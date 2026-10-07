// Non-destructive "framing" for cover images: a focal point + zoom stored as data.
// The original file is never modified. The SAME math is used by the panel editor and by the
// site (src/components/CoverImage.astro), so what you see in the panel is what visitors get.
//
// Rendering model (all cards are 16:9 with object-fit: cover):
//   object-position: x% y%   → which part of the photo stays in view (the focal point)
//   transform-origin: x% y%  → zoom grows around that same point (never reveals empty edges)
//   scale: zoom              → 0.5 … 3   (below 1 the framed photo shrinks; the card background shows around it)

export const FRAME_ASPECT = 16 / 9;
export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 3;

export type CoverFrame = { x: number; y: number; zoom: number };
export const DEFAULT_FRAME: CoverFrame = { x: 50, y: 50, zoom: 1 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Accepts anything (YAML, old entries, garbage) and returns a valid frame. */
export function normalizeFrame(v: unknown): CoverFrame {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  const num = (k: string, d: number) => (typeof o[k] === 'number' && Number.isFinite(o[k] as number) ? (o[k] as number) : d);
  return {
    x: round1(clamp(num('x', 50), 0, 100)),
    y: round1(clamp(num('y', 50), 0, 100)),
    zoom: Math.round(clamp(num('zoom', 1), ZOOM_MIN, ZOOM_MAX) * 100) / 100,
  };
}

export const isDefaultFrame = (f: CoverFrame) => f.x === 50 && f.y === 50 && f.zoom === 1;

/** Inline CSS for the <img>. Returns undefined for the default frame (no inline style needed). */
export function frameStyleString(frame: CoverFrame | null | undefined): string | undefined {
  if (!frame) return undefined;
  const f = normalizeFrame(frame);
  if (isDefaultFrame(f)) return undefined;
  return `object-position:${f.x}% ${f.y}%;transform-origin:${f.x}% ${f.y}%;scale:${f.zoom}`;
}

/**
 * How much the pointer must move the focal point so the photo follows the cursor 1:1.
 * A photo point at fraction `f` of the image lands at box position  p + k·(f − p),
 * where p is the focal position (0..1) and k = (displayed image size ÷ box size) × zoom.
 * Moving p by Δp therefore shifts the content by Δp·(1 − k)  →  Δp = Δbox / (1 − k).
 */
export function focalDelta(deltaBoxFraction: number, k: number): number {
  const d = 1 - k;
  if (Math.abs(d) < 1e-3) return 0; // nothing to pan (image exactly fits, no zoom)
  return deltaBoxFraction / d;
}

/** Display size of the cover-fitted photo relative to the 16:9 box, per axis (≥ 1). */
export function overflowFractions(imgW: number, imgH: number) {
  const r = imgW / imgH;
  return { w: Math.max(1, r / FRAME_ASPECT), h: Math.max(1, FRAME_ASPECT / r) };
}
