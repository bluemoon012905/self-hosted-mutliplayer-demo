import type { TilePoint } from "../../shared/domain/gameTypes";
import { getPlayerTile } from "./gameSession";
import type { GameSession } from "./runtimeTypes";
import turtleCheeseUrl from "../../../player_sprite/turtle_cheese.png";
import turtleCowboyUrl from "../../../player_sprite/turtle_cowboy.png";
import turtleFrogUrl from "../../../player_sprite/turtle_frog.png";
import turtleGlassesUrl from "../../../player_sprite/turtle_glasses.png";
import turtlePoopUrl from "../../../player_sprite/turtle_poop.png";
import turtleScholarUrl from "../../../player_sprite/turtle_scholar.png";
import turtleScorpionUrl from "../../../player_sprite/turtle_scropion.png";

const viewRadiusColumns = 9;
const viewRadiusRows = 6;
const renderCellSize = 66;
const viewportColumns = viewRadiusColumns * 2 + 1;
const viewportRows = viewRadiusRows * 2 + 1;

const spriteUrlByKey: Record<string, string> = {
  turtle_cheese: turtleCheeseUrl,
  turtle_cowboy: turtleCowboyUrl,
  turtle_frog: turtleFrogUrl,
  turtle_glasses: turtleGlassesUrl,
  turtle_poop: turtlePoopUrl,
  turtle_scholar: turtleScholarUrl,
  turtle_scropion: turtleScorpionUrl,
};

function labelForSprite(spriteKey: string): string {
  return spriteKey
    .replace("turtle_", "")
    .replace("scropion", "scorpion")
    .replace(/_/g, " ");
}

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
  originX: number;
  originY: number;
  width: number;
  height: number;
} {
  const width = viewportColumns * session.map.tileSize;
  const height = viewportRows * session.map.tileSize;
  const worldWidth = session.map.size.columns * session.map.tileSize;
  const worldHeight = session.map.size.rows * session.map.tileSize;
  const maxOriginX = Math.max(0, worldWidth - width);
  const maxOriginY = Math.max(0, worldHeight - height);

  return {
    originX: clamp(session.player.position.x - width / 2, 0, maxOriginX),
    originY: clamp(session.player.position.y - height / 2, 0, maxOriginY),
    width,
    height,
  };
}

function renderPlayerOverlay(
  session: GameSession,
  viewport: ReturnType<typeof buildViewport>,
): string {
  const left =
    ((session.player.position.x - viewport.originX) / session.map.tileSize) *
    renderCellSize;
  const top =
    ((session.player.position.y - viewport.originY) / session.map.tileSize) *
    renderCellSize;
  const hitboxWidth =
    ((session.player.radius * 2) * renderCellSize) / session.map.tileSize;
  const hitboxHeight = hitboxWidth;
  const spriteWidth =
    ((session.player.radius * 3.25) * renderCellSize) / session.map.tileSize;
  const spriteHeight =
    ((session.player.radius * 3.7) * renderCellSize) / session.map.tileSize;
  const spriteTop = -(hitboxHeight * 0.98 + spriteHeight * 0.62) + 30;
  const emoteTop = spriteTop - renderCellSize * 0.72;
  const roleClass = `player-role-${session.player.role}`;
  const spriteUrl =
    spriteUrlByKey[session.player.spriteKey] ?? spriteUrlByKey.turtle_glasses;
  const facingClass =
    session.player.facing === "right" ? "is-facing-left" : "is-facing-right";
  const maxSpeedPerSecond = session.player.definition.stats.speed * 52;
  const speedRatio = Math.min(
    1,
    session.player.movementSpeed / Math.max(maxSpeedPerSecond, 1),
  );
  const wobbleDegrees = session.player.isMoving
    ? Math.sin(session.player.walkCycle / 70) * 5 * speedRatio
    : 0;

  return `
    <div
      class="arena-player-overlay ${roleClass} ${facingClass}"
      style="left:${left}px; top:${top}px;"
    >
      <div class="arena-player-emote" style="top:${emoteTop}px;">
        ${session.player.emote}
      </div>
      <img
        class="arena-player-sprite"
        src="${spriteUrl}"
        alt="${session.player.definition.name}"
        style="width:${spriteWidth}px; height:${spriteHeight}px; top:${spriteTop}px; --wobble-rotation:${wobbleDegrees}deg;"
      />
      <div
        class="arena-player-hitbox"
        style="width:${hitboxWidth}px; height:${hitboxHeight}px;"
      ></div>
    </div>
  `;
}

