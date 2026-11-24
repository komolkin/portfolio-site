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
        url: "/worm-app-3/favicon-32.png?v=4",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/worm-app-3/icon-192.png?v=4",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/worm-app-3/icon-512.png?v=4",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [{ url: "/worm-app-3/apple-touch-icon.png?v=4", sizes: "180x180" }],
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

export default function WormApp3Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`worm-app-frame fixed inset-0 overflow-hidden text-black antialiased ${allo.className}`}
      style={{ backgroundColor: "#E8E8E8" }}
    >
      {children}
    </div>
  );
}
