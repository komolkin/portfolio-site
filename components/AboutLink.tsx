"use client";

import { usePathname, useRouter } from "next/navigation";
import WidgetChrome from "./widgets/WidgetChrome";

export default function AboutLink() {
  const pathname = usePathname();
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname && pathname !== "/") {
      router.replace("/", { scroll: false });
    }
    const aboutSection =
      document.getElementById("about") ?? document.getElementById("top");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <WidgetChrome>
      <button
        data-sfx="click"
        onClick={handleClick}
        className="hover:opacity-80 transition-opacity block px-4 py-2"
      >
        <div className="text-xs text-foreground leading-[1.4]">About</div>
      </button>
    </WidgetChrome>
  );
}