function renderWallSegments(
  session: GameSession,
  viewport: ReturnType<typeof buildViewport>,
): string {
  const viewportRight = viewport.originX + viewport.width;
  const viewportBottom = viewport.originY + viewport.height;

  return session.map.wallTiles
    .map((tile) => {
      const worldX = tile.column * session.map.tileSize;
      const worldY = tile.row * session.map.tileSize;
      const worldRight = worldX + session.map.tileSize;
      const worldBottom = worldY + session.map.tileSize;

      if (
        worldRight < viewport.originX ||
        worldX > viewportRight ||
        worldBottom < viewport.originY ||
        worldY > viewportBottom
      ) {
        return "";
      }

      const left =
        ((worldX - viewport.originX) / session.map.tileSize) * renderCellSize;
      const top =
        ((worldY - viewport.originY) / session.map.tileSize) * renderCellSize;
      const size =
        (session.map.tileSize / session.map.tileSize) * renderCellSize;

      return `
        <div
          class="arena-wall-segment"
          style="left:${left}px; top:${top}px; width:${size}px; height:${size}px;"
        ></div>
      `;
    })
    .join("");
}

function renderArena(session: GameSession): string {
  const viewport = buildViewport(session);
  const visibleTiles = buildVisibleTiles(session);
  const playerTile = getPlayerTile(session);
  const spawnMarkers = session.map.spawnTiles
    .filter((tile) => visibleTiles.has(keyOf(tile)))
    .map((tile) => {
      const left =
        ((tile.column * session.map.tileSize - viewport.originX) /
          session.map.tileSize) *
          renderCellSize +
        renderCellSize * 0.5;
      const top =
        ((tile.row * session.map.tileSize - viewport.originY) /
          session.map.tileSize) *
          renderCellSize +
        renderCellSize * 0.5;

      return `
        <div
          class="arena-spawn-marker"
          style="left:${left}px; top:${top}px;"
        ></div>
      `;
    })
    .join("");
  const fogTiles = [...visibleTiles].length
    ? session.map.grid
        .flatMap((row, rowIndex) =>
          [...row].map((_, columnIndex) => ({ column: columnIndex, row: rowIndex })),
        )
        .filter((tile) => !visibleTiles.has(keyOf(tile)))
        .map((tile) => {
          const worldX = tile.column * session.map.tileSize;
          const worldY = tile.row * session.map.tileSize;
          const worldRight = worldX + session.map.tileSize;
          const worldBottom = worldY + session.map.tileSize;

          if (
            worldRight < viewport.originX ||
            worldX > viewport.originX + viewport.width ||
            worldBottom < viewport.originY ||
            worldY > viewport.originY + viewport.height
          ) {
            return "";
          }

          const left =
            ((worldX - viewport.originX) / session.map.tileSize) * renderCellSize;
          const top =
            ((worldY - viewport.originY) / session.map.tileSize) * renderCellSize;

          return `
            <div
              class="arena-fog-cell"
              style="left:${left}px; top:${top}px; width:${renderCellSize}px; height:${renderCellSize}px;"
            ></div>
          `;
        })
        .join("")
    : "";

  return `
    <div class="arena-surface">
      ${renderWallSegments(session, viewport)}
      ${spawnMarkers}
      ${fogTiles}
      ${renderPlayerOverlay(session, viewport)}
    </div>
  `;
}

