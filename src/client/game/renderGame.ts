import type { ItemDefinition, TilePoint } from "../../shared/domain/gameTypes";
import { getPlayerTile } from "./gameSession";
import type { EnemyRuntime, GameSession, MeleeAttackRuntime } from "./runtimeTypes";
import bowUrl from "../../../item_sprite/bow.png";
import breadUrl from "../../../item_sprite/bread.png";
import crossbowUrl from "../../../item_sprite/crossbow.png";
import arrowUrl from "../../../item_sprite/arrow.png";
import potionBlueUrl from "../../../item_sprite/potion_blue.png";
import potionGoldUrl from "../../../item_sprite/potion_gold.png";
import potionGreenUrl from "../../../item_sprite/potion_green.png";
import potionPurpleUrl from "../../../item_sprite/potion_purple.png";
import potionRedUrl from "../../../item_sprite/potion_red.png";
import spearUrl from "../../../item_sprite/spear.png";
import staffUrl from "../../../item_sprite/staff.png";
import swordUrl from "../../../item_sprite/sword.png";
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

const itemSpriteUrlByKey: Record<string, string> = {
  bow: bowUrl,
  bread: breadUrl,
  crossbow: crossbowUrl,
  arrow: arrowUrl,
  potion_blue: potionBlueUrl,
  potion_gold: potionGoldUrl,
  potion_green: potionGreenUrl,
  potion_purple: potionPurpleUrl,
  potion_red: potionRedUrl,
  spear: spearUrl,
  staff: staffUrl,
  sword: swordUrl,
};

function labelForSprite(spriteKey: string): string {
  return spriteKey
    .replace("turtle_", "")
    .replace("scropion", "scorpion")
    .replace(/_/g, " ");
}

function labelForItemSprite(spriteKey: string): string {
  return spriteKey.replace(/_/g, " ");
}

function formatDamageType(value: string): string {
  return value === "projectile" ? "proj" : value;
}

