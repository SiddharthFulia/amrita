import { NextResponse } from 'next/server';

// Proxy image download so cross-origin cat images can be saved to device
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return NextResponse.json({ error: 'No URL' }, { status: 400 });

  // Only allow thecatapi CDN URLs
  const allowed = ['cdn2.thecatapi.com', 'cdn.thecatapi.com', '25.media.tumblr.com', '24.media.tumblr.com'];
  const isAllowed = allowed.some(domain => url.includes(domain)) || url.match(/^https:\/\/[^/]*thecatapi\.com/);
  if (!isAllowed) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('fetch failed');

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : contentType.includes('mp4') ? 'mp4' : 'jpg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="cute-cat-${Date.now()}.${ext}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
