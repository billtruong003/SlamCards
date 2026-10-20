import { useEffect, useState } from 'react';
import edl from './edl.json';
import './chat.css';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';

// One type system for both videos: the game's own "BỐP!" stamp (Baloo 2, cream, thick ink outline, ink drop shadow),
// key words in the game's yellow; the chat bubbles and the end card use the game's cream / ink / pink.
const INK = '#2a1418';
const CREAM = '#fffbf0';
const YEL = '#ffc93c';
const PINK = '#a34e71';
const FONT = 'Baloo2';
const COVERS = (edl as unknown as { covers: Record<string, { box: number[]; t: number[] }[]> }).covers;
const LIVE = (edl as unknown as { live: string }).live;

// Boxes of a picture (0..1) painted over with the live address: the filmed lobby shows the local test server's.
const Covers = ({ src, t }: { src: string; t: number }) => (
  <>
    {(COVERS[src] ?? []).filter((c) => t >= c.t[0] && t < c.t[1]).map(({ box: [x0, y0, x1, y1] }, i) => (
      <div key={i} style={{ position: 'absolute', left: `${x0 * 100}%`, top: `${y0 * 100}%`, width: `${(x1 - x0) * 100}%`, height: `${(y1 - y0) * 100}%`,
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', containerType: 'size' }}>
        <span style={{ fontFamily: FONT, color: INK, fontSize: 'min(34cqh, 6.3cqw)', whiteSpace: 'nowrap' }}>{LIVE.replace('/slam-cards', '/slam…')}</span>
      </div>
    ))}
  </>
);

type Clip = { id: string; name: string; src: string; from_: number; dur: number; t_in: number; rate: number; z: number[]; c: number[] };
type Text = { t: string; from_: number; dur: number; y: number; style: 'stamp' | 'head'; size: number; hl: boolean; tilt: number };
type Chat = { who: 'teo' | 'bill'; t: string; from_: number; dur: number; row?: number };
type Tap = { clip: string; at: number; x: number; y: number };
type Split = { from_: number; dur: number; left: { src: string; t_in: number }; right: { src: string; t_in: number }; labels: string[] };
export type Edit = {
  id: string; W: number; H: number; fps: number; frames: number; clips: Clip[]; texts: Text[]; chats: Chat[]; taps: Tap[];
  flashes: number[]; shakes: number[][]; splits: Split[]; ends: { from_: number; dur: number }[];
};

function useFont() {
  const [handle] = useState(() => delayRender('font'));
  useEffect(() => {
    const face = new FontFace(FONT, `url(${staticFile('fonts/Baloo2-Bold.ttf')})`, { weight: '700' });
    face.load().then((f) => { document.fonts.add(f); continueRender(handle); });
  }, [handle]);
}

// The window of a W x H picture zoomed by z, centred on c and kept inside the picture (same as render.py's view()).
function windowOf(W: number, H: number, z: number, c: number[]) {
  const X = Math.min(Math.max(c[0] * W * z - W / 2, 0), W * z - W);
  const Y = Math.min(Math.max(c[1] * H * z - H / 2, 0), H * z - H);
  return { X, Y };
}

function shakeAt(edit: Edit, f: number) {
  for (const [at, n, amp] of edit.shakes) {
    if (f >= at && f < at + n) {
      const k = f - at; const fall = 1 - k / n;
      return [(k % 2 ? -1 : 1) * amp * fall, (Math.floor(k / 2) % 2 ? -1 : 1) * amp * 0.7 * fall];
    }
  }
  return [0, 0];
}

const ClipView = ({ clip, edit, ending }: { clip: Clip; edit: Edit; ending: boolean }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const t = f / Math.max(1, clip.dur - 1);
  const z = interpolate(t, [0, 1], [clip.z[0], clip.z[1]]);
  const { X, Y } = windowOf(W, H, z, clip.c);
  const [sx, sy] = shakeAt(edit, clip.from_ + f);
  const taps = edit.taps.filter((p) => p.clip === clip.id);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: INK }}>
      <div style={{ position: 'absolute', left: -X + sx, top: -Y + sy, width: W * z, height: H * z, filter: ending ? 'blur(16px) brightness(0.55)' : undefined }}>
        <OffthreadVideo src={staticFile(clip.src)} startFrom={Math.round(clip.t_in * edit.fps)} playbackRate={clip.rate} muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <Covers src={clip.src} t={clip.t_in + (f / edit.fps) * clip.rate} />
      </div>
      {taps.map((p) => <TapRing key={p.at} at={p.at - clip.from_} x={p.x * W * z - X} y={p.y * H * z - Y} />)}
    </AbsoluteFill>
  );
};

