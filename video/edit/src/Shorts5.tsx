import { createContext, useContext, useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';
import './chat.css';

// The five shorts, one concept each (../shorts5.py → shorts5.json). The trailer's type system:
//   Baloo 2 ExtraBold   the game's letters: the logo and the in-world stamps (ĂN HÌNH!, BỐP!)
//   Nunito Black        every line of copy, in loose chunks, each tilted its own way, one word in yellow, never in a box
// Studio colours are the site's warm graphite + amber; every video ends on the same card with the studio logo.
const G0 = '#141210';
const G1 = '#25221F';
const TXT = '#F6F3EF';
const AMBER = '#FFB84D';
const YEL = '#FFC93C';
const PINK = '#ff5d8f';
const INK = '#2a1418';
const NUNITO = "'Nunito', sans-serif";
const BALOO = "'Baloo 2', sans-serif";

// the language of the cut: 'vi' (Dép Lào Tuổi Thơ) or 'en' (the global cut: the game's English name on the logo)
const Lang = createContext<'vi' | 'en'>('vi');

type Clip = { src: string; from_: number; dur: number; t_in: number; rate: number; z: number[]; c: number[]; name: string; blur?: number; dark?: number };
type Over = { kind: string; from_: number; dur: number; [k: string]: unknown };
export type Short5 = { lang?: 'vi' | 'en'; id: string; W: number; H: number; fps: number; frames: number; clips: Clip[]; over: Over[] };

function useFonts() {
  const [handle] = useState(() => delayRender('fonts', { timeoutInMilliseconds: 90000 }));
  useEffect(() => {
    // Nunito + Baloo 2 from Google Fonts (with the Vietnamese subset); a failed load is tried again
    const vi = 'Ăn hình ỨC GHÊ đập dép tổ ong Bằng';
    const load = (tries: number) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@700;800;900&display=block';
      link.onload = () => Promise.all([
        document.fonts.load('900 60px Nunito', vi), document.fonts.load('800 60px Nunito', vi), document.fonts.load('800 60px "Baloo 2"', vi),
      ]).then(() => continueRender(handle), () => tries > 0 && setTimeout(() => load(tries - 1), 1000));
      link.onerror = () => { link.remove(); if (tries > 0) setTimeout(() => load(tries - 1), 1000); };
      document.head.appendChild(link);
    };
    load(5);
  }, [handle]);
}

// The edit is timed in frames at 30 a second (shorts5.json); the composition renders at OUT_FPS. useF() = the time in
// edit frames (fractional at 60 fps), so every overlay keeps its timing and moves twice as smoothly.
export const OUT_FPS = 60;
const useF = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return f * 30 / fps; };

const shakeOf = (edit: Short5, f: number) => {
  for (const o of edit.over) {
    if (o.kind !== 'shake' || f < o.from_ || f >= o.from_ + o.dur) continue;
    const k = Math.floor(f - o.from_); const fall = 1 - k / o.dur; const amp = (o.amp as number) ?? 16;
    return [(k % 2 ? -1 : 1) * amp * fall, (Math.floor(k / 2) % 2 ? -1 : 1) * amp * 0.7 * fall];
  }
  return [0, 0];
};

