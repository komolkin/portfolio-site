import Slides from "@/components/slides/Slides";
import BookingButton from "@/components/BookingButton";
import HeaderNav from "@/components/HeaderNav";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden">
      <Slides />
      {/* Fixed header in top left */}
      <div className="fixed top-6 left-6 z-50 pointer-events-auto">
        <HeaderNav />
      </div>

      {/* Fixed button in top right */}
      <div className="fixed top-6 right-6 z-50 pointer-events-auto">
        <BookingButton />
      </div>
    </div>
  );
}
