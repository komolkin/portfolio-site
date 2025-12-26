"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import Draggable from "../widgets/Draggable";
import PricingWidget from "../widgets/PricingWidget";
import SpotifyWidget from "../widgets/SpotifyWidget";
import HeartRate from "../widgets/HeartRate";
import SpotsLeft from "../widgets/SpotsLeft";
import WorldTime from "../widgets/WorldTime";
import About from "../widgets/About";
import Timeline from "../widgets/Timeline";
import FAQWidget from "../widgets/FAQWidget";
import { getWidgetPositions, saveWidgetPosition } from "@/lib/persist";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "spline-viewer": {
        url: string;
      };
    }
  }
}

export type WidgetType =
  | "spotify"
  | "heartrate"
  | "worldtime"
  | "about"
  | "timeline"
  | "pricing"
  | "spots-left"
  | "faq";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
}

const WIDGETS: WidgetConfig[] = [
  { id: "spotify-1", type: "spotify", x: 100, y: 100 },
  { id: "heartrate-1", type: "heartrate", x: 100, y: 250 },
  { id: "spots-left-1", type: "spots-left", x: 100, y: 320 },
  { id: "worldtime-1", type: "worldtime", x: 100, y: 400 },
  { id: "about-1", type: "about", x: 100, y: 550 },
  { id: "timeline-1", type: "timeline", x: 100, y: 750 },
  { id: "pricing-1", type: "pricing", x: 450, y: 100 },
  { id: "faq-1", type: "faq", x: 450, y: 400 },
];

export default function SplineSlide() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(WIDGETS);
  const [containerBounds, setContainerBounds] = useState({
    width: 0,
    height: 0,
  });
  const [isVisible, setIsVisible] = useState(false);
  const [widgetZIndexes, setWidgetZIndexes] = useState<Record<string, number>>(
    {}
  );
  const zIndexCounterRef = useRef(100);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load saved positions and merge with widget configs
    const saved = getWidgetPositions();
    if (saved.length > 0) {
      setWidgets((prev) =>
        prev.map((widget) => {
          const savedPos = saved.find((s) => s.id === widget.id);
          return savedPos
            ? { ...widget, x: savedPos.x, y: savedPos.y }
            : widget;
        })
      );
    }

    // Get container bounds - use full viewport
    const updateBounds = () => {
      setContainerBounds({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Initial bounds calculation with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateBounds, 100);
    window.addEventListener("resize", updateBounds);

    // Show widgets after 2 seconds with fade effect
    const visibilityTimeout = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(visibilityTimeout);
      window.removeEventListener("resize", updateBounds);
    };
  }, []);

  const handleWidgetFocus = (id: string) => {
    zIndexCounterRef.current += 1;
    setWidgetZIndexes((prev) => ({
      ...prev,
      [id]: zIndexCounterRef.current,
    }));
  };

  const handleDragCancel = (id: string) => {
    // Keep the z-index even on cancel
  };

  const handleDragEnd = (id: string, x: number, y: number) => {
    // Keep the z-index - don't reset it
    setWidgets((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, x, y } : w));
      saveWidgetPosition(id, x, y);
      return updated;
    });
  };

  const renderWidget = (widget: WidgetConfig) => {
    switch (widget.type) {
      case "spotify":
        return <SpotifyWidget />;
      case "heartrate":
        return <HeartRate />;
      case "spots-left":
        return <SpotsLeft />;
      case "worldtime":
        return <WorldTime />;
      case "about":
        return <About />;
      case "timeline":
        return <Timeline />;
      case "pricing":
        return <PricingWidget />;
      case "faq":
        return <FAQWidget />;
      default:
        return null;
    }
  };

  return (
    <div id="top" className="slide w-full h-screen relative">
      {/* <Script
        src="https://unpkg.com/@splinetool/viewer@1.10.99/build/spline-viewer.js"
        strategy="beforeInteractive"
        type="module"
      />
      <spline-viewer url="https://prod.spline.design/uOdzLGN1pWyXz7O3/scene.splinecode" /> */}

      {/* Widget Canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none z-50"
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="transition-opacity duration-500"
            style={{
              opacity: isVisible ? 1 : 0,
            }}
          >
            <Draggable
              id={widget.id}
              initialX={widget.x}
              initialY={widget.y}
              bounds={containerBounds}
              zIndex={widgetZIndexes[widget.id] || 50}
              onWidgetFocus={handleWidgetFocus}
              onDragCancel={handleDragCancel}
              onDragEnd={handleDragEnd}
            >
              {renderWidget(widget)}
            </Draggable>
          </div>
        ))}
      </div>
    </div>
  );
}
