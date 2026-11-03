import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Worm",
  description:
    "Invite-only social prediction app. Trade curated markets, mostly sports. Find traders on the leaderboard, follow them or copy their trades, and leave a take.",
  applicationName: "Worm",
  manifest: "/worm-app/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Worm",
  },
  icons: {
    icon: [
      {
        url: "/worm-app/favicon-32.png?v=2",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/worm-app/icon-192.png?v=2",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/worm-app/icon-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [{ url: "/worm-app/apple-touch-icon.png?v=2", sizes: "180x180" }],
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
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function WormAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] bg-black text-white antialiased">
      {children}
    </div>
  );
}