const ClipView = ({ clip, edit }: { clip: Clip; edit: Short5 }) => {
  const f = useF();
  const { width: W, height: H, fps: fpsOut } = useVideoConfig();
  const z = interpolate(f, [0, Math.max(1, clip.dur - 1)], [clip.z[0], clip.z[1]], { extrapolateRight: 'clamp' });
  const X = Math.min(Math.max(clip.c[0] * W * z - W / 2, 0), W * z - W);
  const Y = Math.min(Math.max(clip.c[1] * H * z - H / 2, 0), H * z - H);
  const [sx, sy] = shakeOf(edit, clip.from_ + f);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: G0 }}>
      {/* a transform, not a resized box: a slow push-in moves by fractions of a pixel instead of snapping a pixel every few frames */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', willChange: 'transform',
        transform: `translate(${-X + sx}px, ${-Y + sy}px) scale(${z})` }}>
        <OffthreadVideo src={staticFile(clip.src)} startFrom={Math.round(clip.t_in * fpsOut)} playbackRate={clip.rate} muted
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: clip.blur || clip.dark ? `blur(${clip.blur ?? 0}px) brightness(${1 - (clip.dark ?? 0)})` : undefined }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- type
// a chunk drops in: scale 1.4 → 1 and 3° more tilt → its own, in 5 frames
const useDrop = (delay = 0) => {
  const f = useF();
  const k = interpolate(f - delay, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const e = 1 - (1 - k) ** 3;
  return { on: f >= delay, s: 1.4 - 0.4 * e, r: 3 * (1 - e), o: Math.min(1, (f - delay + 1) / 2) };
};
const pos = (x: unknown, y: number): React.CSSProperties => (x == null
  ? { position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center' }
  : { position: 'absolute', left: x as number, top: y });

const Chunk = ({ o }: { o: Over }) => {
  const d = useDrop(o.delay as number);
  const s = o.size as number;
  if (!d.on) return null;
  return (
    <div style={{ ...pos(o.x, o.y as number), opacity: d.o }}>
      <span className="ch" style={{ display: 'inline-block', fontSize: s, ['--sw' as string]: `${Math.round(s * 0.085)}px`, ['--sd' as string]: `${Math.round(s * 0.07)}px`,
        color: (o.color as string) ?? TXT, transform: `rotate(${(o.rot as number) + d.r}deg) scale(${d.s})`, transformOrigin: '50% 60%' }}
        dangerouslySetInnerHTML={{ __html: o.t as string }} />
    </div>
  );
};

const Paper = ({ o }: { o: Over }) => {
  const d = useDrop(o.delay as number);
  const s = o.size as number; const rot = o.rot as number;
  if (!d.on) return null;
  return (
    <div style={{ ...pos(o.x, o.y as number), opacity: d.o }}>
      <span style={{ position: 'relative', display: 'inline-block', transform: `rotate(${rot + d.r}deg) scale(${d.s})` }}>
        <span className="paper" style={{ fontSize: s }} dangerouslySetInnerHTML={{ __html: o.t as string }} />
        <span style={{ position: 'absolute', left: -46, top: -24, width: 120, height: 40, background: 'rgba(255,214,120,.85)', transform: `rotate(${-rot * 1.5 - 32}deg)` }} />
      </span>
    </div>
  );
};

const Stamp = ({ o }: { o: Over }) => {
  const f = useF();
  const { fps } = useVideoConfig();
  const delay = (o.delay as number) ?? 0;
  if (f < delay) return null;
  const s = spring({ frame: (f - delay) * fps / 30, fps, config: { damping: 9, stiffness: 230, mass: 0.6 }, from: 1.6, to: 1 });
  const size = o.size as number;
  return (
    <div style={{ ...pos(o.x, o.y as number) }}>
      <span style={{ display: 'inline-block', fontFamily: BALOO, fontWeight: 800, fontSize: size, lineHeight: 1.05, color: (o.color as string) ?? YEL,
        WebkitTextStroke: `${Math.round(size * 0.1)}px ${INK}`, paintOrder: 'stroke fill', textShadow: `0 ${Math.round(size * 0.08)}px 0 ${INK}`,
        whiteSpace: 'nowrap', transform: `rotate(${o.rot as number}deg) scale(${s})` }}>{o.t as string}</span>
    </div>
  );
};

// ---------------------------------------------------------------- the game logo (same drawing as the trailer's)
export const Logo = ({ w, id = 'arc' }: { w: number; id?: string }) => {
  const h = w * 0.66;
  const en = useContext(Lang) === 'en';
  const [arc, big, rib, arcSize, bigSize] = en ? ['FLIP-FLOP', 'SLAM!', 'DÉP LÀO · TUỔI THƠ', 150, 250] : ['DÉP LÀO', 'TUỔI THƠ', 'FLIP FLOP SLAM', 170, 230];
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <Img src={staticFile('media/cut-card-tiger.png')} style={{ position: 'absolute', left: -w * 0.06, top: h * 0.3, width: w * 0.17, transform: 'rotate(-18deg)', filter: 'drop-shadow(0 20px 26px rgba(0,0,0,.45))' }} />
      <svg viewBox="0 0 1000 660" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', fontFamily: BALOO, fontWeight: 800 }}>
        <path id={id} d="M140 300 Q500 110 860 300" fill="none" />
        <text fontSize={arcSize} fill={TXT} stroke={INK} strokeWidth={26} strokeLinejoin="round" paintOrder="stroke fill">
          <textPath href={`#${id}`} startOffset="50%" textAnchor="middle">{arc}</textPath>
        </text>
        <g transform="rotate(-3 500 420)">
          {[5, 4, 3, 2, 1].map((i) => <text key={i} x={500} y={455 + i * 4} textAnchor="middle" fontSize={bigSize} fill="#9a5414" stroke={INK} strokeWidth={22} strokeLinejoin="round" paintOrder="stroke fill">{big}</text>)}
          <text x={500} y={455} textAnchor="middle" fontSize={bigSize} fill={YEL} stroke={INK} strokeWidth={22} strokeLinejoin="round" paintOrder="stroke fill">{big}</text>
        </g>
        <g transform="rotate(-4 500 600)">
          <path d="M110 565 L890 565 L855 607 L890 649 L110 649 L145 607 Z" fill={G1} stroke={G0} strokeWidth={8} />
          <text x={500} y={623} textAnchor="middle" fontSize={50} fill={AMBER} letterSpacing={en ? 6 : 10} style={{ fontFamily: NUNITO, fontWeight: 900 }}>{rib}</text>
        </g>
      </svg>
      <Img src={staticFile('media/cut-dep-dep_lao.png')} style={{ position: 'absolute', left: w * 0.8, top: -h * 0.02, width: w * 0.32, transform: 'rotate(-18deg)', filter: 'drop-shadow(0 20px 26px rgba(0,0,0,.45))' }} />
    </div>
  );
};

// The end card of every short: graphite like the studio site, the logo slams down, the line, the link, the credits,
// the studio's logo last.
const EndCard = ({ o }: { o: Over }) => {
  const f = useF();
  const en = useContext(Lang) === 'en';
  const { fps } = useVideoConfig();
  const sl = spring({ frame: (f) * fps / 30, fps, config: { damping: 11, stiffness: 210, mass: 0.7 }, from: 1.5, to: 1 });
  const fade = (d: number) => interpolate(f, [d, d + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const { width, height } = useVideoConfig();
  if (width > height) return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #3a3530, ${G0} 75%)` }}>
      <div style={{ position: 'absolute', left: 960 - 400, top: 285 - 264, transform: `scale(${sl}) rotate(${(1 - sl) * -8}deg)` }}><Logo w={800} id="arc-end" /></div>
      <Chunk o={{ kind: 'chunk', from_: 0, dur: 0, t: o.line as string, x: null, y: 590, size: 80, rot: -3, delay: 8 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 735, display: 'flex', justifyContent: 'center', opacity: fade(14) }}>
        <div style={{ fontFamily: NUNITO, fontWeight: 900, fontSize: 44, background: '#e0457b', color: '#fff', padding: '12px 44px', borderRadius: 999,
          border: `5px solid ${G0}`, boxShadow: `0 8px 0 ${G0}`, transform: `rotate(1.5deg) translateY(${(1 - fade(14)) * 20}px)` }}>billthedevstudio.io.vn/slam-cards</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 862, textAlign: 'center', fontFamily: NUNITO, fontWeight: 800, fontSize: 30, color: TXT, opacity: fade(20) }}>
        {en ? 'Game idea' : 'Ý tưởng'}: ThuanBui (David) &nbsp;·&nbsp; Developer: BillTheDev
      </div>
      <Img src={staticFile('brand/studio-logo-dark.png')} style={{ position: 'absolute', left: 960 - 230, top: 925, width: 460, opacity: fade(26),
        transform: `scale(${0.9 + 0.1 * fade(26)})` }} />
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #3a3530, ${G0} 75%)` }}>
      <div style={{ position: 'absolute', left: 540 - 410, top: 660 - 270, transform: `scale(${sl}) rotate(${(1 - sl) * -8}deg)` }}><Logo w={820} id="arc-end" /></div>
      <Chunk o={{ kind: 'chunk', from_: 0, dur: 0, t: o.line as string, x: null, y: 1080, size: 66, rot: -3, delay: 8 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1290, display: 'flex', justifyContent: 'center', opacity: fade(14) }}>
        <div style={{ fontFamily: NUNITO, fontWeight: 900, fontSize: 46, background: '#e0457b', color: '#fff', padding: '12px 40px', borderRadius: 999,
          border: `5px solid ${G0}`, boxShadow: `0 8px 0 ${G0}`, transform: `rotate(1.5deg) translateY(${(1 - fade(14)) * 20}px)` }}>billthedevstudio.io.vn/slam-cards</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1440, textAlign: 'center', fontFamily: NUNITO, fontWeight: 800, fontSize: 36, lineHeight: 1.45, color: TXT, opacity: fade(20) }}>
        {en ? 'Game idea' : 'Ý tưởng'}: ThuanBui (David)<br />Developer: BillTheDev
      </div>
      <Img src={staticFile('brand/studio-logo-dark.png')} style={{ position: 'absolute', left: 540 - 310, top: 1590, width: 620, opacity: fade(26),
        transform: `scale(${0.9 + 0.1 * fade(26)})` }} />
    </AbsoluteFill>
  );
};

