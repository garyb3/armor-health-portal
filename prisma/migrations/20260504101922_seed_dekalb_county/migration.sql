-- Seed: Dekalb County. Fixed id matches the cnty_franklin_seed / cnty_cobb_seed convention.
INSERT INTO "counties" ("id", "slug", "displayName", "active", "createdAt")
VALUES ('cnty_dekalb_seed', 'dekalb', 'Dekalb County', true, CURRENT_TIMESTAMP);
