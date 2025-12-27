import type { PortfolioItem } from "@/lib/supabase";

interface PortfolioSlideProps {
  item: PortfolioItem;
  index: number;
}

export default function PortfolioSlide({ item, index }: PortfolioSlideProps) {
  const hasMedia = item.media_url && item.media_url.trim() !== "";

  return (
    <div
      id={index === 0 ? "works" : undefined}
      className="slide w-full h-screen relative overflow-hidden"
      style={!hasMedia && item.background_color ? { backgroundColor: item.background_color } : undefined}
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
            <img
              src={item.media_url!}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          )
        ) : null}

        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
      </div>

      {/* Metadata - Bottom Left */}
      <div className="absolute bottom-6 left-6 md:bottom-8 md:left-8 lg:bottom-10 lg:left-10 max-w-md space-y-4 z-10">
        {/* Title */}
        <h2 className="text-xs font-medium tracking-tight text-white leading-[1.4]">
          {item.title}
        </h2>

        {/* Description */}
        <p className="text-xs text-white/70 leading-[1.4]">
          {item.description}
        </p>

        {/* Metadata Grid */}
        <div className="space-y-2">
          <MetadataRow label="Year" value={item.year} />
          <MetadataRow label="Role" value={item.role} />
          <MetadataRow label="Scope" value={item.scope} />
          {item.link && <MetadataRow label="Link" value={item.link} isLink />}
        </div>
      </div>
    </div>
  );
}

interface MetadataRowProps {
  label: string;
  value: string;
  isLink?: boolean;
}

function MetadataRow({ label, value, isLink = false }: MetadataRowProps) {
  return (
    <div className="flex items-baseline gap-4">
      <span className="text-xs text-white/50 w-14 flex-shrink-0 leading-[1.4]">
        {label}
      </span>
      {isLink ? (
        <a
          href={value.startsWith("http") ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white hover:text-white/70 transition-colors duration-200 flex items-center gap-1.5 group leading-[1.4]"
        >
          <span>{value.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          <svg
            className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 17L17 7M17 7H7M17 7v10"
            />
          </svg>
        </a>
      ) : (
        <span className="text-xs text-white leading-[1.4]">{value}</span>
      )}
    </div>
  );
}
