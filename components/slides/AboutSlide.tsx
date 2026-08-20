"use client";

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
      className="slide w-full min-h-screen flex flex-col relative"
    >
      <div className="w-full px-6 md:px-8 lg:px-10 pt-20 lg:pt-24">
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl">
          Ilya approaches aesthetics not just as a visual discipline but as an
          ethical category — a way design shapes contemporary culture,
          influences behavior, and defines how ideas are understood. His work is
          rooted in constant research and experimentation, searching for
          innovative ways to craft visual language and user behavior.
        </p>
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Previously he was a Senior Product Designer at Yandex Media Labs,
          helped multiple projects to move from zero to one and beyond.
        </p>
        {/* <AboutTimeAndMusic /> */}
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Currently he is not open for new work, but if you have any exciting
          and challenging projects —{" "}
          <button
            data-sfx="press"
            data-cal-namespace="30min"
            data-cal-link="komolkin/30min"
            data-cal-config='{"layout":"month_view"}'
            className="underline underline-offset-4 hover:text-muted-foreground transition-colors"
          >
            let&apos;s talk
          </button>
          .
        </p>
        <p className="text-4xl md:text-[36px] font-normal text-foreground leading-[1.2] max-w-4xl pt-6">
          Worked with: Mattel, Lamborghini, VeeFriends, Ubisoft, Diesel, Paris
          Saint-German, Ledger, Cryptoys.
        </p>
        {/* Copyright */}
        <div className="mt-auto pt-20 pb-6 md:pb-8 lg:pb-10">
          <span className="text-sm text-muted-foreground">© 2026</span>
        </div>
      </div>
    </div>
  );
}
