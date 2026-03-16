"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

const tabs = [
  { id: "top", label: "Ilya Komolkin" },
  { id: "about", label: "About" },
];

export default function HeaderNav() {
  const [activeTab, setActiveTab] = useState("top");
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const navRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateIndicator = (tabId: string) => {
    const tabEl = tabRefs.current.get(tabId);
    const navEl = navRef.current;
    if (tabEl && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const tabRect = tabEl.getBoundingClientRect();
      setIndicatorStyle({
        left: tabRect.left - navRect.left,
        width: tabRect.width,
      });
    }
  };

  useEffect(() => {
    updateIndicator(activeTab);
  }, [activeTab]);

  // Update indicator on resize
  useEffect(() => {
    const handleResize = () => updateIndicator(activeTab);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeTab]);

  // Detect which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Skip observer updates during programmatic scrolling
        if (isScrollingRef.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Check for data-section attribute first
            const section = entry.target.getAttribute("data-section");
            if (section && tabs.some((tab) => tab.id === section)) {
              setActiveTab(section);
              return;
            }
            // Fallback to id-based detection
            const id = entry.target.id;
            if (tabs.some((tab) => tab.id === id)) {
              setActiveTab(id);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe elements by ID
    tabs.forEach((tab) => {
      const element = document.getElementById(tab.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    // Set scrolling flag to prevent observer from updating during scroll
    isScrollingRef.current = true;
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    setActiveTab(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }

    // Re-enable observer after scroll animation completes
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 800);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <motion.nav
      ref={navRef}
      className="relative flex items-center"
      animate={{
        x: activeTab !== "top" ? -8 : 0,
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 25,
      }}
    >
      {/* Sliding background indicator */}
      <motion.div
        className="absolute h-full bg-foreground/10 backdrop-blur-md rounded"
        initial={false}
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      />

      {/* Tab buttons */}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.id, el);
          }}
          onClick={() => scrollTo(tab.id)}
          className={`relative z-10 px-2.5 py-1 text-sm transition-colors ${
            activeTab === tab.id
              ? "text-foreground"
              : "text-white/60 hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </motion.nav>
  );
}
