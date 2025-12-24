"use client";

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";
import WidgetChrome from "./widgets/WidgetChrome";

export default function BookingButton() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "30min" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <WidgetChrome>
      <button
        data-cal-namespace="30min"
        data-cal-link="komolkin/30min"
        data-cal-config='{"layout":"month_view"}'
        className="hover:opacity-80 transition-opacity block px-4 py-2 text-left"
      >
        <div className="text-xs text-white leading-[1.4]">
          Book an Intro
        </div>
      </button>
    </WidgetChrome>
  );
}











