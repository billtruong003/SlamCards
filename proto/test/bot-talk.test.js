// What computer players say (server/bot-talk.js, Bill's rules in docs/bot-loi-noi.md): every line
// exists in every language, they talk as much as their persona, never repeat themselves soon,
// rest after a line, and say less each when there are more of them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pickLine, LINES, STICKERS_FOR, TALK, ALL_LINES } from '../server/bot-talk.js';
import { STICKERS, REACTIONS } from '../src/catalog.js';
import { seededRandom } from '../src/rules.js';

const LOCALES = ['vi', 'en', 'es', 'id', 'ja', 'ko', 'pt-BR', 'th', 'zh-Hans', 'zh-Hant'];

test('every bot line and sticker can be shown, in every language', () => {
  for (const code of LOCALES) {
    const strings = JSON.parse(fs.readFileSync(new URL(`../src/locales/${code}.json`, import.meta.url), 'utf8'));
    for (const id of ALL_LINES) {
      const key = id.startsWith('p:') ? `phrase.${id.slice(2)}` : `bot.${id.slice(2)}`;
      assert.ok(strings[key], `${code}: ${key}`);
    }
  }
  for (const id of ALL_LINES.filter((l) => l.startsWith('p:'))) assert.ok(REACTIONS.has(id), `${id} is a phrase people have too`);
  for (const id of Object.values(STICKERS_FOR).flat()) assert.ok(STICKERS.includes(id), id);
  assert.deepEqual(Object.keys(STICKERS_FOR).sort(), Object.keys(LINES).sort());
});

test('a bot talks as much as its persona, rests after a line, never repeats one soon', () => {
  const random = seededRandom(3);
  for (const persona of Object.keys(TALK)) {
    // no rest between tries: how often it speaks at all
    const bot = { persona };
    let said = 0;
    for (let turn = 0; turn < 3000; turn++) {
      bot.quietUntil = 0;
      if (pickLine(bot, 'miss', { crowd: 1, turnNo: turn }, random)) said += 1;
    }
    assert.ok(Math.abs(said / 3000 - TALK[persona]) < 0.04, `${persona} ${said / 3000}`);
  }
  // with the rest: after a line, quiet for the next two turns at least; won/lost/hello still said
  const bot = { persona: 'quick' };
  let last = null;
  for (let turn = 0; turn < 2000; turn++) {
    const id = pickLine(bot, 'ate', { crowd: 1, turnNo: turn }, random);
    if (!id) continue;
    if (last !== null) assert.ok(turn - last >= 2, `spoke at ${last} and ${turn}`);
    last = turn;
  }
  const resting = { persona: 'quick', quietUntil: 99 };
  let ends = 0;
  for (let i = 0; i < 200; i++) if (pickLine(resting, 'won', { crowd: 1, turnNo: 1 }, random)) ends += 1;
  assert.ok(ends > 0, 'the end of a match is said even while resting');
  // never the same as one of its last few
  const talker = { persona: 'quick' };
  const recent = [];
  for (let turn = 0; turn < 3000; turn++) {
    talker.quietUntil = 0;
    const id = pickLine(talker, 'praise', { crowd: 1, turnNo: turn }, random);
    if (!id) continue;
    assert.ok(!recent.slice(-4).includes(id), `${id} again`);
    recent.push(id);
  }
});

test('more bots at the table, fewer words each', () => {
  const random = seededRandom(5);
  const rate = (crowd) => {
    const bot = { persona: 'wild' };
    let said = 0;
    for (let turn = 0; turn < 4000; turn++) {
      bot.quietUntil = 0;
      if (pickLine(bot, 'slow', { crowd, turnNo: turn }, random)) said += 1;
    }
    return said / 4000;
  };
  assert.ok(rate(3) < rate(1) * 0.7);
});
