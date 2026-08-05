"use client";

import { useEffect, useRef } from "react";
import TopSlide from "./TopSlide";
import PlaygroundSlide from "./PlaygroundSlide";

const MOBILE_QUERY = "(max-width: 767px)";
const SWIPE_DISTANCE = 36;
const SWIPE_VELOCITY = 0.25;

function shouldIgnoreSwipe(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "canvas, button, a, input, textarea, select, label, [data-pager-ignore]"
    )
  );
}

export default function Slides() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const media = window.matchMedia(MOBILE_QUERY);
    const slides = () =>
      Array.from(container.querySelectorAll<HTMLElement>(".slide"));

    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;
    let touchIgnored = false;
    let isPaging = false;

    const getCurrentIndex = () => {
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      slides().forEach((slide, index) => {
        const distance = Math.abs(slide.offsetTop - container.scrollTop);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      });

      return closestIndex;
    };

    const goToSlide = (index: number) => {
      const target = slides()[index];
      if (!target || isPaging) return;

      isPaging = true;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        isPaging = false;
      }, 450);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!media.matches || event.touches.length !== 1) return;

      touchIgnored = shouldIgnoreSwipe(event.target);
      if (touchIgnored) return;

      touchStartY = event.touches[0].clientY;
      touchStartX = event.touches[0].clientX;
      touchStartTime = Date.now();
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (!media.matches || isPaging || touchIgnored) return;

      const touch = event.changedTouches[0];
      const deltaY = touchStartY - touch.clientY;
      const deltaX = touchStartX - touch.clientX;
      const elapsed = Math.max(Date.now() - touchStartTime, 1);
      const velocity = Math.abs(deltaY) / elapsed;

      if (Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return;
      if (Math.abs(deltaY) < SWIPE_DISTANCE && velocity < SWIPE_VELOCITY) return;

      const currentIndex = getCurrentIndex();
      if (deltaY > 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className="slides-scroll h-full">
      <PlaygroundSlide />
      <TopSlide />
    </div>
  );
}
