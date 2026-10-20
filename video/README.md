# Marketing video + media · Dép Lào Tuổi Thơ

Everything that makes the trailer, the shorts and the key art. The game footage is real: scripted players play matches
on the local server and the page is filmed frame by frame (sounds logged with their exact time).

```
qa/capture/          filming + stills (needs the game server on :8097; playwright lives in qa/node_modules)
  rec.mjs              recorder: DevTools screencast, sound log, the "film look" (no HUD, memes off, live link)
  match.mjs            the story match (MODE=phone|desktop)        → qa/out/film/<mode>-match/
  hook.mjs             posed close-ups of the capture               → qa/out/film/<mode>-hook/
  extra.mjs            quick match with strangers, wardrobe         → qa/out/film/desktop-{quick,wardrobe}/
  shorts.mjs           portrait take reel, each slam logged as cap / near / flip / off → qa/out/film/<NAME>/
                       (DEP=dep_le|dep_to_ong, SHIFT/DMIN/DMAX/TYPE for the off-table takes)
  thump-render.mjs     the game's slam sound rendered by the browser's Web Audio → video/sfx/game_thump_<i>.wav
  assemble.py          a take → footage.mp4 (constant 30 fps) + events.json (sounds, marks in seconds)
  stills.mjs, media-assets.mjs, media-cards.mjs   4K stills, pet/slipper/card cut-outs → video/media/src/
  media-render.mjs     renders video/media/keyart.html artboards → video/media/out/
  capture-story.mjs, capture-stage.mjs            early storyboard stills (qa/out/story)

video/
  sfx.py               the game's own SFX as files (ports of proto/src/sound.js) + edit sounds → sfx/
  cut.py               the first trailer (v4) and short: shots in music beats → edit/src/edl.json + mix.json (superseded)
  trailer.py           the trailer v3 (16:9, ~50 s): ident, Bill's copy, the one end card → edit/src/trailer.json + mixtrailer.json
  editlib.py           the edit model shared by shorts5.py and trailer.py (clips + overlays drawn by edit/src/Shorts5.tsx)
  shorts.py            the three shorts → edit/src/shorts.json + mixshorts.json (superseded by shorts5.py)
  shorts5.py           the five shorts, one concept each (S1 XIU, S2 CLIFF + P2, S3 RECESS, S4 DEPS, S5 FRIEND) → edit/src/shorts5.json + mix5.json
  audio_mix.py         mix + master (music ducked under SFX, limiter, −14 LUFS / −1 dBTP) → out/build/<ID>_soundtrack.wav
  grade.py             colour + finish (range fix, sharpen-blur-multiply, luma levels) out/build → out/final
  edit/                Remotion project: Cut.tsx (trailer), Shorts.tsx (old shorts), Shorts5.tsx (the five shorts, trailer type system), chat.css
  design/              module mockups (chat bubble) shared with Remotion
  media/keyart.html    key art (style "vở học trò" chosen) → media/out/
  media/thumb.html     the trailer's YouTube thumbnail (1280x720) → media/out/thumb-trailer.png
  fonts/               Baloo 2 (the game's display font)
  archive/             superseded: the still-frame mockup animatic, key art v1
  out/final/           deliverables · out/build/ intermediates · out/old/ earlier versions (all git-ignored)
```

## Make a video

```bash
node qa/capture/thump-render.mjs                           # once: the game's own slam sound
cd video && python sfx.py
python shorts.py && python audio_mix.py mixshorts.json     # or: python cut.py && python audio_mix.py mix.json
cp out/build/STRESS_soundtrack.wav edit/public/STRESS_mix.wav   # (each video: <ID>_mix.wav next to the footage)
cd edit && npm run shorts                                  # or: npm run long
cd .. && python grade.py short_STRESS                      # → out/final/short_stress.mp4
# the five: python shorts5.py && python audio_mix.py mix5.json, copy out/build/<ID>_soundtrack.wav to edit/public/<ID>_mix.wav,
#   npx remotion render src/index.ts S1-XIU ../out/build/S1-XIU.mp4 --codec h264 --crf 17, python grade.py S1-XIU
```

Film slowed: `SLOW=0.25` runs the game at a quarter speed while the screencast records (its clock, timers, frames, CSS
animations; start the server with every SLAM_TIMING value x4), and assemble.py rebuilds 60 fps in game time, so every
frame is a new one. Slow motion below ~0.6x uses 240 fps windows interpolated with ffmpeg minterpolate (editlib.INTERP).
Check: a contact sheet of every cut, and no frozen frame in the middle of motion (only the game's own hit-stop).

Footage is copied into `edit/public/footage/` (git-ignored): `<name>.mp4` + `<name>.json` from `qa/out/film/<take>/`.
Before sending anything: contact sheets of the start / middle / end of every shot and of every cut.
