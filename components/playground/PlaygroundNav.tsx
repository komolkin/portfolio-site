"use client";

import Link from "next/link";
import { PROJECTS, type ProjectId } from "@/components/playground/playground-route";

interface PlaygroundNavProps {
  activeProject: ProjectId;
}

export default function PlaygroundNav({ activeProject }: PlaygroundNavProps) {
  return (
    <nav
      className="absolute left-6 top-1/2 -translate-y-1/2 z-10 md:left-8 lg:left-10"
      aria-label="Playground projects"
    >
      <ul
        className="flex flex-col rounded-lg border border-white/[0.08] bg-black/40 py-2 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md"
        style={{ minWidth: "10rem" }}
      >
        {PROJECTS.map(({ id, label }, i) => {
          const index1 = i + 1;
          const isActive = activeProject === id;
          return (
            <li key={id}>
              <Link
                href={`/${index1}`}
                scroll={false}
                className={`relative block w-full text-left text-sm transition-colors duration-150 py-2.5 pl-4 pr-5 ${
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
