// Cover-image framing for the Keystatic panel.
//
//   image:       cover: coverImageField('blog')   – Keystatic's normal uploader (drag & drop / click / paste)
//   imageFrame:  coverFrame()                     – this file: drag to pan, wheel/slider/pinch-slider to zoom
//
// The framer shows the photo inside a 16:9 box – the exact shape of every card on the site – and
// stores only three numbers ({x, y, zoom}) next to the entry. The uploaded file is never altered.
// The site renders those numbers with the same CSS (see src/utils/coverFrame.ts).
//
// The framer lives in its own field, and Keystatic fields cannot read their siblings, so the wrapped
// image field publishes the currently selected file through a tiny in-page store.
import * as React from 'react';
import { fields } from '@keystatic/core';
import type { BasicFormField } from '@keystatic/core';
import {
  DEFAULT_FRAME,
  FRAME_ASPECT,
  ZOOM_MAX,
  ZOOM_MIN,
  focalDelta,
  isDefaultFrame,
  normalizeFrame,
  overflowFractions,
  type CoverFrame,
} from '../utils/coverFrame';

/* ── tiny store: current cover image object-URL ─────────────────────────── */

let currentSrc: string | null = null;
const listeners = new Set<() => void>();
const setCoverSrc = (url: string | null) => {
  currentSrc = url;
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const useCoverSrc = () => React.useSyncExternalStore(subscribe, () => currentSrc, () => null);

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
};

/* ── wrapped image field (adds publishing, keeps all upload behaviour) ─── */

type ImageOptions = Parameters<typeof fields.image>[0];

export function coverImageField(options: ImageOptions) {
  const base = fields.image(options);
  const BaseInput = base.Input;

  function Input(props: React.ComponentProps<typeof BaseInput>) {
    const value = props.value as { data: Uint8Array; extension: string } | null;
    const data = value?.data;
    const ext = value?.extension;

    React.useEffect(() => {
      if (!data) {
        setCoverSrc(null);
        return;
      }
      const url = URL.createObjectURL(
        new Blob([data as unknown as BlobPart], { type: MIME[(ext || '').toLowerCase()] || 'image/*' })
      );
      setCoverSrc(url);
      return () => URL.revokeObjectURL(url);
    }, [data, ext]);

    React.useEffect(() => () => setCoverSrc(null), []);

    return <BaseInput {...props} />;
  }

  return { ...base, Input } as typeof base;
}

/* ── the framer ─────────────────────────────────────────────────────────── */

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 } as React.CSSProperties,
  box: {
    position: 'relative',
    width: '100%',
    aspectRatio: String(FRAME_ASPECT),
    overflow: 'hidden',
    borderRadius: 8,
    border: '1px solid rgba(128,128,128,.45)',
    background: 'rgba(128,128,128,.15)',
    cursor: 'grab',
    touchAction: 'none',
    outline: 'none',
  } as React.CSSProperties,
  row: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 } as React.CSSProperties,
  btn: {
    font: 'inherit',
    fontSize: 12,
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid rgba(128,128,128,.5)',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
  } as React.CSSProperties,
  hint: { fontSize: 12, opacity: 0.7, lineHeight: 1.5 } as React.CSSProperties,
};

function FrameInput({ value, onChange }: { value: CoverFrame; onChange(v: CoverFrame): void }) {
  const src = useCoverSrc();
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [nat, setNat] = React.useState<{ w: number; h: number } | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const drag = React.useRef<{ sx: number; sy: number; x0: number; y0: number } | null>(null);

  // always-fresh copies for native listeners
  const latest = React.useRef(value);
  latest.current = value;
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => setNat(null), [src]);

  const set = (patch: Partial<CoverFrame>) => onChangeRef.current(normalizeFrame({ ...latest.current, ...patch }));

  const kFor = (zoom: number) => {
    const o = nat ? overflowFractions(nat.w, nat.h) : { w: 1, h: 1 };
    return { kx: o.w * zoom, ky: o.h * zoom };
  };

  /* wheel zoom (needs a non-passive listener to stop the page from scrolling) */
  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const z = clamp(latest.current.zoom * (1 - e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX);
      onChangeRef.current(normalizeFrame({ ...latest.current, zoom: z }));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [src]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!src) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { sx: e.clientX, sy: e.clientY, x0: value.x, y0: value.y };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    const box = boxRef.current;
    if (!d || !box) return;
    const r = box.getBoundingClientRect();
    const { kx, ky } = kFor(value.zoom);
    const x = d.x0 + 100 * focalDelta((e.clientX - d.sx) / r.width, kx);
    const y = d.y0 + 100 * focalDelta((e.clientY - d.sy) / r.height, ky);
    set({ x, y });
  };
  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 5 : 1;
    const map: Record<string, Partial<CoverFrame>> = {
      ArrowLeft: { x: value.x + step },
      ArrowRight: { x: value.x - step },
      ArrowUp: { y: value.y + step },
      ArrowDown: { y: value.y - step },
      '+': { zoom: value.zoom + 0.1 },
      '=': { zoom: value.zoom + 0.1 },
      '-': { zoom: value.zoom - 0.1 },
    };
    if (map[e.key]) {
      e.preventDefault();
      set(map[e.key]);
    }
  };

  return (
    <div style={S.wrap}>
      <div
        ref={boxRef}
        style={{ ...S.box, cursor: src ? (dragging ? 'grabbing' : 'grab') : 'default' }}
        tabIndex={0}
        role="group"
        aria-label="Cover image framing preview (16:9). Drag to move, scroll to zoom."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${value.x}% ${value.y}%`,
              transformOrigin: `${value.x}% ${value.y}%`,
              scale: String(value.zoom),
              userSelect: 'none',
              pointerEvents: 'none',
              display: 'block',
            }}
          />
        ) : (
          <div style={{ ...S.hint, position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 16, textAlign: 'center' }}>
            Upload a Cover Image above (drag &amp; drop works), then frame it here.
          </div>
        )}
      </div>

      <div style={S.row}>
        <span aria-hidden>🔍</span>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.01}
          value={value.zoom}
          disabled={!src}
          onChange={(e) => set({ zoom: Number(e.target.value) })}
          style={{ flex: 1 }}
          aria-label="Zoom"
        />
        <span style={{ minWidth: 42, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value.zoom.toFixed(2)}×</span>
        <button type="button" style={S.btn} disabled={!src} onClick={() => set({ x: 50, y: 50 })}>
          Center
        </button>
        <button
          type="button"
          style={S.btn}
          disabled={isDefaultFrame(value)}
          onClick={() => onChange({ ...DEFAULT_FRAME })}
        >
          Reset
        </button>
      </div>

      <div style={S.hint}>
        This box has the exact shape of the cards on Blog, Projects and Home (16:9). Drag the photo to choose what stays in view,
        scroll or use the slider to zoom. Arrow keys nudge, +/− zoom. The original file is never changed.
      </div>
    </div>
  );
}

export function coverFrame(): BasicFormField<CoverFrame> {
  return {
    kind: 'form',
    label: 'Cover Image Framing',
    Input: (props) => <FrameInput value={props.value} onChange={props.onChange} />,
    defaultValue: () => ({ ...DEFAULT_FRAME }),
    parse: (v) => normalizeFrame(v),
    // Default frame → nothing written to the file (keeps the front-matter clean).
    serialize: (v) => {
      const f = normalizeFrame(v);
      return { value: isDefaultFrame(f) ? undefined : { x: f.x, y: f.y, zoom: f.zoom } };
    },
    validate: (v) => normalizeFrame(v),
    reader: { parse: (v) => normalizeFrame(v) },
  };
}
