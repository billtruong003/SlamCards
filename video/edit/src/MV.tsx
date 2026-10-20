import { useEffect, useState } from 'react';
import {
  AbsoluteFill, Audio, OffthreadVideo, Sequence, continueRender, delayRender, interpolate, spring, staticFile,
  useCurrentFrame, useVideoConfig,
} from 'remotion';

// The "Super Hero" MV mockup (../mv/mv_edit.py → mv.json): chorus 1 cut from the filmed takes, every sung word on
// screen at its own time. Type: Bungee for the hero words (SUPERHERO, BỐP!, the names), Baloo 2 (the game's) for the rest.
const INK = '#241418';
const YEL = '#FFC93C';
const PINK = '#E2457E';
const CREAM = '#FBF3E4';
const BUNGEE = "'Bungee', 'Baloo 2', sans-serif";
const BALOO = "'Baloo 2', sans-serif";

type Word = { t: number; e: number; w: string };
type Line = { from_: number; to: number; words: Word[] };
type Clip = { src: string; from_: number; dur: number; t_in: number; rate: number };
export type MVEdit = {
  id: string; W: number; H: number; fps: number; dur: number; song_from: number;
  clips: Clip[]; lines: Line[]; hit: number; supers: number[]; beats: number[];
  hero: { from_: number; to: number; name: string; tag: string }; title: { from_: number; to: number };
};

function useFonts() {
  const [handle] = useState(() => delayRender('fonts', { timeoutInMilliseconds: 90000 }));
  useEffect(() => {
    const vi = 'Xóa hết mọi thứ Giải cứu thế giới DÉP LÀO TUỔI THƠ HỔ BỐP';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Bungee&display=block';
    link.onload = () => Promise.all([document.fonts.load('800 60px "Baloo 2"', vi), document.fonts.load('60px Bungee', vi)])
      .then(() => continueRender(handle));
    document.head.appendChild(link);
  }, [handle]);
}

const useT = () => { const f = useCurrentFrame(); const { fps } = useVideoConfig(); return f / fps; };
const isSuper = (w: string) => w.toLowerCase().startsWith('superhero');

// the slam: a camera shake and a white flash; each "superhero" a zoom punch
function camera(edit: MVEdit, t: number) {
  let sx = 0; let sy = 0; let zoom = 1;
  const k = t - edit.hit;
  if (k >= 0 && k < 0.35) { const a = 22 * (1 - k / 0.35); const n = Math.floor(k * 60); sx = (n % 2 ? -1 : 1) * a; sy = (Math.floor(n / 2) % 2 ? -1 : 1) * a * 0.6; }
  for (const s of [...edit.supers, edit.hit]) { const d = t - s; if (d >= 0 && d < 0.45) zoom += 0.07 * (1 - d / 0.45) ** 2; }
  return { transform: `translate(${sx}px, ${sy}px) scale(${zoom})` };
}