// a sticky note in pen: the score
const Sticky = ({ o }: { o: Over }) => {
  const d = useDrop(o.delay as number);
  if (!d.on) return null;
  return (
    <div style={{ position: 'absolute', left: o.x as number, top: o.y as number, width: 270, whiteSpace: 'nowrap', padding: '14px 16px 18px', background: '#fff3a8', boxShadow: '0 10px 18px rgba(0,0,0,.28)',
      transform: `rotate(${(o.rot as number) + d.r}deg) scale(${d.s})`, opacity: d.o, fontFamily: NUNITO, fontWeight: 900, color: '#1c5f94', textAlign: 'center' }}>
      <div style={{ fontSize: 36, lineHeight: 1.2 }}>{o.a as string}</div>
      <div style={{ fontSize: 84, lineHeight: 1.05 }}>{o.b as string}</div>
    </div>
  );
};

const Count = ({ o }: { o: Over }) => {
  const f = useF();
  const ts = o.t as string[]; const per = o.dur / ts.length; const i = Math.min(ts.length - 1, Math.floor(f / per));
  const k = (f - i * per) / per;
  return (
    <div style={{ ...pos(null, o.y as number) }}>
      <span className="ch" style={{ display: 'inline-block', fontSize: 230, ['--sw' as string]: '19px', ['--sd' as string]: '15px', opacity: 1 - k * 0.5,
        transform: `rotate(${i % 2 ? 5 : -5}deg) scale(${1.35 - k * 0.35})` }}>{ts[i]}</span>
    </div>
  );
};

