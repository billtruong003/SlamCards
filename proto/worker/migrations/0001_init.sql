-- Devices (2.01): one row per signed device id the game server gave out. coins and xp are the sums of
-- the device's ledger rows, kept by the trigger below; coins can never go below 0 (the CHECK makes an
-- overspending ledger row fail). account: the Google account it is linked to (2.02); linked devices
-- are never pruned.
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  created INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  account TEXT
);
CREATE INDEX devices_last_seen ON devices (last_seen) WHERE account IS NULL;

-- The ledger: every change of coins or xp, with the reason (match, pet, pull, gift...) and a ref
-- unique to the event, so the game server can send one again without paying twice.
CREATE TABLE ledger (
  ref TEXT PRIMARY KEY,
  device TEXT NOT NULL REFERENCES devices (id) ON DELETE CASCADE,
  coins INTEGER NOT NULL,
  xp INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX ledger_device ON ledger (device, at);

CREATE TRIGGER ledger_apply AFTER INSERT ON ledger BEGIN
  UPDATE devices SET coins = coins + NEW.coins, xp = xp + NEW.xp WHERE id = NEW.device;
END;
