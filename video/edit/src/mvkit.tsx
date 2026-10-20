import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import ANIM from './mvanim.json';

// The MV's motion-graphics kit: every layer the "Đội Dép Lào" MV is built from. Pure functions of the shot's
// progress t (0..1) so the mockup's still frames and the real edit draw the same thing.
//   type:   the trailer's system: Baloo 2 ExtraBold for the game's letters (logo, names, stamps: ĂN HÌNH!, BỐP!),
//           Nunito Black for every line of copy, in tilted chunks with one word in yellow (Chunk); the logo is Shorts5's Logo
//   colour: per act (ACT below); ink #241418 for every outline, the game's own
export const INK = '#241418';
export const CREAM = '#FBF3E4';
// the palette: the game's own card colours, softened (no magenta, no red), one warm accent for the hits
//   rose Hổ · sky Gấu Trúc · sun Gà Con · leaf Cáo · plum + amber for Sư Tử's gang · pastel rooms behind
export const YEL = '#F6C453';
export const PINK = '#C9768F';
export const BLUE = '#5E93C4';
export const GREEN = '#73AB7E';
export const SUN = '#E2B25C';
export const RED = '#E39B4A';
export const PLUM = '#2B2030';
export const SKY_GRAD = 'linear-gradient(180deg, #7fb5e6 0%, #b9dbf3 48%, #f6e3d6 100%)';
export const BALOO = "'Baloo 2', sans-serif";
export const NUNITO = "'Nunito', sans-serif";
export const BUNGEE = BALOO;
export const INLINE = BALOO;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const outE = (t: number) => 1 - (1 - t) ** 3;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
// 0..1 inside [a, b] of t
export const win = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
// a seeded random in 0..1 (the same layout every render)
export const rnd = (i: number, s = 1) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

export const Fill = ({ children, style }: { children?: ReactNode; style?: CSSProperties }) => <AbsoluteFill style={style}>{children}</AbsoluteFill>;

// the camera on a flat composition: scale / pan / roll between two framings
export const Cam = ({ t, s = [1, 1], x = [0, 0], y = [0, 0], r = [0, 0], children }:
  { t: number; s?: number[]; x?: number[]; y?: number[]; r?: number[]; children: ReactNode }) => {
  const e = ease(t);
  return <AbsoluteFill style={{ transform: `translate(${lerp(x[0], x[1], e)}px, ${lerp(y[0], y[1], e)}px) scale(${lerp(s[0], s[1], e)}) rotate(${lerp(r[0], r[1], e)}deg)` }}>{children}</AbsoluteFill>;
};

// a filmed take (public/footage/<src>.mp4), from `from` seconds in, at `rate`
// the shot's length in frames (MVFull's ShotView provides it; the mockup's stills leave it 0)
export const ShotLen = createContext(0);
// each take's length in seconds (ffprobe of public/footage): a take slows down to last the whole shot, never runs dry
const TAKE_LEN: Record<string, number> = { 'mv-t0.2': 4.33, 'mv-t0.3': 3.98, 'mv-t0.4': 4.33, 'mv-T2': 3.77 };
export const Take = ({ src, from = 0, rate = 1, style }: { src: string; from?: number; rate?: number; style?: CSSProperties }) => {
  const { fps } = useVideoConfig();
  const len = useContext(ShotLen);
  const room = (TAKE_LEN[src] ?? 99) - from - 0.15;
  const r = len ? Math.min(rate, room / (len / fps)) : rate;
  return <OffthreadVideo src={staticFile(`footage/${src}.mp4`)} startFrom={Math.round(from * fps)} playbackRate={r} muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />;
};

export const Plate = ({ src, style }: { src: string; style?: CSSProperties }) => (
  <Img src={staticFile(`mv/plates/${src}.jpg`)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...style }} />
);