function getWeaponItems(session: GameSession): ItemDefinition[] {
  return session.availableWeaponIds
    .map((itemId) => session.catalog.indexes.itemsById[itemId])
    .filter((item): item is ItemDefinition => Boolean(item));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function normalizeVector(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y) || 1;

  return {
    x: x / length,
    y: y / length,
  };
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

function renderActorOverlay(
  actor: Pick<
    EnemyRuntime | GameSession["player"],
    | "position"
    | "radius"
    | "role"
    | "spriteKey"
    | "facing"
    | "movementSpeed"
    | "isMoving"
    | "walkCycle"
    | "attackAnimationRemainingMs"
    | "definition"
    | "role"
    | "spriteKey"
    | "facing"
  >,
  weaponId: string | null | undefined,
  session: GameSession,
  viewport: ReturnType<typeof buildViewport>,
): string {
  const left =
    ((actor.position.x - viewport.originX) / session.map.tileSize) *
    renderCellSize;
  const top =
    ((actor.position.y - viewport.originY) / session.map.tileSize) *
    renderCellSize;
  const hitboxWidth =
    ((actor.radius * 2) * renderCellSize) / session.map.tileSize;
  const hitboxHeight = hitboxWidth;
  const spriteWidth =
    ((actor.radius * 2.75) * renderCellSize) / session.map.tileSize;
  const spriteHeight =
    ((actor.radius * 3.15) * renderCellSize) / session.map.tileSize;
  const spriteTop = -(hitboxHeight * 0.9 + spriteHeight * 0.58) + 32;
  const roleClass = `player-role-${actor.role}`;
  const spriteUrl =
    spriteUrlByKey[actor.spriteKey] ?? spriteUrlByKey.turtle_glasses;
  const facingClass =
    actor.facing === "right" ? "is-facing-left" : "is-facing-right";
  const maxSpeedPerSecond = actor.definition.stats.speed * 52;
  const speedRatio = Math.min(
    1,
    actor.movementSpeed / Math.max(maxSpeedPerSecond, 1),
  );
  const wobbleDegrees = actor.isMoving
    ? Math.sin(actor.walkCycle / 70) * 5 * speedRatio
    : 0;
  const selectedWeapon = weaponId
    ? session.catalog.indexes.itemsById[weaponId]
    : undefined;
  const weaponSpriteUrl =
    selectedWeapon?.spriteKey && itemSpriteUrlByKey[selectedWeapon.spriteKey]
      ? itemSpriteUrlByKey[selectedWeapon.spriteKey]
      : undefined;
  const weaponWidth =
    ((session.player.radius * 1.55) * renderCellSize) / session.map.tileSize;
  const weaponHeight =
    ((session.player.radius * 1.55) * renderCellSize) / session.map.tileSize;
  const weaponLeft = actor.facing === "left" ? -hitboxWidth * 0.34 : hitboxWidth * 0.34;
  const weaponTop = -(hitboxHeight * 0.18);
  const weaponRotation =
    actor.facing === "up"
      ? -85
      : actor.facing === "down"
        ? 85
        : actor.facing === "left"
          ? -32
          : 32;
  const attackSwingProgress = Math.min(
    1,
    actor.attackAnimationRemainingMs / 120,
  );
  const attackSwingDegrees = attackSwingProgress > 0
    ? (actor.facing === "left" ? -1 : 1) * (18 + attackSwingProgress * 26)
    : 0;
  const isBlockingActor =
    actor.role === "me" && "isBlocking" in actor && actor.isBlocking;
  const blockEffectiveness =
    actor.role === "me" && "blockEffectiveness" in actor
      ? actor.blockEffectiveness
      : 0;
  const blockBarTop = spriteTop - 16;

  return `
    <div
      class="arena-player-overlay ${roleClass} ${facingClass}"
      style="left:${left}px; top:${top}px;"
    >
      ${
        isBlockingActor
          ? `
              <div class="arena-block-meter" style="top:${blockBarTop}px;">
                <div
                  class="arena-block-meter-fill"
                  style="width:${Math.max(0, Math.min(100, blockEffectiveness * 100))}%;"
                ></div>
              </div>
            `
          : ""
      }
      ${
        weaponSpriteUrl
          ? `
              <img
                class="arena-player-weapon"
                src="${weaponSpriteUrl}"
                alt="${selectedWeapon?.name ?? "weapon"}"
                style="width:${weaponWidth}px; height:${weaponHeight}px; left:${weaponLeft}px; top:${weaponTop}px; --weapon-rotation:${weaponRotation + attackSwingDegrees}deg;"
              />
            `
          : ""
      }
      <img
        class="arena-player-sprite"
        src="${spriteUrl}"
        alt="${actor.definition.name}"
        style="width:${spriteWidth}px; height:${spriteHeight}px; top:${spriteTop}px; --wobble-rotation:${wobbleDegrees}deg;"
      />
      <div
        class="arena-player-hitbox"
        style="width:${hitboxWidth}px; height:${hitboxHeight}px;"
      ></div>
    </div>
  `;
}

function renderPlayerOverlay(
  session: GameSession,
  viewport: ReturnType<typeof buildViewport>,
): string {
  return renderActorOverlay(
    session.player,
    session.selectedWeaponId,
    session,
    viewport,
  );
}

function renderEnemies(
  session: GameSession,
  viewport: ReturnType<typeof buildViewport>,
): string {
  return session.enemies
    .map((enemy) => renderActorOverlay(enemy, enemy.weaponId, session, viewport))
    .join("");
}

function renderMeleeAttack(
  attack: MeleeAttackRuntime,
  session: GameSession,
  viewport: ReturnType<typeof buildViewport>,
): string {
  const left =
    ((attack.x - viewport.originX) / session.map.tileSize) * renderCellSize;
  const top =
    ((attack.y - viewport.originY) / session.map.tileSize) * renderCellSize;
  const size = ((attack.radius * 2) * renderCellSize) / session.map.tileSize;
  const rotation =
    (Math.atan2(attack.directionY, attack.directionX) * 180) / Math.PI;
  const opacity = Math.min(1, attack.lifetimeMs / 120);

  return `
    <div
      class="arena-melee-attack"
      style="left:${left}px; top:${top}px; width:${size}px; height:${size}px; --attack-rotation:${rotation}deg; --attack-opacity:${opacity};"
      aria-hidden="true"
    >
      <span class="arena-melee-slash arena-melee-slash-a"></span>
      <span class="arena-melee-slash arena-melee-slash-b"></span>
      <span class="arena-melee-slash arena-melee-slash-c"></span>
    </div>
  `;
}

function renderProjectiles(
  session: GameSession,
  viewport: ReturnType<typeof buildViewport>,
): string {
  return session.projectiles
    .map((projectile) => {
      const left =
        ((projectile.x - viewport.originX) / session.map.tileSize) * renderCellSize;
      const top =
        ((projectile.y - viewport.originY) / session.map.tileSize) * renderCellSize;
      const rotation =
        (Math.atan2(projectile.velocityY, projectile.velocityX) * 180) / Math.PI + 90;
      const size = (session.player.radius * renderCellSize) / session.map.tileSize;
      const direction = normalizeVector(projectile.velocityX, projectile.velocityY);
      const visualOffset = size * 0.28;
      const spriteUrl = itemSpriteUrlByKey[projectile.spriteKey];

      if (!spriteUrl) {
        return "";
      }

      return `
        <img
          class="arena-projectile"
          src="${spriteUrl}"
          alt=""
          aria-hidden="true"
          style="left:${left + direction.x * visualOffset}px; top:${top + direction.y * visualOffset}px; width:${size}px; height:${size}px; --projectile-rotation:${rotation}deg;"
        />
      `;
    })
    .join("");
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
      ${renderProjectiles(session, viewport)}
      ${session.meleeAttacks
        .map((attack) => renderMeleeAttack(attack, session, viewport))
        .join("")}
      ${renderEnemies(session, viewport)}
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
              style="left:${tile.column * 3}px; top:${tile.row * 3}px;"
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
              style="left:${tile.column * 3 + 0.5}px; top:${tile.row * 3 + 0.5}px;"
            ></div>
          `,
        )
        .join("")}
      <div
        class="minimap-player-dot"
        style="left:${playerTile.column * 3}px; top:${playerTile.row * 3}px;"
      ></div>
    </div>
  `;
}

function renderHud(session: GameSession): string {
  const { definition, resources } = session.player;

  return `
    <div class="arena-hud" aria-label="Player resources">
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

function renderCollapsiblePanel(
  panelId: keyof GameSession["collapsedPanels"],
  eyebrow: string,
  title: string,
  content: string,
  collapsed: boolean,
): string {
  return `
    <aside class="panel control-panel collapsible-panel${collapsed ? " is-collapsed" : ""}">
      <div class="collapsible-panel-header">
        <div>
          <p class="eyebrow">${eyebrow}</p>
          <h3>${title}</h3>
        </div>
        <button
          class="selector-button collapsible-toggle"
          data-panel-toggle="${panelId}"
          type="button"
          aria-expanded="${collapsed ? "false" : "true"}"
        >
          ${collapsed ? "Expand" : "Minimize"}
        </button>
      </div>
      ${
        collapsed
          ? ""
          : `<div class="collapsible-panel-body">${content}</div>`
      }
    </aside>
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

  return renderCollapsiblePanel(
    "mapLab",
    "Map Generation",
    "Map Lab",
    `
      <div class="selector-group">
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
    `,
    session.collapsedPanels.mapLab,
  );
}

function renderCharacterPanel(session: GameSession): string {
  const selectedSpriteUrl =
    spriteUrlByKey[session.player.spriteKey] ?? spriteUrlByKey.turtle_glasses;

  return renderCollapsiblePanel(
    "character",
    "Character",
    "Driver Select",
    `
      <div class="selector-group">
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
    `,
    session.collapsedPanels.character,
  );
}

function renderWeaponPanel(session: GameSession): string {
  const weaponItems = getWeaponItems(session);
  const selectedWeapon =
    (session.selectedWeaponId
      ? session.catalog.indexes.itemsById[session.selectedWeaponId]
      : undefined) ?? weaponItems[0];

  if (!selectedWeapon || selectedWeapon.effect.type !== "weapon-attack") {
    return "";
  }

  const previewSpriteUrl = selectedWeapon.spriteKey
    ? itemSpriteUrlByKey[selectedWeapon.spriteKey]
    : undefined;

  return renderCollapsiblePanel(
    "weapon",
    "Weapon",
    "Armory",
    `
      <div class="selector-group">
        <p class="selector-meta">
          Temporary weapon selection wired from content packs.
        </p>
      </div>
      <div class="weapon-preview">
        <div class="weapon-preview-stage">
          ${
            previewSpriteUrl
              ? `
                  <img
                    class="weapon-preview-image"
                    src="${previewSpriteUrl}"
                    alt="${selectedWeapon.name}"
                  />
                `
              : ""
          }
        </div>
        <div class="weapon-preview-copy">
          <h4>${selectedWeapon.name}</h4>
          <p class="selector-meta">${selectedWeapon.description}</p>
          <div class="weapon-stat-list">
            <span class="weapon-stat">DMG ${selectedWeapon.effect.damage}</span>
            <span class="weapon-stat">${selectedWeapon.effect.attackPeriodSeconds}s atk</span>
            <span class="weapon-stat">STA ${selectedWeapon.effect.staminaCost}</span>
            <span class="weapon-stat">${formatDamageType(selectedWeapon.effect.damageType)}</span>
            ${
              selectedWeapon.effect.projectileSpeed
                ? `<span class="weapon-stat">SPD ${selectedWeapon.effect.projectileSpeed}</span>`
                : ""
            }
          </div>
        </div>
      </div>
      <div class="weapon-grid">
        ${weaponItems
          .map((weapon) => {
            const isActive = session.selectedWeaponId === weapon.id;
            const spriteUrl = weapon.spriteKey
              ? itemSpriteUrlByKey[weapon.spriteKey]
              : undefined;

            return `
              <button
                class="weapon-card${isActive ? " is-active" : ""}"
                data-weapon-id="${weapon.id}"
                type="button"
              >
                <span class="weapon-card-stage">
                  ${
                    spriteUrl
                      ? `
                          <img
                            class="weapon-card-image"
                            src="${spriteUrl}"
                            alt="${weapon.name}"
                          />
                        `
                      : ""
                  }
                </span>
                <span class="weapon-card-label">${weapon.name}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    `,
    session.collapsedPanels.weapon,
  );
}

function renderModeMenu(): string {
  return `
    <main class="shell shell-menu">
      <section class="panel mode-menu-panel">
        <p class="eyebrow">Game Modes</p>
        <h1>Turtle Arena</h1>
        <p class="lede">
          Pick a mode to enter the sandbox immediately or configure a pre-match loadout for levels and pvp.
        </p>
        <div class="mode-grid">
          <button class="mode-card" data-mode-select="sandbox" type="button">
            <strong>Sandbox</strong>
            <span>Open arena with live tuning panels and free-form testing.</span>
          </button>
          <button class="mode-card" data-mode-select="levels" type="button">
            <strong>Levels</strong>
            <span>Choose your two-item loadout before the match starts.</span>
          </button>
          <button class="mode-card" data-mode-select="pvp" type="button">
            <strong>PVP</strong>
            <span>Set your build before the match, then swap between slots 1 and 2.</span>
          </button>
        </div>
      </section>
    </main>
  `;
}

function renderSetupScreen(session: GameSession): string {
  const weaponItems = getWeaponItems(session);
  const slotLabels = ["Slot 1", "Slot 2"] as const;
  const enemySection =
    session.mode === "levels"
      ? `
          <section class="panel inset-panel">
            <div class="selector-group">
              <p class="eyebrow">Enemies</p>
              <p class="selector-meta">
                Add turtle enemies for this level. They use the same base stats and will seek the player.
              </p>
            </div>
            <div class="enemy-grid">
              ${weaponItems
                .map((weapon) => {
                  const spriteUrl = weapon.spriteKey
                    ? itemSpriteUrlByKey[weapon.spriteKey]
                    : undefined;
                  const count = session.levelEnemyCounts[weapon.id] ?? 0;

                  return `
                    <div class="enemy-card">
                      <div class="enemy-card-main">
                        <span class="weapon-card-stage">
                          ${
                            spriteUrl
                              ? `
                                  <img
                                    class="weapon-card-image"
                                    src="${spriteUrl}"
                                    alt="${weapon.name}"
                                  />
                                `
                              : ""
                          }
                        </span>
                        <div>
                          <strong>${weapon.name} Turtle</strong>
                          <p class="selector-meta">${count} selected</p>
                        </div>
                      </div>
                      <div class="enemy-card-actions">
                        <button class="selector-button" data-enemy-weapon="${weapon.id}" data-enemy-adjust="-1" type="button">-</button>
                        <button class="selector-button is-active" data-enemy-weapon="${weapon.id}" data-enemy-adjust="1" type="button">+</button>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          </section>
        `
      : "";

  return `
    <main class="shell shell-menu">
      <section class="panel mode-setup-panel">
        <div class="mode-setup-header">
          <div>
            <p class="eyebrow">${session.mode}</p>
            <h2>Pre-Match Setup</h2>
            <p class="selector-meta">
              Choose two weapons now. During the match, swap between them with keys 1 and 2.
            </p>
          </div>
          <div class="mode-setup-actions">
            <button class="selector-button" data-back-menu type="button">Back</button>
            <button class="selector-button is-active" data-start-match type="button">Start Match</button>
          </div>
        </div>
        <section class="panel inset-panel">
          <div class="selector-group">
            <p class="eyebrow">Character</p>
            <p class="selector-meta">Pick the turtle skin used for this run.</p>
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
        </section>
        ${enemySection}
        <div class="loadout-columns">
          ${([0, 1] as const)
            .map((slotIndex) => {
              const equippedId = session.setupLoadoutWeaponIds[slotIndex];

              return `
                <section class="panel inset-panel">
                  <div class="selector-group">
                    <p class="eyebrow">${slotLabels[slotIndex]}</p>
                    <p class="selector-meta">
                      ${equippedId ? `Equipped: ${session.catalog.indexes.itemsById[equippedId]?.name ?? equippedId}` : "Choose a weapon"}
                    </p>
                  </div>
                  <div class="weapon-grid">
                    ${weaponItems
                      .map((weapon) => {
                        const isActive = equippedId === weapon.id;
                        const spriteUrl = weapon.spriteKey
                          ? itemSpriteUrlByKey[weapon.spriteKey]
                          : undefined;

                        return `
                          <button
                            class="weapon-card${isActive ? " is-active" : ""}"
                            data-weapon-id="${weapon.id}"
                            data-loadout-slot="${slotIndex}"
                            type="button"
                          >
                            <span class="weapon-card-stage">
                              ${
                                spriteUrl
                                  ? `
                                      <img
                                        class="weapon-card-image"
                                        src="${spriteUrl}"
                                        alt="${weapon.name}"
                                      />
                                    `
                                  : ""
                              }
                            </span>
                            <span class="weapon-card-label">${weapon.name}</span>
                          </button>
                        `;
                      })
                      .join("")}
                  </div>
                </section>
              `;
            })
            .join("")}
        </div>
      </section>
    </main>
  `;
}

export function renderGame(session: GameSession): string {
  if (session.flow === "menu") {
    return renderModeMenu();
  }

  if (session.flow === "setup") {
    return renderSetupScreen(session);
  }

  const isFullscreen = Boolean(document.fullscreenElement);
  const modeLabel = session.mode === "sandbox" ? "Sandbox" : session.mode === "levels" ? "Levels" : "PVP";
  const equippedLoadout =
    session.mode === "sandbox"
      ? ""
      : `
          <div class="arena-loadout-strip">
            ${(session.setupLoadoutWeaponIds as [string | null, string | null])
              .map((weaponId, index) => {
                const weapon = weaponId ? session.catalog.indexes.itemsById[weaponId] : null;
                return `
                  <div class="loadout-chip${session.activeWeaponSlot === index ? " is-active" : ""}">
                    <strong>${index + 1}</strong>
                    <span>${weapon?.name ?? "Empty"}</span>
                  </div>
                `;
              })
              .join("")}
          </div>
        `;

  return `
    <main class="shell">
      <div class="shell-layout">
        <div class="control-stack">
          ${renderMapGenerationPanel(session)}
          ${renderCharacterPanel(session)}
          ${renderWeaponPanel(session)}
        </div>
        <section class="panel arena-stage">
          <div class="arena-panel">
            <div class="arena-topbar">
              <div class="arena-heading">
                <p class="eyebrow">${modeLabel}</p>
                <h2>${session.map.name}</h2>
                ${equippedLoadout}
              </div>
              <div class="arena-topbar-actions">
                <button class="selector-button" data-back-menu type="button">Menu</button>
                <button class="selector-button" data-fullscreen-toggle type="button">
                  ${isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                </button>
              </div>
            </div>
            <div class="arena-grid" style="--arena-width:${viewportColumns * renderCellSize}px; --arena-height:${viewportRows * renderCellSize}px;">
              <div class="arena-overlay-top arena-overlay-top-left">
                ${renderHud(session)}
              </div>
              <div class="arena-overlay-top arena-overlay-top-right">
                <div class="arena-overview">
                  <div class="minimap">
                    ${renderMiniMap(session)}
                  </div>
                  <p class="arena-meta">
                    ${session.map.archetype} · ${session.map.size.columns}x${session.map.size.rows}
                  </p>
                </div>
              </div>
              ${renderArena(session)}
            </div>
          </div>
        </section>
      </div>
    </main>
  `;
}
