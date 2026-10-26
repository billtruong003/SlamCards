import { useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';

// The three shorts (../shorts.py → shorts.json). Style "vở học trò": a school notebook — ruled cream paper, yellow
// tape, paper labels, ink stamps with the game's letters, sticker cut-outs with a white rim.
const INK = '#2a1418';
const CREAM = '#fffbf0';
const YEL = '#ffcf3a';
const PINK = '#e0457b';
const PEN = '#1c5f94';
const FONT = 'Baloo2';

type Clip = { src: string; from_: number; dur: number; t_in: number; rate: number; z: number[]; c: number[]; name: string };
type Over = { kind: string; from_: number; dur: number; [k: string]: unknown };
type Page = { kind: 'intro' | 'drop' | 'end'; from_: number; dur: number };
export type ShortEdit = { id: string; W: number; H: number; fps: number; frames: number; clips: Clip[]; pages: Page[]; over: Over[] };

function useFont() {
  const [handle] = useState(() => delayRender('font'));
  useEffect(() => {
    new FontFace(FONT, `url(${staticFile('fonts/Baloo2-Bold.ttf')})`, { weight: '700' }).load().then((f) => { document.fonts.add(f); continueRender(handle); });
  }, [handle]);
}

const shakeOf = (edit: ShortEdit, f: number) => {
  for (const o of edit.over) {
    if (o.kind !== 'shake' || f < o.from_ || f >= o.from_ + o.dur) continue;
    const k = f - o.from_; const fall = 1 - k / o.dur; const amp = (o.amp as number) ?? 16;
    return [(k % 2 ? -1 : 1) * amp * fall, (Math.floor(k / 2) % 2 ? -1 : 1) * amp * 0.7 * fall];
  }
  return [0, 0];
};

const ClipView = ({ clip, edit }: { clip: Clip; edit: ShortEdit }) => {
  const f = useCurrentFrame();
  const { width: W, height: H } = useVideoConfig();
  const z = interpolate(f, [0, Math.max(1, clip.dur - 1)], [clip.z[0], clip.z[1]], { extrapolateRight: 'clamp' });
  const X = Math.min(Math.max(clip.c[0] * W * z - W / 2, 0), W * z - W);
  const Y = Math.min(Math.max(clip.c[1] * H * z - H / 2, 0), H * z - H);
  const [sx, sy] = shakeOf(edit, clip.from_ + f);
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: INK }}>
      <div style={{ position: 'absolute', left: -X + sx, top: -Y + sy, width: W * z, height: H * z }}>
        <OffthreadVideo src={staticFile(clip.src)} startFrom={Math.round(clip.t_in * edit.fps)} playbackRate={clip.rate} muted
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- notebook pieces
const ruled: React.CSSProperties = {
  background: `#fdf8ea linear-gradient(transparent 0 76px, rgba(73,130,196,.30) 76px 80px) 0 40px / 100% 80px`,
};
const Margin = () => <div style={{ position: 'absolute', top: 0, bottom: 0, left: 150, width: 6, background: 'rgba(224,69,123,.5)' }} />;
const Tape = ({ x, y, w = 220, rot = 0 }: { x: number; y: number; w?: number; rot?: number }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: 66, background: 'rgba(255,222,130,.82)', transform: `rotate(${rot}deg)`,
    boxShadow: '0 2px 5px rgba(0,0,0,.12)', clipPath: 'polygon(2% 0,98% 3%,100% 50%,97% 100%,3% 97%,0 50%)' }} />
);
const Sticker = ({ src, x, y, w, rot = 0, style }: { src: string; x: number; y: number; w: number; rot?: number; style?: React.CSSProperties }) => (
  <Img src={staticFile(src)} style={{ position: 'absolute', left: x, top: y, width: w, transform: `rotate(${rot}deg)`,
    filter: 'drop-shadow(7px 0 0 #fff) drop-shadow(-7px 0 0 #fff) drop-shadow(0 7px 0 #fff) drop-shadow(0 -7px 0 #fff) drop-shadow(0 16px 18px rgba(0,0,0,.28))', ...style }} />
);
const Polaroid = ({ src, x, y, w, h, rot, label }: { src: string; x: number; y: number; w: number; h: number; rot: number; label: string }) => (
  <div style={{ position: 'absolute', left: x, top: y, width: w, height: h, padding: '22px 22px 90px', background: '#fff', transform: `rotate(${rot}deg)`,
    boxShadow: '0 20px 34px rgba(0,0,0,.25)', boxSizing: 'border-box' }}>
    <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 18, textAlign: 'center', fontFamily: FONT, fontSize: 46, color: PEN }}>{label}</div>
  </div>
);
const Pen = ({ t, x, y, size, rot = 0, color = PEN, k = 1 }: { t: string; x: number; y: number; size: number; rot?: number; color?: string; k?: number }) => (
  // handwriting: revealed left to right like a pen stroke (k 0..1)
  <div style={{ position: 'absolute', left: x, top: y, fontFamily: FONT, fontSize: size, color, transform: `rotate(${rot}deg)`, whiteSpace: 'pre', lineHeight: 1.05,
    clipPath: `inset(-20% ${(1 - k) * 100}% -20% -5%)` }}>{t}</div>
);
const stampStyle = (size: number, color: string): React.CSSProperties => ({
  fontFamily: FONT, fontWeight: 700, fontSize: size, lineHeight: 0.92, color, WebkitTextStroke: `${size * 0.1}px ${INK}`, paintOrder: 'stroke fill',
  textShadow: `0 ${size * 0.08}px 0 ${INK}`, textAlign: 'center', textTransform: 'uppercase',
});

