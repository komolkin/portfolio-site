import type { Metadata, Viewport } from "next";
import { allo } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Worm 3",
  description: "Worm prediction feed prototype",
  applicationName: "Worm",
  manifest: "/worm-app-3/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Worm",
  },
  icons: {
    icon: [
      {
        url: "/worm-app-3/w-favicon-32.png?v=6",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/worm-app-3/w-icon-192.png?v=6",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/worm-app-3/w-icon-512.png?v=6",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      { url: "/worm-app-3/w-apple-touch-icon.png?v=6", sizes: "180x180" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#E8E8E8",
  colorScheme: "light",
};

const STAGE = "#121214";
const APP_BG = "#E8E8E8";

export default function WormApp3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`worm-app-frame fixed inset-0 flex items-center justify-center overflow-hidden text-black antialiased ${allo.variable} ${allo.className}`}
      style={{ backgroundColor: STAGE }}
    >
      <div
        className="relative h-full w-full overflow-x-clip overflow-y-hidden md:aspect-[393/852] md:h-[min(852px,calc(100svh-56px))] md:w-auto md:max-w-[min(393px,calc(100vw-56px))] md:rounded-[44px] md:shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:ring-1 md:ring-white/10 md:[--worm-app-height:100%]"
        style={{ backgroundColor: APP_BG }}
      >
        {children}
      </div>
    </div>
  );
}
