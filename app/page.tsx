import Slides from '@/components/slides/Slides';
import WidgetCanvas from '@/components/widgets/WidgetCanvas';
import Name from '@/components/Name';
import SocialLink from '@/components/SocialLink';

export default function Home() {
  return (
    <div className="h-screen overflow-hidden">
      <Slides />
      <WidgetCanvas />
      {/* Fixed header in top left */}
      <div className="fixed top-6 left-6 z-50 flex items-center gap-2 pointer-events-none">
        <div className="pointer-events-auto">
          <Name />
        </div>
        <div className="pointer-events-auto">
          <SocialLink text="IG" href="https://www.instagram.com/komolkin/" />
        </div>
        <div className="pointer-events-auto">
          <SocialLink text="X" href="https://x.com/dappdesigner" />
        </div>
      </div>
    </div>
  );
}