// a cut-out pet, placed by the middle of its feet; h = its height on screen. It plays its loop (12 frames a second,
// public/mv/anim, mvanim.json) when one was rendered, each pet a little out of step with the others; else the still.
const LOOPS = ANIM as Record<string, number>;
export const Pet = ({ id, pose = 'front', x, y, h, flip = false, rot = 0, style, glow }:
  { id: string; pose?: string; x: number; y: number; h: number; flip?: boolean; rot?: number; style?: CSSProperties; glow?: string }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const n = LOOPS[`${id}-${pose}`];
  const k = n ? (Math.floor((f / fps) * 12) + id.length * 3 + pose.length) % n : 0;
  const src = n ? `mv/anim/${id}-${pose}/${String(k).padStart(2, '0')}.webp` : `mv/pets/${id}-${pose}.png`;
  return (
    <Img src={staticFile(src)} style={{
      position: 'absolute', left: x, top: y, height: h, transform: `translate(-50%, -100%) rotate(${rot}deg) scaleX(${flip ? -1 : 1})`, transformOrigin: '50% 100%',
      filter: glow ? `drop-shadow(0 0 18px ${glow}) drop-shadow(0 0 6px ${glow})` : 'drop-shadow(0 14px 10px rgba(0,0,0,0.25))', ...style,
    }} />
  );
};
export const Prop = ({ src, x, y, h, rot = 0, style }: { src: string; x: number; y: number; h: number; rot?: number; style?: CSSProperties }) => (
  <Img src={staticFile(`mv/${src}`)} style={{ position: 'absolute', left: x, top: y, height: h, transform: `translate(-50%, -50%) rotate(${rot}deg)`, ...style }} />
);

// sunburst rays around (cx, cy)
export const Rays = ({ cx = 960, cy = 540, color = 'rgba(255,255,255,0.18)', n = 24, rot = 0, fade = 900 }:
  { cx?: number; cy?: number; color?: string; n?: number; rot?: number; fade?: number }) => (
  <div style={{ position: 'absolute', inset: 0, background: `repeating-conic-gradient(from ${rot}deg at ${cx}px ${cy}px, ${color} 0deg ${180 / n}deg, transparent ${180 / n}deg ${360 / n}deg)`,
    WebkitMaskImage: `radial-gradient(circle at ${cx}px ${cy}px, black 0px, black ${fade * 0.35}px, transparent ${fade}px)` }} />
);

// anime speed lines converging on (cx, cy), the middle left clear
export const Speed = ({ cx = 960, cy = 540, color = 'rgba(255,255,255,0.85)', clear = 360, n = 90, seed = 1 }:
  { cx?: number; cy?: number; color?: string; clear?: number; n?: number; seed?: number }) => {
  const stops: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360 + rnd(i, seed) * 3; const w = 0.4 + rnd(i, seed + 7) * 1.2;
    stops.push(`transparent ${a}deg`, `${color} ${a}deg`, `${color} ${a + w}deg`, `transparent ${a + w}deg`);
  }
  return <div style={{ position: 'absolute', inset: 0, background: `conic-gradient(from 0deg at ${cx}px ${cy}px, ${stops.join(',')})`,
    WebkitMaskImage: `radial-gradient(ellipse at ${cx}px ${cy}px, transparent ${clear}px, black ${clear * 1.9}px)` }} />;
};

