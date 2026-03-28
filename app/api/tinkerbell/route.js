import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const TINK_FOLDER_NAME = 'tinkerbell';
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
  const res = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  if (res.data.files?.length) return res.data.files[0].id;
  const folder = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
    supportsAllDrives: true,
  });
  return folder.data.id;
}

// GET — list Tinkerbell photos
export async function GET() {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const folderId = await getOrCreateFolder(drive, TINK_FOLDER_NAME);

    const res = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
      fields: 'files(id, name, createdTime, mimeType)',
      orderBy: 'createdTime desc',
      pageSize: 200,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const photos = (res.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      mimeType: f.mimeType,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
      fullUrl: f.mimeType?.startsWith('video/')
        ? `https://drive.google.com/file/d/${f.id}/preview`
        : `https://drive.google.com/thumbnail?id=${f.id}&sz=w2000`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
    }));

    return NextResponse.json({ photos, folderId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — upload photo/video
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || 'image/jpeg';

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // SA finds/creates folder, OAuth uploads
    const authSA = getAuthClient();
    const driveSA = google.drive({ version: 'v3', auth: authSA });
    const folderId = await getOrCreateFolder(driveSA, TINK_FOLDER_NAME);

    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const uploaded = await drive.files.create({
      requestBody: { name: file.name, parents: [folderId] },
      media: { mimeType: contentType, body: stream },
      fields: 'id, name, createdTime, mimeType',
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: uploaded.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    const f = uploaded.data;
    return NextResponse.json({
      photo: {
        id: f.id,
        name: f.name,
        createdTime: f.createdTime,
        mimeType: f.mimeType,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
        fullUrl: f.mimeType?.startsWith('video/')
          ? `https://drive.google.com/file/d/${f.id}/preview`
          : `https://drive.google.com/thumbnail?id=${f.id}&sz=w2000`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — move to tinkerbell/deleted pics subfolder (single or batch)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let fileIds = [];
    const single = searchParams.get('fileId');
    if (single) {
      fileIds = [single];
    } else {
      const body = await request.json().catch(() => ({}));
      if (Array.isArray(body.fileIds)) fileIds = body.fileIds;
    }
    if (!fileIds.length) return NextResponse.json({ error: 'No fileId(s)' }, { status: 400 });

    const authSA = getAuthClient();
    const driveSA = google.drive({ version: 'v3', auth: authSA });

    // Get tinkerbell folder, then create "deleted pics" INSIDE it
    const tinkFolderId = await getOrCreateFolder(driveSA, TINK_FOLDER_NAME);
    const deletedFolderId = await getOrCreateFolder(driveSA, DELETED_FOLDER_NAME, tinkFolderId);

    // OAuth to move (files owned by personal account)
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    await Promise.all(fileIds.map(fileId =>
      drive.files.update({
        fileId,
        addParents: deletedFolderId,
        removeParents: tinkFolderId,
        fields: 'id',
        supportsAllDrives: true,
      })
    ));

    return NextResponse.json({ success: true, deleted: fileIds.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
