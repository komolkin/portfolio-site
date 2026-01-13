"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Snippet } from "@/lib/supabase";

interface SnippetsSlideProps {
  snippets: Snippet[];
}

function SnippetCard({ snippet }: { snippet: Snippet }) {
  const [loaded, setLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setAspectRatio(img.naturalWidth / img.naturalHeight);
    }
    setLoaded(true);
  };

  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoWidth && video.videoHeight) {
      setAspectRatio(video.videoWidth / video.videoHeight);
    }
    setLoaded(true);
  };

  const isVideo = snippet.media_type === "video";

  const content = (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-[#1a1a1a]"
      style={{ aspectRatio: aspectRatio || 1 }}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={snippet.image_url}
          autoPlay
          loop
          muted
          playsInline
          onLoadedMetadata={handleVideoLoad}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <Image
          src={snippet.image_url}
          alt={snippet.alt || "Snippet"}
          fill
          sizes="(max-width: 768px) 50vw, 20vw"
          className={`object-cover transition-opacity duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={handleImageLoad}
        />
      )}
    </div>
  );

  if (snippet.link) {
    return (
      <Link
        href={snippet.link}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        {content}
      </Link>
    );
  }

  return content;
}

export default function SnippetsSlide({ snippets }: SnippetsSlideProps) {
  // Distribute snippets into columns for masonry layout
  const distributeToColumns = (items: Snippet[], columnCount: number) => {
    const columns: Snippet[][] = Array.from({ length: columnCount }, () => []);
    
    items.forEach((item, index) => {
      columns[index % columnCount].push(item);
    });
    
    return columns;
  };

  const desktopColumns = distributeToColumns(snippets, 5);
  const mobileColumns = distributeToColumns(snippets, 2);

  return (
    <div
      data-section="works"
      className="slide w-full min-h-screen bg-black px-6 md:px-8 lg:px-10 pt-20 lg:pt-24 pb-10"
    >
      {/* Title */}
      <h2 className="text-4xl md:text-[36px] font-normal text-white mb-10">
        Random Snippets
      </h2>

      {/* Masonry Grid - Desktop (5 columns) */}
      <div className="hidden md:flex gap-3">
        {desktopColumns.map((column, colIndex) => (
          <div key={colIndex} className="flex-1 flex flex-col gap-3">
            {column.map((snippet) => (
              <SnippetCard key={snippet.id} snippet={snippet} />
            ))}
          </div>
        ))}
      </div>

      {/* Masonry Grid - Mobile (2 columns) */}
      <div className="flex md:hidden gap-3">
        {mobileColumns.map((column, colIndex) => (
          <div key={colIndex} className="flex-1 flex flex-col gap-3">
            {column.map((snippet) => (
              <SnippetCard key={snippet.id} snippet={snippet} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

