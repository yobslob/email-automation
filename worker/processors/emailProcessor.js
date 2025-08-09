// worker/processors/emailProcessor.js
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';
import { sendEmail, isPermanentError } from '../../lib/email.js';
import { updateSheetStatus } from '../../lib/sheets.js';
import { subjectTemplate, bodyTemplates } from '../../lib/templates.js';

const prisma = global.__prisma_worker || new PrismaClient();
if (!global.__prisma_worker) global.__prisma_worker = prisma;
const DEBUG = !!process.env.DEBUG;

async function getAccessTokenFromRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    client.setCredentials({ refresh_token: refreshToken });
    try {
        const res = await client.getAccessToken();
        // res can be object or string depending on version
        const token = res && typeof res === 'object' ? res.token : res;
        return token || null;
    } catch (err) {
        console.error('Failed to refresh Google access token:', err && err.message ? err.message : err);
        return null;
    }
}

export default async function process(job) {
    const { recipientId, userId } = job.data;
    DEBUG && console.log('[processor] job', job.id, 'recipientId', recipientId, 'userId', userId);

    // fetch recipient, campaign, user
    const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } });
    if (!recipient) throw new Error(`Recipient not found ${recipientId}`);

    const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId } });
    if (!campaign) throw new Error(`Campaign not found ${recipient.campaignId}`);

    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : await prisma.user.findUnique({ where: { id: campaign.userId } });
    if (!user) throw new Error(`User not found (${userId || campaign.userId})`);

    const data = recipient.data || {};

    // build subject/body
    const subject = typeof subjectTemplate === 'function' ? subjectTemplate(data) : (data.subject || `Hello ${data.Name || ''}`);
    let body;
    if (Array.isArray(bodyTemplates) && bodyTemplates.length > 0) {
        const fn = bodyTemplates[Math.floor(Math.random() * bodyTemplates.length)];
        body = typeof fn === 'function' ? fn(data) : String(fn || '');
    } else {
        body = `<p>Hi ${data.Name || ''},</p><p>This is a message.</p>`;
    }

    if (!data.Email) {
        await prisma.recipient.update({
            where: { id: recipientId },
            data: { status: 'FAILED', attempts: (recipient.attempts || 0) + 1, lastError: 'Missing email' },
        });
        throw new Error('Missing recipient email'); // still throw so job is visible as failed
    }

    // Try to get an access token for sheet updates
    const accessToken = user && user.googleRefreshToken ? await getAccessTokenFromRefreshToken(user.googleRefreshToken) : (job.data.provider_token || null);

    // send email
    const result = await sendEmail(data.Email, subject, body);

    if (result.success) {
        await prisma.recipient.update({
            where: { id: recipientId },
            data: { status: 'SENT', attempts: (recipient.attempts || 0) + 1, lastError: null, sentAt: new Date() },
        });

        // update Google Sheet status if we have a mapping and token
        try {
            const statusCol = campaign.columnMapping && campaign.columnMapping.Status;
            if (accessToken && statusCol) {
                const range = `Sheet1!${statusCol}${recipient.rowIndex}`;
                await updateSheetStatus(accessToken, campaign.sheetId, range, 'SENT');
            }
        } catch (err) {
            console.error('Non-fatal: failed to update sheet after send:', err && err.message ? err.message : err);
        }

        // notify Discord if webhook present on user
        try {
            if (user.discordWebhookUrl) {
                await axios.post(user.discordWebhookUrl, {
                    content: `Email sent to ${data.Name || data.Email} (${data.Email}) — campaign "${campaign.name}"`,
                });
            }
        } catch (err) {
            console.error('Discord notification failed (non-fatal):', err && err.message ? err.message : err);
        }

        return;
    } else {
        // failure case
        const permanent = isPermanentError(result);
        const nextAttempts = (recipient.attempts || 0) + 1;
        if (permanent || nextAttempts >= 3) {
            await prisma.recipient.update({
                where: { id: recipientId },
                data: { status: 'FAILED', lastError: typeof result.error === 'string' ? result.error : JSON.stringify(result.error), attempts: nextAttempts },
            });
            // update sheet status to FAILED if possible
            try {
                const statusCol = campaign.columnMapping && campaign.columnMapping.Status;
                if (accessToken && statusCol) {
                    const range = `Sheet1!${statusCol}${recipient.rowIndex}`;
                    await updateSheetStatus(accessToken, campaign.sheetId, range, 'FAILED');
                }
            } catch (err) {
                console.error('Failed to update sheet to FAILED (non-fatal):', err);
            }

            // notify discord
            try {
                if (user.discordWebhookUrl) {
                    await axios.post(user.discordWebhookUrl, {
                        content: `Permanent failure sending to ${data.Email}: ${result.error || 'unknown error'}`,
                    });
                }
            } catch (err) {
                console.error('Notify discord on failure failed:', err);
            }

            return;
        } else {
            // transient: increment attempts and throw so Bull will retry
            await prisma.recipient.update({
                where: { id: recipientId },
                data: { attempts: nextAttempts, lastError: typeof result.error === 'string' ? result.error : JSON.stringify(result.error) },
            });
            throw new Error(result.error || 'Transient send error');
        }
    }
}
