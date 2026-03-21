import {
  adjustLevelEnemyCount,
  goToMenu,
  isPvpHost,
  releasePrimaryAttack,
  replayMatch,
  rerollMap,
  setPvpField,
  startPrimaryAttack,
  setMapLayoutSize,
  setPlayerSprite,
  setActiveWeaponSlot,
  setSelectedWeapon,
  setSetupLoadoutWeapon,
  selectMapTemplate,
  selectMode,
  setMovementKeyState,
  setMapDensity,
  startBlocking,
  startMatch,
  stopBlocking,
  togglePanelCollapse,
  triggerRoll,
  toggleInventory,
} from "./gameSession";
import type { GameSession } from "./runtimeTypes";

export interface BindInputHandlers {
  onBackToMenuFromPvpRoom?: () => Promise<void> | void;
  onCreatePvpRoom?: () => Promise<void> | void;
  onJoinPvpRoom?: () => Promise<void> | void;
  onLeavePvpRoom?: () => Promise<void> | void;
  onTogglePvpReady?: () => Promise<void> | void;
  onRefreshPvpRoom?: () => Promise<void> | void;
  onUpdatePvpRoomConfig?: () => Promise<void> | void;
}

export function bindInput(
  session: GameSession,
  render: () => void,
  handlers: BindInputHandlers = {},
): () => void {
  function onPointerDown(event: PointerEvent) {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionNode = target.closest<HTMLElement>(
      "[data-mode-select], [data-back-menu], [data-play-again], [data-start-match], [data-enemy-weapon], [data-enemy-adjust], [data-loadout-slot], [data-map-template], [data-map-density], [data-map-layout-size], [data-player-sprite], [data-weapon-id], [data-panel-toggle], [data-map-reroll], [data-fullscreen-toggle], [data-pvp-create], [data-pvp-join], [data-pvp-leave], [data-pvp-ready], [data-pvp-refresh]",
    );

    if (!actionNode) {
      return;
    }

    if (actionNode.dataset.modeSelect) {
      selectMode(
        session,
        actionNode.dataset.modeSelect as NonNullable<GameSession["mode"]>,
      );
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.backMenu !== undefined) {
      if (session.mode === "pvp" && session.pvp.currentRoom) {
        event.preventDefault();
        void handlers.onBackToMenuFromPvpRoom?.();
        return;
      }

      goToMenu(session);
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.playAgain !== undefined) {
      replayMatch(session);
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.startMatch !== undefined) {
      startMatch(session);
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.enemyWeapon && actionNode.dataset.enemyAdjust) {
      adjustLevelEnemyCount(
        session,
        actionNode.dataset.enemyWeapon,
        Number(actionNode.dataset.enemyAdjust),
      );
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.mapTemplate) {
      selectMapTemplate(session, actionNode.dataset.mapTemplate);
      if (session.mode === "pvp" && session.pvp.currentRoom && isPvpHost(session)) {
        void handlers.onUpdatePvpRoomConfig?.();
      }
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.mapDensity) {
      setMapDensity(
        session,
        actionNode.dataset.mapDensity as GameSession["selectedDensity"],
      );
      if (session.mode === "pvp" && session.pvp.currentRoom && isPvpHost(session)) {
        void handlers.onUpdatePvpRoomConfig?.();
      }
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.mapLayoutSize) {
      setMapLayoutSize(
        session,
        actionNode.dataset.mapLayoutSize as GameSession["selectedLayoutSize"],
      );
      if (session.mode === "pvp" && session.pvp.currentRoom && isPvpHost(session)) {
        void handlers.onUpdatePvpRoomConfig?.();
      }
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.playerSprite) {
      setPlayerSprite(session, actionNode.dataset.playerSprite);
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.weaponId) {
      if (session.flow === "setup" && session.mode !== "sandbox") {
        const slot = Number(actionNode.dataset.loadoutSlot ?? "0") === 1 ? 1 : 0;
        setSetupLoadoutWeapon(session, slot, actionNode.dataset.weaponId);
      } else {
        setSelectedWeapon(session, actionNode.dataset.weaponId);
      }
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.panelToggle) {
      togglePanelCollapse(
        session,
        actionNode.dataset.panelToggle as keyof GameSession["collapsedPanels"],
      );
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.mapReroll !== undefined) {
      rerollMap(session);
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.pvpCreate !== undefined) {
      event.preventDefault();
      void handlers.onCreatePvpRoom?.();
      return;
    }

    if (actionNode.dataset.pvpJoin !== undefined) {
      event.preventDefault();
      void handlers.onJoinPvpRoom?.();
      return;
    }

    if (actionNode.dataset.pvpLeave !== undefined) {
      event.preventDefault();
      void handlers.onLeavePvpRoom?.();
      return;
    }

    if (actionNode.dataset.pvpReady !== undefined) {
      event.preventDefault();
      void handlers.onTogglePvpReady?.();
      return;
    }

    if (actionNode.dataset.pvpRefresh !== undefined) {
      event.preventDefault();
      void handlers.onRefreshPvpRoom?.();
      return;
    }

    if (actionNode.dataset.fullscreenToggle !== undefined) {
      const arenaRoot = document.querySelector<HTMLElement>("[data-arena-root]");

      if (!arenaRoot) {
        return;
      }

      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void arenaRoot.requestFullscreen();
      }
      event.preventDefault();
    }
  }

  function onFullscreenChange() {
    render();
  }

  function onInput(event: Event) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const field = target.dataset.pvpField;

    if (!field) {
      return;
    }

    setPvpField(
      session,
      field as "playerName" | "serverUrl" | "roomCodeInput" | "passwordInput" | "waitTimeSecondsInput",
      target.value,
    );
  }

  function onKeyDown(event: KeyboardEvent) {
    if (session.flow !== "match") {
      return;
    }

    const key = event.key.toLowerCase();
    switch (key) {
      case "w":
        if (setMovementKeyState(session, "up", true)) {
          event.preventDefault();
        }
        return;
      case "a":
        if (setMovementKeyState(session, "left", true)) {
          event.preventDefault();
        }
        return;
      case "s":
        if (setMovementKeyState(session, "down", true)) {
          event.preventDefault();
        }
        return;
      case "d":
        if (setMovementKeyState(session, "right", true)) {
          event.preventDefault();
        }
        return;
      case " ":
        if (event.repeat) {
          return;
        }
        if (triggerRoll(session)) {
          render();
        }
        event.preventDefault();
        return;
      case "1":
        if (setActiveWeaponSlot(session, 0)) {
          render();
        }
        event.preventDefault();
        return;
      case "2":
        if (setActiveWeaponSlot(session, 1)) {
          render();
        }
        event.preventDefault();
        return;
      case "e":
        if (event.repeat) {
          return;
        }
        toggleInventory(session);
        event.preventDefault();
        render();
        return;
      case "j":
        if (event.repeat) {
          return;
        }
        if (startPrimaryAttack(session)) {
          render();
        }
        event.preventDefault();
        return;
      case "k":
        if (startBlocking(session)) {
          render();
        }
        event.preventDefault();
        return;
      default:
        return;
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    if (session.flow !== "match") {
      return;
    }

    const key = event.key.toLowerCase();

    switch (key) {
      case "w":
        setMovementKeyState(session, "up", false);
        event.preventDefault();
        return;
      case "a":
        setMovementKeyState(session, "left", false);
        event.preventDefault();
        return;
      case "s":
        setMovementKeyState(session, "down", false);
        event.preventDefault();
        return;
      case "d":
        setMovementKeyState(session, "right", false);
        event.preventDefault();
        return;
      case "j":
        if (releasePrimaryAttack(session)) {
          render();
        }
        event.preventDefault();
        return;
      case "k":
        if (stopBlocking(session)) {
          render();
        }
        event.preventDefault();
        return;
      default:
        return;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("input", onInput);
  document.addEventListener("fullscreenchange", onFullscreenChange);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("input", onInput);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  };
}
