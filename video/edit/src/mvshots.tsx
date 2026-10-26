import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Logo } from './Shorts5';
import {
  BALOO, BLUE, BUNGEE, Chunk, Take, Cloud, NUNITO, PLUM, SKY_GRAD, SUN, Bars, Beams, CREAM, Cam, Confetti, Duo, Dust, GREEN, Grain, Halftone, INK, INLINE, Impact, PINK, Panel, Paper,
  Pet, Plate, Prop, RED, Rays, Ribbon, Rings, Speed, Streaks, Type, Vignette, YEL, clamp01, ease, lerp, outE, rnd, win,
} from './mvkit';

// Every shot of the MV as a function of its progress t (0..1). The timing (bar, beats) and the notes live in
// ../mv/shots.json; the mockup renders t = 0.08 / 0.5 / 0.92 of each.
type R = (t: number) => JSX.Element;
const TEAM = ['tiger', 'panda', 'chick', 'fox'];
const GANG = ['lion', 'crab', 'hog', 'elephant'];
const TEAM_C = { tiger: PINK, panda: BLUE, chick: SUN, fox: GREEN } as Record<string, string>;
const NAME = { tiger: 'HỔ', panda: 'GẤU TRÚC', chick: 'GÀ CON', fox: 'CÁO', lion: 'SƯ TỬ', crab: 'CUA', hog: 'HEO RỪNG', elephant: 'VOI' } as Record<string, string>;
const TAG = { tiger: 'Chiến thần dép lào', panda: 'Chậm mà chắc', chick: 'Nhỏ mà có võ', fox: 'Gió nào cũng lật' } as Record<string, string>;

// an anime eyecatch: flat colour, rays, halftone, the hero big, its name
const poster = (id: string, i: number, color: string, flip = false): R => (t) => (
  <AbsoluteFill style={{ background: color }}>
    <Rays cx={flip ? 1350 : 570} cy={560} color="rgba(255,255,255,0.22)" n={18} rot={t * 30} fade={1300} />
    <Halftone color="rgba(36,20,24,0.18)" size={26} dot={6} mask={flip ? 'linear-gradient(225deg, black, transparent 60%)' : 'linear-gradient(135deg, black, transparent 60%)'} />
    <div style={{ position: 'absolute', left: flip ? 0 : 980, top: -100, width: 940, height: 1300, background: 'rgba(255,255,255,0.12)', transform: 'skewX(-12deg)' }} />
    <Cam t={t} s={[1.08, 1.0]} x={[flip ? 40 : -40, 0]}>
      <Pet id={id} pose="tq" x={flip ? 1380 : 560} y={1060} h={lerp(860, 900, t)} flip={flip} />
    </Cam>
    <Type text={`0${i}`} x={flip ? 120 : 1180} y={250} size={60} font={BALOO} color={INK} drop={0} align="left" show={win(t, 0, 0.2)} />
    <Type text={NAME[id]} x={flip ? 120 : 1180} y={420} size={NAME[id].length > 4 ? 120 : 170} color="#fff" drop={6} stroke="rgba(36,20,24,0.55)" align="left" show={win(t, 0.05, 0.35)} />
    <div style={{ position: 'absolute', left: flip ? 124 : 1184, top: 520, width: 420 * outE(win(t, 0.2, 0.5)), height: 4, background: '#fff', opacity: 0.85 }} />
    <Type text={TAG[id]} x={flip ? 124 : 1184} y={570} size={40} font={NUNITO} color="#fff" drop={0} align="left" show={win(t, 0.3, 0.6)} />
    <Speed cx={flip ? 1380 : 560} cy={600} color="rgba(255,255,255,0.35)" clear={520} seed={i} />
    <Grain op={0.12} seed={i} />
  </AbsoluteFill>
);
const fight = (a: string, b: string, ca: string, cb: string, word: string): R => (t) => (
  <AbsoluteFill style={{ background: INK }}>
    <div style={{ position: 'absolute', inset: 0, background: ca, clipPath: 'polygon(0 0, 58% 0, 42% 100%, 0 100%)' }} />
    <div style={{ position: 'absolute', inset: 0, background: cb, clipPath: 'polygon(58% 0, 100% 0, 100% 100%, 42% 100%)' }} />
    <Speed cx={960} cy={540} color="rgba(255,255,255,0.4)" clear={200} seed={7} />
    <Cam t={t} s={[1, 1.12]}>
      <Pet id={a} pose="run" x={lerp(420, 640, t)} y={1000} h={720} />
      <Pet id={b} pose="run" x={lerp(1500, 1280, t)} y={1000} h={720} flip />
    </Cam>
    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1080, background: 'linear-gradient(100deg, transparent 49.6%, #fff 49.8%, #fff 50.2%, transparent 50.4%)' }} />
    <Impact on={t > 0.85} />
  </AbsoluteFill>
);

