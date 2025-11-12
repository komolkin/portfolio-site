import type { Metadata } from 'next';
import './globals.css';
import { HeartRateProvider } from '@/lib/heartRateContext';

export const metadata: Metadata = {
  title: 'Ilya — Portfolio',
  description: 'Personal site with 3D and widgets',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HeartRateProvider>{children}</HeartRateProvider>
      </body>
    </html>
  );
}

