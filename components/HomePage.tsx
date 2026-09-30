import Slides from "@/components/slides/Slides";
import HeaderNav from "@/components/HeaderNav";
import BgModeToggle from "@/components/BgModeToggle";

export default function HomePage() {
  return (
    <div className="h-[100dvh] overflow-hidden">
      <Slides />
      {/* Fixed header in top left */}
      <div className="fixed top-6 left-6 z-50 pointer-events-auto md:top-8 md:left-8 lg:top-10 lg:left-10">
        <HeaderNav />
      </div>
      {/* Background mode in top right */}
      <div className="fixed top-6 right-6 z-50 pointer-events-auto md:top-8 md:right-8 lg:top-10 lg:right-10">
        <BgModeToggle />
      </div>
    </div>
  );
}
