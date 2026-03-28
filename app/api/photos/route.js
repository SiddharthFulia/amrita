import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const DELETED_FOLDER_NAME = 'deleted pics';

function getAuthClient() {
  return new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
}

// OAuth2 client using personal Google account — used for uploads so files
// count against the user's storage quota, not the service account's (zero) quota
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

async function getOrCreateDeletedFolder(drive) {
  const res = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name = '${DELETED_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const folder = await drive.files.create({
    requestBody: {
      name: DELETED_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [FOLDER_ID],
    },
    fields: 'id',
    supportsAllDrives: true,
  });
  return folder.data.id;
}

// GET /api/photos?pageToken=...&pageSize=20
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.list({
      q: `'${FOLDER_ID}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime)',
      orderBy: 'createdTime desc',
      pageSize,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      ...(pageToken ? { pageToken } : {}),
    });

    const photos = (response.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      isVideo: f.mimeType?.startsWith('video/'),
      createdTime: f.createdTime,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w600`,
      fullUrl: f.mimeType?.startsWith('video/')
        ? `https://drive.google.com/file/d/${f.id}/preview`
        : `https://drive.google.com/thumbnail?id=${f.id}&sz=w2000`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
    }));

    return NextResponse.json({
      photos,
      nextPageToken: response.data.nextPageToken || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/photos — upload
export async function POST(request) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);

    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const uploaded = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [FOLDER_ID],
      },
      media: {
        mimeType: file.type,
        body: readableStream,
      },
      fields: 'id, name, createdTime',
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: uploaded.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    const isVideo = file.type.startsWith('video/');
    return NextResponse.json({
      photo: {
        id: uploaded.data.id,
        name: uploaded.data.name,
        mimeType: file.type,
        isVideo,
        createdTime: uploaded.data.createdTime,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${uploaded.data.id}&sz=w600`,
        fullUrl: isVideo
          ? `https://drive.google.com/file/d/${uploaded.data.id}/preview`
          : `https://drive.google.com/thumbnail?id=${uploaded.data.id}&sz=w2000`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${uploaded.data.id}`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/photos?fileId=... — moves to "deleted pics" subfolder
export async function DELETE(request) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'No fileId provided' }, { status: 400 });
    }

    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const deletedFolderId = await getOrCreateDeletedFolder(drive);

    // Move file: add new parent, remove old parent
    await drive.files.update({
      fileId,
      addParents: deletedFolderId,
      removeParents: FOLDER_ID,
      fields: 'id',
      supportsAllDrives: true,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
