import type { Metadata } from "next";
import { WormWaitlist } from "@/components/worm-landing/WormWaitlist";

export const metadata: Metadata = {
  title: "Worm — Waitlist",
  description:
    "Invite-only social prediction app. Trade curated markets, mostly sports. Find traders on the leaderboard, follow them or copy their trades, and leave a take.",
};

export default function WormWaitlistPage() {
  return <WormWaitlist />;
}
