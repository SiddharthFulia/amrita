import { NextResponse } from 'next/server';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:4001';

/**
 * Bridge route: ask BE for the Spotify auth URL, then redirect the user to it.
 * BE generates the URL with the proper redirect_uri pointing back to /api/spotify/callback.
 */
export async function GET(req) {
  try {
    // Pass our origin to BE so it picks the right redirect_uri
    const origin = new URL(req.url).origin;
    const beRes = await fetch(`${BE_URL}/api/spotify/auth-url`, {
      headers: { 'origin': origin, 'referer': origin },
      cache: 'no-store',
    });
    const data = await beRes.json();
    if (!data.status) {
      return NextResponse.redirect(`${origin}/music?spotify_error=${encodeURIComponent(data.message || 'auth_url_failed')}`);
    }
    const res = NextResponse.redirect(data.data.url);
    res.cookies.set('sp_redirect_uri', data.data.redirectUri, {
      httpOnly: true, path: '/', maxAge: 600, sameSite: 'lax',
    });
    return res;
  } catch (err) {
    const origin = new URL(req.url).origin;
    return NextResponse.redirect(`${origin}/music?spotify_error=${encodeURIComponent(err.message)}`);
  }
}
