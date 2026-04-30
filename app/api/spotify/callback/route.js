import { NextResponse } from 'next/server';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:4001';

/**
 * Bridge route: receives the OAuth code from Spotify, forwards it to BE for token exchange.
 * BE saves the tokens to disk; FE never touches them.
 */
export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const origin = url.origin;

  if (error) {
    return NextResponse.redirect(`${origin}/music?spotify_error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/music?spotify_error=missing_code`);
  }

  // We stored the redirect_uri the BE generated when we hit /api/spotify/login.
  // It must match exactly what was used to start the flow.
  const redirectUri = req.cookies.get('sp_redirect_uri')?.value
    || `${origin}/api/spotify/callback`;

  try {
    const beRes = await fetch(`${BE_URL}/api/spotify/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirectUri }),
    });
    const data = await beRes.json();
    if (!data.status) {
      return NextResponse.redirect(`${origin}/music?spotify_error=${encodeURIComponent(data.message || 'exchange_failed')}`);
    }
    const res = NextResponse.redirect(`${origin}/music?spotify=connected`);
    res.cookies.set('sp_redirect_uri', '', { path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    return NextResponse.redirect(`${origin}/music?spotify_error=${encodeURIComponent(err.message)}`);
  }
}
