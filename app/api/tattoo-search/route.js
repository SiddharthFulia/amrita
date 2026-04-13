import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'tattoo';
    const page = parseInt(searchParams.get('page') || '1');

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchCx = process.env.GOOGLE_SEARCH_CX;

    if (!apiKey || !searchCx) {
      return NextResponse.json({ error: 'Search not configured', images: [] }, { status: 500 });
    }

    const startIndex = (page - 1) * 10 + 1;
    const searchQuery = encodeURIComponent(`${query} tattoo`);

    const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchCx}&q=${searchQuery}&searchType=image&num=10&start=${startIndex}&imgSize=large&safe=active`;

    const googleResponse = await fetch(googleUrl);

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json();
      throw new Error(errorData.error?.message || `Google returned ${googleResponse.status}`);
    }

    const googleData = await googleResponse.json();
    const totalResults = parseInt(googleData.searchInformation?.totalResults || '0');
    const totalPages = Math.min(Math.ceil(totalResults / 10), 10);

    const images = (googleData.items || []).map(item => ({
      url: item.link,
      thumbnail: item.image?.thumbnailLink || item.link,
      source: item.displayLink || '',
      title: item.title || query,
      width: item.image?.width,
      height: item.image?.height,
    }));

    return NextResponse.json({ images, page, hasMore: page < totalPages });
  } catch (searchError) {
    return NextResponse.json({ error: searchError.message, images: [] }, { status: 500 });
  }
}
