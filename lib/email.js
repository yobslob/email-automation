const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail(to, subject, body) {
    const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        html: body,
    };
    try {
        await sgMail.send(msg);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message, code: error.code };
    }
}

export function isPermanentError(error) {
    // Simplified: assume 4xx errors are permanent
    return error.code && error.code.toString().startsWith('4');
}