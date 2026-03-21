import "./styles.css";

import { bindInput } from "./game/bindInput";
import {
  applyPvpRoomSnapshot,
  createGameSession,
  goToMenu,
  setPvpBusy,
  setPvpError,
  startMatch,
  tickSession,
} from "./game/gameSession";
import { renderGame } from "./game/renderGame";
import { loadCatalog } from "./services/catalogSource";
import {
  createPvpRoom,
  fetchPvpRoom,
  joinPvpRoom,
  leavePvpRoom,
  setPvpReady,
  updatePvpRoomConfig,
} from "./services/pvpRoomService";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root element");
}

const appRoot = app;
appRoot.dataset.arenaRoot = "true";

async function bootstrap() {
  const localServerUrl =
    window.location.port === "3001"
      ? window.location.origin
      : "http://localhost:3001";
  const catalog = await loadCatalog({
    mode: "local-server",
    localServerUrl,
  });
  const session = createGameSession(catalog);

  const render = () => {
    appRoot.innerHTML = renderGame(session);
  };

  function normalizedServerUrl(): string {
    return session.pvp.serverUrl.trim().replace(/\/+$/, "");
  }

  async function withPvpRequest(task: () => Promise<void>) {
    try {
      setPvpBusy(session, true);
      setPvpError(session, null);
      render();
      await task();
    } catch (error) {
      setPvpError(
        session,
        error instanceof Error ? error.message : "PVP request failed.",
      );
    } finally {
      setPvpBusy(session, false);
      render();
    }
  }

  render();
  bindInput(session, render, {
    onBackToMenuFromPvpRoom: () =>
      withPvpRequest(async () => {
        const currentRoom = session.pvp.currentRoom;

        if (currentRoom) {
          await leavePvpRoom({
            serverUrl: normalizedServerUrl(),
            roomCode: currentRoom.roomCode,
            playerId: session.pvp.playerId,
          });
        }

        applyPvpRoomSnapshot(session, null);
        goToMenu(session);
      }),
    onCreatePvpRoom: () =>
      withPvpRequest(async () => {
        const room = await createPvpRoom({
          serverUrl: normalizedServerUrl(),
          playerId: session.pvp.playerId,
          playerName: session.pvp.playerName.trim() || "Pilot",
          password: session.pvp.passwordInput,
          mapTemplateId: session.selectedMapTemplateId,
          density: session.selectedDensity,
          layoutSize: session.selectedLayoutSize,
          waitTimeSeconds: Number(session.pvp.waitTimeSecondsInput) || 20,
        });
        applyPvpRoomSnapshot(session, room);
      }),
    onJoinPvpRoom: () =>
      withPvpRequest(async () => {
        const room = await joinPvpRoom({
          serverUrl: normalizedServerUrl(),
          roomCode: session.pvp.roomCodeInput.trim().toUpperCase(),
          playerId: session.pvp.playerId,
          playerName: session.pvp.playerName.trim() || "Pilot",
          password: session.pvp.passwordInput,
        });
        applyPvpRoomSnapshot(session, room);
      }),
    onLeavePvpRoom: () =>
      withPvpRequest(async () => {
        const currentRoom = session.pvp.currentRoom;

        if (currentRoom) {
          await leavePvpRoom({
            serverUrl: normalizedServerUrl(),
            roomCode: currentRoom.roomCode,
            playerId: session.pvp.playerId,
          });
        }

        applyPvpRoomSnapshot(session, null);
        session.flow = "setup";
      }),
    onTogglePvpReady: () =>
      withPvpRequest(async () => {
        const currentRoom = session.pvp.currentRoom;
        const currentPlayer = currentRoom?.players.find(
          (player) => player.id === session.pvp.playerId,
        );

        if (!currentRoom || !currentPlayer) {
          throw new Error("Join a room first.");
        }

        const room = await setPvpReady({
          serverUrl: normalizedServerUrl(),
          roomCode: currentRoom.roomCode,
          playerId: session.pvp.playerId,
          ready: !currentPlayer.ready,
        });
        applyPvpRoomSnapshot(session, room);
      }),
    onRefreshPvpRoom: () =>
      withPvpRequest(async () => {
        const currentRoom = session.pvp.currentRoom;

        if (!currentRoom) {
          return;
        }

        const room = await fetchPvpRoom({
          serverUrl: normalizedServerUrl(),
          roomCode: currentRoom.roomCode,
        });
        applyPvpRoomSnapshot(session, room);
      }),
    onUpdatePvpRoomConfig: () =>
      withPvpRequest(async () => {
        const currentRoom = session.pvp.currentRoom;

        if (!currentRoom) {
          return;
        }

        const room = await updatePvpRoomConfig({
          serverUrl: normalizedServerUrl(),
          roomCode: currentRoom.roomCode,
          playerId: session.pvp.playerId,
          mapTemplateId: session.selectedMapTemplateId,
          density: session.selectedDensity,
          layoutSize: session.selectedLayoutSize,
          waitTimeSeconds: Number(session.pvp.waitTimeSecondsInput) || 20,
        });
        applyPvpRoomSnapshot(session, room);
      }),
  });

  let lastTickAt = performance.now();
  let lastRoomPollAt = 0;

  function loop(now: number) {
    const deltaMs = now - lastTickAt;
    lastTickAt = now;

    if (tickSession(session, deltaMs)) {
      render();
    }

    const currentRoom = session.pvp.currentRoom;
    if (
      session.mode === "pvp" &&
      currentRoom &&
      now - lastRoomPollAt >= 1000 &&
      !session.pvp.isBusy
    ) {
      lastRoomPollAt = now;
      void fetchPvpRoom({
        serverUrl: normalizedServerUrl(),
        roomCode: currentRoom.roomCode,
      })
        .then((room) => {
          applyPvpRoomSnapshot(session, room);

          if (room.status === "active" && session.flow === "setup") {
            startMatch(session);
          }

          render();
        })
        .catch((error) => {
          setPvpError(
            session,
            error instanceof Error ? error.message : "Failed to refresh room.",
          );
          render();
        });
    }

    window.requestAnimationFrame(loop);
  }

  window.requestAnimationFrame(loop);
}

void bootstrap();
