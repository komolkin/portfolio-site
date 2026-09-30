import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import SelectionColor from "@/components/SelectionColor";
import { AgentationToolbar } from "@/components/AgentationToolbar";
import { Analytics } from "@vercel/analytics/next";
import { instrumentSans, instrumentSansCondensed } from "@/lib/fonts";
import { BG_MODE_KEY, DEFAULT_BG_MODE } from "@/lib/bgMode";

export const metadata: Metadata = {
  title: "Ilya Komolkin",
  description:
    "Generalist design engineer focused on building impactful products and brands",
};

/** Runs before paint so the correct bg mode is applied without a flash. */
const bgModeInitScript = `(function(){try{var m=localStorage.getItem(${JSON.stringify(BG_MODE_KEY)});document.documentElement.dataset.bg=(m==="gradient"||m==="flat")?m:${JSON.stringify(DEFAULT_BG_MODE)};}catch(e){document.documentElement.dataset.bg=${JSON.stringify(DEFAULT_BG_MODE)};}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      data-bg={DEFAULT_BG_MODE}
      suppressHydrationWarning
      className={`${instrumentSans.variable} ${instrumentSansCondensed.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bgModeInitScript }} />
      </head>
      <body className={`${instrumentSans.className} font-sans`}>
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