function renderMiniMap(session: GameSession): string {
  const visibleTiles = buildVisibleTiles(session);
  const playerTile = getPlayerTile(session);

  return `
    <div
      class="minimap-surface"
      style="--minimap-width:${session.map.size.columns}; --minimap-height:${session.map.size.rows};"
    >
      ${session.map.wallTiles
        .map(
          (tile) => `
            <div
              class="minimap-segment"
              style="left:${tile.column * 5}px; top:${tile.row * 5}px;"
            ></div>
          `,
        )
        .join("")}
      ${session.map.spawnTiles
        .filter((tile) => visibleTiles.has(keyOf(tile)))
        .map(
          (tile) => `
            <div
              class="minimap-spawn-marker"
              style="left:${tile.column * 5 + 1}px; top:${tile.row * 5 + 1}px;"
            ></div>
          `,
        )
        .join("")}
      <div
        class="minimap-player-dot"
        style="left:${playerTile.column * 5 + 0.5}px; top:${playerTile.row * 5 + 0.5}px;"
      ></div>
    </div>
  `;
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

function renderMapGenerationPanel(session: GameSession): string {
  const selectedTemplate =
    session.catalog.indexes.mapTemplatesById[session.selectedMapTemplateId];
  const layoutSizeControls =
    selectedTemplate?.layout.type === "generated"
      ? `
          <div class="selector-group">
            <p class="eyebrow">Layout Size</p>
            <div class="selector-row">
              ${session.availableLayoutSizes
                .map((layoutSize) => {
                  const isActive = session.selectedLayoutSize === layoutSize;

                  return `
                    <button
                      class="selector-button${isActive ? " is-active" : ""}"
                      data-map-layout-size="${layoutSize}"
                      type="button"
                    >
                      ${layoutSize}
                    </button>
                  `;
                })
                .join("")}
            </div>
            <p class="selector-meta">
              Small is 4x less area than medium. Large is 4x more area.
            </p>
          </div>
        `
      : "";
  const densityControls =
    selectedTemplate?.layout.type === "generated"
      ? `
          <div class="selector-group">
            <p class="eyebrow">Density</p>
            <div class="selector-row">
              ${session.availableDensities
                .map((density) => {
                  const isActive = session.selectedDensity === density;

                  return `
                    <button
                      class="selector-button${isActive ? " is-active" : ""}"
                      data-map-density="${density}"
                      type="button"
                    >
                      ${density}
                    </button>
                  `;
                })
                .join("")}
            </div>
            <p class="selector-meta">
              Regenerate the current archetype with a different wall density.
            </p>
          </div>
        `
      : "";

  return `
    <aside class="panel control-panel">
      <div class="selector-group">
        <p class="eyebrow">Map Generation</p>
        <h3>Map Lab</h3>
        <p class="selector-meta">
          Switch archetypes and reroll layouts without leaving the arena.
        </p>
      </div>
      <div class="selector-group">
        <p class="eyebrow">Template</p>
        <div class="selector-row">
          ${session.catalog.mapTemplates
            .map((template) => {
              const isActive = template.id === session.selectedMapTemplateId;

              return `
                <button
                  class="selector-button${isActive ? " is-active" : ""}"
                  data-map-template="${template.id}"
                  type="button"
                >
                  ${template.name}
                </button>
              `;
            })
            .join("")}
        </div>
        <p class="selector-meta">
          ${session.map.archetype} archetype · ${session.selectedLayoutSize} · ${session.map.maxPlayers} spawns
        </p>
      </div>
      ${layoutSizeControls}
      ${densityControls}
      <div class="selector-group">
        <button class="selector-button selector-button-wide" data-map-reroll type="button">
          Reroll Layout
        </button>
      </div>
    </aside>
  `;
}

function renderCharacterPanel(session: GameSession): string {
  const selectedSpriteUrl =
    spriteUrlByKey[session.player.spriteKey] ?? spriteUrlByKey.turtle_glasses;

  return `
    <aside class="panel control-panel">
      <div class="selector-group">
        <p class="eyebrow">Character</p>
        <h3>Driver Select</h3>
        <p class="selector-meta">
          Pick the turtle skin used for your player sprite.
        </p>
      </div>
      <div class="character-preview">
        <div class="character-preview-stage">
          <img
            class="character-preview-image"
            src="${selectedSpriteUrl}"
            alt="${session.player.spriteKey}"
          />
        </div>
      </div>
      <div class="character-grid">
        ${session.availableSpriteKeys
          .map((spriteKey) => {
            const spriteUrl = spriteUrlByKey[spriteKey] ?? spriteUrlByKey.turtle_glasses;
            const isActive = session.player.spriteKey === spriteKey;

            return `
              <button
                class="character-card${isActive ? " is-active" : ""}"
                data-player-sprite="${spriteKey}"
                type="button"
              >
                <span class="character-card-stage">
                  <img
                    class="character-card-image"
                    src="${spriteUrl}"
                    alt="${labelForSprite(spriteKey)}"
                  />
                </span>
                <span class="character-card-label">${labelForSprite(spriteKey)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </aside>
  `;
}

export function renderGame(session: GameSession): string {
  const isFullscreen = Boolean(document.fullscreenElement);

  return `
    <main class="shell">
      <div class="shell-layout">
        <div class="control-stack">
          ${renderMapGenerationPanel(session)}
          ${renderCharacterPanel(session)}
        </div>
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
                  ${session.map.archetype} · ${session.map.size.columns}x${session.map.size.rows} · free movement viewport
                </p>
                <button class="selector-button" data-fullscreen-toggle type="button">
                  ${isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                </button>
              </div>
            </div>
            <div class="arena-grid" style="--arena-width:${viewportColumns * renderCellSize}px; --arena-height:${viewportRows * renderCellSize}px;">
              ${renderArena(session)}
            </div>
          </div>
        </section>
      </div>
    </main>
  `;
}
