import "./styles.css";

import { loadCatalog } from "./services/catalogSource";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root element");
}

const appRoot = app;

async function bootstrap() {
  const catalog = await loadCatalog({
    mode: "embedded",
    localServerUrl: "http://localhost:3001",
  });

  appRoot.innerHTML = `
    <main class="shell">
      <section class="hero">
        <p class="eyebrow">Static Client + Optional Local Server</p>
        <h1>Maze Tanks</h1>
        <p class="lede">
          Tank Trouble-style scaffold with data-driven characters, maps, and items.
        </p>
      </section>

      <section class="panel">
        <h2>Game Modes</h2>
        <div class="cards">
          <article class="card">
            <h3>Player vs AI</h3>
            <p>Runs entirely in the browser. Safe for static hosting.</p>
          </article>
          <article class="card">
            <h3>Local Host</h3>
            <p>Swap the catalog source to localhost for future multiplayer sessions.</p>
          </article>
        </div>
      </section>

      <section class="panel">
        <h2>Catalog Preview</h2>
        <div class="cards">
          <article class="card">
            <h3>Characters</h3>
            <ul>${catalog.characters
              .map(
                (character) =>
                  `<li><strong>${character.name}</strong> · speed ${character.stats.moveSpeed} · armor ${character.stats.armor}</li>`,
              )
              .join("")}</ul>
          </article>
          <article class="card">
            <h3>Maps</h3>
            ${catalog.maps
              .map(
                (map) => `
                  <div class="map-preview">
                    <p>
                      <strong>${map.name}</strong> · ${map.archetype} · ${map.size.columns}x${map.size.rows} · players ${map.maxPlayers}
                    </p>
                    <pre>${map.grid.join("\n")}</pre>
                  </div>
                `,
              )
              .join("")}
          </article>
          <article class="card">
            <h3>Items</h3>
            <ul>${catalog.items
              .map(
                (item) =>
                  `<li><strong>${item.name}</strong> · ${item.kind} · rarity ${item.rarity}</li>`,
              )
              .join("")}</ul>
          </article>
        </div>
      </section>
    </main>
  `;
}

void bootstrap();
