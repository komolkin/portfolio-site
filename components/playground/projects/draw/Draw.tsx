"use client";

import { useEffect, useRef, useState } from "react";

const BRUSH_RADIUS = 22;
const MIN_POINT_DIST = 1;
const CANVAS_BG = "#2e2e2e";
const SHADE_STOPS = 18;
const SPINE_SPACING = 1;
const SPLINE_SAMPLES = 12;
const CHAIKIN_ITERS = 2;

type Point = { x: number; y: number };

function dist(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Corner-cutting — rounds sharp pointer turns before the spline. */
function chaikin(points: Point[], iterations: number): Point[] {
  let pts = points.map((p) => ({ ...p }));
  for (let k = 0; k < iterations; k++) {
    if (pts.length < 2) break;
    const next: Point[] = [{ ...pts[0] }];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      next.push({
        x: a.x * 0.75 + b.x * 0.25,
        y: a.y * 0.75 + b.y * 0.25,
      });
      next.push({
        x: a.x * 0.25 + b.x * 0.75,
        y: a.y * 0.25 + b.y * 0.75,
      });
    }
    next.push({ ...pts[pts.length - 1] });
    pts = next;
  }
  return pts;
}

function catmullRomPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

/** Smooth curve through the raw pointer points, then evenly resample. */
function buildSpine(points: Point[]): Point[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [{ ...points[0] }];
  if (points.length === 2) return densify(points, SPINE_SPACING);

  const rounded = chaikin(points, CHAIKIN_ITERS);
  const padded = [rounded[0], ...rounded, rounded[rounded.length - 1]];
  const curved: Point[] = [];
  for (let i = 0; i < padded.length - 3; i++) {
    for (let s = 0; s < SPLINE_SAMPLES; s++) {
      curved.push(
        catmullRomPoint(
          padded[i],
          padded[i + 1],
          padded[i + 2],
          padded[i + 3],
          s / SPLINE_SAMPLES,
        ),
      );
    }
  }
  curved.push({ ...rounded[rounded.length - 1] });
  return densify(curved, SPINE_SPACING);
}

