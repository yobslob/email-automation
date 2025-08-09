// pages/api/sheets/columns.js
import { getSheetColumns } from '../../../lib/sheets.js';
import { PrismaClient } from '@prisma/client';
import { OAuth2Client } from 'google-auth-library';

const prisma = global.__prisma || new PrismaClient();
if (!global.__prisma) global.__prisma = prisma;

function isGoogleAuthError(err) {
    // googleapis errors may have code or status or response?.status
    if (!err) return false;
    return err.code === 401 || err.status === 401 || (err.response && err.response.status === 401);
}

async function getAccessTokenFromRefreshToken(refreshToken) {
    if (!refreshToken) return null;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    client.setCredentials({ refresh_token: refreshToken });
    try {
        const res = await client.getAccessToken();
        // res may be object { token } or a string depending on version
        return res && typeof res === 'object' ? res.token : res;
    } catch (err) {
        console.error('Failed to refresh access token from refresh token:', err);
        return null;
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { accessToken, sheetId, userId } = req.body;
    if (!sheetId) return res.status(400).json({ error: 'Missing sheetId' });

    // Try with client-supplied token first (if provided)
    if (accessToken) {
        try {
            const columns = await getSheetColumns(accessToken, sheetId);
            return res.status(200).json({ columns });
        } catch (err) {
            console.warn('getSheetColumns with client token failed:', err && (err.message || err.code || err.status));
            // fallthrough to try refresh token if 401
            if (!isGoogleAuthError(err)) {
                console.error('Non-auth error when fetching columns:', err);
                return res.status(500).json({ error: err.message || 'Failed to fetch columns' });
            }
        }
    }

    // If we reach here: either no accessToken or it was invalid (401). Try refresh token path via stored refresh token.
    if (!userId) {
        return res.status(401).json({ error: 'No valid Google access token and no userId provided to attempt refresh.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.googleRefreshToken) {
            return res.status(401).json({ error: 'No stored Google refresh token for user. Re-authenticate with Google.' });
        }

        const refreshedToken = await getAccessTokenFromRefreshToken(user.googleRefreshToken);
        if (!refreshedToken) {
            return res.status(500).json({ error: 'Failed to mint access token from refresh token. Re-authenticate.' });
        }

        // Try again with refreshed token
        try {
            const columns = await getSheetColumns(refreshedToken, sheetId);
            return res.status(200).json({ columns });
        } catch (err2) {
            console.error('getSheetColumns failed even after refresh token exchange:', err2);
            return res.status(500).json({ error: err2.message || 'Failed to fetch columns after refresh' });
        }
    } catch (dbErr) {
        console.error('DB error while looking up user for refresh token:', dbErr);
        return res.status(500).json({ error: 'Server error' });
    }
}
