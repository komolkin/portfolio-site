import type { PortfolioItem } from "@/lib/supabase";
import Image from "next/image";

interface PortfolioSlideProps {
  item: PortfolioItem;
  index: number;
}

export default function PortfolioSlide({ item, index }: PortfolioSlideProps) {
  const hasMedia = item.media_url && item.media_url.trim() !== "";

  return (
    <div
      id={index === 0 ? "works" : undefined}
      data-section="works"
      className="slide w-full h-screen relative overflow-hidden"
      style={
        !hasMedia && item.background_color
          ? { backgroundColor: item.background_color }
          : undefined
      }
    >
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
              className="w-full h-full object-cover"
            />
          ) : (
            <Image
              src={item.media_url!}
              alt={item.title}
              fill
              sizes="100vw"
              quality={90}
              priority={index === 0}
              className="object-cover"
            />
          )
        ) : null}
      </div>

      {/* Title & Description - Bottom Left */}
      <div className="absolute bottom-6 left-6 right-6 md:bottom-8 md:left-8 md:right-8 lg:bottom-10 lg:left-10 lg:right-10 z-10">
        <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-4">
          {/* Title */}
          <h2 className="text-sm font-semibold text-white">{item.title}</h2>

          {/* Description */}
          <p className="text-sm text-white/60">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
