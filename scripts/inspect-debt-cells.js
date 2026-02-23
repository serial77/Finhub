require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

(async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const s = google.sheets({ version: 'v4', auth });
  const meta = await s.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEET_ID });
  const tabs = (meta.data.sheets || [])
    .map((x) => x.properties.title)
    .filter((t) => /^[A-Z]{3}\d{2}$/.test(t))
    .sort();

  for (const t of tabs) {
    const r = await s.spreadsheets.values.batchGet({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      ranges: [`'${t}'!H2:H3`, `'${t}'!I2:I3`, `'${t}'!J2:J3`, `'${t}'!M11:M20`],
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    console.log('\n', t);
    for (const vr of r.data.valueRanges || []) {
      console.log(vr.range, JSON.stringify(vr.values || []));
    }
  }
})();