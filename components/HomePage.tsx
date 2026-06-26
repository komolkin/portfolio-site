import Slides from "@/components/slides/Slides";
import HeaderNav from "@/components/HeaderNav";

export default function HomePage() {
  return (
    <div className="h-[100dvh] overflow-hidden">
      <Slides />
      {/* Fixed header in top left */}
      <div className="fixed top-6 left-6 md:top-8 md:left-8 lg:top-10 lg:left-10 z-50 pointer-events-auto">
        <HeaderNav />
      </div>
    </div>
  );
}
