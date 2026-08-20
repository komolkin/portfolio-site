"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PROJECTS, type ProjectId } from "@/components/playground/playground-route";

interface PlaygroundNavProps {
  activeProject: ProjectId;
}

const CLOSE_THRESHOLD = 72;

function ChevronIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-muted-foreground"
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
  const [drawerOffset, setDrawerOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileNavVisible, setMobileNavVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const dragStartY = useRef(0);
  const dragStartOffset = useRef(0);

  const activeLabel =
    PROJECTS.find((p) => p.id === activeProject)?.label ?? "Component";

  const closeDrawer = () => {
    setOpen(false);
    setDrawerOffset(0);
    setIsDragging(false);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeDrawer();
  }, [activeProject]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const playground = document.getElementById("playground");
    const scrollRoot = document.querySelector(".slides-scroll");
    if (!playground || !scrollRoot) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.45);
        setMobileNavVisible(visible);
        if (!visible) closeDrawer();
      },
      { root: scrollRoot, threshold: [0, 0.45, 0.7, 1] },
    );

    observer.observe(playground);
    return () => observer.disconnect();
  }, []);

  const handleDrawerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!open) return;
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartOffset.current = drawerOffset;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDrawerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = e.clientY - dragStartY.current;
    setDrawerOffset(Math.max(0, dragStartOffset.current + delta));
  };

  const handleDrawerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);

    if (drawerOffset > CLOSE_THRESHOLD) {
      closeDrawer();
      return;
    }

    setDrawerOffset(0);
  };

  const listClass = "flex flex-col rounded-lg bg-black/40 py-1 backdrop-blur-md";

  const mobileNav = (
    <div
      className="pointer-events-none fixed inset-0 z-[999] min-[1200px]:hidden"
      aria-hidden={!mobileNavVisible && !open}
    >
      {/* Trigger */}
      <div
        className={`absolute inset-x-0 bottom-0 flex justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2 transition-[opacity,transform] duration-200 ease-out ${
          mobileNavVisible && !open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-full opacity-0"
        }`}
      >
        <button
          type="button"
          data-sfx="click"
          onClick={() => {
            setDrawerOffset(0);
            setOpen(true);
          }}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="playground-project-drawer"
          tabIndex={mobileNavVisible && !open ? 0 : -1}
          className="inline-flex max-w-full items-center justify-between gap-3 rounded-lg bg-black/40 px-4 py-2.5 text-left text-sm text-foreground backdrop-blur-md transition-transform active:scale-[0.95]"
        >
          <span className="whitespace-nowrap font-medium">{activeLabel}</span>
          <ChevronIcon />
        </button>
      </div>

      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeDrawer}
        aria-hidden={!open}
      />

      {/* Drawer */}
      <div
        id="playground-project-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Select playground project"
        className={`absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex max-h-[min(72dvh,560px)] flex-col overflow-hidden rounded-[1.75rem] bg-black/55 backdrop-blur-xl ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          transform: open ? `translateY(${drawerOffset}px)` : "translateY(calc(100% + 1.5rem))",
          transition: isDragging ? "none" : "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
          <div
            className="flex shrink-0 touch-none flex-col items-center pb-2 pt-3"
            onPointerDown={handleDrawerPointerDown}
            onPointerMove={handleDrawerPointerMove}
            onPointerUp={handleDrawerPointerUp}
            onPointerCancel={handleDrawerPointerUp}
          >
            <div className="h-1 w-10 rounded-full bg-white/25" aria-hidden />
          </div>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          {PROJECTS.map(({ id, label }, i) => {
            const index1 = i + 1;
            const isActive = activeProject === id;
            return (
              <li key={id}>
                <Link
                  href={`/${index1}`}
                  scroll={false}
                  data-sfx="click"
                  data-sfx-hover="tick"
                  onClick={closeDrawer}
                  className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-[17px] transition-colors ${
                    isActive
                      ? "bg-white/10 font-semibold text-white"
                      : "font-normal text-white/80 active:bg-white/[0.06]"
                  }`}
                >
                  <span>{label}</span>
                  {isActive && (
                    <span className="size-1.5 shrink-0 rounded-full bg-white" aria-hidden />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <nav
        className="absolute left-6 top-1/2 z-10 hidden -translate-y-1/2 min-[1200px]:left-8 min-[1200px]:block lg:left-10"
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
                  data-sfx="click"
                  data-sfx-hover="tick"
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
