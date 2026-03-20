import {
  attack,
  rerollMap,
  setMapLayoutSize,
  selectMapTemplate,
  setMovementKeyState,
  setMapDensity,
  toggleInventory,
} from "./gameSession";
import type { GameSession } from "./runtimeTypes";

export function bindInput(
  session: GameSession,
  render: () => void,
): () => void {
  function onClick(event: MouseEvent) {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const actionNode = target.closest<HTMLElement>(
      "[data-map-template], [data-map-density], [data-map-layout-size], [data-map-reroll], [data-fullscreen-toggle]",
    );

    if (!actionNode) {
      return;
    }

    if (actionNode.dataset.mapTemplate) {
      selectMapTemplate(session, actionNode.dataset.mapTemplate);
      render();
      return;
    }

    if (actionNode.dataset.mapDensity) {
      setMapDensity(
        session,
        actionNode.dataset.mapDensity as GameSession["selectedDensity"],
      );
      render();
      return;
    }

    if (actionNode.dataset.mapLayoutSize) {
      setMapLayoutSize(
        session,
        actionNode.dataset.mapLayoutSize as GameSession["selectedLayoutSize"],
      );
      render();
      return;
    }

    if (actionNode.dataset.mapReroll !== undefined) {
      rerollMap(session);
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
    }
  }

  function onFullscreenChange() {
    render();
  }

  function onKeyDown(event: KeyboardEvent) {
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
        attack(session, "left");
        event.preventDefault();
        render();
        return;
      case "k":
        if (event.repeat) {
          return;
        }
        attack(session, "center");
        event.preventDefault();
        render();
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
      default:
        return;
    }
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  document.addEventListener("click", onClick);
  document.addEventListener("fullscreenchange", onFullscreenChange);

  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("click", onClick);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
  };
}
