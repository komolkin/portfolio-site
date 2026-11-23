import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Worm 2",
  description: "Worm main feed prototype",
  applicationName: "Worm",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Worm",
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

export default function WormApp2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="worm-app-frame fixed inset-0 overflow-hidden bg-black text-white antialiased">
      {children}
    </div>
  );
}
