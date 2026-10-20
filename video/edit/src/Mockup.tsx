import { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import list from './mvshotlist.json';
import { SHOTS } from './mvshots';

// The MV mockup: three stills per shot (t = 0.08 / 0.5 / 0.92), one per frame, rendered as an image sequence.
export const MOCK_T = [0.08, 0.5, 0.92];
export const MOCK_IDS = (list.shots as { id: string }[]).map((s) => s.id);

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

export const Mockup = () => {
  useFonts();
  const f = useCurrentFrame();
  const id = MOCK_IDS[Math.floor(f / 3)];
  const draw = SHOTS[id];
  return <AbsoluteFill style={{ background: '#000', overflow: 'hidden' }}>{draw ? draw(MOCK_T[f % 3]) : null}</AbsoluteFill>;
};
