import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const TINK_FOLDER_NAME = 'tinkerbell';

function getAuthClient() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return client;
}

async function getOrCreateFolder(drive, name, parentId = FOLDER_ID) {
  const existing = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)', pageSize: 1, supportsAllDrives: true, includeItemsFromAllDrives: true,
  });
  if (existing.data.files?.length > 0) return existing.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id', supportsAllDrives: true,
  });
  return folder.data.id;
}

export async function POST(request) {
  try {
    const { fileName, mimeType } = await request.json();
    if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 });

    const authSA = getAuthClient();
    const driveSA = google.drive({ version: 'v3', auth: authSA });
    const folderId = await getOrCreateFolder(driveSA, TINK_FOLDER_NAME);

    const oauthClient = getOAuthClient();
    const accessToken = (await oauthClient.getAccessToken()).token;

    const initResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: fileName,
          parents: [folderId],
        }),
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      throw new Error(`Failed to init upload: ${errorText}`);
    }

    const resumableUrl = initResponse.headers.get('location');
    if (!resumableUrl) throw new Error('No resumable URL returned');

    return NextResponse.json({
      uploadUrl: resumableUrl,
      folderId,
      accessToken,
    });
  } catch (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }
}
