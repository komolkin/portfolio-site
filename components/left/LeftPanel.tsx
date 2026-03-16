'use client';

import { useEffect, useState, useRef } from 'react';
import NumberFlow from '@number-flow/react';
import { useHeartRate } from '@/lib/heartRateContext';

function getTimeInTimezone(timezone: string): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: timezone }));
}

// Scrolling text component for long text
function ScrollingText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        setShouldScroll(textWidth > containerWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <div ref={containerRef} className="overflow-hidden relative w-full pointer-events-none">
      <div
        ref={textRef}
        className={`whitespace-nowrap pointer-events-auto ${
          shouldScroll ? 'animate-scroll-text' : ''
        } ${className || ''}`}
      >
        {shouldScroll ? (
          <>
            <span>{text}</span>
            <span className="ml-8">{text}</span>
          </>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

export default function LeftPanel() {
  // Live data states
  const [nyTime, setNyTime] = useState({ hours: 0, minutes: 0 });
  const [parisTime, setParisTime] = useState({ hours: 0, minutes: 0 });
  const [spotifyData, setSpotifyData] = useState<{ isPlaying: boolean; track: { title: string; artist: string; url: string } | null } | null>(null);
  const { bpm: heartRate } = useHeartRate();

  // Update New York and Paris time
  useEffect(() => {
    const updateTime = () => {
      const nyDate = getTimeInTimezone('America/New_York');
      const parisDate = getTimeInTimezone('Europe/Paris');
      setNyTime({ hours: nyDate.getHours(), minutes: nyDate.getMinutes() });
      setParisTime({ hours: parisDate.getHours(), minutes: parisDate.getMinutes() });
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Spotify track
  useEffect(() => {
    const fetchSpotify = async () => {
      try {
        const response = await fetch('/api/spotify/now-playing');
        if (response.ok) {
          const data = await response.json();
          setSpotifyData({
            isPlaying: data.isPlaying || false,
            track: data.track || null,
          });
        }
      } catch (error) {
        console.error('Error fetching Spotify:', error);
      }
    };
    fetchSpotify();
    const interval = setInterval(fetchSpotify, 15000);
    return () => clearInterval(interval);
  }, []);


  const timelineItems = [
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      timestamp: "Documenting travels",
      description: "on Instagram"
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        </svg>
      ),
      timestamp: "Curating",
      description: '"Turbo Focus" playlist'
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
      timestamp: "Committing",
      description: "using GitHub"
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      timestamp: "Hit me up anytime",
      description: "on X ∞"
    },
    // Live data items
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      timestamp: "New York",
      description: (
        <span className="font-mono">
          <NumberFlow value={nyTime.hours} format={{ minimumIntegerDigits: 2 }} />:
          <NumberFlow value={nyTime.minutes} format={{ minimumIntegerDigits: 2 }} />
        </span>
      ),
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      timestamp: "Paris",
      description: (
        <span className="font-mono">
          <NumberFlow value={parisTime.hours} format={{ minimumIntegerDigits: 2 }} />:
          <NumberFlow value={parisTime.minutes} format={{ minimumIntegerDigits: 2 }} />
        </span>
      ),
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      ),
      timestamp: spotifyData?.track
        ? spotifyData.isPlaying
          ? "Now playing"
          : "Recently played"
        : "Now playing",
      description: spotifyData?.track ? (
        <a
          href={spotifyData.track.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity block w-full"
        >
          <ScrollingText text={`${spotifyData.track.title} - ${spotifyData.track.artist}`} />
        </a>
      ) : (
        "No track"
      ),
    },
    {
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      timestamp: "Heart Rate",
      description: (
        <span className="font-mono">
          <NumberFlow value={heartRate} /> BPM
        </span>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Hi, I'm Ilya</h1>
        <div className="text-sm text-muted-foreground leading-relaxed">
          <p>
            Passionate about creating beautiful digital experiences and building products that matter.
          </p>
        </div>
      </div>

      {/* Timeline section */}
      <div className="space-y-4">
        <div className="relative">
          {/* Vertical line connecting all items */}
          <div className="absolute left-[8px] top-0 bottom-0 w-[1px] bg-border" />
          
          {/* Timeline items */}
          <div className="space-y-6">
            {timelineItems.map((item, index) => (
              <div key={index} className="flex items-start gap-4 relative">
                {/* Icon container */}
                <div className="relative z-10 flex-shrink-0 w-4 h-4 flex items-center justify-center text-foreground">
                  {item.icon}
                </div>
                
                {/* Text content */}
                <div className="flex-1 pt-0.5">
                  <div className="text-sm font-medium text-foreground mb-1">
                    {item.timestamp}
                  </div>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

