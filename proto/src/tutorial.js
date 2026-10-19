// The seven tutorial steps (task 1.11, mockup v25): what each one says and the clip it plays.
// Data only, no page: the server counts the steps from here too.
//
// Clips are real gameplay cut by qa/tutorial-clips.py into public/tutorial/<clip>.mp4 (+ .jpg
// poster), without words; the game lays the captions over them in the player's language. `cues`
// are [from, to, pink] in seconds of the clip; caption n of step k is locale key tut.s<k>.c<n>.
// Pink marks the outcome, ink the setup, as in the mockup. `hint` lists the devices that get a
// muted extra line (tut.s<k>.hint.touch / .mouse).
export const STEPS = [
  { clip: '1-close', cues: [[0, 3.3, false], [3.4, 6.9, true]], hint: ['touch', 'mouse'] },
  { clip: '2-capture', cues: [[2.3, 4.6, true]] },
  { clip: '3-fall', cues: [[0, 2.1, false], [2.2, 4.4, true]] },
  { clip: '4-timeout', cues: [[0.2, 3.9, false], [4.1, 6.4, false], [6.5, 9.2, true]] },
  { clip: '5-types', cues: [[0, 3.9, false], [4.0, 7.8, true]], hint: ['touch'] },
  { clip: '6-wind', cues: [[0, 4.1, false], [4.2, 8.3, true]] },
  { clip: '7-forced', cues: [[0.1, 2.1, false], [2.2, 4.5, true]] },
];

// The steps in-match reminders replay the first time their feature shows up (match 2 on).
export const REMINDERS = { types: 5, wind: 6, forced: 7 };