const Pause = ({ o }: { o: Over }) => {
  const f = useF();
  const a = interpolate(f, [0, 4, o.dur - 6, o.dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: a }}>
      <div style={{ width: 200, height: 200, borderRadius: 40, background: 'rgba(246,243,239,.92)', border: `8px solid ${G0}`, display: 'flex', gap: 28, alignItems: 'center', justifyContent: 'center',
        transform: `scale(${1.2 - 0.2 * Math.min(1, f / 4)})` }}>
        <div style={{ width: 34, height: 100, background: G0, borderRadius: 8 }} /><div style={{ width: 34, height: 100, background: G0, borderRadius: 8 }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the school notebook (video 3)
const Ruled = ({ o }: { o: Over }) => {
  const f = useF();
  return (
    <AbsoluteFill style={{ background: '#fdf8ea linear-gradient(transparent 0 76px, rgba(73,130,196,.30) 76px 80px) 0 40px / 100% 80px',
      transform: `scale(${1 + f / o.dur * ((o.push as number) ?? 0.04)})` }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 150, width: 6, background: 'rgba(224,69,123,.5)' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(120,90,40,.18) 100%)' }} />
    </AbsoluteFill>
  );
};

// handwriting in blue pen, written left to right
const Pen = ({ o }: { o: Over }) => {
  const f = useF();
  const k = interpolate(f, [0, (o.write as number) ?? 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: o.x as number, top: o.y as number, fontFamily: NUNITO, fontWeight: 800, fontSize: o.size as number, color: (o.color as string) ?? '#1c5f94',
      transform: `rotate(${o.rot as number}deg)`, whiteSpace: 'pre', lineHeight: 1.2, clipPath: `inset(-20% ${(1 - k) * 100}% -20% -5%)` }}>{o.t as string}</div>
  );
};

// the trailer's opening move: a slipper comes down on the words, they squash and lean
const Squash = ({ o }: { o: Over }) => {
  const f = useF();
  const { fps } = useVideoConfig();
  const { width } = useVideoConfig(); const cx = width / 2;
  const hit = o.hit as number; const y = o.y as number; const size = o.size as number;
  const after = f >= hit;
  const sq = after ? spring({ frame: (f - hit) * fps / 30, fps, config: { damping: 7, stiffness: 320, mass: 0.5 } }) : 0;
  const sy = 1 - 0.45 * sq; const sx = 1 + 0.1 * sq; const sk = -14 * sq; const rot = -5 - 4 * sq;
  const fall = Math.min(1, f / hit); const e = fall ** 3;
  // after the hit the slipper flies back up and out of the frame, so the squashed words read
  const up = after ? interpolate(f - hit, [0, 14], [0, 1], { extrapolateRight: 'clamp' }) ** 1.6 : 0;
  const kk = Math.floor(f - hit); const [sx2, sy2] = after && kk < 8 ? [(kk % 2 ? -1 : 1) * 18 * (1 - kk / 8), (kk % 2 ? 1 : -1) * 12 * (1 - kk / 8)] : [0, 0];
  const d = useDrop(0);
  return (
    <AbsoluteFill style={{ transform: `translate(${sx2}px, ${sy2}px)` }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', opacity: d.o }}>
        <span className="ch" style={{ display: 'inline-block', fontSize: size, ['--sw' as string]: `${Math.round(size * 0.085)}px`, ['--sd' as string]: `${Math.round(size * 0.07)}px`,
          transformOrigin: '50% 100%', transform: `rotate(${rot + d.r}deg) skewX(${sk}deg) scale(${sx * d.s}, ${sy * d.s})` }} dangerouslySetInnerHTML={{ __html: o.t as string }} />
      </div>
      {after && f - hit < 7 && [0.2, 0.6, 2.5, 2.9, 3.5, 5.9].map((a) => (
        <div key={a} style={{ position: 'absolute', left: cx + Math.cos(a) * (380 + (f - hit) * 30) - 50, top: y + size * 0.55 + Math.sin(a) * (150 + (f - hit) * 12), width: 100, height: 16,
          borderRadius: 8, background: '#2a1418', opacity: 1 - (f - hit) / 7, transform: `rotate(${a * 57.3}deg)` }} />
      ))}
      <Img src={staticFile('media/cut-dep-dep_lao.png')} style={{ position: 'absolute', left: cx - 380, top: y - 475, width: 760,
        transform: after ? `translate(${up * 520}px, ${up * -1500}px) rotate(${18 - up * 70}deg)` : `translate(${(1 - e) * 200}px, ${(1 - e) * -1300}px) rotate(${18 - (1 - e) * 40}deg) scale(${1.5 - e * 0.5})`,
        filter: `drop-shadow(0 ${after ? 14 : 40 - e * 26}px ${after ? 14 : 40 - e * 26}px rgba(0,0,0,.35))` }} />
    </AbsoluteFill>
  );
};

const Sticker = ({ o }: { o: Over }) => {
  const d = useDrop(o.delay as number);
  if (!d.on) return null;
  return (
    <div style={{ position: 'absolute', left: o.x as number, top: o.y as number, opacity: d.o, transform: `rotate(${(o.rot as number) + d.r}deg) scale(${d.s})` }}>
      <Img src={staticFile(o.src as string)} style={{ width: o.w as number, display: 'block',
        filter: 'drop-shadow(6px 0 0 #fff) drop-shadow(-6px 0 0 #fff) drop-shadow(0 6px 0 #fff) drop-shadow(0 -6px 0 #fff) drop-shadow(0 14px 16px rgba(0,0,0,.25))' }} />
      <div style={{ position: 'absolute', left: '50%', top: -26, width: 170, height: 52, marginLeft: -85, background: 'rgba(255,214,120,.85)', transform: 'rotate(-6deg)' }} />
    </div>
  );
};

// ---------------------------------------------------------------- the slipper match-up (video 4)
const Graphite = () => <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 40%, #3a3530, ${G0} 75%)` }} />;

// a cut-out that drops in and sways a little
const Cut = ({ o }: { o: Over }) => {
  const f = useF();
  const d = useDrop(o.delay as number);
  if (!d.on) return null;
  const sway = Math.sin((f - (o.delay as number)) / 9) * ((o.sway as number) ?? 3);
  return (
    <Img src={staticFile(o.src as string)} style={{ position: 'absolute', left: o.x as number, top: o.y as number, width: o.w as number, opacity: d.o,
      transform: `rotate(${(o.rot as number) + d.r * 3 + sway}deg) scale(${d.s})`, filter: 'drop-shadow(0 20px 26px rgba(0,0,0,.45))' }} />
  );
};

// the fighter card: name in amber, two honest stats in dots
const Stat = ({ o }: { o: Over }) => {
  const d = useDrop(o.delay as number);
  if (!d.on) return null;
  const rows = o.rows as [string, number][];
  const k = o.big ? 1.45 : 1;  // the big card: shown alone over the held, dimmed shot
  return (
    <div style={{ position: 'absolute', left: o.big ? 60 : 90, right: o.big ? 60 : 90, top: o.y as number, background: 'rgba(20,18,16,.86)', border: `${o.big ? 7 : 5}px solid ${AMBER}`, borderRadius: 26,
      padding: `${16 * k}px ${30 * k}px ${20 * k}px`, fontFamily: NUNITO, fontWeight: 800, fontSize: 42 * k, lineHeight: 1.4, color: TXT, opacity: d.o,
      transform: `rotate(${(o.rot as number) + d.r}deg) scale(${0.85 + 0.15 * (1.4 - d.s) / 0.4})` }}>
      <div style={{ fontWeight: 900, fontSize: ((o.name as string).length > 8 ? 46 : 58) * k, color: AMBER, letterSpacing: 2 }}>{o.name as string}</div>
      {o.img ? <Img src={staticFile(o.img as string)} style={{ position: 'absolute', right: -30 * k, top: -120 * k, width: 300 * k, transform: 'rotate(14deg)',
        filter: 'drop-shadow(0 14px 16px rgba(0,0,0,.45))' }} /> : null}
      {rows.map(([label, n]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{label}</span>
          <span style={{ letterSpacing: 6 * k, color: YEL }}>{'●'.repeat(n)}<span style={{ color: 'rgba(246,243,239,.25)' }}>{'●'.repeat(5 - n)}</span></span></div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- the old friend (video 5)
// a chat line, big: the approved module (chat.css), Tèo from the left, Bill from the right, popping in
const Chat = ({ o }: { o: Over }) => {
  const f = useF();
  const { fps } = useVideoConfig();
  const u = 4.6;
  const s = spring({ frame: (f) * fps / 30, fps, config: { damping: 11, stiffness: 210 }, from: 0.3, to: 1 });
  const mine = o.who === 'bill';
  return (
    <div className="vchat" style={{ position: 'absolute', left: (o.x as number) ?? 48, width: (o.w as number) ?? 984, top: o.y as number, ['--u' as string]: `${(o.u as number) ?? u}px` }}>
      <div className={`vmsg ${mine ? 'bill' : 'teo'}`} style={{ transform: `scale(${s}) rotate(${mine ? 1.5 : -1.5}deg)`, transformOrigin: mine ? 'right bottom' : 'left bottom' }}>
        <div className="vav"><Img src={staticFile(`pets/${mine ? 'tiger' : 'panda'}.png`)} /></div>
        <div className="vbub">
          <span className="vwho">{mine ? 'Bill' : 'Tèo'}</span>
          <p>{o.t as string}</p>
          <svg className="vtail" viewBox="0 0 15 16"><path className="f" d="M15 0 L13.5 0 L1.5 14.5 L15 14.5 Z" /><path className="s" d="M13.5 0 L1.5 14.5 L20 14.5" /></svg>
        </div>
      </div>
    </div>
  );
};

// a finger tap: a ring that shrinks onto the button
const Tap = ({ o }: { o: Over }) => {
  const f = useF();
  const k = Math.min(1, f / 8);
  const r = 150 - 70 * k;
  return <div style={{ position: 'absolute', left: (o.x as number) - r / 2, top: (o.y as number) - r / 2, width: r, height: r, borderRadius: '50%',
    border: '12px solid #fff', boxShadow: `0 0 0 8px rgba(20,18,16,.4)`, opacity: interpolate(f, [0, 3, o.dur - 4, o.dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }} />;
};

// a clock counting up, in the stamp letters
const Timer = ({ o }: { o: Over }) => {
  const f = useF();
  const sec = Math.min(o.to as number, Math.floor((f / Math.max(1, o.dur - 1)) * (o.to as number)));  // reaches the last second on the last frame
  const done = sec >= (o.to as number);
  return <Stamp o={{ ...o, t: `00:0${sec}`, color: done ? YEL : TXT, delay: 0, size: done ? 190 : 170 }} />;
};

// ---------------------------------------------------------------- the trailer's opening
// the studio ident, the site's colours: warm graphite, an amber glow breathing behind the fox logo, the label under it
const Ident = ({ o }: { o: Over }) => {
  const f = useF();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: (f - 2) * fps / 30, fps, config: { damping: 10, stiffness: 180, mass: 0.7 }, from: 0.6, to: 1 });
  const glow = 0.13 + 0.05 * Math.sin(f / 7);
  const lab = interpolate(f, [16, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const out = interpolate(f, [o.dur - 6, o.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 45%, ${G1} 0%, ${G0} 70%)` }}>
      <AbsoluteFill style={{ opacity: out }}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 900, height: 900, margin: -450, borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,184,77,${glow}) 0%, rgba(255,184,77,${glow / 3}) 40%, transparent 65%)` }} />
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <Img src={staticFile('brand/studio-logo-dark.png')} style={{ width: 1100, opacity: Math.min(1, f / 3), transform: `scale(${f < 2 ? 0.6 : pop})` }} />
          <div style={{ marginTop: 36, fontFamily: NUNITO, fontWeight: 800, fontSize: 30, letterSpacing: '.32em', color: '#D7AF83', opacity: lab,
            transform: `translateY(${(1 - lab) * 14}px)` }}>{useContext(Lang) === 'en' ? 'PRESENTS' : 'GIỚI THIỆU'}</div>
        </AbsoluteFill>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// the game logo slams down on a beat
const LogoSlam = ({ o }: { o: Over }) => {
  const f = useF();
  const { fps } = useVideoConfig();
  const sl = spring({ frame: (f) * fps / 30, fps, config: { damping: 10, stiffness: 230, mass: 0.7 }, from: 1.7, to: 1 });
  const w = o.w as number;
  return (
    <div style={{ position: 'absolute', left: (o.cx as number) - w / 2, top: (o.cy as number) - w * 0.33, opacity: Math.min(1, f / 2 + 0.3),
      transform: `scale(${sl}) rotate(${(1 - sl) * -10}deg)` }}><Logo w={w} id={`arc-${o.from_}`} /></div>
  );
};

const Overlay = ({ o }: { o: Over }) => {
  const f = useF();
  switch (o.kind) {
    case 'chunk': return <Chunk o={o} />;
    case 'paper': return <Paper o={o} />;
    case 'stamp': return <Stamp o={o} />;
    case 'end': return <EndCard o={o} />;
    case 'sticky': return <Sticky o={o} />;
    case 'count': return <Count o={o} />;
    case 'pause': return <Pause o={o} />;
    case 'ruled': return <Ruled o={o} />;
    case 'pen': return <Pen o={o} />;
    case 'squash': return <Squash o={o} />;
    case 'sticker': return <Sticker o={o} />;
    case 'graphite': return <Graphite />;
    case 'cut': return <Cut o={o} />;
    case 'stat': return <Stat o={o} />;
    case 'chat': return <Chat o={o} />;
    case 'ident': return <Ident o={o} />;
    case 'logo': return <LogoSlam o={o} />;
    case 'shade': return <AbsoluteFill style={{ background: `linear-gradient(180deg, transparent ${o.from as number}%, rgba(20,18,16,.88) ${(o.from as number) + 22}%)`, opacity: Math.min(1, f / 5) }} />;
    case 'tap': return <Tap o={o} />;
    case 'timer': return <Timer o={o} />;
    case 'flash': return <AbsoluteFill style={{ background: '#fff', opacity: 0.85 * (1 - f / o.dur) }} />;
    case 'dim': return <AbsoluteFill style={{ background: G0, opacity: (o.strength as number) * Math.min(1, f / 8) }} />;
    case 'vignette': return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(170,20,50,${o.strength as number}) 100%)` }} />;
    case 'pulse': return <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(170,20,50,.35) 100%)', opacity: 1 - f / o.dur }} />;
    default: return null;
  }
};

const CSS = `
.ch{font-family:${NUNITO};font-weight:900;line-height:1.15;white-space:nowrap;color:${TXT};-webkit-text-stroke:var(--sw) ${G0};paint-order:stroke fill;
  text-shadow:0 var(--sd) 0 ${G0},0 10px 30px rgba(0,0,0,.35)}
.ch b{color:${YEL};font-weight:900}
.paper{display:inline-block;background:${TXT};color:${G0};font-family:${NUNITO};font-weight:900;line-height:1.15;padding:.18em .5em .22em;white-space:nowrap;box-shadow:0 10px 24px rgba(0,0,0,.35)}
.paper b{color:#e0457b}`;

export const Short5Cut = ({ edit }: { edit: Short5 }) => {
  useFonts();
  const K = useVideoConfig().fps / 30;
  const order = ['ident', 'ruled', 'graphite', 'cut', 'logo', 'shade', 'vignette', 'pulse', 'dim', 'flash', 'end', 'sticker', 'pen', 'squash', 'stat', 'chat', 'tap', 'timer', 'sticky', 'paper', 'chunk', 'count', 'pause', 'stamp'];
  const over = [...edit.over].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return (
    <Lang.Provider value={edit.lang ?? 'vi'}>
    <AbsoluteFill style={{ background: G0 }}>
      <style>{CSS}</style>
      {edit.clips.map((c, i) => <Sequence key={i} from={c.from_ * K} durationInFrames={c.dur * K} name={c.name}><ClipView clip={c} edit={edit} /></Sequence>)}
      {over.map((o, i) => <Sequence key={`o${i}`} from={o.from_ * K} durationInFrames={Math.max(1, o.dur) * K} name={o.kind}><Overlay o={o} /></Sequence>)}
      <Audio src={staticFile(`${edit.id}_mix.wav`)} />
    </AbsoluteFill>
    </Lang.Provider>
  );
};