const TapRing = ({ at, x, y }: { at: number; x: number; y: number }) => {
  const f = useCurrentFrame() - at;
  const { width } = useVideoConfig();
  if (f < -6 || f > 12) return null;
  const r = width * 0.032;
  const press = f < 4 ? 1 : Math.max(0, 1 - (f - 4) / 5);
  const ring = f >= 0 ? f / 12 : 0;
  return (
    <>
      <div style={{ position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: 'rgba(255,255,255,.85)', border: `5px solid ${INK}`, opacity: press, transform: `scale(${f < 0 ? 1 : 0.9})` }} />
      {f >= 0 && <div style={{ position: 'absolute', left: x - r * (1 + ring * 1.6), top: y - r * (1 + ring * 1.6), width: r * 2 * (1 + ring * 1.6), height: r * 2 * (1 + ring * 1.6), borderRadius: '50%', border: '6px solid white', opacity: 1 - ring }} />}
    </>
  );
};

const Words = ({ t, hl }: { t: string; hl: boolean }) => (
  <>
    {t.split('\n').map((line, i) => (
      <div key={i}>
        {line.split(/(\*[^*]+\*)/).filter(Boolean).map((part, j) => {
          const key = part.startsWith('*');
          return <span key={j} style={{ color: key || hl ? YEL : CREAM }}>{part.replace(/\*/g, '')}</span>;
        })}
      </div>
    ))}
  </>
);

const TextView = ({ tx }: { tx: Text }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const size = tx.size * (width / 1080) * (width > height ? 0.75 : 1);
  const out = interpolate(f, [tx.dur - 4, tx.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const stroke = Math.max(4, size * 0.09);
  const base: React.CSSProperties = {
    position: 'absolute', left: 0, right: 0, top: tx.y * height, textAlign: 'center', fontFamily: FONT, fontWeight: 700,
    fontSize: size, lineHeight: 1.02, WebkitTextStroke: `${stroke}px ${INK}`, paintOrder: 'stroke fill',
    textShadow: `0 ${size * 0.07}px 0 ${INK}`, opacity: out,
  };
  if (tx.style === 'stamp') {
    const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 220, mass: 0.6 }, from: 1.5, to: 1 });
    return <div style={{ ...base, transform: `translateY(-50%) rotate(${tx.tilt}deg) scale(${s})` }}><Words t={tx.t} hl={tx.hl} /></div>;
  }
  const k = spring({ frame: f, fps, config: { damping: 16, stiffness: 160 } });
  return (
    <div style={{ ...base, transform: `translateY(calc(-50% + ${(1 - k) * 40}px))`, opacity: out * k }}>
      <span style={{ display: 'inline-block', padding: `${size * 0.18}px ${size * 0.42}px`, borderRadius: size * 0.4, background: 'rgba(42,20,24,.62)', boxShadow: `0 0 ${size * 0.5}px rgba(42,20,24,.45)` }}>
        <Words t={tx.t} hl={tx.hl} />
      </span>
    </div>
  );
};

