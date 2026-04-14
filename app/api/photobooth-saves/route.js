import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const BOOTH_FOLDER_NAME = 'photobooth';
const DELETED_FOLDER_NAME = 'deleted pics';

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

export async function GET() {
  try {
    const authClient = getAuthClient();
    const drive = google.drive({ version: 'v3', auth: authClient });
    const folderId = await getOrCreateFolder(drive, BOOTH_FOLDER_NAME);

    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`,
      fields: 'files(id, name, mimeType, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const photos = (response.data.files || []).map(fileItem => ({
      id: fileItem.id,
      name: fileItem.name,
      mimeType: fileItem.mimeType,
      createdTime: fileItem.createdTime,
      thumbnailUrl: `https://lh3.googleusercontent.com/d/${fileItem.id}=s400`,
      fullUrl: `https://lh3.googleusercontent.com/d/${fileItem.id}=s1600`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${fileItem.id}`,
    }));

    return NextResponse.json({ photos });
  } catch (routeError) {
    return NextResponse.json({ error: routeError.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { imageData, name } = await request.json();
    if (!imageData) return NextResponse.json({ error: 'imageData required' }, { status: 400 });

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const fileName = name || `photobooth-${Date.now()}.png`;

    const readableStream = new Readable();
    readableStream.push(imageBuffer);
    readableStream.push(null);

    const authSA = getAuthClient();
    const driveSA = google.drive({ version: 'v3', auth: authSA });
    const folderId = await getOrCreateFolder(driveSA, BOOTH_FOLDER_NAME);

    const oauthClient = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth: oauthClient });

    const uploaded = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: 'image/png', body: readableStream },
      fields: 'id, name, createdTime, mimeType',
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: uploaded.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    const savedFile = uploaded.data;
    return NextResponse.json({
      photo: {
        id: savedFile.id,
        name: savedFile.name,
        mimeType: savedFile.mimeType,
        createdTime: savedFile.createdTime,
        thumbnailUrl: `https://lh3.googleusercontent.com/d/${savedFile.id}=s400`,
        fullUrl: `https://lh3.googleusercontent.com/d/${savedFile.id}=s1600`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${savedFile.id}`,
      },
    });
  } catch (routeError) {
    return NextResponse.json({ error: routeError.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { fileIds } = await request.json();
    if (!fileIds || !fileIds.length) {
      return NextResponse.json({ error: 'fileIds required' }, { status: 400 });
    }

    const authSA = getAuthClient();
    const driveSA = google.drive({ version: 'v3', auth: authSA });
    const boothFolderId = await getOrCreateFolder(driveSA, BOOTH_FOLDER_NAME);
    const deletedFolderId = await getOrCreateFolder(driveSA, DELETED_FOLDER_NAME, boothFolderId);

    const oauthClient = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth: oauthClient });

    await Promise.all(fileIds.map(fileId =>
      drive.files.update({
        fileId,
        addParents: deletedFolderId,
        removeParents: boothFolderId,
        fields: 'id',
        supportsAllDrives: true,
      })
    ));

    return NextResponse.json({ success: true, deleted: fileIds.length });
  } catch (routeError) {
    return NextResponse.json({ error: routeError.message }, { status: 500 });
  }
}
