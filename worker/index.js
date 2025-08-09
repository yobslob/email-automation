// worker/index.js
// CommonJS worker file — place at worker/index.js and run with `node worker/index.js`

import Queue from 'bull';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import axios from 'axios';
import { OAuth2Client } from 'google-auth-library';

import { sendEmail, isPermanentError } from '../lib/email.js';
import { updateSheetStatus } from '../lib/sheets.js';
import { subjectTemplate, bodyTemplates } from '../lib/templates.js';

// Prisma singleton to avoid too many connections in dev
const prisma = global.__prisma_worker || new PrismaClient();
if (!global.__prisma_worker) global.__prisma_worker = prisma;

const DEBUG = !!process.env.DEBUG;

// Redis connection handling: prefer REDIS_URL, fallback to host/port/password
let queue;
const REDIS_URL = process.env.REDIS_URL || null;
if (REDIS_URL) {
    queue = new Queue('email-sends', REDIS_URL);
    if (DEBUG) console.log('Using REDIS_URL for queue');
} else if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
    queue = new Queue('email-sends', {
        redis: {
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
            password: process.env.REDIS_PASSWORD || undefined,
        },
    });
    if (DEBUG) console.log('Using REDIS_HOST/PORT for queue');
} else {
    console.error('No Redis config found. Set REDIS_URL or REDIS_HOST/REDIS_PORT. Exiting.');
    process.exit(1);
}

if (DEBUG) console.log('Worker started — listening to queue "email-sends"');

// helper to get access token from stored google refresh token
async function getAccessTokenFromRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
        // no redirect URI required for server-side token refresh
    );
    client.setCredentials({ refresh_token: refreshToken });

    try {
        const res = await client.getAccessToken();
        // getAccessToken may return { token } or a string — handle both
        const token = res && typeof res === 'object' ? res.token : res;
        if (DEBUG) console.log('Obtained Google access token (truncated):', token ? token.substring(0, 10) + '...' : null);
        return token || null;
    } catch (err) {
        console.error('Failed to get Google access token from refresh token:', err && err.message ? err.message : err);
        return null;
    }
}

// concurrency 1 to respect per-hour scheduling behavior; increase if you want parallel
const CONCURRENCY = 1;

