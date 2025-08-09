// lib/email.js
import sgMail from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set — sendEmail will fail.');
} else {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export async function sendEmail(to, subject, body) {
    const msg = {
        to,
        from: process.env.SENDGRID_FROM_EMAIL,
        subject,
        html: body,
    };

    try {
        const res = await sgMail.send(msg);
        if (process.env.DEBUG) console.log('sendEmail success', { to, subject, res });
        return { success: true, response: res };
    } catch (error) {
        // SendGrid errors can have response.body
        let details = error.message;
        if (error.response && error.response.body) {
            details = error.response.body;
        }
        if (process.env.DEBUG) {
            console.error('sendEmail error', { to, subject, details, stack: error.stack });
        }
        return { success: false, error: details, code: error.code || null };
    }
}

export function isPermanentError(error) {
    // If SendGrid returns a 4xx status code inside response body, treat as permanent
    try {
        if (!error) return false;
        if (error.code && String(error.code).startsWith('4')) return true;
        // When response.body is an object with errors:
        if (error && error.errors && Array.isArray(error.errors)) {
            // look for 4xx
            return error.errors.some((e) => String(e.status || '').startsWith('4'));
        }
        return false;
    } catch (err) {
        return false;
    }
}
