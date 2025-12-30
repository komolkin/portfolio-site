"use client";

import { useState } from "react";
import type { PortfolioItem } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";

interface PortfolioSlideProps {
  item: PortfolioItem;
  index: number;
}

export default function PortfolioSlide({ item, index }: PortfolioSlideProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const hasMedia = item.media_url && item.media_url.trim() !== "";
  const hasLink = item.link && item.link.trim() !== "";

  const slideContent = (
    <>
      {/* Full-screen Media Background */}
      <div className="absolute inset-0">
        {hasMedia ? (
          item.media_type === "video" ? (
            <video
              src={item.media_url!}
              autoPlay
              loop
              muted
              playsInline
              onLoadedData={() => setMediaLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-700 ease-out ${
                mediaLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          ) : (
            <Image
              src={item.media_url!}
              alt={item.title}
              fill
              sizes="100vw"
              quality={100}
              priority={index === 0}
              onLoad={() => setMediaLoaded(true)}
              className={`object-cover transition-opacity duration-700 ease-out ${
                mediaLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          )
        ) : null}
      </div>

      {/* Title & Description - Bottom Left */}
      <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 lg:bottom-10 lg:left-10 lg:right-10 z-10">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
          {/* Title */}
          <h2
            className={`text-sm font-semibold ${
              item.text_invert ? "text-black" : "text-white"
            }`}
          >
            {item.title}
          </h2>

          {/* Description */}
          <p
            className={`text-sm ${
              item.text_invert ? "text-black/60" : "text-white/60"
            }`}
          >
            {item.description}
          </p>
        </div>
      </div>
    </>
  );

  const slideClassName = "slide w-full h-screen relative overflow-hidden";
  const slideStyle =
    !hasMedia && item.background_color
      ? { backgroundColor: item.background_color }
      : undefined;

  if (hasLink) {
    return (
      <Link
        href={item.link!}
        target="_blank"
        rel="noopener noreferrer"
        id={index === 0 ? "works" : undefined}
        data-section="works"
        className={`${slideClassName} block cursor-pointer`}
        style={slideStyle}
      >
        {slideContent}
      </Link>
    );
  }

  return (
    <div
      id={index === 0 ? "works" : undefined}
      data-section="works"
      className={slideClassName}
      style={slideStyle}
    >
      {slideContent}
    </div>
  );
}
