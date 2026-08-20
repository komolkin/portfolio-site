"use client";

import { useState, useEffect, useCallback } from "react";

export default function SlideDotsIndicator() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalSlides, setTotalSlides] = useState(0);

  const updateActiveSlide = useCallback(() => {
    const slidesContainer = document.querySelector(".slides-scroll");
    if (!slidesContainer) return;

    const workSlides = document.querySelectorAll('[data-section="works"]');
    if (workSlides.length === 0) return;

    const containerRect = slidesContainer.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    workSlides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect();
      const slideCenter = slideRect.top + slideRect.height / 2;
      const distance = Math.abs(slideCenter - containerCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  }, []);

  useEffect(() => {
    const slidesContainer = document.querySelector(".slides-scroll");
    if (!slidesContainer) return;

    // Count work slides
    const workSlides = document.querySelectorAll('[data-section="works"]');
    setTotalSlides(workSlides.length);

    const handleScroll = () => {
      // Find the first work slide
      const firstWorkSlide = document.querySelector('[data-section="works"]');
      const aboutSlide = document.querySelector('[data-section="about"]');

      if (!firstWorkSlide) {
        setIsVisible(false);
        return;
      }

      const containerRect = slidesContainer.getBoundingClientRect();
      const firstWorkRect = firstWorkSlide.getBoundingClientRect();

      // Check if we're past the top slide (first work slide is visible or above viewport)
      const isInWorksSection = firstWorkRect.top <= containerRect.height * 0.5;

      // Check if we've scrolled past all work slides to about
      let isPastWorks = false;
      if (aboutSlide) {
        const aboutRect = aboutSlide.getBoundingClientRect();
        isPastWorks = aboutRect.top <= containerRect.height * 0.5;
      }

      setIsVisible(isInWorksSection && !isPastWorks);

      // Update active slide
      if (isInWorksSection && !isPastWorks) {
        updateActiveSlide();
      }
    };

    slidesContainer.addEventListener("scroll", handleScroll);
    // Initial check
    handleScroll();

    return () => slidesContainer.removeEventListener("scroll", handleScroll);
  }, [updateActiveSlide]);

  const handleDotClick = (index: number) => {
    const workSlides = document.querySelectorAll('[data-section="works"]');
    if (workSlides[index]) {
      workSlides[index].scrollIntoView({ behavior: "smooth" });
    }
  };

  if (totalSlides === 0) return null;

  return (
    <div
      className={`fixed right-6 top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center gap-3 pointer-events-auto
                  md:right-8 lg:right-10
                  transition-all duration-500 ease-out
                  ${isVisible 
                    ? "opacity-100 translate-x-0" 
                    : "opacity-0 translate-x-8 pointer-events-none"}`}
    >
      {Array.from({ length: totalSlides }).map((_, index) => (
        <button
          key={index}
          data-sfx="tick"
          data-sfx-hover="tick"
          onClick={() => handleDotClick(index)}
          aria-label={`Go to slide ${index + 1}`}
          className="w-2 h-2 flex items-center justify-center cursor-pointer"
          style={{
            transitionDelay: isVisible ? `${index * 50}ms` : "0ms",
          }}
        >
          <span
            className={`rounded-full transition-all duration-300 ease-out
                        ${activeIndex === index 
                          ? "w-2 h-2 bg-white" 
                          : "w-1 h-1 bg-white/40 hover:bg-white/70"}`}
          />
        </button>
      ))}
    </div>
  );
}

