import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import SelectionColor from "@/components/SelectionColor";
import { AgentationToolbar } from "@/components/AgentationToolbar";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Ilya Komolkin",
  description:
    "Generalist design engineer focused on building impactful products and brands",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <SelectionColor />
        </Providers>
        <AgentationToolbar />
        <Analytics />
      </body>
    </html>
  );
}
