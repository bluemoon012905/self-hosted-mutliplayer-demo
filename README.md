# self-hosted-mutliplayer-demo

Tank Trouble-style browser game scaffold with:

- static client for player-vs-AI
- shared game definitions and factories
- optional local server for future multiplayer/authoritative state

## Structure

- `index.html`: static app entrypoint
- `src/client`: browser app
- `src/shared`: game domain, decoders, and factories
- `src/server`: optional local server entrypoint
- `src/content`: raw config definitions for characters, items, and maps

## Why the decoder/factory layer exists

Raw config should be cheap to change. The rest of the game should not depend on raw object shapes.

The flow is:

1. Raw content definitions live in `src/content`.
2. Decoders validate and normalize those definitions.
3. Factories build runtime-ready objects.
4. Client and server consume the normalized runtime objects.

That lets you tweak stats, map layouts, and loadouts without rewriting gameplay code.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run dev:server`

## Next build steps

- add maze generation
- add tank movement and projectile simulation
- add AI controller
- add local multiplayer state sync over websocket or SSE + HTTP
