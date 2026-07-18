"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PROJECTS, type ProjectId } from "@/components/playground/playground-route";

interface PlaygroundNavProps {
  activeProject: ProjectId;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 ${
        open ? "rotate-180" : ""
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function PlaygroundNav({ activeProject }: PlaygroundNavProps) {
  const [open, setOpen] = useState(false);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  const activeLabel =
    PROJECTS.find((p) => p.id === activeProject)?.label ?? "Component";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [activeProject]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const playground = document.getElementById("playground");
    const scrollRoot = document.querySelector(".slides-scroll");
    if (!playground || !scrollRoot) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45);
        setMobileNavVisible(visible);
        if (!visible) setOpen(false);
      },
      { root: scrollRoot, threshold: [0, 0.45, 0.7, 1] },
    );

    observer.observe(playground);
    return () => observer.disconnect();
  }, []);

  const listClass =
    "flex flex-col rounded-lg border border-white/[0.08] bg-black/40 py-1 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md";

  const mobileNav = (
    <nav
      ref={containerRef}
      className={`fixed inset-x-0 bottom-0 z-[999] md:hidden transition-[opacity,transform] duration-200 ease-out ${
        mobileNavVisible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      }`}
      aria-label="Playground projects"
      aria-hidden={!mobileNavVisible}
    >
      <div className="flex justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2">
        <div className="relative w-fit max-w-[calc(100%-2rem)]">
          {open && (
            <ul
              id="playground-project-picker"
              className={`absolute bottom-full left-0 z-10 mb-2 min-w-full w-max ${listClass}`}
            >
              {PROJECTS.map(({ id, label }, i) => {
                const index1 = i + 1;
                const isActive = activeProject === id;
                return (
                  <li key={id}>
                    <Link
                      href={`/${index1}`}
                      scroll={false}
                      onClick={() => setOpen(false)}
                      className={`relative block w-full text-left text-sm transition-colors duration-150 py-1.5 pl-4 pr-5 ${
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
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="true"
            aria-controls={open ? "playground-project-picker" : undefined}
            tabIndex={mobileNavVisible ? 0 : -1}
            className="inline-flex max-w-full items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-black/40 px-4 py-2.5 text-left text-sm text-foreground shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-colors"
          >
            <span className="whitespace-nowrap font-medium">{activeLabel}</span>
            <ChevronIcon open={open} />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <nav
        className="absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 md:left-8 md:block lg:left-10"
        aria-label="Playground projects"
      >
        <ul className={listClass} style={{ minWidth: "10rem" }}>
          {PROJECTS.map(({ id, label }, i) => {
            const index1 = i + 1;
            const isActive = activeProject === id;
            return (
              <li key={id}>
                <Link
                  href={`/${index1}`}
                  scroll={false}
                  className={`relative block w-full text-left text-sm transition-colors duration-150 py-1.5 pl-4 pr-5 ${
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

      {mounted ? createPortal(mobileNav, document.body) : null}
    </>
  );
}
