import * as THREE from "three";

/** Figma Wormie frame — node 7415:3225 inside a 24×24 container. */
export const FIGMA_WORMIE_SIZE = 24;
export const FIGMA_FACE_W = 17;
export const FIGMA_FACE_H = 16.077;

const TEXTURE_W = 1024;
const TEXTURE_H = 512;

/** Equirect math overshoots; tune down to match perceived size on the sphere. */
const FACE_TEXTURE_SCALE = 0.52;

/** Feature layout in the Wormie SVG viewBox (17 × 16.077). */
const EYE_CENTERS = [
  { x: 5.45, y: 6.0 },
  { x: 11.55, y: 6.0 },
] as const;
const EYE_W = 2.65;
const EYE_H = 5.25;
const MOUTH = { x: 8.5, y: 9.0, radius: 7.35, stroke: 2.35 };

type FaceLayout = {
  cx: number;
  cy: number;
  faceW: number;
  faceH: number;
  faceX: number;
  faceY: number;
};

function getFaceLayout(): FaceLayout {
  const cx = TEXTURE_W / 2;
  const cy = TEXTURE_H / 2;
  const faceW =
    TEXTURE_W * 0.5 * (FIGMA_FACE_W / FIGMA_WORMIE_SIZE) * FACE_TEXTURE_SCALE;
  const faceH = faceW * (FIGMA_FACE_H / FIGMA_FACE_W);
  return {
    cx,
    cy,
    faceW,
    faceH,
    faceX: cx - faceW / 2,
    faceY: cy - faceH / 2,
  };
}

function drawCircleBody(ctx: CanvasRenderingContext2D) {
  const cx = TEXTURE_W / 2;
  const cy = TEXTURE_H / 2;

  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, TEXTURE_W * 0.42);
  bg.addColorStop(0, "#1a1a1a");
  bg.addColorStop(0.55, "#0e0e0e");
  bg.addColorStop(1, "#050505");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
}

function drawEmissiveFace(
  ctx: CanvasRenderingContext2D,
  blink: number,
) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, TEXTURE_W, TEXTURE_H);
  drawSmileyFace(ctx, getFaceLayout(), blink);
}

function drawGlowFill(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  glow: number,
) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
  ctx.shadowBlur = glow;
  ctx.fillStyle = "#ffffff";
  draw();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#ffffff";
  draw();
  ctx.restore();
}

function drawGlowStroke(
  ctx: CanvasRenderingContext2D,
  draw: () => void,
  glow: number,
) {
  ctx.save();
  ctx.shadowColor = "rgba(255, 255, 255, 0.9)";
  ctx.shadowBlur = glow;
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  draw();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";
  draw();
  ctx.restore();
}

/** Procedural Wormie face — eyes squash vertically as `blink` goes 0 → 1. */
function drawSmileyFace(
  ctx: CanvasRenderingContext2D,
  layout: FaceLayout,
  blink: number,
) {
  const sx = layout.faceW / FIGMA_FACE_W;
  const sy = layout.faceH / FIGMA_FACE_H;
  const ox = layout.faceX;
  const oy = layout.faceY;
  const eyeOpen = Math.max(0, 1 - blink);

  for (const { x, y } of EYE_CENTERS) {
    const ex = ox + x * sx;
    const ey = oy + y * sy;
    const w = EYE_W * sx;
    const h = EYE_H * sy * eyeOpen;

    if (h < 0.35) continue;

    drawGlowFill(ctx, () => {
      ctx.beginPath();
      ctx.roundRect(ex - w / 2, ey - h / 2, w, h, w / 2);
      ctx.fill();
    }, 11 * sx);
  }

  const mouthCx = ox + MOUTH.x * sx;
  const mouthCy = oy + MOUTH.y * sy;
  const mouthR = MOUTH.radius * sx;
  const mouthW = MOUTH.stroke * sx;

  drawGlowStroke(
    ctx,
    () => {
      ctx.beginPath();
      ctx.lineWidth = mouthW;
      ctx.arc(mouthCx, mouthCy, mouthR, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    },
    13 * sx,
  );
}

/** 0 = eyes open, 1 = eyes closed. Rebuilds both maps each call. */
export function drawSphereTexture(
  bodyCtx: CanvasRenderingContext2D,
  emissiveCtx: CanvasRenderingContext2D,
  blink = 0,
) {
  drawCircleBody(bodyCtx);
  drawEmissiveFace(emissiveCtx, blink);
}

export type SphereTextureResource = {
  bodyMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  redraw: (blink?: number) => void;
};

/** Dynamic canvas textures — call `redraw(blink)` to update eyes. */
export function createSphereTextureResource(): SphereTextureResource {
  const bodyCanvas = document.createElement("canvas");
  bodyCanvas.width = TEXTURE_W;
  bodyCanvas.height = TEXTURE_H;
  const bodyCtx = bodyCanvas.getContext("2d");
  if (!bodyCtx) {
    throw new Error("Could not create body texture canvas");
  }

  const emissiveCanvas = document.createElement("canvas");
  emissiveCanvas.width = TEXTURE_W;
  emissiveCanvas.height = TEXTURE_H;
  const emissiveCtx = emissiveCanvas.getContext("2d");
  if (!emissiveCtx) {
    throw new Error("Could not create emissive texture canvas");
  }

  const bodyMap = new THREE.CanvasTexture(bodyCanvas);
  bodyMap.colorSpace = THREE.SRGBColorSpace;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  const redraw = (blink = 0) => {
    drawSphereTexture(bodyCtx, emissiveCtx, blink);
    bodyMap.needsUpdate = true;
    emissiveMap.needsUpdate = true;
  };

  redraw(0);
  return { bodyMap, emissiveMap, redraw };
}
