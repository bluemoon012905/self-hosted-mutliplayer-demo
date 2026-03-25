# Milestone: 2026-03-20

## Current State

The project now has:

- `Sandbox`, `Levels`, and `PVP` mode selection from the main menu
- pre-match setup flow for `Levels` and `PVP`
- two-slot weapon loadout for non-sandbox modes with swap on keys `1` and `2`
- AI turtle enemies for `Levels`
- melee and projectile weapon behavior
- roll on `Space`
- block on `K`
- room-based `PVP` lobby flow with:
  - room create
  - room join by code + password
  - ready / unready
  - shared 10 second countdown when both players are ready
  - countdown cancellation if either player unreadies

## Hosting Work Completed

The app was reworked so one server can serve both:

- the built frontend
- the local room API

Relevant files:

- `src/server/index.ts`
- `src/client/main.ts`
- `src/client/game/gameSession.ts`
- `src/client/services/pvpRoomService.ts`

Production run flow is now:

```bash
npm run build
npm start
```

Server default:

- `http://localhost:3001`

## Verified Working Locally

Verified on the host machine:

- `/` serves the built app
- `/health` returns JSON
- `/pvp/rooms/create` works
- local room create / join / ready / countdown works

## Current Blocker

Remote friend access is not working yet.

Observed state:

- the host can open the public tunnel link successfully
- the friend receives the link but sees an empty page
- the friend does not need the repo or a local GitHub checkout
- this appears to be a remote loading / asset / tunnel issue, not a missing local install issue

Important detail:

- the issue was described as "failing to load localhost for my friend's PC"
- that should not happen directly if the tunnel is working, because the friend should only open the public URL
- the remaining problem is likely one of:
  - stale cached assets
  - tunnel misrouting / wrong port at some point
  - client asset load failure in the friend's browser
  - a same-origin / resource request issue that only shows up remotely

## First Checks For Next Session

1. Reproduce with a clean public tunnel after rebuilding:

```bash
npm run build
npm start
cloudflared tunnel --url http://localhost:3001
```

2. Test the public URL in:

- host incognito window
- phone on mobile data
- second browser

3. Have the friend test:

- `/health`
- the main `/` URL

4. Capture the friend's browser errors:

- Console tab
- Network tab failures for `.js`, `.css`, or image assets

5. If still blank, add:

- request logging on the server
- visible client bootstrap error UI instead of a blank page

## Scope Not Done Yet

Real in-match synchronized PVP is not implemented yet.

Current PVP state is:

- shared room / lobby / ready flow
- both clients can enter the match after room activation
- gameplay is not yet authoritative or network-synchronized between players

## Resume Point

Next session should focus on:

1. diagnosing remote blank-page loading from the tunnel URL
2. making remote access robust
3. then moving from shared lobby into actual synchronized in-match PVP
