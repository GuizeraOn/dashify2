import { google } from 'googleapis';

export async function getSheetsClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable');
  }

  let credentials;
  try {
    credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_JSON format. Must be a valid JSON string.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();

  // @ts-ignore
  const sheets = google.sheets({ version: 'v4', auth: client });

  return sheets;
}

export const getSpreadsheetId = () => {
  const id = process.env.SPREADSHEET_ID;
  if (!id) throw new Error('Missing SPREADSHEET_ID environment variable');
  return id;
};
