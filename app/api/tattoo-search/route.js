import { NextResponse } from 'next/server';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'https://api.cognivex.cloud';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'tattoo';
    const count = searchParams.get('count') || '20';
    const page = searchParams.get('page') || '1';

    const beResponse = await fetch(`${BE_URL}/api/image-search?q=${encodeURIComponent(query + ' tattoo')}&count=${count}&page=${page}`, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!beResponse.ok) throw new Error(`BE returned ${beResponse.status}`);

    const beData = await beResponse.json();
    const images = (beData.data?.images || []).map(item => ({
      url: item.url,
      thumbnail: item.thumbnail || item.url,
      source: item.source || '',
      title: item.title || query,
    }));

    return NextResponse.json({ images, page: parseInt(page), hasMore: images.length >= 10 });
  } catch (searchError) {
    return NextResponse.json({ error: searchError.message, images: [] }, { status: 500 });
  }
}
