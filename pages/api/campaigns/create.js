// pages/api/campaigns/create.js
import { PrismaClient } from '@prisma/client';
import Queue from 'bull';
import { getSheetData } from '../../../lib/sheets.js';

const prisma = global.__prisma || new PrismaClient();
if (!global.__prisma) global.__prisma = prisma;

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_HOST || null;
if (!REDIS_URL) {
    console.warn('REDIS_URL not set — jobs will not be enqueued automatically.');
}

function columnToIndex(col) {
    return col.charCodeAt(0) - 65;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const body = req.body;
    const { name, sheetId, mapping, startTime, provider_token } = body;
    if (!name || !sheetId || !mapping || !startTime) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        // Attempt to get userId from supabase token in cookie? For simplicity, require userId if present.
        // If you prefer, validate authorization here.
        const userId = req.body.userId || null;

        const campaign = await prisma.campaign.create({
            data: {
                userId: userId || 'unknown',
                name,
                sheetType: 'google',
                sheetId,
                columnMapping: mapping,
                status: 'pending',
                startTime: new Date(startTime),
            },
        });

        // Read sheet rows using provider token
        const rows = await getSheetData(provider_token, sheetId);

        // Setup queue
        const emailQueue = REDIS_URL ? new Queue('email-sends', REDIS_URL) : null;

        const startTimeDate = new Date(startTime);

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const data = {
                Name: mapping.Name ? row[columnToIndex(mapping.Name)] || '' : '',
                Email: mapping.Email ? row[columnToIndex(mapping.Email)] || '' : '',
                PrimaryPlatform: mapping.PrimaryPlatform ? row[columnToIndex(mapping.PrimaryPlatform)] || '' : '',
                SecondaryPlatform: mapping.SecondaryPlatform ? row[columnToIndex(mapping.SecondaryPlatform)] || '' : '',
                LessSubs: mapping.LessSubs ? row[columnToIndex(mapping.LessSubs)] || '' : '',
                VideoName: mapping.VideoName ? row[columnToIndex(mapping.VideoName)] || '' : '',
            };

            const sendTime = new Date(startTimeDate);
            sendTime.setHours(startTimeDate.getHours() + i);
            sendTime.setMinutes(Math.floor(Math.random() * 60));

            const recipient = await prisma.recipient.create({
                data: {
                    campaignId: campaign.id,
                    rowIndex: i + 2,
                    data,
                    status: 'pending',
                    sendTime,
                },
            });

            const delay = sendTime.getTime() - Date.now();
            if (emailQueue) {
                const jobData = {
                    recipientId: recipient.id,
                    userId: userId || null,
                    provider_token,
                    sheetId,
                    rowIndex: recipient.rowIndex,
                    mapping,
                };
                const jobOptions = {
                    attempts: 5,
                    backoff: { type: 'exponential', delay: 60 * 1000 },
                    delay: Math.max(0, delay),
                };
                await emailQueue.add(jobData, jobOptions);
            }
        }

        return res.status(200).json({ success: true, campaignId: campaign.id });
    } catch (err) {
        console.error('API create campaign error:', err);
        return res.status(500).json({ error: err.message || 'Server error' });
    }
}
