import { NextResponse } from 'next/server';

const BE_URL = process.env.BE_INTERNAL_URL || 'http://72.61.236.205';

export async function POST(request) {
  try {
    const body = await request.json();
    const endpoint = body.endpoint;
    delete body.endpoint;

    const backendResponse = await fetch(`${BE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (proxyError) {
    return NextResponse.json({ status: false, message: proxyError.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    const backendResponse = await fetch(`${BE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (proxyError) {
    return NextResponse.json({ status: false, message: proxyError.message }, { status: 500 });
  }
}
