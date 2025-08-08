const Queue = require('bull');
const { PrismaClient } = require('@prisma/client');
const { sendEmail, isPermanentError } = require('./lib/email');
const { updateSheetStatus } = require('./lib/sheets');
const { subjectTemplate, bodyTemplates } = require('./lib/templates');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const prisma = new PrismaClient();
const emailQueue = new Queue('email sends', process.env.REDIS_URL);

async function getAccessToken(googleRefreshToken) {
    const client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'postmessage' // Adjust to your redirect URI if necessary
    );
    client.setCredentials({ refresh_token: googleRefreshToken });
    const { token } = await client.getAccessToken();
    return token;
}

emailQueue.process(async (job) => {
    const { recipientId, userId } = job.data;
    try {
        const recipient = await prisma.recipient.findUnique({ where: { id: recipientId } });
        if (!recipient) throw new Error('Recipient not found');
        const campaign = await prisma.campaign.findUnique({ where: { id: recipient.campaignId } });
        if (!campaign) throw new Error('Campaign not found');
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Generate email content
        const data = recipient.data;
        const subject = subjectTemplate(data);
        const body = bodyTemplates[Math.floor(Math.random() * bodyTemplates.length)](data);

        // Send email
        const result = await sendEmail(data.Email, subject, body);
        const accessToken = await getAccessToken(user.googleRefreshToken);
        const range = `Sheet1!${campaign.columnMapping.Status}${recipient.rowIndex}`;

        if (result.success) {
            await prisma.recipient.update({
                where: { id: recipientId },
                data: { status: 'SENT', attempts: recipient.attempts + 1 },
            });
            await updateSheetStatus(accessToken, campaign.sheetId, range, 'SENT');
            if (user.discordWebhookUrl) {
                await axios.post(user.discordWebhookUrl, {
                    content: `Mail sent to ${data.Name} at ${new Date().toISOString()}`,
                });
            }
        } else {
            const isPermanent = isPermanentError(result);
            if (isPermanent || recipient.attempts >= 3) {
                await prisma.recipient.update({
                    where: { id: recipientId },
                    data: { status: 'FAILED', lastError: result.error, attempts: recipient.attempts + 1 },
                });
                await updateSheetStatus(accessToken, campaign.sheetId, range, 'FAILED');
            } else {
                throw new Error(result.error); // Trigger retry
            }
        }
    } catch (error) {
        console.error('Error processing job:', error);
        throw error; // Bull handles retries
    }
});

console.log('Worker started');