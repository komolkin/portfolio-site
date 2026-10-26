import type { Metadata } from "next";
import { WormLanding } from "@/components/worm-landing/WormLanding";

export const metadata: Metadata = {
  title: "Worm",
  description:
    "Invite-only social prediction app. Trade curated markets, mostly sports. Find traders on the leaderboard, follow them or copy their trades, and leave a take.",
};

export default function WormAppPage() {
  return <WormLanding />;
}
