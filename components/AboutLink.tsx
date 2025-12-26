"use client";

import WidgetChrome from "./widgets/WidgetChrome";

export default function AboutLink() {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const aboutSection = document.getElementById("about");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <WidgetChrome>
      <button
        onClick={handleClick}
        className="hover:opacity-80 transition-opacity block px-4 py-2"
      >
        <div className="text-xs text-foreground leading-[1.4]">
          About
        </div>
      </button>
    </WidgetChrome>
  );
}

