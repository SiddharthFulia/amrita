import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
const CATS_FOLDER_NAME = 'saved cats';
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

// GET — list saved cats
export async function GET() {
  try {
    const auth = getAuthClient();
    const drive = google.drive({ version: 'v3', auth });
    const catsFolderId = await getOrCreateFolder(drive, CATS_FOLDER_NAME);

    const res = await drive.files.list({
      q: `'${catsFolderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name, createdTime)',
      orderBy: 'createdTime desc',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const cats = (res.data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
      fullUrl: `https://drive.google.com/thumbnail?id=${f.id}&sz=w2000`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
    }));

    return NextResponse.json({ cats, folderId: catsFolderId });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST — save a cat image from URL to Drive
export async function POST(request) {
  try {
    const { url, name } = await request.json();
    if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

    // Fetch the image
    const imgRes = await fetch(url);
    if (!imgRes.ok) throw new Error('Failed to fetch cat image');
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Upload to "saved cats" folder using OAuth (uses user's quota)
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Need service account to find/create folder, then OAuth to upload
    const authSA = getAuthClient();
    const driveSA = google.drive({ version: 'v3', auth: authSA });
    const catsFolderId = await getOrCreateFolder(driveSA, CATS_FOLDER_NAME);

    const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg';
    const fileName = name || `cat-${Date.now()}.${ext}`;

    const uploaded = await drive.files.create({
      requestBody: { name: fileName, parents: [catsFolderId] },
      media: { mimeType: contentType, body: stream },
      fields: 'id, name, createdTime',
      supportsAllDrives: true,
    });

    await drive.permissions.create({
      fileId: uploaded.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true,
    });

    return NextResponse.json({
      cat: {
        id: uploaded.data.id,
        name: uploaded.data.name,
        createdTime: uploaded.data.createdTime,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${uploaded.data.id}&sz=w400`,
        fullUrl: `https://drive.google.com/thumbnail?id=${uploaded.data.id}&sz=w2000`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${uploaded.data.id}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — move to deleted pics (supports single ?fileId= or batch body { fileIds: [] })
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    let fileIds = [];

    // single via query param
    const single = searchParams.get('fileId');
    if (single) {
      fileIds = [single];
    } else {
      // batch via JSON body
      const body = await request.json().catch(() => ({}));
      if (Array.isArray(body.fileIds)) fileIds = body.fileIds;
    }
    if (!fileIds.length) return NextResponse.json({ error: 'No fileId(s)' }, { status: 400 });

    // Use OAuth so we can move files owned by the personal account
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Use service account to find/create folders (they were created by SA)
    const authSA = getAuthClient();
    const driveSA = google.drive({ version: 'v3', auth: authSA });
    const catsFolderId = await getOrCreateFolder(driveSA, CATS_FOLDER_NAME);
    // deleted pics goes INSIDE "saved cats" folder, not at root
    const deletedFolderId = await getOrCreateFolder(driveSA, DELETED_FOLDER_NAME, catsFolderId);

    await Promise.all(fileIds.map(fileId =>
      drive.files.update({
        fileId,
        addParents: deletedFolderId,
        removeParents: catsFolderId,
        fields: 'id',
        supportsAllDrives: true,
      })
    ));

    return NextResponse.json({ success: true, deleted: fileIds.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