const IntroPage = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (d: number) => (f < d ? 0 : spring({ frame: f - d, fps, config: { damping: 11, stiffness: 190 }, from: 0.4, to: 1 }));
  const push = interpolate(f, [0, 112], [1, 1.06]);
  return (
    <AbsoluteFill style={{ ...ruled, transform: `scale(${push})` }}>
      <Margin />
      <Pen t="Giờ ra chơi…" x={200} y={150} size={80} rot={-3} k={interpolate(f, [0, 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      <div style={{ position: 'absolute', left: 60, right: 60, top: 300, transform: `rotate(-3deg) scale(${pop(0)})`, ...stampStyle(124, '#5aa9ef') }}>
        Ai từng<br /><span style={{ color: '#ff5d8f' }}>mất hết hình</span><br />giờ ra chơi?
      </div>
      <div style={{ opacity: f < 14 ? 0 : 1, transform: `scale(${pop(14)})`, transformOrigin: '40% 60%' }}>
        <Polaroid src="media/capture-top.jpg" x={170} y={880} w={660} h={700} rot={-6} label="ăn hình nè!" />
        <Tape x={380} y={850} rot={4} />
      </div>
      <div style={{ opacity: f < 28 ? 0 : 1, transform: `scale(${pop(28)})`, transformOrigin: '80% 85%' }}>
        <Sticker src="media/cut-pet-tiger.png" x={700} y={1430} w={330} rot={10} />
      </div>
      <Pen t="(mất 10 lá trong 1 buổi 😭)" x={160} y={1700} size={52} rot={-2} color={PINK} k={interpolate(f, [44, 74], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </AbsoluteFill>
  );
};

const DropPage = () => {
  // the taped cards on the page, the paper slipper falling at them; hits on the last frame (then the cut)
  const f = useCurrentFrame();
  const k = interpolate(f, [0, 22], [0, 1], { extrapolateRight: 'clamp' });
  const e = k * k * k;
  return (
    <AbsoluteFill style={{ ...ruled }}>
      <Margin />
      <Sticker src="media/cut-card-panda-back.png" x={420} y={760} w={440} rot={8} />
      <Sticker src="media/cut-card-tiger-back.png" x={260} y={560} w={440} rot={-6} />
      <Tape x={420} y={530} rot={-5} />
      <Img src={staticFile('media/cut-dep-dep_lao.png')} style={{ position: 'absolute', left: 210, top: 480, width: 760,
        transform: `translate(${(1 - e) * 120}px, ${(1 - e) * -900}px) rotate(${-30 + (1 - e) * 25}deg) scale(${2.2 - e * 1.2})`,
        filter: `drop-shadow(0 ${30 - e * 20}px ${40 - e * 25}px rgba(0,0,0,${0.15 + e * 0.25}))` }} />
      <Pen t="dép lào huyền thoại" x={190} y={1560} size={66} rot={-4} />
    </AbsoluteFill>
  );
};

const EndPage = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = (d: number) => (f < d ? 0 : spring({ frame: f - d, fps, config: { damping: 10, stiffness: 200 }, from: 1.4, to: 1 }));
  return (
    <AbsoluteFill style={{ ...ruled }}>
      <Margin />
      <Sticker src="media/cut-card-panda-back.png" x={560} y={1150} w={330} rot={12} />
      <Sticker src="media/cut-card-tiger.png" x={330} y={1040} w={360} rot={-8} style={{ transform: `rotate(-8deg) scale(${pop(8)})` }} />
      <Tape x={440} y={1010} rot={-6} />
      <div style={{ position: 'absolute', left: 40, right: 40, top: 240, transform: `rotate(-4deg) scale(${pop(0)})`, ...stampStyle(190, '#ff5d8f'), lineHeight: 0.86 }}>
        Dép Lào<br /><span style={{ color: YEL, fontSize: '1.12em' }}>Tuổi Thơ</span>
      </div>
      <Pen t={'Giờ dích online,\nkhỏi sợ cô bắt'} x={170} y={720} size={78} rot={-3} color={PINK}
        k={interpolate(f, [12, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1590, display: 'flex', justifyContent: 'center', transform: `scale(${pop(30)})` }}>
        <div style={{ fontFamily: FONT, fontSize: 50, color: '#fff', background: PINK, border: `6px solid ${INK}`, boxShadow: `6px 8px 0 ${INK}`, borderRadius: 999, padding: '10px 40px' }}>
          play.billthedevstudio.com/slam-cards
        </div>
      </div>
      <Pen t={'Ý tưởng game: ThuanBui (David)'+String.fromCharCode(10)+'Làm game: BillTheDev'} x={300} y={1730} size={44} color={PEN}
        k={interpolate(f, [44, 70], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- overlays
const Label = ({ o }: { o: Over }) => {
  // a torn paper label taped on top of the picture
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const k = spring({ frame: f, fps, config: { damping: 13, stiffness: 200 } });
  const out = interpolate(f, [o.dur - 4, o.dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: (o.y as number) * height, display: 'flex', justifyContent: 'center', opacity: out,
      transform: `translateY(${(1 - k) * -40}px) rotate(-2.5deg)` }}>
      <div style={{ position: 'relative', background: '#fdf8ea', padding: '18px 46px 22px', fontFamily: FONT, fontSize: 68, color: INK,
        boxShadow: '0 10px 22px rgba(0,0,0,.28)', clipPath: 'polygon(0 6%,4% 0,30% 5%,55% 0,80% 4%,100% 0,98% 50%,100% 100%,70% 95%,40% 100%,12% 96%,0 100%,2% 50%)' }}>
        {o.t as string}
      </div>
      <div style={{ position: 'absolute', top: -22, left: '50%', marginLeft: -100, width: 200, height: 60, background: 'rgba(255,222,130,.85)', transform: 'rotate(4deg)' }} />
    </div>
  );
};

const Tally = ({ o }: { o: Over }) => {
  // the attempts, counted in pen on a sticky note (or the score, for the cliffhanger)
  const n = o.n as number;
  return (
    <div style={{ position: 'absolute', right: 50, top: 300, width: 230, padding: '16px 18px', background: '#fff3a8', boxShadow: '0 10px 18px rgba(0,0,0,.25)',
      transform: 'rotate(5deg)', fontFamily: FONT, color: PEN, textAlign: 'center' }}>
      {o.score
        ? <><div style={{ fontSize: 34 }}>Bill – Tèo</div><div style={{ fontSize: 80, lineHeight: 1 }}>1 – 1</div></>
        : <><div style={{ fontSize: 34 }}>Lần thử</div><div style={{ fontSize: 76, lineHeight: 1, letterSpacing: 6 }}>{'|'.repeat(Math.min(n, 4))}{n >= 4 ? '' : ''}</div>
          <div style={{ fontSize: 30, color: PINK }}>{n >= 4 ? 'lần 4!' : `lần ${n}`}</div></>}
    </div>
  );
};

const Stamp = ({ o }: { o: Over }) => {
  const f = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const s = spring({ frame: f, fps, config: { damping: 9, stiffness: 230, mass: 0.6 }, from: 1.6, to: 1 });
  const size = o.size as number;
  const color = o.color === 'pink' ? '#ff5d8f' : YEL;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: (o.y as number) * height, transform: `translateY(-50%) rotate(${o.tilt as number}deg) scale(${s})`,
      ...stampStyle(size, color) }}>{o.t as string}</div>
  );
};

const Question = ({ o }: { o: Over }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f, fps, config: { damping: 10, stiffness: 220 }, from: 1.5, to: 1 });
  const b = f < 10 ? 0 : spring({ frame: f - 10, fps, config: { damping: 10, stiffness: 220 }, from: 1.5, to: 1 });
  return (
    <>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 230, transform: `rotate(-5deg) scale(${a})`, ...stampStyle(190, YEL) }}>{o.a as string}</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1480, opacity: f < 10 ? 0 : 1, transform: `rotate(4deg) scale(${b})`, ...stampStyle(160, '#ff5d8f') }}>{o.b as string}</div>
    </>
  );
};

