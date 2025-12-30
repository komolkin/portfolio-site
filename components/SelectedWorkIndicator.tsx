"use client";

import { useState, useEffect } from "react";

export default function SelectedWorkIndicator() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const slidesContainer = document.querySelector(".slides-scroll");
    if (!slidesContainer) return;

    const handleScroll = () => {
      // Show only when at the top (scrolled less than 100px)
      setIsVisible(slidesContainer.scrollTop <= 100);
    };

    slidesContainer.addEventListener("scroll", handleScroll);
    return () => slidesContainer.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    const worksSection = document.getElementById("works");
    if (worksSection) {
      worksSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-6 left-6 md:bottom-8 md:left-8 lg:bottom-10 lg:left-10 z-50 
                 flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground 
                 transition-all duration-500 ease-out group cursor-pointer
                 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
    >
      <span>Selected Work</span>
      <span className="inline-block transition-transform duration-300 group-hover:translate-y-0.5">↓</span>
    </button>
  );
}