queue.process(CONCURRENCY, async (job) => {
    const { recipientId, userId } = job.data;
    if (DEBUG) console.log(`[job ${job.id}] Starting processing recipientId=${recipientId} userId=${userId}`);

    try {
        const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } });
        if (!recipient) throw new Error(`Recipient ${recipientId} not found`);

        const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId } });
        if (!campaign) throw new Error(`Campaign ${recipient.campaignId} not found`);

        const user = await prisma.user.findUnique({ where: { id: userId || campaign.userId } });
        if (!user) throw new Error(`User ${userId || campaign.userId} not found`);

        // Build email content from templates
        const data = recipient.data || {};
        const subject = typeof subjectTemplate === 'function' ? subjectTemplate(data) : (data.subject || `Hello ${data.Name || ''}`);
        let body;
        if (Array.isArray(bodyTemplates) && bodyTemplates.length > 0) {
            const templateFn = bodyTemplates[Math.floor(Math.random() * bodyTemplates.length)];
            body = typeof templateFn === 'function' ? templateFn(data) : String(templateFn || '');
        } else {
            body = `<p>Hi ${data.Name || ''},</p><p>This is a message.</p>`;
        }

        if (!data.Email) {
            // No destination email — mark as failed and skip
            await prisma.recipient.update({
                where: { id: recipientId },
                data: { status: 'FAILED', lastError: 'Missing email address', attempts: (recipient.attempts || 0) + 1 },
            });
            throw new Error('Recipient missing Email');
        }

        if (DEBUG) console.log(`[job ${job.id}] Sending email to ${data.Email}`);

        const sendResult = await sendEmail(data.Email, subject, body);

        // If we have a google refresh token for the user, get an access token to update sheets
        const accessToken = user && user.googleRefreshToken ? await getAccessTokenFromRefreshToken(user.googleRefreshToken) : null;

        // compute sheet range for Status column, if mapping exists
        let statusRange = null;
        try {
            const statusCol = campaign.columnMapping && campaign.columnMapping.Status;
            if (statusCol) statusRange = `Sheet1!${statusCol}${recipient.rowIndex}`;
        } catch (err) {
            if (DEBUG) console.warn('Could not compute status range from campaign.columnMapping', err);
        }

        if (sendResult && sendResult.success) {
            // mark recipient sent
            await prisma.recipient.update({
                where: { id: recipientId },
                data: { status: 'SENT', attempts: (recipient.attempts || 0) + 1, lastError: null, sentAt: new Date() },
            });

            // update sheet status if possible
            if (accessToken && statusRange) {
                try {
                    await updateSheetStatus(accessToken, campaign.sheetId, statusRange, 'SENT');
                    if (DEBUG) console.log(`[job ${job.id}] Updated sheet ${campaign.sheetId} ${statusRange} => SENT`);
                } catch (err) {
                    console.error(`[job ${job.id}] Failed to update sheet status (non-fatal):`, err && err.message ? err.message : err);
                }
            }

            // Notify on Discord if configured
            if (user && user.discordWebhookUrl) {
                try {
                    await axios.post(user.discordWebhookUrl, {
                        content: `Email sent to ${data.Name || data.Email} (${data.Email}) — campaign "${campaign.name}"`,
                    });
                } catch (err) {
                    console.error(`[job ${job.id}] Failed to notify Discord:`, err && err.message ? err.message : err);
                }
            }

            if (DEBUG) console.log(`[job ${job.id}] Completed successfully`);
            return Promise.resolve();
        } else {
            // Send failed — decide permanent or transient
            const permanent = isPermanentError(sendResult) === true;

            if (permanent || (recipient.attempts || 0) + 1 >= 3) {
                // mark failed permanently
                await prisma.recipient.update({
                    where: { id: recipientId },
                    data: { status: 'FAILED', lastError: sendResult && sendResult.error ? (typeof sendResult.error === 'string' ? sendResult.error : JSON.stringify(sendResult.error)) : 'Unknown error', attempts: (recipient.attempts || 0) + 1 },
                });

                // update sheet to FAILED if possible
                if (accessToken && statusRange) {
                    try {
                        await updateSheetStatus(accessToken, campaign.sheetId, statusRange, 'FAILED');
                        if (DEBUG) console.log(`[job ${job.id}] Updated sheet ${campaign.sheetId} ${statusRange} => FAILED`);
                    } catch (err) {
                        console.error(`[job ${job.id}] Failed to update sheet status for FAILED:`, err && err.message ? err.message : err);
                    }
                }

                // optionally notify discord
                if (user && user.discordWebhookUrl) {
                    try {
                        await axios.post(user.discordWebhookUrl, {
                            content: `Permanent failure sending to ${data.Email}: ${sendResult && sendResult.error ? (typeof sendResult.error === 'string' ? sendResult.error : JSON.stringify(sendResult.error)) : 'Unknown error'}`,
                        });
                    } catch (err) {
                        console.error(`[job ${job.id}] Discord notify on failure failed:`, err && err.message ? err.message : err);
                    }
                }

                // do not rethrow — treated as terminal
                return Promise.resolve();
            } else {
                // transient — increment attempts and rethrow so Bull will retry with backoff
                await prisma.recipient.update({
                    where: { id: recipientId },
                    data: { attempts: (recipient.attempts || 0) + 1, lastError: sendResult && sendResult.error ? (typeof sendResult.error === 'string' ? sendResult.error : JSON.stringify(sendResult.error)) : 'Transient error' },
                });

                const message = sendResult && sendResult.error ? (typeof sendResult.error === 'string' ? sendResult.error : JSON.stringify(sendResult.error)) : 'Transient send error';
                if (DEBUG) console.log(`[job ${job.id}] Transient error — throwing to trigger retry:`, message);

                // Throw to allow Bull to honor job attempts/backoff
                throw new Error(message);
            }
        }
    } catch (err) {
        console.error(`[job ${job.id}] Error processing:`, err && err.message ? err.message : err);
        // rethrow for Bull to handle retries (unless you want to swallow)
        throw err;
    }
});

// graceful shutdown
async function gracefulShutdown() {
    try {
        console.log('Worker shutting down gracefully...');
        await queue.close(5000);
    } catch (err) {
        console.warn('Error closing queue:', err && err.message ? err.message : err);
    }
    try {
        await prisma.$disconnect();
    } catch (err) {
        console.warn('Error disconnecting prisma:', err && err.message ? err.message : err);
    }
    process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// show some event-level logs
queue.on('completed', (job) => {
    if (DEBUG) console.log(`Job ${job.id} completed`);
});
queue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed:`, err && err.message ? err.message : err);
});

console.log('Worker ready — waiting for jobs (queue: email-sends)');