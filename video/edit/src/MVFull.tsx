import { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame } from 'remotion';
import grid from './mvgrid.json';
import list from './mvshotlist.json';
import { SHOTS } from './mvshots';
import { ShotLen } from './mvkit';

// The whole MV "Đội Dép Lào" on "Super Hero" (Cao Bá Hưng x SR x Hoaprox): every shot of the approved mockup
// (mvshotlist.json) cut on the song's bar grid (mvgrid.json), each drawn by its SHOTS function over its own 0..1.
export const MV_FPS = 30;
export const SONG_END = 249.2;
type Shot = { id: string; bar: number; beats: number };

const near = (xs: number[], t: number) => xs.reduce((bi, x, i) => (Math.abs(x - t) < Math.abs(xs[bi] - t) ? i : bi), 0);
export const MV_CUTS = (list.shots as Shot[]).map((s, i) => {
  const t0 = i === 0 ? 0 : grid.bars[s.bar - 1];
  const b = near(grid.beats, grid.bars[s.bar - 1]);
  const t1 = s.beats && b + s.beats < grid.beats.length ? grid.beats[b + s.beats] : SONG_END;
  return { id: s.id, from: Math.round(t0 * MV_FPS), dur: Math.max(1, Math.round(t1 * MV_FPS) - Math.round(t0 * MV_FPS)) };
});
export const MV_FRAMES = Math.round(SONG_END * MV_FPS);

// sound effects on top of the song: the game's thump on every impact, a riser into the drops, a flip on card turns
const SFX: [string, string, number, number][] = [
  // [shot, file, at (0..1 of the shot), volume]
  ['0.4', 'riser.wav', 0.35, 0.35], ['2.7', 'riser.wav', 0.0, 0.4], ['3.1', 'game_thump_2.wav', 0.02, 0.9], ['4.1', 'game_thump_2.wav', 0.05, 0.6],
  ['4.2', 'game_thump_2.wav', 0.05, 0.6], ['5.1', 'game_thump_2.wav', 0.05, 1.0], ['6.2', 'flip.wav', 0.42, 0.7], ['6.5', 'flip.wav', 0.38, 0.7],
  ['7.4', 'game_thump_2.wav', 0.88, 0.8], ['8.6', 'game_thump_2.wav', 0.02, 0.8], ['9.2', 'riser.wav', 0.3, 0.4], ['11.1', 'game_thump_2.wav', 0.02, 1.0],
  ['12.5', 'game_thump_2.wav', 0.42, 0.5], ['12.5', 'game_thump_2.wav', 0.49, 0.5], ['12.5', 'game_thump_2.wav', 0.56, 0.5], ['12.5', 'game_thump_2.wav', 0.63, 0.5],
];

function useFonts() {
  const [handle] = useState(() => delayRender('fonts', { timeoutInMilliseconds: 90000 }));
  useEffect(() => {
    const vi = 'DÉP LÀO TUỔI THƠ GIỜ RA CHƠI ĂN HÌNH Sư Tử Gấu Trúc Gà Con Cáo';
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800&family=Nunito:wght@700;800;900&display=block';
    link.onload = () => Promise.all([document.fonts.load('800 60px "Baloo 2"', vi), document.fonts.load('900 60px Nunito', vi), document.fonts.load('800 60px Nunito', vi)])
      .then(() => continueRender(handle));
    document.head.appendChild(link);
  }, [handle]);
}

const ShotView = ({ id, dur }: { id: string; dur: number }) => {
  const f = useCurrentFrame();
  const draw = SHOTS[id];
  return <ShotLen.Provider value={dur}><AbsoluteFill style={{ overflow: 'hidden' }}>{draw ? draw(Math.min(1, f / dur)) : null}</AbsoluteFill></ShotLen.Provider>;
};

export const MVFull = () => {
  useFonts();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {MV_CUTS.map((c) => <Sequence key={c.id} from={c.from} durationInFrames={c.dur} name={c.id}><ShotView id={c.id} dur={c.dur} /></Sequence>)}
      <Audio src={staticFile('mv/song.mp3')} />
      {SFX.map(([id, file, at, vol], i) => {
        const c = MV_CUTS.find((x) => x.id === id);
        return c ? <Sequence key={`s${i}`} from={c.from + Math.round(c.dur * at)} name={`sfx ${id}`}><Audio src={staticFile(`mv/${file}`)} volume={vol} /></Sequence> : null;
      })}
    </AbsoluteFill>
  );
};
