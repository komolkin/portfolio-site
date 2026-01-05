"use client";

import Image from "next/image";
import AboutTimeAndMusic from "@/components/AboutTimeAndMusic";
import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function AboutSlide() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "30min" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <div
      id="about"
      data-section="about"
      className="slide w-full min-h-screen flex flex-col lg:flex-row relative"
    >
      {/* Text Column - 2/3 width on desktop */}
      <div className="w-full lg:w-2/3 px-6 md:px-8 lg:px-10 pt-20 lg:pt-24">
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl">
          Ilya approaches aesthetics not just as a visual discipline but as an
          ethical category — a way design shapes contemporary culture,
          influences behavior, and defines how ideas are understood. His work is
          rooted in constant research and experimentation, searching for
          innovative ways to craft visual language and communication.
        </p>
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Previously he was a Senior Product Designer at Yandex Media Labs.
        </p>
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Currently he is the co-founder and Head of Design at Rarible.
        </p>
        {/* <AboutTimeAndMusic /> */}
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Fields of interest.
        </p>
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Tech Stack.
        </p>
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Currently not open for new work, but if you have any exciting and
          challenging projects —{" "}
          <button
            data-cal-namespace="30min"
            data-cal-link="komolkin/30min"
            data-cal-config='{"layout":"month_view"}'
            className="underline underline-offset-4 hover:text-muted-foreground transition-colors"
          >
            let's talk
          </button>
          .
        </p>
        {/* Copyright */}
        <div className="mt-auto pt-20 pb-6 md:pb-8 lg:pb-10">
          <span className="text-sm text-muted-foreground">© 2026</span>
        </div>
      </div>

      {/* Photo Column - 1/3 width on desktop, sticky */}
      <div className="hidden lg:block w-1/3 pr-6 md:pr-8 lg:pr-10">
        <div className="sticky top-0 h-screen w-full flex items-center py-20">
          <div className="relative w-full h-[calc(100%-80px)] rounded-[10px] overflow-hidden">
            <Image
              src="https://ik.imagekit.io/mm8hrnl43/Portfolio/Selfie.png"
              alt="Ilya Komolkin"
              fill
              className="object-cover grayscale"
              priority
            />
          </div>
        </div>
      </div>

      {/* Mobile photo - shown at top on smaller screens */}
      <div
        className="lg:hidden w-full h-[50vh] relative order-first mx-6 mt-20 rounded-[10px] overflow-hidden"
        style={{ width: "calc(100% - 48px)" }}
      >
        <Image
          src="https://ik.imagekit.io/mm8hrnl43/Portfolio/Selfie.png"
          alt="Ilya Komolkin"
          fill
          className="object-cover grayscale"
          priority
        />
      </div>
    </div>
  );
}