function densify(points: Point[], spacing: number): Point[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));
  const out: Point[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const d = dist(a, b);
    const steps = Math.max(1, Math.ceil(d / spacing));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** Unit normals along the path, flipped for continuity. */
function pathNormals(points: Point[]): Point[] {
  const n = points.length;
  const norms: Point[] = [];
  for (let i = 0; i < n; i++) {
    let tx: number;
    let ty: number;
    if (i === 0) {
      tx = points[Math.min(1, n - 1)].x - points[0].x;
      ty = points[Math.min(1, n - 1)].y - points[0].y;
    } else if (i === n - 1) {
      tx = points[i].x - points[i - 1].x;
      ty = points[i].y - points[i - 1].y;
    } else {
      tx = points[i + 1].x - points[i - 1].x;
      ty = points[i + 1].y - points[i - 1].y;
    }
    const len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len;
    let ny = tx / len;
    if (i > 0 && nx * norms[i - 1].x + ny * norms[i - 1].y < 0) {
      nx = -nx;
      ny = -ny;
    }
    norms.push({ x: nx, y: ny });
  }
  return norms;
}

/** Matte cylinder shade for a point across the tube (t ∈ [-1, 1]). */
function tubeShade(t: number, nx: number, ny: number): string {
  const facing = Math.sqrt(Math.max(0, 1 - t * t));
  const ox = t * nx;
  const oy = t * ny;
  const nLen = Math.hypot(ox, oy, facing) || 1;
  // Soft top light — matches the clay/tube reference.
  const lx = -0.28;
  const ly = -0.92;
  const lz = 0.55;
  const lLen = Math.hypot(lx, ly, lz);
  const ndotl = Math.max(
    0,
    (ox * lx + oy * ly + facing * lz) / (nLen * lLen),
  );
  const intensity = Math.min(1, 0.32 + 0.68 * Math.pow(ndotl, 1.15));
  const g = Math.round(118 + intensity * 137);
  return `rgb(${g},${g},${g})`;
}

/** Average neighboring normals so shading turns aren't faceted. */
function smoothNormals(norms: Point[]): Point[] {
  if (norms.length < 3) return norms;
  let curr = norms;
  for (let pass = 0; pass < 2; pass++) {
    const next = curr.map((n) => ({ ...n }));
    for (let i = 1; i < curr.length - 1; i++) {
      const nx = curr[i - 1].x * 0.25 + curr[i].x * 0.5 + curr[i + 1].x * 0.25;
      const ny = curr[i - 1].y * 0.25 + curr[i].y * 0.5 + curr[i + 1].y * 0.25;
      const len = Math.hypot(nx, ny) || 1;
      next[i] = { x: nx / len, y: ny / len };
    }
    curr = next;
  }
  return curr;
}

function shadeGradient(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  nx: number,
  ny: number,
) {
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  for (let i = 0; i <= SHADE_STOPS; i++) {
    const u = i / SHADE_STOPS;
    grad.addColorStop(u, tubeShade(u * 2 - 1, nx, ny));
  }
  return grad;
}

function fillShadedDisc(
  ctx: CanvasRenderingContext2D,
  center: Point,
  nx: number,
  ny: number,
  radius: number,
) {
  const x0 = center.x - nx * radius;
  const y0 = center.y - ny * radius;
  const x1 = center.x + nx * radius;
  const y1 = center.y + ny * radius;
  ctx.fillStyle = shadeGradient(ctx, x0, y0, x1, y1, nx, ny);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function fillShadedSegment(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  na: Point,
  nb: Point,
  radius: number,
) {
  const mx = (a.x + b.x) * 0.5;
  const my = (a.y + b.y) * 0.5;
  let nx = (na.x + nb.x) * 0.5;
  let ny = (na.y + nb.y) * 0.5;
  const nLen = Math.hypot(nx, ny) || 1;
  nx /= nLen;
  ny /= nLen;

  ctx.fillStyle = shadeGradient(
    ctx,
    mx - nx * radius,
    my - ny * radius,
    mx + nx * radius,
    my + ny * radius,
    nx,
    ny,
  );
  ctx.beginPath();
  ctx.moveTo(a.x - na.x * radius, a.y - na.y * radius);
  ctx.lineTo(b.x - nb.x * radius, b.y - nb.y * radius);
  ctx.lineTo(b.x + nb.x * radius, b.y + nb.y * radius);
  ctx.lineTo(a.x + na.x * radius, a.y + na.y * radius);
  ctx.closePath();
  ctx.fill();
}

function tracePath(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y);
    return;
  }
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  // Quadratic mid-point chain — silhouette stays curved between samples.
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) * 0.5;
    const midY = (points[i].y + points[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

let shadeLayer: HTMLCanvasElement | null = null;

function getShadeLayer(width: number, height: number) {
  if (!shadeLayer) shadeLayer = document.createElement("canvas");
  if (shadeLayer.width !== width || shadeLayer.height !== height) {
    shadeLayer.width = width;
    shadeLayer.height = height;
  }
  return shadeLayer;
}

function drawTube(ctx: CanvasRenderingContext2D, points: Point[], radius: number) {
  if (points.length === 0) return;

  const spine = buildSpine(points);

  // Soft shadow
  ctx.save();
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = radius * 2.05;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.translate(0, radius * 0.1);
  tracePath(ctx, spine);
  ctx.stroke();
  ctx.restore();

  const temp = getShadeLayer(ctx.canvas.width, ctx.canvas.height);
  const tctx = temp.getContext("2d");
  if (!tctx) return;

  const transform = ctx.getTransform();
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.clearRect(0, 0, temp.width, temp.height);
  tctx.setTransform(transform);

  const norms =
    spine.length === 1
      ? [{ x: 0, y: -1 }]
      : smoothNormals(pathNormals(spine));

  // Solid round underlay — fills tips + outer elbows so nothing goes empty
  tctx.strokeStyle = tubeShade(0, 0, -1);
  tctx.lineWidth = radius * 2;
  tctx.lineCap = "round";
  tctx.lineJoin = "round";
  tracePath(tctx, spine);
  tctx.stroke();

  // Volume shading on top (same profile at tips and along the body)
  fillShadedDisc(tctx, spine[0], norms[0].x, norms[0].y, radius);
  fillShadedDisc(
    tctx,
    spine[spine.length - 1],
    norms[spine.length - 1].x,
    norms[spine.length - 1].y,
    radius,
  );

  for (let i = 0; i < spine.length - 1; i++) {
    fillShadedSegment(
      tctx,
      spine[i],
      spine[i + 1],
      norms[i],
      norms[i + 1],
      radius * 1.04,
    );
  }

  // Clip to one continuous round-capped stroke
  tctx.globalCompositeOperation = "destination-in";
  tctx.strokeStyle = "#000";
  tctx.lineWidth = radius * 2;
  tctx.lineCap = "round";
  tctx.lineJoin = "round";
  tracePath(tctx, spine);
  tctx.stroke();
  tctx.globalCompositeOperation = "source-over";

  // Tiny blur knocks down remaining micro-facets / hard AA
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = "blur(0.55px)";
  ctx.drawImage(temp, 0, 0);
  ctx.filter = "none";
  ctx.restore();
  ctx.setTransform(transform);
}

function sizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  dpr: number,
) {
  canvas.width = Math.max(1, Math.floor(width * dpr));
  canvas.height = Math.max(1, Math.floor(height * dpr));
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

export default function Draw() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const liveRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const pointsRef = useRef<Point[]>([]);
  const historyRef = useRef<ImageData[]>([]);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const rafRef = useRef<number | null>(null);
  const [hasMarks, setHasMarks] = useState(false);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [pointerInside, setPointerInside] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const base = baseRef.current;
    const live = liveRef.current;
    if (!wrap || !base || !live) return;

    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { width, height, dpr };

      const baseCtx = sizeCanvas(base, width, height, dpr);
      sizeCanvas(live, width, height, dpr);

      if (baseCtx) {
        baseCtx.fillStyle = CANVAS_BG;
        baseCtx.fillRect(0, 0, width, height);
      }
      historyRef.current = [];
      setHasMarks(false);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  const pointerToLocal = (e: React.PointerEvent) => {
    const canvas = liveRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const clearLive = () => {
    const live = liveRef.current;
    const ctx = live?.getContext("2d");
    const { width, height, dpr } = sizeRef.current;
    if (!live || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, live.width, live.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const redrawLive = () => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const live = liveRef.current;
      const ctx = live?.getContext("2d");
      if (!live || !ctx) return;
      clearLive();
      drawTube(ctx, pointsRef.current, BRUSH_RADIUS);
    });
  };

  const pushHistory = () => {
    const base = baseRef.current;
    const ctx = base?.getContext("2d");
    if (!base || !ctx) return;
    try {
      historyRef.current.push(ctx.getImageData(0, 0, base.width, base.height));
      if (historyRef.current.length > 24) historyRef.current.shift();
    } catch {
      // Undo unavailable if the buffer is too large.
    }
  };

  const commitStroke = () => {
    const base = baseRef.current;
    const ctx = base?.getContext("2d");
    const { dpr } = sizeRef.current;
    if (!base || !ctx || pointsRef.current.length === 0) return;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTube(ctx, pointsRef.current, BRUSH_RADIUS);
    clearLive();
    pointsRef.current = [];
    setHasMarks(true);
  };

  const clearCanvas = () => {
    const base = baseRef.current;
    const ctx = base?.getContext("2d");
    const { width, height, dpr } = sizeRef.current;
    if (!base || !ctx) return;
    pushHistory();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, width, height);
    clearLive();
    pointsRef.current = [];
    setHasMarks(false);
  };

  const undo = () => {
    const base = baseRef.current;
    const ctx = base?.getContext("2d");
    const prev = historyRef.current.pop();
    const { dpr } = sizeRef.current;
    if (!base || !ctx || !prev) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.putImageData(prev, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    clearLive();
    pointsRef.current = [];
    drawingRef.current = false;
    setHasMarks(historyRef.current.length > 0);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const live = liveRef.current;
    if (!live) return;
    live.setPointerCapture(e.pointerId);
    pushHistory();
    drawingRef.current = true;
    const p = pointerToLocal(e);
    setCursor(p);
    pointsRef.current = [p];
    redrawLive();
    setHasMarks(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointerToLocal(e);
    setCursor(p);
    if (!drawingRef.current) return;
    const pts = pointsRef.current;
    const last = pts[pts.length - 1];
    if (last && dist(last, p) < MIN_POINT_DIST) return;
    pts.push(p);
    redrawLive();
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    commitStroke();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // already released
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative h-[min(70dvh,36rem)] w-full max-w-3xl overflow-hidden rounded-2xl md:h-[min(72dvh,40rem)] md:rounded-3xl"
      style={{ backgroundColor: CANVAS_BG }}
    >
      <canvas ref={baseRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <canvas
        ref={liveRef}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor: pointerInside ? "none" : "default" }}
        aria-label="Drawing canvas"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        onPointerEnter={() => setPointerInside(true)}
        onPointerLeave={(e) => {
          setPointerInside(false);
          setCursor(null);
          endStroke(e);
        }}
      />

      {pointerInside && cursor && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-full border border-white/25"
          style={{
            width: BRUSH_RADIUS * 2,
            height: BRUSH_RADIUS * 2,
            left: cursor.x - BRUSH_RADIUS,
            top: cursor.y - BRUSH_RADIUS,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.35)",
          }}
        />
      )}

      {!hasMarks && (
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/35">
          Draw
        </p>
      )}

      {hasMarks && (
        <button
          type="button"
          data-sfx="click"
          onClick={clearCanvas}
          className="absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          Clear
        </button>
      )}
    </div>
  );
}