// A chat line, big: the module mocked up in video/design/chat-modules.html (chat.css), popping in like the game's
// bubbles. Rows stack under each other (row 1 is the reply); the text carries its own line breaks.
const ChatView = ({ c }: { c: Chat }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const u = portrait ? 3 : 2.6;
  const s = spring({ frame: f, fps, config: { damping: 11, stiffness: 210 }, from: 0.3, to: 1 });
  const out = interpolate(f, [c.dur - 4, c.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const mine = c.who === 'bill';
  const box: React.CSSProperties = portrait
    ? { left: 48, right: 48, top: height * 0.27 + (c.row ?? 0) * 84 * u }
    : { left: 80, width: 900, top: 180 + (c.row ?? 0) * 84 * u };
  return (
    <div className="vchat" style={{ position: 'absolute', ...box, ['--u' as string]: `${u}px`, opacity: out }}>
      <div className={`vmsg ${mine ? 'bill' : 'teo'}`} style={{ transform: `scale(${s})`, transformOrigin: mine ? 'right bottom' : 'left bottom' }}>
        <div className="vav"><Img src={staticFile(`pets/${mine ? 'tiger' : 'panda'}.png`)} /></div>
        <div className="vbub">
          <span className="vwho">{mine ? 'Bill' : 'Tèo'}</span>
          <p>{c.t}</p>
          <svg className="vtail" viewBox="0 0 15 16"><path className="f" d="M15 0 L13.5 0 L1.5 14.5 L15 14.5 Z" /><path className="s" d="M13.5 0 L1.5 14.5 L20 14.5" /></svg>
        </div>
      </div>
    </div>
  );
};

const SplitView = ({ sp, edit }: { sp: Split; edit: Edit }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const k = spring({ frame: f, fps, config: { damping: 15, stiffness: 140 } });
  const lw = W * 0.6; const lh = lw * 9 / 16; const ly = (H - lh) / 2 - 30;
  const ph = H * 0.8; const pw = ph * 9 / 16; const py = (H - ph) / 2 - 30;
  const frame = (r: number): React.CSSProperties => ({ position: 'absolute', border: `8px solid ${INK}`, borderRadius: r, overflow: 'hidden', boxShadow: `10px 12px 0 ${INK}`, background: INK });
  const label: React.CSSProperties = { position: 'absolute', fontFamily: FONT, fontSize: 38, color: INK, textAlign: 'center' };
  return (
    <AbsoluteFill style={{ background: '#f6eedb' }}>
      <div style={{ ...frame(26), left: W * 0.05 - (1 - k) * 300, top: ly, width: lw, height: lh }}>
        <OffthreadVideo src={staticFile(sp.left.src)} startFrom={Math.round(sp.left.t_in * edit.fps)} muted style={{ width: '100%', height: '100%' }} />
        <Covers src={sp.left.src} t={sp.left.t_in + f / edit.fps} />
      </div>
      <div style={{ ...frame(48), left: W * 0.71 + (1 - k) * 300, top: py, width: pw, height: ph }}>
        <OffthreadVideo src={staticFile(sp.right.src)} startFrom={Math.round(sp.right.t_in * edit.fps)} muted style={{ width: '100%', height: '100%' }} />
        <Covers src={sp.right.src} t={sp.right.t_in + f / edit.fps} />
      </div>
      <div style={{ ...label, left: W * 0.05, width: lw, top: ly + lh + 26 }}>{sp.labels[0]}</div>
      <div style={{ ...label, left: W * 0.71, width: pw, top: py - 56 }}>{sp.labels[1]}</div>
    </AbsoluteFill>
  );
};

const EndCard = () => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const portrait = height > width;
  const u = portrait ? width / 1080 : height / 1080;
  const pop = (d: number) => (f < d ? 0 : spring({ frame: f - d, fps, config: { damping: 10, stiffness: 200 }, from: 1.4, to: 1 }));
  const st: React.CSSProperties = { fontFamily: FONT, color: CREAM, WebkitTextStroke: `${10 * u}px ${INK}`, paintOrder: 'stroke fill', textShadow: `0 ${9 * u}px 0 ${INK}` };
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 26 * u }}>
      <div style={{ ...st, fontSize: 170 * u, lineHeight: 0.98, transform: `rotate(-3deg) scale(${pop(0)})` }}>Dép Lào<br />Tuổi Thơ</div>
      <div style={{ ...st, fontSize: 70 * u, WebkitTextStroke: `${7 * u}px ${INK}`, transform: `scale(${pop(6)})` }}>chơi <span style={{ color: YEL }}>free</span> trên web</div>
      <div style={{ fontFamily: FONT, fontSize: 46 * u, color: '#fff', background: PINK, border: `6px solid ${INK}`, boxShadow: `6px 8px 0 ${INK}`, borderRadius: 999,
        padding: `${10 * u}px ${40 * u}px`, transform: `scale(${pop(10)})` }}>billthedevstudio.io.vn/slam-cards</div>
      <div style={{ ...st, fontSize: 42 * u, WebkitTextStroke: `${5 * u}px ${INK}`, textShadow: 'none', opacity: f < 16 ? 0 : 1, lineHeight: 1.35 }}>
        Ý tưởng game: ThuanBui (David)<br />Làm game: BillTheDev
      </div>
    </AbsoluteFill>
  );
};

const Flash = ({ edit }: { edit: Edit }) => {
  const f = useCurrentFrame();
  const at = edit.flashes.find((a) => f >= a && f < a + 4);
  if (at === undefined) return null;
  return <AbsoluteFill style={{ background: 'white', opacity: 0.85 * (1 - (f - at) / 4) }} />;
};

export const Cut = ({ edit }: { edit: Edit }) => {
  useFont();
  const endAt = edit.ends[0]?.from_ ?? Infinity;
  return (
    <AbsoluteFill style={{ background: INK }}>
      {edit.clips.map((c) => (
        <Sequence key={c.id} from={c.from_} durationInFrames={c.dur} name={c.name}>
          <ClipView clip={c} edit={edit} ending={c.from_ >= endAt} />
        </Sequence>
      ))}
      {edit.splits.map((s) => <Sequence key={s.from_} from={s.from_} durationInFrames={s.dur} name="Chia đôi"><SplitView sp={s} edit={edit} /></Sequence>)}
      <Flash edit={edit} />
      {edit.chats.map((c) => <Sequence key={c.from_} from={c.from_} durationInFrames={c.dur} name={`chat ${c.who}`}><ChatView c={c} /></Sequence>)}
      {edit.texts.map((t) => <Sequence key={`${t.from_}${t.t}`} from={t.from_} durationInFrames={t.dur} name={t.t}><TextView tx={t} /></Sequence>)}
      {edit.ends.map((e) => <Sequence key={e.from_} from={e.from_} durationInFrames={e.dur} name="Khung kết"><EndCard /></Sequence>)}
      <Audio src={staticFile(`${edit.id}_mix.wav`)} />
    </AbsoluteFill>
  );
};
