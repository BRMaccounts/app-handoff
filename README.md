# The hand-off page for the app's old address

When the app moves to https://beyondthewords.com (register item 93), the old
address, app.brandonrobbinsministry.com, keeps serving only this page. It
carries each reader's saved things (highlights, notes, journal, plan progress,
settings, sign-in) to the new address, switches off the old app's background
helper, and sends them to the same page of the app on the new address.

The whole plan, and the order of the switch, is in
`docs/domain-move-beyondthewords.md` in the app repository.

## What is here

- `index.html` and `404.html`: the same page twice, so every old link, however
  deep, lands on it. Keep them identical.
- `carry-send.js`: does the work. Its packed format must match
  `src/lib/carry.ts` in the app; `tests/carry.test.mjs` there checks the two
  against each other.
- `CNAME`: the old address, so GitHub Pages answers for it.

## How to publish it as its own GitHub Pages site (switch day only)

1. On GitHub, make a new public repository under the same account, for example
   `brmaccounts/app-handoff`.
2. Copy the four files in this folder (not this README, it does no harm either
   way) into the top level of that repository and commit them to its `main`
   branch.
3. In that repository, open Settings, then Pages. Under "Build and
   deployment", choose "Deploy from a branch", branch `main`, folder `/ (root)`,
   and save.
4. Before the old address can point here, the app repository must let go of
   it: the app's `public/CNAME` changes to `beyondthewords.com` in the same
   hour (step order in the domain-move doc). GitHub lets only one repository
   hold a custom domain at a time.
5. Back in this repository's Settings, Pages, type
   `app.brandonrobbinsministry.com` under "Custom domain", save, wait for the
   certificate, then tick "Enforce HTTPS".
6. Test it: open `https://app.brandonrobbinsministry.com/#/read/mark/2` in a
   browser that has used the app. It should land on the same chapter at
   `https://beyondthewords.com/` with the reader's highlights in place.

## Limits

- Everything travels in the address after "#", which never reaches a server.
  The page refuses to build an address longer than 1,000,000 characters
  (Firefox's ceiling; Chrome's is 2 MB). Squeezed, that is far more than a
  browser lets the app save in the first place, so in practice nobody hits it.
  If someone does, the page says so in plain words and leaves everything where
  it is.
- Nothing is deleted from the old address. The old address cannot hear back
  from the new one, so it cannot know the move worked.
