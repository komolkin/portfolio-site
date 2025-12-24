import { Realtime, InferRealtimeEvents } from "@upstash/realtime";
import { redis } from "./redis";
import z from "zod/v4";

const schema = {
  cursor: {
    // Cursor position update
    move: z.object({
      id: z.string(), // Unique user ID
      x: z.number(), // X position (percentage of viewport)
      y: z.number(), // Y position (percentage of viewport)
      color: z.string(), // Cursor color
      name: z.string(), // Random generated username
    }),
    // User left the page
    leave: z.object({
      id: z.string(),
    }),
  },
};

export const realtime = new Realtime({ schema, redis });
export type RealtimeEvents = InferRealtimeEvents<typeof realtime>;
