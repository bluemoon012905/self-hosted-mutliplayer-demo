import type { TilePoint } from "../../shared/domain/gameTypes";
import { getPlayerTile } from "./gameSession";
import type { GameSession } from "./runtimeTypes";

const viewRadiusColumns = 11;
const viewRadiusRows = 7;
const renderCellSize = 52;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function keyOf(tile: TilePoint): string {
  return `${tile.column},${tile.row}`;
}

function buildLine(start: TilePoint, end: TilePoint): TilePoint[] {
  const points: TilePoint[] = [];
  let currentColumn = start.column;
  let currentRow = start.row;
  const deltaColumn = Math.abs(end.column - start.column);
  const stepColumn = start.column < end.column ? 1 : -1;
  const deltaRow = -Math.abs(end.row - start.row);
  const stepRow = start.row < end.row ? 1 : -1;
  let error = deltaColumn + deltaRow;

  while (true) {
    points.push({ column: currentColumn, row: currentRow });

    if (currentColumn === end.column && currentRow === end.row) {
      return points;
    }

    const errorTimesTwo = 2 * error;

    if (errorTimesTwo >= deltaRow) {
      error += deltaRow;
      currentColumn += stepColumn;
    }

    if (errorTimesTwo <= deltaColumn) {
      error += deltaColumn;
      currentRow += stepRow;
    }
  }
}

function hasLineOfSight(session: GameSession, target: TilePoint): boolean {
  const line = buildLine(getPlayerTile(session), target);

  for (let index = 1; index < line.length; index += 1) {
    const point = line[index];
    const cell = session.map.grid[point.row]?.[point.column];

    if (!cell) {
      return false;
    }

    if (point.column === target.column && point.row === target.row) {
      return true;
    }

    if (cell === "#") {
      return false;
    }
  }

  return true;
}

function buildVisibleTiles(session: GameSession): Set<string> {
  const playerTile = getPlayerTile(session);
  const visible = new Set<string>([keyOf(playerTile)]);
  const minColumn = clamp(
    playerTile.column - viewRadiusColumns,
    0,
    session.map.size.columns - 1,
  );
  const maxColumn = clamp(
    playerTile.column + viewRadiusColumns,
    0,
    session.map.size.columns - 1,
  );
  const minRow = clamp(
    playerTile.row - viewRadiusRows,
    0,
    session.map.size.rows - 1,
  );
  const maxRow = clamp(
    playerTile.row + viewRadiusRows,
    0,
    session.map.size.rows - 1,
  );

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      const target = { column, row };

      if (hasLineOfSight(session, target)) {
        visible.add(keyOf(target));
      }
    }
  }

  return visible;
}

function buildViewport(session: GameSession): {
  minColumn: number;
  maxColumn: number;
  minRow: number;
  maxRow: number;
} {
  const playerTile = getPlayerTile(session);

  return {
    minColumn: clamp(
      playerTile.column - viewRadiusColumns,
      0,
      session.map.size.columns - 1,
    ),
    maxColumn: clamp(
      playerTile.column + viewRadiusColumns,
      0,
      session.map.size.columns - 1,
    ),
    minRow: clamp(
      playerTile.row - viewRadiusRows,
      0,
      session.map.size.rows - 1,
    ),
    maxRow: clamp(
      playerTile.row + viewRadiusRows,
      0,
      session.map.size.rows - 1,
    ),
  };
}

function renderPlayerOverlay(session: GameSession, viewport: ReturnType<typeof buildViewport>): string {
  const viewportOriginX = viewport.minColumn * session.map.tileSize;
  const viewportOriginY = viewport.minRow * session.map.tileSize;
  const left =
    ((session.player.position.x - viewportOriginX) / session.map.tileSize) *
    renderCellSize;
  const top =
    ((session.player.position.y - viewportOriginY) / session.map.tileSize) *
    renderCellSize;
  const diameter =
    (session.player.radius * 2 * renderCellSize) / session.map.tileSize;

  return `
    <div
      class="arena-player-overlay"
      style="left:${left}px; top:${top}px; width:${diameter}px; height:${diameter}px;"
    ></div>
  `;
}

function renderArena(session: GameSession): string {
  const viewport = buildViewport(session);
  const rows: string[] = [];

  for (let row = viewport.minRow; row <= viewport.maxRow; row += 1) {
    const cells: string[] = [];

    for (
      let column = viewport.minColumn;
      column <= viewport.maxColumn;
      column += 1
    ) {
      const isSpawnTile = session.map.spawnTiles.some(
        (tile) => tile.column === column && tile.row === row,
      );
      const cell = session.map.grid[row]?.[column] ?? "#";
      let className = "arena-cell";

      if (cell === "#") {
        className += " arena-wall";
      } else {
        className += " arena-floor";
      }

      if (isSpawnTile) {
        className += " arena-spawn";
      }

      cells.push(`<div class="${className}"></div>`);
    }

    rows.push(`<div class="arena-row">${cells.join("")}</div>`);
  }

  rows.push(renderPlayerOverlay(session, viewport));

  return rows.join("");
}

function renderMiniMap(session: GameSession): string {
  const visibleTiles = buildVisibleTiles(session);
  const playerTile = getPlayerTile(session);

  return session.map.grid
    .map((row, rowIndex) => {
      const cells = [...row]
        .map((cell, columnIndex) => {
          const isPlayerTile =
            playerTile.column === columnIndex && playerTile.row === rowIndex;
          const isVisible = visibleTiles.has(`${columnIndex},${rowIndex}`);
          let className = "minimap-cell";

          if (cell === "#") {
            className += " minimap-wall";
          } else {
            className += " minimap-floor";
          }

          if (isVisible) {
            className += " minimap-visible";
          }

          if (isPlayerTile) {
            className += " minimap-player";
          }

          return `<div class="${className}"></div>`;
        })
        .join("");

      return `<div class="minimap-row" style="--minimap-columns:${session.map.size.columns}">${cells}</div>`;
    })
    .join("");
}

function renderHud(session: GameSession): string {
  const { definition, resources } = session.player;

  return `
    <div class="arena-hud">
      <div class="hud-chip">
        <strong>HP</strong>
        <span>${Math.round(resources.health)} / ${definition.stats.health.max}</span>
      </div>
      <div class="hud-chip">
        <strong>STA</strong>
        <span>${Math.round(resources.stamina)} / ${definition.stats.stamina.max}</span>
      </div>
      <div class="hud-chip">
        <strong>MP</strong>
        <span>${Math.round(resources.mana)} / ${definition.stats.mana.max}</span>
      </div>
    </div>
  `;
}

export function renderGame(session: GameSession): string {
  const isFullscreen = Boolean(document.fullscreenElement);

  return `
    <main class="shell">
      <section class="panel arena-stage" data-arena-root>
        <div class="arena-panel">
          <div class="arena-header">
            <div>
              <p class="eyebrow">Arena</p>
              <h2>${session.map.name}</h2>
              ${renderHud(session)}
            </div>
            <div class="arena-overview">
              <div class="minimap">
                ${renderMiniMap(session)}
              </div>
              <p class="arena-meta">
                ${session.map.archetype} · ${session.map.size.columns}x${session.map.size.rows} · sight window 23x15
              </p>
              <button class="selector-button" data-fullscreen-toggle type="button">
                ${isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
              </button>
            </div>
          </div>
          <div class="arena-grid" style="--columns:23; --cell-size:${renderCellSize}px;">
            ${renderArena(session)}
          </div>
        </div>
      </section>
    </main>
  `;
}
