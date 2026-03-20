import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import SelectionColor from "@/components/SelectionColor";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "Ilya Komolkin",
  description:
    "Paris-based generalist designer focused on building impactful products and brands",
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
        <Analytics />
      </body>
    </html>
  );
}
