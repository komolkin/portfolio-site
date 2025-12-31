import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import CursorCanvas from "@/components/CursorCanvas";
import SelectionColor from "@/components/SelectionColor";

export const metadata: Metadata = {
  title: "Ilya — Portfolio",
  description: "Personal site with 3D and widgets",
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
          <CursorCanvas />
          <SelectionColor />
        </Providers>
      </body>
    </html>
  );
}
