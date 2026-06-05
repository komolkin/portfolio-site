import { fal } from "@fal-ai/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  DEFAULT_WORLD_CUP_COUNTRY_ID,
  getWorldCupCountry,
  WORLD_CUP_COUNTRY_IDS,
} from "@/lib/ai-cam/world-cup-countries";

export const maxDuration = 120;

const REVE_MODEL = "fal-ai/reve/fast/remix";
const FALLBACK_MODEL = "fal-ai/nano-banana-2/edit";
const SCENE_REFERENCE_PATH = path.join(
  process.cwd(),
  "public/playground/ai-cam/world-cup-fan-zone-reference.png",
);

const requestSchema = z.object({
  image: z.string().startsWith("data:image/"),
  countryId: z.enum(WORLD_CUP_COUNTRY_IDS as [string, ...string[]]).default(DEFAULT_WORLD_CUP_COUNTRY_ID),
  flagFacePaint: z.boolean().default(false),
});

let cachedSceneReferenceUrl: string | null = null;

function dataUrlToFile(dataUrl: string) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const buffer = Buffer.from(base64, "base64");
  return new File([buffer], "selfie.jpg", { type: mime });
}

function getErrorMessage(err: unknown) {
  if (!(err instanceof Error)) return "Image generation failed.";

  const falError = err as Error & {
    body?: { detail?: unknown; message?: string };
    status?: number;
  };

  if (typeof falError.body?.detail === "string") return falError.body.detail;
  if (Array.isArray(falError.body?.detail)) {
    return falError.body.detail
      .map((item) => (typeof item === "object" && item && "msg" in item ? String(item.msg) : String(item)))
      .join(", ");
  }
  if (typeof falError.body?.message === "string") return falError.body.message;

  return err.message || "Image generation failed.";
}

function isModelNotFound(err: unknown) {
  const message = getErrorMessage(err).toLowerCase();
  return message.includes("not found") || message.includes("application 'reve'");
}

function buildPrompt(model: string, countryId: string, flagFacePaint: boolean) {
  const country = getWorldCupCountry(countryId);
  if (!country) {
    throw new Error("Unknown country selection.");
  }

  const teamSupport = [
    `The person and surrounding fans are celebrating ${country.label} at the World Cup.`,
    `Fans wear ${country.fanColors} team jerseys and scarves.`,
    `The crowd waves ${country.flagDescription} throughout the fan zone.`,
    `Team colors ${country.fanColors} dominate the celebration scene.`,
  ].join(" ");

  const flagFacePaintLine = flagFacePaint
    ? `Add colors of the flag on the face: ${country.label} flag face paint in ${country.fanColors}, with ${country.flagDescription} patterns on the cheeks and forehead like a World Cup fan, while keeping the same recognizable person.`
    : null;

  const useReveTags = model.includes("reve");

  if (useReveTags) {
    return [
      "Photorealistic front-facing smartphone selfie — the image IS what the phone front camera captures, first-person POV.",
      "The phone taking the photo must NOT appear in frame: no smartphone visible, no phone in hand, not a photo of someone being photographed.",
      "Use the exact face and identity from <img index=\"0\" /> — same person, same facial structure, looking directly into the front camera lens.",
      "They celebrate in a packed outdoor fan zone at night like <img index=\"1\" />: dense cheering crowd, stadium floodlights, ecstatic post-goal energy.",
      teamSupport,
      ...(flagFacePaintLine ? [flagFacePaintLine] : []),
      "One hand holds the golden FIFA World Cup trophy raised beside their face; the other hand holds the phone off-screen to take the selfie — only the trophy and their face are visible, not the device.",
      "Classic selfie framing: face close to lens, slight wide-angle front-camera distortion, candid and handheld.",
      "RAW photograph, disposable camera aesthetic, harsh flash, film grain, realistic skin texture, not cartoon, not illustration.",
    ].join(" ");
  }

  return [
    "Photorealistic front-facing smartphone selfie — the image IS what the phone front camera captures, first-person POV.",
    "The phone taking the photo must NOT appear in frame: no smartphone visible, no phone in hand, not a photo of someone being photographed by another camera.",
    "The person from the first reference image must be the exact same person in the result — preserve face, identity, looking directly into the front camera lens.",
    "They celebrate in a packed outdoor fan zone at night like the second reference image: dense cheering crowd, stadium floodlights, ecstatic post-goal energy.",
    teamSupport,
    ...(flagFacePaintLine ? [flagFacePaintLine] : []),
    "One hand holds the golden FIFA World Cup trophy raised beside their face; the other hand holds the phone off-screen to take the selfie — only the trophy and their face are visible, not the device.",
    "Classic selfie framing: face close to lens, slight wide-angle front-camera distortion, big joyful smile, mouth open cheering.",
    "RAW photograph, disposable camera aesthetic, harsh flash, film grain, realistic skin texture, not cartoon, not illustration.",
  ].join(" ");
}

function buildModelInput(
  model: string,
  selfieUrl: string,
  sceneUrl: string,
  countryId: string,
  flagFacePaint: boolean,
) {
  const input: Record<string, unknown> = {
    prompt: buildPrompt(model, countryId, flagFacePaint),
    image_urls: [selfieUrl, sceneUrl],
    aspect_ratio: "9:16",
    output_format: "jpeg",
    num_images: 1,
  };

  if (model.includes("nano-banana")) {
    input.resolution = "1K";
    input.limit_generations = true;
  }

  return input;
}

async function getSceneReferenceUrl() {
  if (cachedSceneReferenceUrl) return cachedSceneReferenceUrl;

  const buffer = readFileSync(SCENE_REFERENCE_PATH);
  cachedSceneReferenceUrl = await fal.storage.upload(
    new File([buffer], "world-cup-fan-zone-reference.png", { type: "image/png" }),
  );

  return cachedSceneReferenceUrl;
}

async function generateWorldCupSelfie(
  selfieUrl: string,
  sceneUrl: string,
  countryId: string,
  flagFacePaint: boolean,
) {
  const configuredModel = process.env.AI_CAM_MODEL?.trim();
  const models = [...new Set([configuredModel, REVE_MODEL, FALLBACK_MODEL].filter(Boolean))] as string[];

  let lastError: unknown;

  for (const model of models) {
    try {
      const result = await fal.subscribe(model, {
        input: buildModelInput(model, selfieUrl, sceneUrl, countryId, flagFacePaint),
        logs: false,
      });

      const imageUrl = result.data.images?.[0]?.url;
      if (!imageUrl) {
        throw new Error("Model returned no image.");
      }

      return { imageUrl, model };
    } catch (err) {
      lastError = err;
      if (isModelNotFound(err)) {
        console.warn(`[ai-cam/transform] Model unavailable: ${model}`);
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No compatible image model is available on this fal account.");
}

export async function POST(request: Request) {
  const apiKey = process.env.FAL_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "FAL_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Expected a base64 data URL image." }, { status: 400 });
  }

  fal.config({ credentials: apiKey });

  try {
    const [selfieUrl, sceneUrl] = await Promise.all([
      fal.storage.upload(dataUrlToFile(parsed.data.image)),
      getSceneReferenceUrl(),
    ]);

    const { imageUrl } = await generateWorldCupSelfie(
      selfieUrl,
      sceneUrl,
      parsed.data.countryId,
      parsed.data.flagFacePaint,
    );

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Could not download the generated image.");
    }

    const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const imageDataUrl = `data:${contentType};base64,${imageBuffer.toString("base64")}`;

    return NextResponse.json({ imageUrl, imageDataUrl });
  } catch (err) {
    console.error("[ai-cam/transform]", err);
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 502 });
  }
}