const Count = ({ o }: { o: Over }) => {
  const f = useCurrentFrame();
  const ts = o.t as string[]; const per = o.dur / ts.length; const i = Math.min(ts.length - 1, Math.floor(f / per));
  const k = (f - i * per) / per;
  return <div style={{ position: 'absolute', left: 0, right: 0, top: 1380, ...stampStyle(260, CREAM), opacity: 1 - k * 0.6, transform: `scale(${1.4 - k * 0.4})` }}>{ts[i]}</div>;
};

const Tape2 = ({ o }: { o: Over }) => {
  const { height } = useVideoConfig();
  const f = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: (o.y as number) * height, display: 'flex', justifyContent: 'center', opacity: Math.min(1, f / 4) }}>
      <div style={{ background: 'rgba(255,222,130,.92)', padding: '10px 36px', fontFamily: FONT, fontSize: 44, color: INK, transform: 'rotate(-2deg)', boxShadow: '0 4px 8px rgba(0,0,0,.2)' }}>
        {o.t as string}
      </div>
    </div>
  );
};

const Overlay = ({ o }: { o: Over }) => {
  const f = useCurrentFrame();
  switch (o.kind) {
    case 'label': return <Label o={o} />;
    case 'tally': return <Tally o={o} />;
    case 'stamp': return <Stamp o={o} />;
    case 'question': return <Question o={o} />;
    case 'count': return <Count o={o} />;
    case 'tape': return <Tape2 o={o} />;
    case 'flash': return <AbsoluteFill style={{ background: '#fff', opacity: 0.85 * (1 - f / o.dur) }} />;
    case 'dim': return <AbsoluteFill style={{ background: INK, opacity: (o.strength as number) * Math.min(1, f / 8) }} />;
    case 'vignette': return <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(170,20,50,${o.strength as number}) 100%)` }} />;
    case 'pulse': return <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(170,20,50,.35) 100%)', opacity: 1 - f / o.dur }} />;
    case 'pause': return (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: interpolate(f, [0, 4, o.dur - 8, o.dur], [0, 1, 1, 0]) }}>
        <div style={{ width: 200, height: 200, borderRadius: 40, background: 'rgba(255,251,240,.92)', border: `8px solid ${INK}`, display: 'flex', gap: 30, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 34, height: 100, background: INK, borderRadius: 8 }} /><div style={{ width: 34, height: 100, background: INK, borderRadius: 8 }} />
        </div>
      </AbsoluteFill>);
    default: return null;
  }
};

export const ShortCut = ({ edit }: { edit: ShortEdit }) => {
  useFont();
  const order = ['vignette', 'pulse', 'dim', 'flash', 'tape', 'tally', 'label', 'count', 'pause', 'question', 'stamp'];
  const over = [...edit.over].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return (
    <AbsoluteFill style={{ background: INK }}>
      {edit.clips.map((c, i) => <Sequence key={i} from={c.from_} durationInFrames={c.dur} name={c.name}><ClipView clip={c} edit={edit} /></Sequence>)}
      {edit.pages.map((p, i) => (
        <Sequence key={`p${i}`} from={p.from_} durationInFrames={p.dur} name={`Trang vở · ${p.kind}`}>
          {p.kind === 'intro' ? <IntroPage /> : p.kind === 'drop' ? <DropPage /> : <EndPage />}
        </Sequence>
      ))}
      {over.map((o, i) => <Sequence key={`o${i}`} from={o.from_} durationInFrames={Math.max(1, o.dur)} name={o.kind}><Overlay o={o} /></Sequence>)}
      <Audio src={staticFile(`${edit.id}_mix.wav`)} />
    </AbsoluteFill>
  );
};
