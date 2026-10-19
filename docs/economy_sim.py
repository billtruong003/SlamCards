"""Economy draft for Flip Flop Slam: Monte Carlo of coins, levels and the card-background gacha.
Bill's rules: 2-4 matches buy a pet; level up = 10 free pulls; 6 rarities (white..rainbow);
a rare item within ~40-50 pulls; backgrounds and special stickers very rare; x10 of an item unlocks its sticker;
a collection set has 5 items; no daily coin cap."""
import random, statistics as st

# ---- match income (coins), by finishing place; longer tables pay a bit more per match
PAY = {2: [100, 40], 3: [110, 60, 40], 4: [120, 75, 55, 40]}
BONUS_CAPTURE = 10          # each card you capture
# ---- xp: same shape as coins
XP = {2: [100, 60], 3: [110, 75, 60], 4: [120, 85, 70, 60]}
def xp_to_next(level):      # L1->2 150, then +150 per level
    return 150 * level
# ---- pets: 21 locked (cat, dog, penguin free)
PET_PRICES = [200] * 9 + [300] * 8 + [400] * 4
PULL_COST = 60
# ---- gacha: rarity weights (%), pity
RARITY = ['white', 'green', 'blue', 'purple', 'orange', 'rainbow']
WEIGHTS = [50, 28, 14, 6.05, 1.55, 0.4]
HARD_PITY = 50              # orange or better guaranteed by pull 50
SOFT_PITY = 40              # from pull 40 the orange+ chance climbs
BG_SHARE = {'orange': 0.2, 'rainbow': 1.0}   # share of that tier that is a card background
SETS = 2                    # collection sets live at once, 5 items each (one per tier white..orange)


def pull(since_rare):
    w = list(WEIGHTS)
    if since_rare >= SOFT_PITY:
        boost = (since_rare - SOFT_PITY + 1) * 6
        w[4] += boost
    if since_rare + 1 >= HARD_PITY:
        w = [0, 0, 0, 0, WEIGHTS[4], WEIGHTS[5]]
    r = random.choices(RARITY, weights=w)[0]
    bg = random.random() < BG_SHARE.get(r, 0)
    return r, bg


def player(matches, size_mix=(0.5, 0.2, 0.3), win_rate=None, paid_pulls=True):
    coins = xp = 0; level = 1; free = 0; pulls = 0; since = 0
    pets = 0; first_pet = None; first_rare = None; bgs = 0; first_bg = None
    items = {}; stickers = 0; first_sticker = None
    prices = sorted(PET_PRICES)
    for m in range(1, matches + 1):
        n = random.choices([2, 3, 4], weights=size_mix)[0]
        place = random.randrange(n) if win_rate is None else (0 if random.random() < win_rate else random.randrange(1, n))
        coins += PAY[n][place] + BONUS_CAPTURE * random.choice([0, 0, 1, 1, 2])
        xp += XP[n][place]
        while xp >= xp_to_next(level):
            xp -= xp_to_next(level); level += 1; free += 10
        # spend: buy the cheapest pet when affordable, else pull with spare coins above the next pet price
        if pets < len(prices) and coins >= prices[pets]:
            coins -= prices[pets]; pets += 1
            if first_pet is None: first_pet = m
        budget_pulls = free + ((coins - (prices[pets] if pets < len(prices) else 0)) // PULL_COST if paid_pulls else 0)
        for _ in range(max(0, int(budget_pulls))):
            if free: free -= 1
            else: coins -= PULL_COST
            pulls += 1
            r, bg = pull(since)
            since = 0 if r in ('orange', 'rainbow') else since + 1
            if r in ('orange', 'rainbow') and first_rare is None: first_rare = m
            if bg:
                bgs += 1
                if first_bg is None: first_bg = m
            else:
                key = (r, random.randrange(SETS))
                items[key] = items.get(key, 0) + 1
                if items[key] == {"white": 25, "green": 15}.get(r, 10):
                    stickers += 1
                    if first_sticker is None: first_sticker = m
    return dict(level=level, pets=pets, pulls=pulls, bgs=bgs, stickers=stickers, first_pet=first_pet, first_rare=first_rare,
                first_bg=first_bg, first_sticker=first_sticker, items=items)


def summary(runs, key):
    v = [r[key] for r in runs if r[key] is not None]
    return f'{st.median(v):.0f} (none in {len(runs) - len(v)} of {len(runs)})' if v else 'never'


random.seed(1)
for matches in (10, 30, 60, 100):
    runs = [player(matches) for _ in range(2000)]
    print(f'--- after {matches} matches (median of 2000 players)')
    for k in ('level', 'pets', 'pulls', 'bgs', 'stickers'):
        print(f'  {k:9s} {st.median(r[k] for r in runs):.0f}')
runs = [player(300) for _ in range(2000)]
print('--- first time (match number, median)')
for k in ('first_pet', 'first_rare', 'first_bg', 'first_sticker'):
    print(f'  {k:14s} {summary(runs, k)}')
# matches per pet for an average player while still buying pets
r = [player(60) for _ in range(2000)]
print('pets per match over 60 matches:', st.median(x['pets'] for x in r) / 60)
# pulls needed for a sticker by item tier (one specific item, x10)
probs = dict(zip(RARITY, [w / 100 for w in WEIGHTS]))
for t in ('white', 'green', 'blue', 'purple', 'orange'):
    p = probs[t] * (1 - BG_SHARE.get(t, 0)) / SETS
    need = {"white": 25, "green": 15}.get(t, 10)
    print(f"sticker from a {t:6s} item (x{need}): about {need / p:.0f} pulls")
print('background chance per pull: %.2f%% (about 1 in %.0f)' % (100 * sum(probs[t] * BG_SHARE.get(t, 0) for t in RARITY), 1 / sum(probs[t] * BG_SHARE.get(t, 0) for t in RARITY)))
# orange+ within pity: distribution of pulls to first orange+
def to_rare():
    s = 0
    while True:
        r, _ = pull(s); s += 1
        if r in ('orange', 'rainbow'): return s
d = [to_rare() for _ in range(20000)]
print('pulls to first orange-or-better: median %d, 90%% within %d, max %d' % (st.median(d), sorted(d)[int(0.9 * len(d))], max(d)))