// horizontal streaks (a run, a whip)
export const Streaks = ({ color = 'rgba(255,255,255,0.7)', n = 26, seed = 3, shift = 0, dir = 1 }:
  { color?: string; n?: number; seed?: number; shift?: number; dir?: number }) => (
  <>{Array.from({ length: n }, (_, i) => {
    const y = rnd(i, seed) * 1080; const w = 200 + rnd(i, seed + 1) * 700; const x = ((rnd(i, seed + 2) * 2400 + shift * dir * 1600) % 2600) - 340;
    return <div key={i} style={{ position: 'absolute', left: x, top: y, width: w, height: 2 + rnd(i, seed + 3) * 6, borderRadius: 9, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />;
  })}</>
);

// volumetric light: beams through a window, soft, screened over the picture
export const Beams = ({ angle = -28, color = 'rgba(255,214,150,0.55)', x = 420, spread = 1, n = 5, seed = 2, op = 1 }:
  { angle?: number; color?: string; x?: number; spread?: number; n?: number; seed?: number; op?: number }) => (
  <div style={{ position: 'absolute', inset: 0, mixBlendMode: 'screen', opacity: op }}>
    {Array.from({ length: n }, (_, i) => (
      <div key={i} style={{ position: 'absolute', left: x + (i - n / 2) * 120 * spread + rnd(i, seed) * 60, top: -400, width: 60 + rnd(i, seed + 1) * 160, height: 2200,
        background: `linear-gradient(180deg, ${color}, rgba(0,0,0,0) 85%)`, transform: `rotate(${angle}deg)`, transformOrigin: '50% 0', filter: 'blur(26px)', opacity: 0.45 + rnd(i, seed + 2) * 0.55 }} />
    ))}
  </div>
);

// motes in a beam / sparkles; t drifts them
export const Dust = ({ n = 60, seed = 4, t = 0, color = 'rgba(255,236,200,0.9)', area = [0, 0, 1920, 1080], size = 5 }:
  { n?: number; seed?: number; t?: number; color?: string; area?: number[]; size?: number }) => (
  <>{Array.from({ length: n }, (_, i) => {
    const s = size * (0.4 + rnd(i, seed + 3)); const x = area[0] + rnd(i, seed) * area[2] + Math.sin(t * 6 + i) * 20; const y = area[1] + ((rnd(i, seed + 1) * area[3] - t * 120 * (0.3 + rnd(i, seed + 2))) % area[3] + area[3]) % area[3];
    return <div key={i} style={{ position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: '50%', background: color, boxShadow: `0 0 ${s * 2}px ${color}`, opacity: 0.35 + rnd(i, seed + 5) * 0.65 }} />;
  })}</>
);

export const Halftone = ({ color = 'rgba(36,20,24,0.22)', size = 22, dot = 5, mask = 'linear-gradient(135deg, black, transparent 70%)', style }:
  { color?: string; size?: number; dot?: number; mask?: string; style?: CSSProperties }) => (
  <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, ${color} ${dot}px, transparent ${dot + 0.5}px)`, backgroundSize: `${size}px ${size}px`, WebkitMaskImage: mask, ...style }} />
);

// the notebook page of the game's brand ("vở học trò"): cream, blue lines, the red margin
export const Paper = ({ tint = '#fbf6ec', line = 'rgba(80,120,190,0.28)', margin = true, grey = false }: { tint?: string; line?: string; margin?: boolean; grey?: boolean }) => (
  <div style={{ position: 'absolute', inset: 0, background: tint, filter: grey ? 'grayscale(1)' : undefined }}>
    <div style={{ position: 'absolute', inset: 0, backgroundImage: `repeating-linear-gradient(180deg, transparent 0 46px, ${line} 46px 48px)` }} />
    {margin && <div style={{ position: 'absolute', left: 150, top: 0, bottom: 0, width: 3, background: 'rgba(220,70,90,0.45)' }} />}
  </div>
);

// film grain, procedural
export const Grain = ({ op = 0.16, seed = 1 }: { op?: number; seed?: number }) => (
  <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, opacity: op, mixBlendMode: 'overlay' }} aria-hidden="true">
    <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
    <rect width="1920" height="1080" filter={`url(#g${seed})`} />
  </svg>
);
export const Vignette = ({ op = 0.55, color = '20,8,16' }: { op?: number; color?: string }) => (
  <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(${color},0) 45%, rgba(${color},${op}) 100%)` }} />
);
export const Bars = ({ h = 130 }: { h?: number }) => (
  <><div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: h, background: '#000' }} /><div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: '#000' }} /></>
);

// a manga panel: ink frame, its own picture inside
export const Panel = ({ x, y, w, h, rot = 0, children, bg = '#fff', border = 10 }:
  { x: number; y: number; w: number; h: number; rot?: number; children?: ReactNode; bg?: string; border?: number }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, transform: `rotate(${rot}deg)`, background: bg, border: `${border}px solid ${INK}`, boxSizing: 'border-box', overflow: 'hidden', boxShadow: '0 18px 0 rgba(36,20,24,0.18)' }}>
    {children}
  </div>
);

// type: a word or line, ink outline + drop, revealed by `show` (0..1: slides up and scales in)
export const Type = ({ text, x, y, size = 160, font = BUNGEE, color = '#fff', stroke = INK, sw = 0, drop = 10, rot = 0, show = 1, align = 'center', style, spacing = 0 }:
  { text: string; x: number; y: number; size?: number; font?: string; color?: string; stroke?: string; sw?: number; drop?: number; rot?: number; show?: number; align?: 'left' | 'center' | 'right'; style?: CSSProperties; spacing?: number }) => {
  const k = outE(clamp01(show));
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(${tx}, -50%) rotate(${rot}deg) translateY(${(1 - k) * 60}px) scale(${0.7 + 0.3 * k})`, opacity: k,
      fontFamily: font, fontSize: size, lineHeight: 0.95, color, whiteSpace: 'pre', letterSpacing: spacing, fontWeight: font === NUNITO ? 900 : 800,
      WebkitTextStroke: sw ? `${sw}px ${stroke}` : undefined, paintOrder: 'stroke fill', textShadow: drop ? `0 ${drop}px 0 ${stroke}, 0 ${drop * 2}px ${drop * 3}px rgba(0,0,0,0.3)` : undefined, ...style }}>{text}</div>
  );
};
// a label on a skewed ribbon
export const Ribbon = ({ text, x, y, bg = PINK, color = '#fff', size = 40, rot = -3, show = 1 }:
  { text: string; x: number; y: number; bg?: string; color?: string; size?: number; rot?: number; show?: number }) => {
  const k = outE(clamp01(show));
  return <div style={{ position: 'absolute', left: x, top: y, padding: '10px 28px', background: bg, color, fontFamily: BALOO, fontWeight: 800, fontSize: size,
    transform: `rotate(${rot}deg) skewX(-10deg) translateX(${(1 - k) * -300}px)`, opacity: k, boxShadow: `0 8px 0 ${INK}` }}>{text}</div>;
};