export const SHOTS: Record<string, R> = {
  // ---------------- act 0 · the table in the dark
  '0.1': (t) => (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, #25221F 0%, #141210 70%)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', left: 960 - 450, top: 540 - 450, width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,184,77,0.18), transparent 65%)' }} />
      <Img src={staticFile('brand/studio-logo-dark.png')} style={{ position: 'absolute', left: 960, top: 500, width: lerp(980, 1100, outE(t)), transform: 'translate(-50%, -50%)', opacity: win(t, 0, 0.15) }} />
      <Type text="GIỚI THIỆU" x={960} y={690} size={30} font={NUNITO} color="#D7AF83" drop={0} spacing={10} show={win(t, 0.45, 0.7)} />
      <Type text="♪  Super Hero · Cao Bá Hưng x SR x Hoaprox" x={960} y={975} size={36} font={NUNITO} color="#cfc4b6" drop={0} spacing={2} show={win(t, 0.55, 0.8)} />
      <Grain op={0.1} />
    </AbsoluteFill>
  ),
  '0.2': (t) => (
    <AbsoluteFill style={{ background: '#140e10' }}>
      <Take src="mv-t0.2" from={0.2} />
      <Beams angle={-24} x={560 + t * 120} op={0.9} />
      <Dust n={70} t={t} area={[200, 0, 1100, 1000]} />
      <Vignette op={0.7} /><Grain op={0.18} seed={2} />
    </AbsoluteFill>
  ),
  '0.3': (t) => (
    <AbsoluteFill style={{ background: '#140e10' }}>
      <Cam t={t} r={[-4, 0]} s={[1.05, 1.05]}><Take src="mv-t0.3" from={0.2} /></Cam>
      <Rings cx={960} cy={540} t={t * 0.4} color="rgba(255,214,150,0.35)" n={2} max={700} />
      <Dust n={50} t={t} area={[500, 100, 900, 900]} />
      <Vignette op={0.75} /><Grain op={0.18} seed={3} />
    </AbsoluteFill>
  ),
  '0.4': (t) => (
    <AbsoluteFill style={{ background: '#140e10' }}>
      <Cam t={t * t} s={[1, 1.4]} y={[0, 40]}><Take src="mv-t0.4" from={0.2} /></Cam>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 58%, rgba(201,118,143,${0.6 * win(t, 0.6, 1)}) 0%, transparent 45%)`, mixBlendMode: 'screen' }} />
      <Speed cx={960} cy={600} color={`rgba(255,240,220,${0.6 * win(t, 0.5, 1)})`} clear={260} seed={4} />
      <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: win(t, 0.9, 1) }} />
      <Vignette op={0.6} /><Grain op={0.18} seed={4} />
    </AbsoluteFill>
  ),
  // ---------------- act 1 · the grey world (notebook page, one small panel each)
  '1.1': (t) => (
    <AbsoluteFill>
      <Paper grey />
      <Panel x={lerp(170, 260, t)} y={190} w={1120} h={680} rot={-1.5} bg="#e6e3df">
        <Pet id="tiger" pose="walk" x={lerp(300, 820, t)} y={600} h={430} style={{ filter: 'grayscale(0.9)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 570, height: 5, background: INK }} />
      </Panel>
      <Grain op={0.14} />
    </AbsoluteFill>
  ),
  '1.2': (t) => (
    <AbsoluteFill>
      <Paper grey />
      {[['panda', 'eat', 210, -2], ['chick', 'no', 760, 1.5], ['fox', 'back', 1310, -1]].map(([id, pose, x, r], i) => (
        <Panel key={i} x={(x as number) + (i === 1 ? 0 : 0)} y={lerp(300 + i * 30, 270 + i * 30, t)} w={460} h={520} rot={r as number} bg="#e6e3df">
          <Pet id={id as string} pose={pose as string} x={230} y={480} h={390} style={{ filter: 'grayscale(0.92)' }} />
        </Panel>
      ))}
      <Grain op={0.14} />
    </AbsoluteFill>
  ),
  '1.3': (t) => (
    <AbsoluteFill>
      <Paper grey />
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, #7ec8ff ${-40 + t * 60}%, #f3dde3 ${40 + t * 60}%, transparent ${70 + t * 60}%)`, opacity: win(t, 0.25, 0.8) }} />
      <Beams angle={8} x={960} color="rgba(255,255,255,0.7)" op={win(t, 0.3, 0.9)} />
      <Panel x={560} y={lerp(420, 520, t)} w={800} h={500} rot={lerp(-1, 4, t)} bg="#e6e3df" border={lerp(10, 0, win(t, 0.6, 1))}>
        <Pet id="tiger" pose="front" x={400} y={480} h={360} style={{ filter: `grayscale(${lerp(0.9, 0, win(t, 0.4, 1))})` }} />
      </Panel>
      <Dust n={40} t={t} color="rgba(255,255,255,0.95)" />
    </AbsoluteFill>
  ),
  '1.4': (t) => (
    <AbsoluteFill style={{ background: PINK }}>
      <Cam t={t} s={[1, 3.2]} y={[0, 520]}>
        <Pet id="tiger" pose="yes" x={960} y={1120} h={1000} />
      </Cam>
      {Array.from({ length: 7 }, (_, i) => <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: i * 170, height: 34, background: '#fff', opacity: win(t, 0.6, 1) * 0.9, transform: `translateX(${(i % 2 ? 1 : -1) * (1 - win(t, 0.6, 1)) * 1920}px)` }} />)}
      <Dust n={14} t={t} size={22} color="#fff" area={[560, 300, 800, 300]} />
    </AbsoluteFill>
  ),
  // ---------------- act 2 · the dream: heroes, the rival
  '2.1': poster('tiger', 1, PINK),
  '2.2': poster('panda', 2, BLUE, true),
  '2.3': poster('chick', 3, SUN),
  '2.4': poster('fox', 4, GREEN, true),
  '2.5': (t) => (
    <AbsoluteFill style={{ background: '#141016' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 85%, rgba(227,155,74,${0.55 * win(t, 0.1, 0.6)}) 0%, transparent 55%)` }} />
      <Cam t={t} s={[1.05, 1.22]} y={[0, 80]}>
        {GANG.slice(1).map((g, i) => <Pet key={g} id={g} pose="front" x={[420, 1500, 1820][i]} y={1000} h={420} style={{ filter: 'brightness(0.18) saturate(0)' }} />)}
        <Pet id="lion" pose={t < 0.4 ? 'back' : 'front'} x={960} y={1060} h={840} glow={RED} style={{ filter: `brightness(${lerp(0.15, 0.9, win(t, 0.35, 0.8))}) drop-shadow(0 0 30px ${RED})` }} />
      </Cam>
      <Type text="SƯ TỬ" x={120} y={200} size={170} color="#fff" drop={6} stroke="rgba(0,0,0,0.6)" align="left" show={win(t, 0.55, 0.85)} />
      <div style={{ position: 'absolute', left: 124, top: 300, width: 420 * outE(win(t, 0.65, 0.9)), height: 4, background: RED, opacity: 0.9 }} />
      <Type text="Đại ca lớp bên" x={124} y={350} size={40} font={NUNITO} color={RED} drop={0} align="left" show={win(t, 0.7, 0.95)} />
      <Grain op={0.22} />
    </AbsoluteFill>
  ),
  '2.6': (t) => (
    <AbsoluteFill style={{ background: '#000' }}>
      <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(0 0, 54% 0, 46% 100%, 0 100%)', background: PINK }}>
        <Cam t={t} s={[1.2, 1.35]}><Pet id="tiger" pose="tq" x={540} y={1250} h={1100} /></Cam>
      </div>
      <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(54% 0, 100% 0, 100% 100%, 46% 100%)', background: '#221826' }}>
        <Cam t={t} s={[1.2, 1.35]}><Pet id="lion" pose="tq" x={1400} y={1250} h={1100} flip glow={RED} /></Cam>
      </div>
      <Type text="VS" x={960} y={540} size={lerp(400, 300, outE(t))} font={INLINE} color={YEL} sw={10} drop={16} rot={-8} show={win(t, 0.15, 0.4)} />
      <Speed color="rgba(255,255,255,0.3)" clear={300} />
    </AbsoluteFill>
  ),
  '2.7': (t) => {
    const k = Math.min(3, Math.floor(t * 4));
    return (
      <AbsoluteFill style={{ background: '#000' }}>
        {k < 3 && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 380, height: 320, overflow: 'hidden', background: [PINK, BLUE, SUN][k] }}>
            <Pet id={TEAM[k]} pose="front" x={960} y={900} h={1500} />
          </div>
        )}
      </AbsoluteFill>
    );
  },
  // ---------------- act 3 · chorus 1
  '3.1': (t) => (
    <AbsoluteFill>
      <Cam t={t} s={[1.2, 1.1]} r={[3, -2]}><Take src="mv-T2" from={0.35} rate={0.5} /></Cam>
      <Speed color="rgba(255,255,255,0.9)" clear={320} seed={11} />
      <Type text="BỐP!" x={980} y={300} size={lerp(420, 300, outE(t))} color={YEL} sw={10} drop={18} rot={-10} show={win(t, 0, 0.15)} />
      <Impact on={t < 0.12} />
    </AbsoluteFill>
  ),
  '3.2': (t) => {
    const k = outE(win(t, 0, 0.18));
    return (
      <AbsoluteFill style={{ background: PINK }}>
        <Rays color="rgba(255,255,255,0.25)" n={20} rot={t * 40} fade={1400} />
        <Halftone color="rgba(36,20,24,0.18)" mask="radial-gradient(circle, transparent 30%, black 80%)" />
        <div style={{ position: 'absolute', left: 960 - 500, top: 470 - 330, opacity: Math.min(1, k * 2), transform: `scale(${lerp(1.7, 1, k) * lerp(1, 1.04, t)}) rotate(${(1 - k) * -10}deg)` }}><Logo w={1000} id="mv-arc-32" /></div>
        <Impact on={t < 0.06} />
      </AbsoluteFill>
    );
  },
  '3.3': (t) => (
    <AbsoluteFill style={{ background: CREAM }}>
      <Paper />
      <Panel x={80} y={80} w={1060} h={560} rot={-2}><Plate src="capture-close" style={{ transform: `scale(${lerp(1.1, 1.3, t)})` }} /></Panel>
      <Panel x={1180} y={60} w={660} h={460} rot={2.5} bg={BLUE}><Pet id="panda" pose="run" x={330} y={460} h={380} /><Streaks shift={t} n={10} /></Panel>
      <Panel x={980} y={560} w={860} h={460} rot={-1.5}><Plate src="slam-flash" style={{ transform: `scale(${lerp(1.2, 1.05, t)})` }} /></Panel>
      <Panel x={160} y={690} w={760} h={330} rot={1.5} bg={SUN}><Pet id="chick" pose="yes" x={380} y={330} h={300} /></Panel>
    </AbsoluteFill>
  ),
  '3.4': (t) => (
    <AbsoluteFill style={{ background: SUN }}>
      <Streaks color="rgba(255,255,255,0.9)" n={40} shift={t} dir={-1} />
      <Cam t={t} x={[-120, 120]}>
        {TEAM.map((id, i) => <Pet key={id} id={id} pose="run" x={330 + i * 420 + Math.sin(i * 2 + t * 8) * 20} y={920 - (i % 2) * 30} h={380} rot={-6} style={{ transform: `translate(-50%, -100%) rotate(-6deg) skewX(-6deg)` }} />)}
      </Cam>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 920, height: 160, background: INK }} />
    </AbsoluteFill>
  ),
  '3.5': (t) => (
    <AbsoluteFill style={{ background: BLUE }}>
      <Speed color="rgba(255,255,255,0.75)" clear={300} seed={5} />
      <Type text="WE ARE" x={960} y={200} size={230} color={YEL} sw={10} drop={16} show={win(t, 0, 0.2)} />
      <Type text="SUPERHERO" x={960} y={420} size={lerp(250, 280, t)} color="#fff" sw={10} drop={16} show={win(t, 0.15, 0.4)} />
      <Cam t={t} s={[0.75, 1.15]} y={[60, 0]}>
        {TEAM.map((id, i) => <Pet key={id} id={id} pose="runfront" x={[560, 1360, 800, 1120][i]} y={[1060, 1060, 1110, 1110][i]} h={[400, 400, 480, 480][i]} />)}
      </Cam>
    </AbsoluteFill>
  ),
  '3.6': (t) => (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #d99aac, #e2b25c)' }}>
      <Rays cy={760} color="rgba(255,255,255,0.3)" n={22} rot={t * 30} fade={1500} />
      <Cam t={t} s={[1.15, 1.0]} y={[60, 0]}>
        {TEAM.map((id, i) => <Pet key={id} id={id} pose={i % 2 ? 'dance' : 'dance2'} x={420 + i * 360} y={1000} h={440} />)}
      </Cam>
      <Confetti t={t} />
    </AbsoluteFill>
  ),
  // ---------------- act 4 · recess, eight gags
  '4.1': (t) => (
    <AbsoluteFill>
      <Cam t={t} s={[1.0, 1.25]}><Plate src="capture-close" /></Cam>
      <Rings cx={760} cy={500} t={t} color="rgba(255,255,255,0.8)" />
      <Pet id="tiger" pose="yes" x={1520} y={1060} h={lerp(0, 420, outE(win(t, 0.4, 0.7)))} />
    </AbsoluteFill>
  ),
  '4.2': (t) => (
    <AbsoluteFill style={{ background: CREAM }}>
      <Paper />
      <Cam t={t} r={[0, -4]}><Plate src="slam-flash" style={{ opacity: 0.95 }} /></Cam>
      <Pet id="panda" pose="no" x={1560} y={1060} h={480} />
    </AbsoluteFill>
  ),
  '4.3': (t) => (
    <AbsoluteFill style={{ background: GREEN }}>
      <Speed cx={1500} cy={300} color="rgba(255,255,255,0.6)" clear={180} />
      <Prop src="props/card-tiger.png" x={lerp(700, 1600, ease(t))} y={lerp(700, 200, ease(t))} h={420} rot={lerp(0, 540, t)} />
      {Array.from({ length: 5 }, (_, i) => <Prop key={i} src="props/card-tiger.png" x={lerp(700, 1600, ease(Math.max(0, t - (i + 1) * 0.05)))} y={lerp(700, 200, ease(Math.max(0, t - (i + 1) * 0.05)))} h={420} rot={lerp(0, 540, t - (i + 1) * 0.05)} style={{ opacity: 0.18 }} />)}
      <Pet id="fox" pose="no" x={480} y={1060} h={560} />
    </AbsoluteFill>
  ),
  '4.4': (t) => (
    <AbsoluteFill style={{ background: '#f6e6ea' }}>
      <Halftone color="rgba(201,118,143,0.25)" mask="none" />
      {['haha', 'cool', 'crazy', 'bonk', 'boo', 'cry', 'dead', 'like', 'nope', 'hush', 'plot', 'flushed'].map((s, i) => (
        <Prop key={s} src={`stickers/${s}.${['crazy'].includes(s) ? 'gif' : 'png'}`} x={rnd(i, 3) * 1700 + 110} y={((rnd(i, 4) * 1100 + t * 500 * (0.6 + rnd(i, 5))) % 1200) - 60} h={150 + rnd(i, 6) * 80} rot={rnd(i, 7) * 40 - 20} />
      ))}
      <Pet id="chick" pose="dance" x={960} y={1040} h={560} />
    </AbsoluteFill>
  ),
  '4.5': (t) => (
    <AbsoluteFill style={{ background: INK }}>
      {Array.from({ length: 24 }, (_, i) => { const h = 80 + Math.abs(Math.sin(i * 1.7 + t * 12)) * 520; return <div key={i} style={{ position: 'absolute', left: 40 + i * 78, bottom: 0, width: 56, height: h, background: i % 2 ? PINK : YEL, opacity: 0.85 }} />; })}
      <Pet id="chick" pose={t < 0.5 ? 'dance' : 'dance2'} x={560} y={1000} h={600} />
      <Pet id="fox" pose={t < 0.5 ? 'dance2' : 'dance'} x={1360} y={1000} h={600} flip />
    </AbsoluteFill>
  ),
  '4.6': (t) => (
    <AbsoluteFill style={{ background: SUN }}>
      <Rays color="rgba(255,255,255,0.4)" n={14} rot={t * 120} />
      {Array.from({ length: 6 }, (_, i) => <Prop key={i} src="props/dep-dep_to_ong.png" x={960} y={500} h={520} rot={t * 900 - i * 14} style={{ opacity: i ? 0.12 : 1 }} />)}
    </AbsoluteFill>
  ),
  '4.7': (t) => (
    <AbsoluteFill style={{ background: BLUE }}>
      <Paper tint="#d8ebfb" margin={false} />
      <Cam t={t} s={[1, 1.35]} y={[0, 140]}><Pet id="panda" pose="eat" x={960} y={1040} h={760} /></Cam>
    </AbsoluteFill>
  ),
  '4.8': (t) => (
    <AbsoluteFill style={{ background: 'linear-gradient(135deg, #c9768f, #e2b25c)' }}>
      <Rays color="rgba(255,255,255,0.3)" n={24} rot={t * 20} />
      {TEAM.map((id, i) => <Pet key={id} id={id} pose="yes" x={420 + i * 360} y={lerp(1000, 960, Math.sin(t * Math.PI))} h={460} />)}
      <Confetti t={t * 0.4} />
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: t > 0.9 ? 1 : 0 }} />
    </AbsoluteFill>
  ),
  // ---------------- act 5 · the ambush
  '5.1': (t) => (
    <AbsoluteFill style={{ background: '#000' }}>
      <Prop src="props/card-tiger-back.png" x={960} y={560} h={lerp(1600, 900, outE(win(t, 0, 0.3)))} style={{ filter: 'brightness(0.28) saturate(0.2)' }} />
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 52%, rgba(227,155,74,${0.5 * win(t, 0.25, 0.4)}), transparent 40%)` }} />
      <svg width="1920" height="1080" style={{ position: 'absolute', inset: 0, opacity: win(t, 0.25, 0.35) }} aria-hidden="true">
        <path d="M960 540 L1010 380 L980 300 L1060 160 M960 540 L880 700 L930 790 L850 960 M960 540 L1150 600 L1260 560" stroke={RED} strokeWidth="8" fill="none" />
      </svg>
      <Pet id="lion" pose="front" x={960} y={360} h={300} style={{ opacity: win(t, 0.6, 0.9), filter: `brightness(0.2) drop-shadow(0 0 40px ${RED})` }} />
      <Grain op={0.25} />
    </AbsoluteFill>
  ),
  // ---------------- act 6 · standing up
  '6.1': (t) => (
    <AbsoluteFill style={{ background: '#120a10' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 70%, rgba(201,118,143,0.25), transparent 45%)' }} />
      <Pet id="tiger" pose="no" x={960} y={1010} h={lerp(540, 600, t)} style={{ filter: 'brightness(0.65) saturate(0.6)' }} />
      <Dust n={30} t={t} color="rgba(217,154,172,0.8)" />
      <Grain op={0.2} />
    </AbsoluteFill>
  ),
  '6.2': (t) => (
    <AbsoluteFill style={{ background: t < 0.45 ? '#120a10' : PINK }}>
      {t >= 0.45 && <Rays color="rgba(255,255,255,0.35)" n={20} rot={t * 50} fade={1400} />}
      <Prop src={t < 0.45 ? 'props/card-tiger-back.png' : 'props/card-tiger.png'} x={960} y={560} h={760} rot={lerp(-10, 6, t)} style={{ transform: `translate(-50%, -50%) rotate(${lerp(-10, 6, t)}deg) scaleX(${Math.cos(win(t, 0.3, 0.6) * Math.PI) * (t < 0.45 ? 1 : -1)})` }} />
      {t >= 0.45 && <Pet id="tiger" pose="yes" x={960} y={1060} h={lerp(300, 520, win(t, 0.5, 0.9))} />}
    </AbsoluteFill>
  ),
  '6.3': (t) => (
    <AbsoluteFill style={{ background: CREAM }}>
      <Paper />
      <Panel x={70} y={140} w={570} h={760} rot={-2} bg={PINK}><Pet id="tiger" pose="walk" x={285} y={700} h={380} /></Panel>
      <Panel x={675} y={100} w={570} h={760} rot={1.5} bg={SUN}><Pet id="tiger" pose="run" x={285} y={700} h={400} /><Streaks shift={t} n={12} /></Panel>
      <Panel x={1280} y={150} w={570} h={760} rot={-1}><Plate src="slam-air" style={{ transform: 'scale(1.6)' }} /></Panel>
    </AbsoluteFill>
  ),
  '6.4': (t) => (
    <AbsoluteFill style={{ background: '#2b2030' }}>
      <Speed color="rgba(255,255,255,0.5)" clear={260} seed={13} />
      <Dust n={90} t={t * 3} color="rgba(255,220,240,0.8)" size={7} />
      <Cam t={t} s={[0.85, 1.3]}><Pet id="tiger" pose="runfront" x={960} y={1060} h={700} /></Cam>
    </AbsoluteFill>
  ),
  '6.5': (t) => (
    <AbsoluteFill style={{ background: BLUE }}>
      <Rays color="rgba(255,255,255,0.25)" n={18} rot={t * 30} />
      <Prop src={t < 0.4 ? 'props/card-panda-back.png' : 'props/card-panda.png'} x={1180} y={540} h={720} rot={-8} style={{ transform: `translate(-50%, -50%) rotate(-8deg) scaleX(${Math.cos(win(t, 0.25, 0.55) * Math.PI) * (t < 0.4 ? 1 : -1)})` }} />
      <Pet id="tiger" pose="tq" x={520} y={1040} h={560} />
      {t > 0.55 && <Pet id="panda" pose="yes" x={1180} y={1060} h={460} />}
    </AbsoluteFill>
  ),
  '6.6': (t) => (
    <AbsoluteFill style={{ background: 'linear-gradient(90deg, #e2b25c 50%, #73ab7e 50%)' }}>
      <Rays color="rgba(255,255,255,0.25)" n={18} />
      <Pet id="chick" pose={t < 0.4 ? 'no' : 'yes'} x={500} y={1040} h={520} />
      <Pet id="fox" pose={t < 0.55 ? 'no' : 'yes'} x={1420} y={1040} h={520} flip />
      <Pet id="tiger" pose="dance" x={960} y={1060} h={lerp(0, 380, win(t, 0.6, 0.9))} />
    </AbsoluteFill>
  ),
  // the dream: the four float free among the clouds, no slippers under them; parallax, back clouds hazy
  '6.7': (t) => (
    <AbsoluteFill style={{ background: SKY_GRAD }}>
      <Beams angle={16} x={1300} color="rgba(255,250,235,0.7)" n={6} />
      {[0, 3, 6, 9, 11].map((c, i) => <Cloud key={c} i={c} x={((rnd(i, 21) * 2300 + t * 90) % 2300) - 190} y={150 + rnd(i, 22) * 380} w={260 + rnd(i, 23) * 120} op={0.55} />)}
      {TEAM.map((id, i) => (
        <Pet key={id} id={id} pose={['dance', 'front', 'dance2', 'yes'][i]} x={[360, 820, 1200, 1600][i] + t * 70} y={[640, 470, 700, 520][i] + Math.sin(t * 5 + i * 1.7) * 26} h={[300, 260, 280, 300][i]} rot={[-14, 10, -6, 16][i] + Math.sin(t * 3 + i) * 6} />
      ))}
      {[1, 4, 7].map((c, i) => <Cloud key={c} i={c} x={((rnd(i, 31) * 2400 + t * 260) % 2400) - 240} y={760 + rnd(i, 32) * 260} w={560 + rnd(i, 33) * 240} />)}
    </AbsoluteFill>
  ),
  '6.8': (t) => (
    <AbsoluteFill style={{ background: INK }}>
      {TEAM.map((id, i) => (
        <div key={id} style={{ position: 'absolute', left: (i % 2) * 960, top: Math.floor(i / 2) * 540, width: 960, height: 540, overflow: 'hidden', background: TEAM_C[id], opacity: win(t, i * 0.15, i * 0.15 + 0.1) }}>
          <Rays cx={480} cy={300} color="rgba(255,255,255,0.25)" n={14} />
          <Pet id={id} pose="tq" x={480} y={600} h={560} />
        </div>
      ))}
    </AbsoluteFill>
  ),
  // ---------------- act 7 · back together
  '7.1': (t) => (
    <AbsoluteFill style={{ background: '#1f1822' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #3a2a40 0%, #1f1822 60%)' }} />
      {GANG.map((g, i) => <Pet key={g} id={g} pose="front" x={560 + i * 270} y={560} h={i === 0 ? 300 : 210} glow={i === 0 ? RED : undefined} style={{ filter: 'brightness(0.55)' }} />)}
      <Cam t={t} s={[1, 1.08]} y={[0, -40]}>
        {TEAM.map((id, i) => <Pet key={id} id={id} pose="back" x={420 + i * 360} y={1090} h={400} />)}
      </Cam>
      <Bars h={110} />
      <Dust n={40} t={t} color="rgba(227,155,74,0.6)" />
    </AbsoluteFill>
  ),
  '7.2': fight('tiger', 'lion', PINK, '#2b2030', '4 ĐẤU 4'),
  '7.3': (t) => (
    <AbsoluteFill style={{ background: PINK }}>
      <Halftone color="rgba(255,255,255,0.25)" mask="none" size={30} dot={7} />
      {"I'M A SUPERHERO".split(' ').map((w, i) => <Type key={w} text={w} x={960} y={200 + i * 260} size={i === 2 ? 300 : 220} color={i === 2 ? YEL : '#fff'} sw={10} drop={16} rot={i % 2 ? 3 : -3} show={win(t, i * 0.18, i * 0.18 + 0.2)} />)}
      {TEAM.map((id, i) => <Pet key={id} id={id} pose="dance" x={[180, 1740, 300, 1620][i]} y={[520, 520, 1060, 1060][i]} h={360} flip={i % 2 === 1} />)}
    </AbsoluteFill>
  ),
  '7.4': (t) => (
    <AbsoluteFill style={{ background: '#000' }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${PINK} 0%, ${PINK} ${lerp(30, 49, t)}%, #2b2030 ${lerp(70, 51, t)}%)` }} />
      <Streaks n={30} shift={t} />
      {TEAM.map((id, i) => <Pet key={id} id={id} pose="run" x={lerp(320, 760, ease(t)) - i * 120} y={1000 - i * 50} h={420 - i * 40} />)}
      {GANG.map((g, i) => <Pet key={g} id={g} pose="run" x={lerp(1600, 1160, ease(t)) + i * 120} y={1000 - i * 50} h={420 - i * 40} flip />)}
      <Impact on={t > 0.88} />
    </AbsoluteFill>
  ),
  // ---------------- act 8 · the big fight: duels, then the boss
  '8.1': fight('panda', 'elephant', BLUE, '#2b2030', 'GẤU vs VOI'),
  '8.2': fight('chick', 'crab', SUN, '#2b2030', 'GÀ vs CUA'),
  '8.3': fight('fox', 'hog', GREEN, '#2b2030', 'CÁO vs HEO'),
  '8.4': (t) => (
    <AbsoluteFill style={{ background: INK }}>
      {['slam-air', 'capture-low', 'slam-flash', 'capture-close'].map((p, i) => (
        <Panel key={p} x={(i % 2) * 970 + 20} y={Math.floor(i / 2) * 535 + 15} w={940} h={510} rot={[1, -1, -1.5, 1.5][i]}>
          <Plate src={p} style={{ transform: `scale(${lerp(1.1, 1.3, (t + i * 0.2) % 1)})` }} />
        </Panel>
      ))}
    </AbsoluteFill>
  ),
  '8.5': (t) => (
    <AbsoluteFill style={{ background: '#2b2030' }}>
      <Speed cx={960} cy={540} color="rgba(255,255,255,0.4)" clear={200} />
      {Array.from({ length: 22 }, (_, i) => <Prop key={i} src={i % 3 ? 'props/card-tiger.png' : 'props/card-panda-back.png'} x={960 + Math.cos(i * 2.4 + t * 6) * (200 + i * 40)} y={540 + Math.sin(i * 2.4 + t * 6) * (120 + i * 22)} h={160 + rnd(i, 2) * 120} rot={i * 37 + t * 400} />)}
      <Pet id="lion" pose="front" x={960} y={760} h={520} glow={RED} />
    </AbsoluteFill>
  ),
  '8.6': (t) => (
    <AbsoluteFill style={{ background: RED }}>
      <Speed color="rgba(0,0,0,0.5)" clear={240} />
      <Pet id="lion" pose="yes" x={600} y={1060} h={780} />
      <Pet id="tiger" pose="no" x={lerp(1350, 1560, outE(t))} y={1060} h={460} rot={lerp(0, 18, outE(t))} flip />
      <Impact on={t < 0.12} />
    </AbsoluteFill>
  ),
  '8.7': (t) => (
    <AbsoluteFill style={{ background: '#000' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, height: 400, overflow: 'hidden', background: PINK }}><Cam t={t} s={[1, 1.1]}><Pet id="tiger" pose="tq" x={lerp(900, 960, t)} y={1010} h={1500} /></Cam></div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 560, height: 400, overflow: 'hidden', background: '#2b2030' }}><Cam t={t} s={[1, 1.1]}><Pet id="lion" pose="tq" x={lerp(1020, 960, t)} y={940} h={1500} flip glow={RED} /></Cam></div>
    </AbsoluteFill>
  ),
  '8.8': (t) => (
    <AbsoluteFill style={{ background: 'linear-gradient(90deg, #c9768f 50%, #2b2030 50%)' }}>
      <Rays cx={960} cy={300} color="rgba(255,255,255,0.3)" n={16} rot={t * 20} />
      <Pet id="tiger" pose="yes" x={560} y={1060} h={620} />
      <Pet id="lion" pose="yes" x={1360} y={1060} h={680} flip glow={RED} />
      <Prop src="props/dep-dep_lao.png" x={560} y={lerp(420, 260, outE(t))} h={300} rot={-30} />
      <Prop src="props/dep-dep_le.png" x={1360} y={lerp(420, 260, outE(t))} h={300} rot={30} />
    </AbsoluteFill>
  ),
  // ---------------- act 9 · bullet time
  '9.1': (t) => (
    <AbsoluteFill style={{ background: '#e9e4dc' }}>
      <Cam t={t} s={[1.1, 1.25]} r={[-8, 8]} x={[-80, 80]}><Plate src="slam-air" /></Cam>
      <Duo a="#1d1a22" b="#f1ece4" />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(227,155,74,0.35), transparent 30%)', mixBlendMode: 'multiply' }} />
      <Bars h={120} />
      <Grain op={0.2} />
    </AbsoluteFill>
  ),
  '9.2': (t) => (
    <AbsoluteFill style={{ background: '#0c0a0e' }}>
      <Rings cx={960} cy={540} t={t * 2} color={RED} n={2} max={700} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 380, height: 320, overflow: 'hidden' }}>
        <Pet id="tiger" pose="front" x={960} y={1010} h={1600} style={{ filter: 'grayscale(1) contrast(1.2)' }} />
      </div>
    </AbsoluteFill>
  ),
  // ---------------- act 10 · the build: an eye on every beat
  '10.1': (t) => {
    const all = [...TEAM, 'lion', ...TEAM, 'lion', ...TEAM, 'lion', 'tiger'];
    const k = Math.min(all.length - 1, Math.floor(t * all.length));
    const id = all[k];
    return (
      <AbsoluteFill style={{ background: id === 'lion' ? '#2b2030' : TEAM_C[id] }}>
        <Speed color="rgba(255,255,255,0.5)" clear={200} seed={k} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 300, height: 480, overflow: 'hidden' }}>
          <Pet id={id} pose="front" x={960} y={1110 + (k % 3) * 30} h={1800} flip={k % 2 === 1} glow={id === 'lion' ? RED : undefined} />
        </div>
      </AbsoluteFill>
    );
  },
  // ---------------- act 11 · the win
  '11.1': (t) => (
    <AbsoluteFill>
      <Cam t={t} s={[1.4, 1.1]}><Plate src="capture-close" /></Cam>
      <Impact on={t < 0.15} />
      <Speed color="rgba(255,255,255,0.95)" clear={300} />
      <Type text="ĂN HÌNH!!!" x={960} y={540} size={lerp(400, 280, outE(t))} color={YEL} sw={12} drop={20} rot={-6} show={win(t, 0, 0.12)} />
    </AbsoluteFill>
  ),
  '11.2': (t) => (
    <AbsoluteFill style={{ background: t < 0.5 ? '#2b2030' : '#e9c3cd' }}>
      <Pet id="lion" pose={t < 0.5 ? 'no' : 'yes'} x={960} y={1060} h={780} />
    </AbsoluteFill>
  ),
  '11.3': (t) => (
    <AbsoluteFill style={{ background: 'linear-gradient(90deg, #c9768f, #e2a65c)' }}>
      <Rays cy={600} color="rgba(255,255,255,0.3)" n={22} rot={t * 40} />
      <Pet id="tiger" pose={t < 0.5 ? 'dance' : 'dance2'} x={720} y={1040} h={620} />
      <Pet id="lion" pose={t < 0.5 ? 'dance2' : 'dance'} x={1220} y={1040} h={660} flip />
      <Confetti t={t} />
    </AbsoluteFill>
  ),
  '11.4': (t) => (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #e2b25c, #c9768f)' }}>
      <Rays cy={900} color="rgba(255,255,255,0.3)" n={26} rot={t * 20} fade={1600} />
      {[...TEAM, ...GANG].map((id, i) => <Pet key={id} id={id} pose={i % 2 ? 'dance' : 'yes'} x={160 + i * 228} y={1050 - (i % 2) * 30} h={300} flip={i >= 4} />)}
      <Type text="ANH HÙNG" x={960} y={lerp(300, 280, t)} size={250} color="#fff" sw={10} drop={18} show={win(t, 0.1, 0.35)} />
      <Type text="TRONG CHÚNG TA" x={960} y={520} size={150} color={INK} drop={0} show={win(t, 0.35, 0.6)} />
    </AbsoluteFill>
  ),
  // ---------------- act 12 · the party
  '12.1': (t) => (
    <AbsoluteFill style={{ background: '#1d1220' }}>
      {Array.from({ length: 5 }, (_, i) => <div key={i} style={{ position: 'absolute', left: 200 + i * 380, top: -100, width: 300, height: 1400, background: [PINK, YEL, BLUE, GREEN, PINK][i], opacity: 0.25 + 0.2 * Math.sin(t * 10 + i), transform: `rotate(${Math.sin(t * 3 + i) * 25}deg)`, transformOrigin: '50% 0', filter: 'blur(30px)', mixBlendMode: 'screen' }} />)}
      {[...TEAM, ...GANG].map((id, i) => <Pet key={id} id={id} pose={(i + Math.floor(t * 4)) % 2 ? 'dance' : 'dance2'} x={170 + i * 226} y={1000} h={340} flip={i % 2 === 1} />)}
      <Dust n={80} t={t} color="rgba(255,255,255,0.9)" size={6} />
    </AbsoluteFill>
  ),
  '12.2': (t) => (
    <AbsoluteFill>
      <Cam t={t} s={[1.0, 1.15]}><Plate src="table4-high" /></Cam>
      {Array.from({ length: 30 }, (_, i) => <Prop key={i} src={['props/card-tiger.png', 'props/card-panda.png', 'props/card-tiger-back.png'][i % 3]} x={rnd(i, 1) * 1920} y={((rnd(i, 2) * 1300 + t * 1100) % 1300) - 120} h={140 + rnd(i, 3) * 100} rot={rnd(i, 4) * 360 + t * 300} />)}
    </AbsoluteFill>
  ),
  '12.3': (t) => (
    <AbsoluteFill style={{ background: INK }}>
      <div style={{ position: 'absolute', top: 140, left: lerp(0, -1400, t), display: 'flex', gap: 30 }}>
        {[...TEAM, 'lion', ...TEAM].map((id, i) => (
          <div key={i} style={{ position: 'relative', width: 520, height: 800, background: id === 'lion' ? '#2b2030' : TEAM_C[id], border: `10px solid ${CREAM}`, overflow: 'hidden', flex: '0 0 auto' }}>
            <Pet id={id} pose="tq" x={260} y={820} h={600} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  ),
  '12.4': (t) => (
    <AbsoluteFill style={{ background: GREEN }}>
      <Speed color="rgba(255,255,255,0.8)" clear={260} />
      <Cam t={t} s={[0.7, 1.15]}>
        {[...GANG, ...TEAM].map((id, i) => <Pet key={id} id={id} pose="runfront" x={[300, 1620, 520, 1400, 760, 1160, 900, 1020][i]} y={[880, 880, 940, 940, 1010, 1010, 1080, 1080][i]} h={[300, 300, 380, 380, 460, 460, 560, 560][i]} />)}
      </Cam>
    </AbsoluteFill>
  ),
  // flying again, for laughs: the chick flaps up; the others drop onto its head; spinning slippers, thrown from
  // off-frame, smack each of them out of the shot one by one; the chick flies on up out of frame -> the cut
  '12.5': (t) => {
    const rise = outE(win(t, 0, 0.2));
    const chickY = lerp(1250, 1010, rise) - ease(win(t, 0.8, 1.05)) * 1300;
    const drop = [['tiger', 0.14, -170], ['panda', 0.19, 10], ['fox', 0.24, 180], ['lion', 0.29, 0]] as [string, number, number][];
    return (
      <AbsoluteFill style={{ background: SKY_GRAD }}>
        {[2, 5, 8, 10].map((c, i) => <Cloud key={c} i={c} x={rnd(i, 41) * 1900} y={((rnd(i, 42) * 1300 + t * 900) % 1300) - 100} w={300 + rnd(i, 43) * 200} op={0.6} />)}
        <Pet id="chick" pose={Math.floor(t * 12) % 2 ? 'dance' : 'dance2'} x={960} y={chickY} h={320} />
        {drop.map(([id, at, dx], i) => {
          const fall = outE(win(t, at, at + 0.12));
          const hitAt = 0.42 + i * 0.07; const hit = win(t, hitAt, hitAt + 0.16);
          const stackY = chickY - 270 - i * 170;
          const y = lerp(-300, stackY, fall) - hit * 500; const x = 960 + dx * (1 - fall) * 0.4 + hit * (i % 2 ? 1300 : -1300);
          return (
            <div key={id}>
              {t > at && <Pet id={id} pose={hit > 0 ? 'no' : 'front'} x={x} y={y} h={200} rot={hit * (i % 2 ? 540 : -540)} />}
              {t > hitAt - 0.08 && hit < 1 && <Prop src={['props/dep-dep_lao.png', 'props/dep-dep_le.png', 'props/dep-dep_to_ong.png', 'props/dep-dep_lao.png'][i]}
                x={lerp(i % 2 ? -200 : 2120, x, win(t, hitAt - 0.08, hitAt)) + hit * (i % 2 ? 600 : -600)} y={lerp(y - 300, y - 110, win(t, hitAt - 0.08, hitAt))} h={180} rot={t * 2200 + i * 90} />}
            </div>
          );
        })}
        <div style={{ position: 'absolute', inset: 0, background: '#fff', opacity: win(t, 0.94, 1) }} />
      </AbsoluteFill>
    );
  },
  '12.6': (t) => (
    <AbsoluteFill>
      <Cam t={t} s={[1.3, 1.0]} y={[100, 0]}><Plate src="table-cards4" /></Cam>
      {[...TEAM].map((id, i) => <Pet key={id} id={id} pose="dance" x={[330, 780, 1160, 1580][i]} y={lerp(560, 500, t)} h={lerp(260, 220, t)} />)}
      <Beams angle={-15} x={900} color="rgba(255,240,210,0.5)" op={0.8} />
      <Confetti t={t} n={60} />
    </AbsoluteFill>
  ),
  // the game itself, three phones rising on the beat (the end card says the rest)
  '12.7': (t) => (
    <AbsoluteFill style={{ background: BLUE }}>
      <Rays color="rgba(255,255,255,0.2)" n={18} rot={t * 20} />
      {['phone-lobby', 'phone-aim', 'phone-anroi'].map((p, i) => (
        <div key={p} style={{ position: 'absolute', left: 360 + i * 440, top: lerp(1100, 200, outE(win(t, i * 0.12, i * 0.12 + 0.35))) + (i === 1 ? -40 : 0), width: 380, height: 760, borderRadius: 46, border: `14px solid ${INK}`, overflow: 'hidden', transform: `rotate(${[-6, 0, 6][i]}deg)`, background: '#000' }}>
          <Plate src={p} />
        </div>
      ))}
    </AbsoluteFill>
  ),
  // golden hour: both gangs walk toward the camera together
  '12.8': (t) => (
    <AbsoluteFill style={{ background: 'linear-gradient(180deg, #e9b989 0%, #f3d3a8 55%, #d99aac 100%)' }}>
      <Beams angle={12} x={1100} color="rgba(255,240,215,0.6)" n={6} />
      <Cam t={t} s={[0.85, 1.05]}>
        {[...GANG, ...TEAM].map((id, i) => <Pet key={id} id={id} pose="runfront" x={[340, 1580, 560, 1360, 760, 1160, 900, 1020][i]} y={[880, 880, 940, 940, 1010, 1010, 1080, 1080][i]} h={[280, 280, 340, 340, 420, 420, 500, 500][i]} />)}
      </Cam>
      <Dust n={40} t={t} color="rgba(255,245,220,0.9)" />
    </AbsoluteFill>
  ),
  '12.9': (t) => {
    const k = outE(win(t, 0.05, 0.25));
    return (
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, #d99aac, #e2b25c)' }}>
        <Rays cy={820} color="rgba(255,255,255,0.3)" n={24} rot={t * 20} fade={1600} />
        {[...TEAM, ...GANG].map((id, i) => <Pet key={id} id={id} pose="yes" x={170 + i * 226} y={1060} h={300} flip={i >= 4} />)}
        <div style={{ position: 'absolute', left: 960 - 460, top: 380 - 304, opacity: Math.min(1, k * 2), transform: `scale(${lerp(1.6, 1, k)}) rotate(${(1 - k) * -8}deg)` }}><Logo w={920} id="mv-arc-129" /></div>
        <Confetti t={t} n={70} />
      </AbsoluteFill>
    );
  },
  // ---------------- act 13 · the end card
  '13.1': (t) => {
    const k = outE(win(t, 0, 0.2));
    const fade = (d: number) => win(t, d, d + 0.12);
    return (
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 40%, #3a3530, #141210 75%)' }}>
        <div style={{ position: 'absolute', left: 960 - 400, top: 285 - 264, transform: `scale(${lerp(1.5, 1, k)}) rotate(${(1 - k) * -8}deg)` }}><Logo w={800} id="mv-arc-end" /></div>
        <Chunk text="Đập hình cùng *chúng mình* nhé!" x={960} y={620} size={80} rot={-3} show={fade(0.15)} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 735, display: 'flex', justifyContent: 'center', opacity: fade(0.3) }}>
          <div style={{ fontFamily: "'Nunito', sans-serif", fontWeight: 900, fontSize: 44, background: '#c45f7c', color: '#fff', padding: '12px 44px', borderRadius: 999, border: '5px solid #141210', boxShadow: '0 8px 0 #141210', transform: 'rotate(1.5deg)' }}>play.billthedevstudio.com/slam-cards</div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 862, textAlign: 'center', fontFamily: "'Nunito', sans-serif", fontWeight: 800, fontSize: 26, color: '#F6F3EF', opacity: fade(0.42) }}>Ý tưởng: ThuanBui (David) &nbsp;·&nbsp; Developer: BillTheDev &nbsp;·&nbsp; Nhạc: Super Hero – Cao Bá Hưng x SR x Hoaprox</div>
        <Img src={staticFile('brand/studio-logo-dark.png')} style={{ position: 'absolute', left: 960 - 230, top: 925, width: 460, opacity: fade(0.55) }} />
      </AbsoluteFill>
    );
  },
};
