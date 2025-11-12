import { NextResponse } from 'next/server';
import { getNowPlaying } from '@/lib/spotify';

export const revalidate = 15;

export async function GET() {
  const data = await getNowPlaying();
  
  if (!data) {
    return NextResponse.json({ isPlaying: false, track: null }, { status: 200 });
  }

  return NextResponse.json(data);
}

