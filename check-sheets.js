const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function checkSheets() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    const res = await sheets.spreadsheets.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
    });
    
    console.log("Tabs disponíveis na planilha:");
    res.data.sheets.forEach(s => console.log(`- "${s.properties.title}"`));
  } catch (err) {
    console.error(err.message);
  }
}
checkSheets();