function Lyrics({ edit }: { edit: MVEdit }) {
  const t = useT();
  const line = edit.lines.find((l) => t >= l.from_ - 0.15 && t < l.to);
  if (!line) return null;
  const big = line.words.length <= 5;
  return (
    <div style={{ position: 'absolute', left: 120, right: 120, bottom: 96, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', gap: '0 22px' }}>
      {line.words.map((w, i) => {
        const age = t - w.t;
        if (age < -0.06) return <span key={i} style={{ visibility: 'hidden', fontFamily: BALOO, fontSize: big ? 86 : 64 }}>{w.w}</span>;
        const pop = spring({ frame: Math.max(0, age) * 60, fps: 60, config: { damping: 12, stiffness: 220, mass: 0.6 } });
        const singing = t >= w.t && t < w.e + 0.08;
        const hero = isSuper(w.w);
        const exit = interpolate(t, [line.to - 0.12, line.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        return (
          <span key={i} style={{
            display: 'inline-block', fontFamily: hero ? BUNGEE : BALOO, fontWeight: 800,
            fontSize: hero ? (big ? 120 : 92) : (big ? 86 : 64), lineHeight: 1.05,
            color: hero ? YEL : singing ? '#ffffff' : CREAM,
            transform: `translateY(${(1 - pop) * 40}px) scale(${0.6 + 0.4 * pop}) rotate(${hero ? -4 : (i % 2 ? 1.5 : -1.5)}deg)`,
            opacity: Math.min(1, pop * 1.4) * exit,
            textShadow: `0 ${hero ? 7 : 5}px 0 ${hero ? INK : 'rgba(36,20,24,0.85)'}, 0 10px 28px rgba(0,0,0,0.35)`,
          }}>{w.w}</span>
        );
      })}
    </div>
  );
}

function Hero({ edit }: { edit: MVEdit }) {
  const t = useT();
  const { from_, to, name, tag } = edit.hero;
  if (t < from_ || t >= to) return null;
  const k = spring({ frame: (t - from_) * 60, fps: 60, config: { damping: 14, stiffness: 180 } });
  const k2 = spring({ frame: Math.max(0, t - from_ - 0.25) * 60, fps: 60, config: { damping: 16, stiffness: 160 } });
  return (
    <div style={{ position: 'absolute', left: 110, top: 150, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontFamily: BALOO, fontWeight: 800, fontSize: 30, letterSpacing: '0.18em', color: YEL, opacity: k }}>01 / 04</div>
      <div style={{ fontFamily: BUNGEE, fontSize: 170, lineHeight: 0.9, color: '#fff', transform: `translateX(${(1 - k) * -120}px)`, opacity: k, textShadow: `0 9px 0 ${PINK}, 0 18px 34px rgba(0,0,0,0.35)` }}>{name}</div>
      <div style={{ alignSelf: 'flex-start', marginTop: 12, padding: '8px 22px', background: PINK, color: '#fff', fontFamily: BALOO, fontWeight: 800, fontSize: 36, transform: `skewX(-10deg) translateX(${(1 - k2) * -260}px)`, opacity: k2 }}>{tag}</div>
    </div>
  );
}

function Bop({ edit }: { edit: MVEdit }) {
  const t = useT();
  const k = t - edit.hit;
  if (k < 0 || k > 0.9) return null;
  const s = spring({ frame: k * 60, fps: 60, config: { damping: 9, stiffness: 300, mass: 0.5 } });
  const fade = interpolate(k, [0.6, 0.9], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      <AbsoluteFill style={{ background: '#fff', opacity: interpolate(k, [0, 0.08, 0.2], [0.85, 0.5, 0], { extrapolateRight: 'clamp' }) }} />
      <div style={{ position: 'absolute', left: '50%', top: 300, transform: `translate(-50%, -50%) rotate(-8deg) scale(${0.3 + 0.9 * s})`, opacity: fade, fontFamily: BUNGEE, fontSize: 190, color: YEL, textShadow: `0 10px 0 ${INK}, 0 20px 40px rgba(0,0,0,0.4)` }}>BỐP!</div>
    </>
  );
}

function Title({ edit }: { edit: MVEdit }) {
  const t = useT();
  const { from_ } = edit.title;
  if (t < from_) return null;
  const k = spring({ frame: (t - from_) * 60, fps: 60, config: { damping: 14, stiffness: 140 } });
  const k2 = spring({ frame: Math.max(0, t - from_ - 0.35) * 60, fps: 60, config: { damping: 14, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(29,18,32,0) 30%, rgba(29,18,32,${0.75 * k}) 100%)`, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 250, flexDirection: 'column', gap: 26 }}>
      <div style={{ fontFamily: BUNGEE, fontSize: 132, color: '#fff', transform: `translateY(${(1 - k) * 80}px) scale(${0.85 + 0.15 * k})`, opacity: k, textShadow: `0 10px 0 ${PINK}, 0 22px 40px rgba(0,0,0,0.4)` }}>DÉP LÀO TUỔI THƠ</div>
      <div style={{ padding: '14px 40px', borderRadius: 999, background: YEL, color: INK, fontFamily: BALOO, fontWeight: 800, fontSize: 44, transform: `translateY(${(1 - k2) * 60}px)`, opacity: k2 }}>Chơi free · gửi link là chơi</div>
    </AbsoluteFill>
  );
}

export const MV = ({ edit }: { edit: MVEdit }) => {
  useFonts();
  const t = useT();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: INK }}>
      <AbsoluteFill style={camera(edit, t)}>
        {edit.clips.map((c, i) => (
          <Sequence key={i} from={Math.round(c.from_ * fps)} durationInFrames={Math.round(c.dur * fps)}>
            <OffthreadVideo src={staticFile(c.src)} startFrom={Math.round(c.t_in * fps)} playbackRate={c.rate} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Sequence>
        ))}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(20,8,16,0.45) 100%)' }} />
      <Hero edit={edit} />
      <Bop edit={edit} />
      <Lyrics edit={edit} />
      <Title edit={edit} />
      <Audio src={staticFile('mv/song.mp3')} startFrom={Math.round(edit.song_from * fps)} />
      <Sequence from={Math.round((edit.hit - 0.02) * fps)}><Audio src={staticFile('mv/game_thump_2.wav')} volume={0.9} /></Sequence>
      <Sequence from={Math.round((edit.clips[2].from_ + 0.5) * fps)}><Audio src={staticFile('mv/riser.wav')} volume={0.35} /></Sequence>
      <Sequence from={Math.round((edit.clips[3].from_ + 0.1) * fps)}><Audio src={staticFile('mv/flip.wav')} volume={0.6} /></Sequence>
    </AbsoluteFill>
  );
};
