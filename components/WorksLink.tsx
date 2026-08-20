"use client";

import WidgetChrome from "./widgets/WidgetChrome";

export default function WorksLink() {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const worksSection = document.getElementById("works");
    if (worksSection) {
      worksSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <WidgetChrome>
      <button
        data-sfx="click"
        onClick={handleClick}
        className="hover:opacity-80 transition-opacity block px-4 py-2"
      >
        <div className="text-xs text-foreground leading-[1.4]">
          Works
        </div>
      </button>
    </WidgetChrome>
  );
}

