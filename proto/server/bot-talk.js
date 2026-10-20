// What computer players say (task B.05, Bill's lines in docs/bot-loi-noi.md): a quick line or a
// sticker for what just happened, sent like a person's reaction ({t:'react'}), so they tease and
// cheer like the kids they pretend to be. Not every time, never the same line twice in a row, a
// rest after speaking, fewer words each when there are more of them at the table.
//
// Line ids: "p:<id>" are the quick phrases people have too (locale phrase.<id>); "b:<key>" are the
// bots' own (locale bot.<key>); anything else is a sticker. The client shows all three.
const P = (id) => `p:${id}`;
const B = (key) => `b:${key}`;

// Situation → lines, as Bill wrote them.
export const LINES = {
  ate: [P('non'), P('eat'), P('trinh'), P('halan'), B('ate.yum'), B('ate.please'), B('ate.mine'), B('ate.thanks'), B('ate.easy'), B('ate.letsgo')], // the bot just took a person's card
  miss: [P('ga'), P('oops'), B('miss.really'), B('miss.shaky'), B('miss.practice'), B('miss.hello'), B('miss.missed'), B('miss.whiff'), B('miss.lol')], // a person slapped nothing, or knocked a card off
  slow: [P('hurry'), B('slow.asleep'), B('slow.plotting'), B('slow.goon'), B('slow.roots'), B('slow.there'), B('slow.deep')], // a person thinks long
  stung: [P('lucky'), B('stung.fluke'), B('stung.payback'), B('stung.wait'), B('stung.once'), B('stung.hmph'), B('stung.harsh'), B('stung.noted')], // a person took the bot's card
  praise: [P('bakhi'), B('praise.wow'), B('praise.skill'), B('praise.peak'), B('praise.nice'), B('praise.respect'), B('praise.bighand'), B('praise.slick')], // a person slammed well
  decisive: [P('scared'), B('decisive.done'), B('decisive.watch'), B('decisive.breath'), B('decisive.brace'), B('decisive.gone')], // the bot is about to take a slam it likes
  won: [P('gg'), B('won.ez'), B('won.practice'), B('won.again'), B('won.fun'), B('won.bow'), B('won.gentle')],
  lost: [P('gg'), B('lost.rematch'), B('lost.more'), B('lost.notserious'), B('lost.revenge'), B('lost.great')],
  hello: [B('hello.hi'), P('comeon'), B('hello.fair'), P('wait'), B('hello.mine'), B('hello.all')],
  reply: [B('reply.talky'), B('reply.slam'), B('reply.last'), B('reply.wait'), B('reply.sure'), B('reply.focus')], // a person teased the table
};

// Stickers that say the same, sent instead of words now and then.
export const STICKERS_FOR = {
  ate: ['haha', 'sly', 'cool', 'dance'],
  miss: ['haha', 'laughpray', 'bonk', 'stare'],
  slow: ['waiting', 'stare'],
  stung: ['sadcat', 'wail', 'plot'],
  praise: ['wow', 'like', 'flushed'],
  decisive: ['scheme', 'plot', 'sly'],
  won: ['dance', 'cool', 'like'],
  lost: ['sob', 'shrug', 'sad'],
  hello: ['hello', 'hellochat'],
  reply: ['shh', 'boo', 'stare'],
};

// How much each persona talks (share of the moments worth a line), and its pet lines (chosen more).
export const TALK = { quick: 0.5, fox: 0.34, wild: 0.47, rookie: 0.4 }; // within Bill's 1/3 to 1/2
const FAVORITES = {
  quick: [P('non'), P('ga'), B('won.ez'), P('eat'), P('hurry')],
  fox: [B('ate.please'), B('stung.wait'), P('bakhi'), 'sly'],
  wild: [B('ate.letsgo'), B('decisive.gone'), B('miss.lol')],
  rookie: [P('lucky'), B('miss.hello'), 'sadcat'],
};
const STICKER_SHARE = 0.3;
const RECENT = 5; // lines a bot will not say again soon
// Moments that end or open something are said even by a bot that just spoke.
const ANY_TIME = new Set(['won', 'lost', 'hello']);

// A people's taunt, which a bot may answer.
export const TAUNTS = new Set([P('ga'), P('non'), P('trinh'), P('halan'), P('eat'), P('scared'), 'haha', 'boo', 'sly']);

// The line a bot says for `situation`, or null for silence. `bot` keeps its memory: said (recent
// ids), quietUntil (the turn number before which it rests). crowd: bots at the table; turnNo: the
// room's turn count.
export function pickLine(bot, situation, { crowd = 1, turnNo = 0 }, random = Math.random) {
  if (!ANY_TIME.has(situation) && (bot.quietUntil ?? 0) > turnNo) return null;
  if (random() >= (TALK[bot.persona] ?? 0.3) / Math.sqrt(Math.max(1, crowd))) return null;
  const said = bot.said ?? [];
  const fresh = (list) => list.filter((id) => !said.includes(id));
  let pool = random() < STICKER_SHARE ? fresh(STICKERS_FOR[situation]) : fresh(LINES[situation]);
  if (!pool.length) pool = fresh([...LINES[situation], ...STICKERS_FOR[situation]]);
  if (!pool.length) return null;
  // pet lines count three times
  const favorites = FAVORITES[bot.persona] ?? [];
  const weighted = pool.flatMap((id) => (favorites.includes(id) ? [id, id, id] : [id]));
  const id = weighted[Math.floor(random() * weighted.length)];
  bot.said = [...said, id].slice(-RECENT);
  bot.quietUntil = turnNo + 2 + Math.floor(random() * 2); // then a rest of two or three turns
  return id;
}

// Every bot line id the client must be able to show (test: each has a locale entry).
export const ALL_LINES = [...new Set(Object.values(LINES).flat())];
