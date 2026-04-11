import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

function getOAuthClient() {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  );
  client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
  return client;
}

function checkPassword(request) {
  return request.headers.get('x-gallery-password') === process.env.GALLERY_PASSWORD;
}

export async function POST(request) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fileName, mimeType } = await request.json();
    if (!fileName) return NextResponse.json({ error: 'fileName required' }, { status: 400 });

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
          parents: [FOLDER_ID],
        }),
      }
    );

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      throw new Error(`Failed to init upload: ${errorText}`);
    }

    const resumableUrl = initResponse.headers.get('location');
    if (!resumableUrl) throw new Error('No resumable URL returned');

    return NextResponse.json({ uploadUrl: resumableUrl, accessToken });
  } catch (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }
}
