"use client";

import { useState } from "react";
import type { PortfolioItem } from "@/lib/supabase";
import Image from "next/image";
import Link from "next/link";
import CursorTooltip from "@/components/CursorTooltip";

interface PortfolioSlideProps {
  item: PortfolioItem;
  index: number;
}

export default function PortfolioSlide({ item, index }: PortfolioSlideProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const hasMedia = item.media_url && item.media_url.trim() !== "";
  const hasLink = item.link && item.link.trim() !== "";
  const hasLinkText = item.link_text && item.link_text.trim() !== "";

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

      {/* Title, Description & Metadata - Bottom Left */}
      <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 lg:bottom-10 lg:left-10 lg:right-10 z-10">
        <div className="flex flex-col gap-4">
          {/* Title & Description */}
          <div className="flex flex-col gap-2">
            <h2
              className={`text-4xl md:text-[36px] font-normal ${
                item.text_invert ? "text-black" : "text-white"
              }`}
            >
              {item.title}
            </h2>
            <p
              className={`text-sm max-w-xl ${
                item.text_invert ? "text-black/70" : "text-white/70"
              }`}
            >
              {item.description}
            </p>
          </div>

          {/* Metadata Tags */}
          <div className="flex flex-wrap gap-2 text-xs">
            {item.year && (
              <span
                className={`px-3 py-1.5 rounded ${
                  item.text_invert
                    ? "bg-black/10 text-black/80"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {item.year}
              </span>
            )}
            {item.role && (
              <span
                className={`px-3 py-1.5 rounded ${
                  item.text_invert
                    ? "bg-black/10 text-black/80"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {item.role}
              </span>
            )}
            {item.scope && (
              <span
                className={`px-3 py-1.5 rounded ${
                  item.text_invert
                    ? "bg-black/10 text-black/80"
                    : "bg-white/10 text-white/80"
                }`}
              >
                {item.scope}
              </span>
            )}
          </div>
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
      <>
        <Link
          href={item.link!}
          target="_blank"
          rel="noopener noreferrer"
          id={index === 0 ? "works" : undefined}
          data-section="works"
          className={`${slideClassName} block cursor-pointer`}
          style={slideStyle}
          onMouseEnter={(e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
            setIsHovered(true);
          }}
          onMouseMove={(e) => {
            setMousePosition({ x: e.clientX, y: e.clientY });
          }}
          onMouseLeave={() => setIsHovered(false)}
        >
          {slideContent}
        </Link>
        {hasLinkText && (
          <CursorTooltip
            text={item.link_text}
            isActive={isHovered}
            position={mousePosition}
          />
        )}
      </>
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
