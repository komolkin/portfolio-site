"use client";

import { useState } from "react";
import NumberFlow from "@number-flow/react";
import { motion } from "framer-motion";

type Plan = "week" | "month" | "quarter";

const PLANS = {
  week: { price: 1500, label: "Week" },
  month: { price: 5000, label: "Month" },
  quarter: { price: 13000, label: "Quarter" },
};

const FEATURES = [
  {
    text: "Unlimited requests",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="-2 -2 28 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-foreground"
      >
        <path
          d="M12 12c-2-2.67-5-4-8-4a4 4 0 1 0 0 8c3 0 6-1.33 8-4Zm0 0c2 2.67 5 4 8 4a4 4 0 1 0 0-8c-3 0-6 1.33-8 4Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ), // Infinity
  },
  {
    text: "Daily updates",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-foreground"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ), // Calendar
  },
  {
    text: "No contracts",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-foreground"
      >
        <path
          d="M18 6L6 18M6 6l12 12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ), // X or unlock symbol
  },
  {
    text: "Pause or cancel anytime",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-foreground"
      >
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
      </svg>
    ), // Pause button
  },
];

export default function PricingWidget() {
  const [activePlan, setActivePlan] = useState<Plan>("month");

  return (
    <div className="p-4 w-[280px]">
      <div className="flex border-b border-white/10 mb-3 relative">
        {(Object.keys(PLANS) as Plan[]).map((plan) => (
          <button
            key={plan}
            onClick={() => setActivePlan(plan)}
            onPointerDown={(e) => e.stopPropagation()}
            className={`
              flex-1 pb-3 text-xs font-medium transition-colors duration-200 relative
              ${
                activePlan === plan
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
          >
            {PLANS[plan].label}
            {activePlan === plan && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-[-1px] left-0 right-0 h-[1px] bg-foreground"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="mb-2">
        <div className="flex items-baseline gap-1 text-foreground font-mono">
          <span className="text-xl">€</span>
          <NumberFlow
            value={PLANS[activePlan].price}
            className="text-2xl"
            format={{ useGrouping: true }}
          />
          <span className="text-muted-foreground text-xs font-sans">
            /{activePlan}
          </span>
        </div>
      </div>

      <ul className="space-y-2 mb-4">
        {FEATURES.map((feature, i) => (
          <li
            key={i}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            {feature.icon}
            {feature.text}
          </li>
        ))}
      </ul>

      <a
        href={`#${activePlan}`}
        className="block w-full py-2 px-4 bg-foreground text-background text-center text-xs font-medium rounded-sm hover:bg-foreground/90 transition-colors"
        onPointerDown={(e) => e.stopPropagation()}
      >
        Subscribe
      </a>

      <p className="mt-2 text-center text-[9px] text-muted-foreground">
        Secure checkout powered by Stripe
      </p>
    </div>
  );
}
