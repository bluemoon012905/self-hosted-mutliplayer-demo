import "./styles.css";

import { bindInput } from "./game/bindInput";
import { createGameSession, tickSession } from "./game/gameSession";
import { renderGame } from "./game/renderGame";
import { loadCatalog } from "./services/catalogSource";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root element");
}

const appRoot = app;
appRoot.dataset.arenaRoot = "true";

async function bootstrap() {
  const catalog = await loadCatalog({
    mode: "embedded",
    localServerUrl: "http://localhost:3001",
  });
  const session = createGameSession(catalog);

  const render = () => {
    appRoot.innerHTML = renderGame(session);
  };

  render();
  bindInput(session, render);

  let lastTickAt = performance.now();

  function loop(now: number) {
    const deltaMs = now - lastTickAt;
    lastTickAt = now;

    if (tickSession(session, deltaMs)) {
      render();
    }

    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
}

void bootstrap();
