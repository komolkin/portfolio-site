"use client";

import { Agentation } from "agentation";

const enabled =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_AGENTATION === "1";

export function AgentationToolbar() {
  if (!enabled) return null;
  return <Agentation />;
}
