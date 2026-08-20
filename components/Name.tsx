"use client";

import WidgetChrome from './widgets/WidgetChrome';

export default function Name() {
  const handleClick = () => {
    const topSection = document.getElementById("top");
    if (topSection) {
      topSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <WidgetChrome>
      <button
        data-sfx="click"
        onClick={handleClick}
        className="hover:opacity-80 transition-opacity block px-4 py-2"
      >
        <div className="text-xs text-foreground leading-[1.4] uppercase">
          About
        </div>
      </button>
    </WidgetChrome>
  );
}
