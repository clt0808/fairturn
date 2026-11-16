# FairTurn

A fair queue for [EDF Refer a Friend](https://www.edfenergy.com/refer-a-friend) links, written for a UK audience.

People add their own EDF referral link. Someone who wants to switch asks for a link and is given the next one in the rotation, so a single link cannot take every visitor. A person who joined through a link this site handed out, then adds their own, gets a higher share of later turns.

Until **5 January 2027**, EDF’s published reward is **£100 for the referrer** and **£75 for the new customer**. FairTurn does not pay that credit and is not part of EDF. EDF’s terms say referral links are for friends and family. EDF may withhold the reward if it suspects commercial use, or that a link was sent to people the referrer does not know.

Only EDF is wired up. The queue code does not know about EDF. Another scheme (Octopus, for example) would be a new file beside `src/lib/schemes/edf.ts`.

## How the queue works

The rules live in `src/lib/queue` and are covered by unit tests.

Each active link has a **weight** and a running **current weight**.

- A standard link has weight **1**.
- A boosted link has weight **2**. Boosts do not stack, and nothing is allowed above 2.
- A new link starts at current weight 0. It joins the rotation. It does not wipe turns other people are already owed.

Every time a visitor asks for a link, for each active member:

1. Add their weight to their current weight.
2. Hand out the link with the highest current weight. If two are level, the one that joined earlier wins (then the lower id).
3. Subtract the sum of the active weights from the link that was just handed out, and add one to its handout count.

That is smooth weighted round-robin. From a fresh queue it is exact:

- Three standard links, six handouts: A, B, C, A, B, C.
- One boosted link (A) and two standard links (B, C), eight handouts: A, B, C, A, A, B, C, A. Counts are 4, 2 and 2.

Inactive links are skipped and their score is left as it is.

### The boost

It is an honour system. FairTurn cannot see EDF’s accounts.

1. A visitor takes a link. The site creates an 8-character claim code, shows it, and stores it in an HTTP-only cookie for 120 days.
2. If they later submit their own EDF link and the code is still valid, that new link is boosted.
3. The same browser fills the code in automatically. They can also type it.
4. A blank code is a normal join, not an error.

A code is refused when it is unknown, already used, expired, or when it was issued for the same referral link being submitted (you cannot boost the link you were just given). Using a code does not reset anyone else’s score. It only changes that new link’s future share.

### Abuse limits

- One active link per email.
- The same referral code cannot be active twice.
- Links must look like `https://www.edfenergy.com/quote/refer-a-friend/adjective-noun-number`. `http`, a missing `www`, and a trailing slash are accepted and stored in that canonical form. Other hosts, bare codes, extra paths, and tracking queries are rejected.
- Submitting: 5 an hour and 12 a day per network.
- Taking a link: 8 an hour and 15 a day per network.
- Boosts: a token works once, weight stops at 2, and one network can only boost two links a day.
- Admin logins: 8 failures an hour per network.

Network addresses are hashed with `IP_HASH_SALT` and the hash is kept for two days. The raw address is not stored.

### Admin reorder

Up and down change who is offered next. They do not change weights. The move rewrites the current-weight ladder of the active links so the new order is what the next handouts follow. After that, the usual weights apply again.

Removing a link deactivates it and keeps its handout count. It can be restored unless that email or code is already active again.

## Run it locally

Node.js 22 or newer. The app uses Node’s built-in SQLite (`node:sqlite`). No separate database server.

```bash
npm install
cp .env.example .env.local
npm test
npm run dev
```

Open http://127.0.0.1:43123

`npm test` runs the queue, boost, claim, URL, and database tests.

For a local demo, set `SEED_DEMO=true` in `.env.local` before the first start. That inserts four fictional `example.com` links when the database is empty. The site shows a banner while any of those are still active. Do not use the sample admin password from a shared example file on a public server. Set your own.

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | Password for `/admin`. The admin page will not log anyone in until this is set. |
| `AUTH_SECRET` | Signs the admin cookie. Falls back to `ADMIN_PASSWORD`. |
| `IP_HASH_SALT` | Salt for network-address hashes. |
| `DATABASE_PATH` | SQLite file. Defaults to `./data/fairturn.db`. |
| `SEED_DEMO` | `true` loads sample links into an empty database. Leave unset in public. |

## Deploy it publicly

This needs a normal Node process and a disk that survives restarts. SQLite has one writer, so run **one** app instance.

A small VM, Fly.io with a volume, or Railway with a volume are a fit. A serverless host with an ephemeral filesystem (Vercel, for example) is not: the queue would be wiped, or the file would not be writable.

1. Install dependencies and run `npm test`, then `npm run build`.
2. Set `ADMIN_PASSWORD`, `AUTH_SECRET`, and `IP_HASH_SALT` to long random values. Do not set `SEED_DEMO`.
3. Point `DATABASE_PATH` at the persistent disk.
4. Start with `npm start`. The server listens on port **43123**. Put HTTPS in front of it (Caddy, nginx, or the platform’s proxy) and proxy to that port, or change the port in the `start` script.
5. Back up the SQLite file. It is the whole queue, including emails and claim codes.
6. Seed your own referral link from `/admin` after you log in. That form checks the URL and the duplicate rules, and it can mark the link boosted if you want.

`node:sqlite` is still marked experimental in Node 22. It is built in, so there is no native module to compile. Plan to stay on Node 22 until you have re-tested a move to a newer Node.

Emails of people who add a link are visible to anyone with the admin password. Treat that password like a database credential.

## Layout

- `src/lib/queue` — rotation, boost cap, and admin reorder. No database and no EDF knowledge.
- `src/lib/schemes` — supplier definitions. EDF is the only one registered.
- `src/lib/claims` — claim codes and the honour-system checks.
- `src/lib/abuse` — rate-limit windows.
- `src/lib/db` — SQLite. Pages call this; the queue module does not.
- `src/app` — landing page, get a link, add a link, FAQ, privacy note, and `/admin`.
