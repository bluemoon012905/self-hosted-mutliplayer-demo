# self-hosted-mutliplayer-demo

https://bluemoon012905.github.io/self-hosted-mutliplayer-demo/
Tank Trouble-style browser game scaffold with:

- static client for player-vs-AI
- shared game definitions and factories

## Structure

- `index.html`: static app entrypoint
- `src/client`: browser app
- `src/shared`: game domain, decoders, and factories
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

## Running the client correctly

Do not open `index.html` through a generic static server or editor plugin server.
This app's HTML imports `/src/client/main.ts`, which must be transformed by Vite before the browser can execute it.

Use:

- `npm run dev` for local development at `http://localhost:5173`
- `npm run preview` after `npm run build` to serve the production build

## Milestone Notes

Current handoff / milestone status is tracked in:

- [docs/milestone-2026-03-20.md](/home/moonbox/personal_project/self-hosted-mutliplayer-demo/docs/milestone-2026-03-20.md)

## Next build steps

- add maze generation
- add tank movement and projectile simulation
- add AI controller
