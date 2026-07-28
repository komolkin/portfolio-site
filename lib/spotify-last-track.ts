const STORAGE_KEY = "spotify-last-track";

export type StoredSpotifyTrack = {
  title: string;
  artist: string;
  url: string;
  artwork: string;
};

type StoredSpotifyEntry = {
  track: StoredSpotifyTrack;
  savedAt: number;
};

export function readLastSpotifyTrack(): StoredSpotifyTrack | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredSpotifyEntry;
    if (!parsed.track?.title || !parsed.track?.url) return null;

    return parsed.track;
  } catch {
    return null;
  }
}

export function writeLastSpotifyTrack(track: StoredSpotifyTrack): void {
  if (typeof window === "undefined") return;

  try {
    const entry: StoredSpotifyEntry = {
      track,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // ignore private mode / quota errors
  }
}
