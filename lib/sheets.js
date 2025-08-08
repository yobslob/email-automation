import { google } from 'googleapis';

export async function getSheetColumns(accessToken, spreadsheetId) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!1:1',
    });
    return response.data.values[0];
}

export async function getSheetData(accessToken, spreadsheetId) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A2:Z',
    });
    return response.data.values;
}

export async function updateSheetStatus(accessToken, spreadsheetId, range, value) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: { values: [[value]] },
    });
}