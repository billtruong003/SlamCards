import { Composition } from 'remotion';
import edl from './edl.json';
import { Cut, type Edit } from './Cut';
import shorts from './shorts.json';
import { ShortCut, type ShortEdit } from './Shorts';
import shorts5 from './shorts5.json';
import trailer from './trailer.json';
import { OUT_FPS, Short5Cut, type Short5 } from './Shorts5';
import mv from './mv.json';
import { MV, type MVEdit } from './MV';
import { Mockup, MOCK_IDS } from './Mockup';
import { MVFull, MV_FPS, MV_FRAMES } from './MVFull';

// The two launch videos, cut by ../cut.py into edl.json (re-run it after changing the cut).
export const Root = () => {
  const [short, long] = edl.videos as unknown as Edit[];
  return (
    <>
      <Composition id="Short" component={Cut} defaultProps={{ edit: short }} durationInFrames={short.frames} fps={short.fps} width={short.W} height={short.H} />
      <Composition id="Long" component={Cut} defaultProps={{ edit: long }} durationInFrames={long.frames} fps={long.fps} width={long.W} height={long.H} />
      {(shorts.videos as unknown as ShortEdit[]).map((v) => (
        <Composition key={v.id} id={v.id} component={ShortCut} defaultProps={{ edit: v }} durationInFrames={v.frames} fps={v.fps} width={v.W} height={v.H} />
      ))}
      {[...(shorts5.videos as unknown as Short5[]), ...(trailer.videos as unknown as Short5[])].map((v) => (
        <Composition key={v.id} id={v.id} component={Short5Cut} defaultProps={{ edit: v }} durationInFrames={v.frames * OUT_FPS / v.fps} fps={OUT_FPS} width={v.W} height={v.H} />
      ))}
      <Composition id="MV-FULL" component={MVFull} durationInFrames={MV_FRAMES} fps={MV_FPS} width={1920} height={1080} />
      <Composition id="MV-MOCKUP" component={Mockup} durationInFrames={MOCK_IDS.length * 3} fps={1} width={1920} height={1080} />
      <Composition id="MV-CHORUS1" component={MV} defaultProps={{ edit: mv as unknown as MVEdit }} durationInFrames={Math.round((mv as MVEdit).dur * 60)} fps={60} width={1920} height={1080} />
    </>
  );
};
