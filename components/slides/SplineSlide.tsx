"use client";

import Script from "next/script";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "spline-viewer": {
        url: string;
      };
    }
  }
}

export default function SplineSlide() {
  return (
    <div className="slide w-full h-screen relative">
      {/* <Script
        src="https://unpkg.com/@splinetool/viewer@1.10.99/build/spline-viewer.js"
        strategy="beforeInteractive"
        type="module"
      />
      <spline-viewer url="https://prod.spline.design/uOdzLGN1pWyXz7O3/scene.splinecode" /> */}
    </div>
  );
}
