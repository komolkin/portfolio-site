"use client";

interface TimelineItem {
  year: string;
  title: string;
  description: string;
}

const timelineData: TimelineItem[] = [
  {
    year: "2022",
    title: "Major Project",
    description: "Launched innovative NFT marketplace features",
  },
  {
    year: "2020",
    title: "Career Milestone",
    description: "Started focusing on digital product design",
  },
  {
    year: "2018",
    title: "Early Work",
    description: "Began creating beautiful digital experiences",
  },
  {
    year: "2016",
    title: "Beginning",
    description: "Started journey in design and technology",
  },
];

export default function Timeline() {
  return (
    <div className="p-4 w-[280px] h-[200px] overflow-y-auto timeline-scroll">
      <div className="space-y-4 pr-2">
        {timelineData.map((item, index) => (
          <div key={index} className="flex gap-3 relative">
            {/* Timeline line */}
            {index < timelineData.length - 1 && (
              <div className="absolute left-[1.5px] top-[20px] bottom-[-16px] w-[1px] bg-border" />
            )}
            {/* Timeline dot */}
            <div className="relative z-10 w-1 h-1 rounded-full bg-primary mt-1 flex-shrink-0" />
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="text-xs text-muted-foreground mb-1 leading-[1.4]">
                {item.year}
              </div>
              <div className="text-xs font-medium mb-1 leading-[1.4]">
                {item.title}
              </div>
              <div className="text-xs text-muted-foreground leading-[1.4]">
                {item.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