export const Confetti = ({ n = 90, seed = 9, t = 0, colors = [PINK, YEL, BLUE, GREEN, '#fff'] }: { n?: number; seed?: number; t?: number; colors?: string[] }) => (
  <>{Array.from({ length: n }, (_, i) => {
    const x = rnd(i, seed) * 1920; const y = ((rnd(i, seed + 1) * 1300 + t * 900 * (0.6 + rnd(i, seed + 2))) % 1300) - 120;
    return <div key={i} style={{ position: 'absolute', left: x, top: y, width: 14 + rnd(i, seed + 3) * 14, height: 8 + rnd(i, seed + 4) * 8, background: colors[i % colors.length], transform: `rotate(${rnd(i, seed + 5) * 360 + t * 400}deg)` }} />;
  })}</>
);
// expanding rings on a beat
export const Rings = ({ cx = 960, cy = 540, t = 0, color = '#fff', n = 3, max = 900 }: { cx?: number; cy?: number; t?: number; color?: string; n?: number; max?: number }) => (
  <>{Array.from({ length: n }, (_, i) => {
    const k = ((t * 1.5 + i / n) % 1); const r = k * max;
    return <div key={i} style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', border: `${10 * (1 - k) + 2}px solid ${color}`, opacity: 1 - k }} />;
  })}</>
);
// the impact frame (anime): two frames of hard black-and-white ink, then the colour comes back
export const Impact = ({ on = true }: { on?: boolean }) => (on ? <div style={{ position: 'absolute', inset: 0, backdropFilter: 'grayscale(1) contrast(2.4) brightness(1.15)', WebkitBackdropFilter: 'grayscale(1) contrast(2.4) brightness(1.15)' }} /> : null);
// duotone the layers under it: shadows -> a, highlights -> b
export const Duo = ({ a = '#2a2230', b = '#e9e2d6', op = 1 }: { a?: string; b?: string; op?: number }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, backdropFilter: 'grayscale(1) contrast(1.05)', WebkitBackdropFilter: 'grayscale(1) contrast(1.05)', opacity: op }} />
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${a}, ${a})`, mixBlendMode: 'lighten', opacity: op * 0.55 }} />
    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(${b}, ${b})`, mixBlendMode: 'multiply', opacity: op * 0.5 }} />
  </>
);

// a line of copy the trailer's way: Nunito Black, ink outline and drop, tilted; *word* comes out yellow
export const Chunk = ({ text, x, y, size = 80, rot = -3, show = 1, color = CREAM, align = 'center' }:
  { text: string; x: number; y: number; size?: number; rot?: number; show?: number; color?: string; align?: 'left' | 'center' | 'right' }) => {
  const k = outE(clamp01(show));
  const tx = align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0';
  const parts = text.split('*');
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(${tx}, -50%) rotate(${rot}deg) scale(${0.75 + 0.25 * k})`, opacity: k, whiteSpace: 'nowrap',
      fontFamily: NUNITO, fontWeight: 900, fontSize: size, lineHeight: 1.15, color, WebkitTextStroke: `${Math.round(size * 0.085)}px ${INK}`, paintOrder: 'stroke fill',
      textShadow: `0 ${Math.round(size * 0.07)}px 0 ${INK}, 0 10px 30px rgba(0,0,0,.35)` }}>
      {parts.map((p, i) => <span key={i} style={{ color: i % 2 ? YEL : undefined }}>{p}</span>)}
    </div>
  );
};

// one of the twelve cut-out clouds (public/mv/clouds/c0..c11.png)
export const Cloud = ({ i, x, y, w, op = 1 }: { i: number; x: number; y: number; w: number; op?: number }) => (
  <Img src={staticFile(`mv/clouds/c${i % 12}.png`)} style={{ position: 'absolute', left: x, top: y, width: w, transform: 'translate(-50%, -50%)', opacity: op }} />
);
