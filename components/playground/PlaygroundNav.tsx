"use client";

const PROJECTS = [
  { id: "resolved-card", label: "Resolved Card" },
  { id: "userpic-studio", label: "Userpic Studio" },
] as const;

export type ProjectId = (typeof PROJECTS)[number]["id"];

interface PlaygroundNavProps {
  activeProject: ProjectId;
  onSelect: (id: ProjectId) => void;
}

export default function PlaygroundNav({ activeProject, onSelect }: PlaygroundNavProps) {
  return (
    <nav
      className="absolute left-6 top-1/2 -translate-y-1/2 z-10 md:left-8 lg:left-10"
      aria-label="Playground projects"
    >
      <ul
        className="flex flex-col rounded-lg border border-white/[0.08] bg-black/40 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md"
        style={{ minWidth: "10rem" }}
      >
        {PROJECTS.map(({ id, label }) => {
          const isActive = activeProject === id;
          return (
            <li key={id}>
              <button
                onClick={() => onSelect(id)}
                className={`relative block w-full text-left text-sm transition-colors duration-150 py-2.5 pl-4 pr-5 ${
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-foreground/80 rounded-r"
                    aria-hidden
                  />
                )}
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { PROJECTS };
