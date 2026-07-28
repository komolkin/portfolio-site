import type { ContributionCalendarWeek, ContributionLevel } from "@/lib/github";

interface ContributionGraphProps {
  weeks: ContributionCalendarWeek[];
  className?: string;
}

export const CONTRIBUTION_CELL_SIZE = 5;
export const CONTRIBUTION_GAP = 2;
export const CONTRIBUTION_ROWS = 7;

export function getContributionGraphSize(weekCount: number) {
  return {
    width: weekCount * CONTRIBUTION_CELL_SIZE + Math.max(0, weekCount - 1) * CONTRIBUTION_GAP,
    height:
      CONTRIBUTION_ROWS * CONTRIBUTION_CELL_SIZE +
      (CONTRIBUTION_ROWS - 1) * CONTRIBUTION_GAP,
  };
}

const LEVEL_COLORS: Record<ContributionLevel, string> = {
  NONE: "rgba(255, 255, 255, 0.08)",
  FIRST_QUARTILE: "rgba(255, 255, 255, 0.3)",
  SECOND_QUARTILE: "rgba(255, 255, 255, 0.5)",
  THIRD_QUARTILE: "rgba(255, 255, 255, 0.75)",
  FOURTH_QUARTILE: "rgba(255, 255, 255, 1)",
};

export default function ContributionGraph({ weeks, className = "" }: ContributionGraphProps) {
  return (
    <div
      className={`inline-grid w-max ${className}`}
      style={{
        gap: `${CONTRIBUTION_GAP}px`,
        gridTemplateRows: `repeat(${CONTRIBUTION_ROWS}, ${CONTRIBUTION_CELL_SIZE}px)`,
        gridAutoFlow: "column",
        gridAutoColumns: `${CONTRIBUTION_CELL_SIZE}px`,
      }}
      role="img"
      aria-label="GitHub contribution activity"
    >
      {weeks.map((week, weekIndex) =>
        week.contributionDays.map((day) => (
          <div
            key={`${weekIndex}-${day.date}`}
            className="rounded-full"
            style={{ backgroundColor: LEVEL_COLORS[day.contributionLevel] }}
            title={`${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"} on ${day.date}`}
          />
        ))
      )}
    </div>
  );
}
