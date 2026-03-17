"use client";

import { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export default function BookingButton() {
  useEffect(() => {
    (async function () {
      const cal = await getCalApi({ namespace: "30min" });
      cal("ui", { hideEventTypeDetails: false, layout: "month_view" });
    })();
  }, []);

  return (
    <button
      data-cal-namespace="30min"
      data-cal-link="komolkin/30min"
      data-cal-config='{"layout":"month_view"}'
      className="text-sm text-foreground hover:text-muted-foreground transition-colors"
    >
      Book a Call
    </button>
  );
}
