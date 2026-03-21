import {
  adjustLevelEnemyCount,
  attack,
  goToMenu,
  rerollMap,
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

export function bindInput(
  session: GameSession,
  render: () => void,
): () => void {
  function onPointerDown(event: PointerEvent) {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionNode = target.closest<HTMLElement>(
      "[data-mode-select], [data-back-menu], [data-start-match], [data-enemy-weapon], [data-enemy-adjust], [data-loadout-slot], [data-map-template], [data-map-density], [data-map-layout-size], [data-player-sprite], [data-weapon-id], [data-panel-toggle], [data-map-reroll], [data-fullscreen-toggle]",
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
      goToMenu(session);
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
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.mapDensity) {
      setMapDensity(
        session,
        actionNode.dataset.mapDensity as GameSession["selectedDensity"],
      );
      event.preventDefault();
      render();
      return;
    }

    if (actionNode.dataset.mapLayoutSize) {
      setMapLayoutSize(
        session,
        actionNode.dataset.mapLayoutSize as GameSession["selectedLayoutSize"],
      );
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
        attack(session, "center");
        event.preventDefault();
        render();
        return;
      case "k":
        if (startBlocking(session)) {
          render();
        }
        event.preventDefault();
        return;
      case "l":
        if (event.repeat) {
          return;
        }
        attack(session, "right");
        event.preventDefault();
        render();
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
  document.addEventListener("fullscreenchange", onFullscreenChange);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("pointerdown", onPointerDown);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  };
}
