import { createPlayerDefinition } from "../../shared/factories/playerFactory";
import { buildMapFromTemplate } from "../../shared/factories/mapGenerator";
import type {
  AttackSlot,
  FacingDirection,
  GameCatalog,
  ItemDefinition,
  MapDensity,
  MapLayoutSize,
  MapTemplateDefinition,
  TilePoint,
} from "../../shared/domain/gameTypes";
import type { AttackEvent, GameSession, PlayerRuntime } from "./runtimeTypes";

const attackLabelBySlot: Record<AttackSlot, string> = {
  left: "Left-angle shot",
  center: "Forward shot",
  right: "Right-angle shot",
};

function pickRandomTile<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function buildInventory(
  catalog: GameCatalog,
  itemIds: string[],
): ItemDefinition[] {
  return itemIds
    .map((itemId) => catalog.indexes.itemsById[itemId])
    .filter((item): item is ItemDefinition => Boolean(item));
}

function pickDefaultTemplate(catalog: GameCatalog): MapTemplateDefinition {
  return catalog.mapTemplates[0];
}

function tileCenter(map: GameSession["map"], tile: TilePoint): { x: number; y: number } {
  return {
    x: tile.column * map.tileSize + map.tileSize / 2,
    y: tile.row * map.tileSize + map.tileSize / 2,
  };
}

function worldToTile(map: GameSession["map"], x: number, y: number): TilePoint {
  return {
    column: Math.floor(x / map.tileSize),
    row: Math.floor(y / map.tileSize),
  };
}

function buildPlayer(
  catalog: GameCatalog,
  map: GameSession["map"],
): PlayerRuntime {
  const character = catalog.characters[0];
  const spawnTile = pickRandomTile(map.spawnTiles);
  const playerDefinition = createPlayerDefinition(
    "player-1",
    "Pilot One",
    character,
  );
  const spawnPosition = tileCenter(map, spawnTile);

  return {
    definition: playerDefinition,
    mapId: map.id,
    resources: {
      health: playerDefinition.stats.health.max,
      stamina: playerDefinition.stats.stamina.max,
      mana: playerDefinition.stats.mana.max,
    },
    position: spawnPosition,
    radius: map.tileSize * 0.28,
    facing: "right",
    inventoryOpen: false,
  };
}

export function createGameSession(catalog: GameCatalog): GameSession {
  const template = pickDefaultTemplate(catalog);
  const density =
    template.layout.type === "generated"
      ? template.layout.defaultDensity
      : "standard";
  const layoutSize: MapLayoutSize = "medium";
  const map = buildMapFromTemplate(template, { density, layoutSize });
  const player = buildPlayer(catalog, map);

  return {
    catalog,
    selectedMapTemplateId: template.id,
    selectedDensity: density,
    selectedLayoutSize: layoutSize,
    availableDensities: ["sparse", "standard", "dense"],
    availableLayoutSizes: ["small", "medium", "large"],
    map,
    player,
    input: {
      up: false,
      down: false,
      left: false,
      right: false,
    },
    inventoryItems: buildInventory(catalog, player.definition.inventory),
    attackLog: [],
  };
}

function isWallTile(
  map: GameSession["map"],
  tile: TilePoint,
): boolean {
  return map.grid[tile.row]?.[tile.column] === "#";
}

function collidesWithWalls(
  map: GameSession["map"],
  x: number,
  y: number,
  radius: number,
): boolean {
  const minColumn = Math.floor((x - radius) / map.tileSize);
  const maxColumn = Math.floor((x + radius) / map.tileSize);
  const minRow = Math.floor((y - radius) / map.tileSize);
  const maxRow = Math.floor((y + radius) / map.tileSize);

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      if (!isWallTile(map, { column, row })) {
        continue;
      }

      const tileLeft = column * map.tileSize;
      const tileTop = row * map.tileSize;
      const closestX = Math.max(tileLeft, Math.min(x, tileLeft + map.tileSize));
      const closestY = Math.max(tileTop, Math.min(y, tileTop + map.tileSize));
      const deltaX = x - closestX;
      const deltaY = y - closestY;

      if (deltaX * deltaX + deltaY * deltaY < radius * radius) {
        return true;
      }
    }
  }

  return false;
}

function movePlayerAxis(
  session: GameSession,
  nextX: number,
  nextY: number,
): void {
  if (!collidesWithWalls(session.map, nextX, session.player.position.y, session.player.radius)) {
    session.player.position.x = nextX;
  }

  if (!collidesWithWalls(session.map, session.player.position.x, nextY, session.player.radius)) {
    session.player.position.y = nextY;
  }
}

function regenerateResource(
  current: number,
  max: number,
  regenPerSecond: number,
  deltaMs: number,
): number {
  return Math.min(max, current + (regenPerSecond * deltaMs) / 1000);
}

function updateFacing(session: GameSession, xAxis: number, yAxis: number): void {
  if (xAxis === 0 && yAxis === 0) {
    return;
  }

  if (Math.abs(xAxis) >= Math.abs(yAxis)) {
    session.player.facing = xAxis >= 0 ? "right" : "left";
    return;
  }

  session.player.facing = yAxis >= 0 ? "down" : "up";
}

function movePlayerContinuously(session: GameSession, deltaMs: number): boolean {
  const xAxis = Number(session.input.right) - Number(session.input.left);
  const yAxis = Number(session.input.down) - Number(session.input.up);

  if (xAxis === 0 && yAxis === 0) {
    return false;
  }

  const length = Math.hypot(xAxis, yAxis) || 1;
  const normalizedX = xAxis / length;
  const normalizedY = yAxis / length;
  const speedPerSecond = session.player.definition.stats.speed * 52;
  const distance = (speedPerSecond * deltaMs) / 1000;
  const nextX = session.player.position.x + normalizedX * distance;
  const nextY = session.player.position.y + normalizedY * distance;
  const previousX = session.player.position.x;
  const previousY = session.player.position.y;

  updateFacing(session, normalizedX, normalizedY);
  movePlayerAxis(session, nextX, nextY);

  return (
    previousX !== session.player.position.x ||
    previousY !== session.player.position.y
  );
}

export function setMovementKeyState(
  session: GameSession,
  key: "up" | "down" | "left" | "right",
  pressed: boolean,
): boolean {
  if (session.input[key] === pressed) {
    return false;
  }

  session.input[key] = pressed;
  return true;
}

export function toggleInventory(session: GameSession): void {
  session.player.inventoryOpen = !session.player.inventoryOpen;
}

export function selectMapTemplate(
  session: GameSession,
  templateId: string,
): void {
  const template = session.catalog.indexes.mapTemplatesById[templateId];

  if (!template) {
    return;
  }

  session.selectedMapTemplateId = template.id;
  session.selectedDensity =
    template.layout.type === "generated"
      ? template.layout.defaultDensity
      : "standard";
  rerollMap(session);
}

export function setMapDensity(
  session: GameSession,
  density: MapDensity,
): void {
  session.selectedDensity = density;
  rerollMap(session);
}

export function setMapLayoutSize(
  session: GameSession,
  layoutSize: MapLayoutSize,
): void {
  session.selectedLayoutSize = layoutSize;
  rerollMap(session);
}

export function rerollMap(session: GameSession): void {
  const template =
    session.catalog.indexes.mapTemplatesById[session.selectedMapTemplateId];

  if (!template) {
    return;
  }

  const map = buildMapFromTemplate(template, {
    density: session.selectedDensity,
    layoutSize: session.selectedLayoutSize,
  });
  const spawnTile = pickRandomTile(map.spawnTiles);
  const spawnPosition = tileCenter(map, spawnTile);

  session.map = map;
  session.player.mapId = map.id;
  session.player.position = spawnPosition;
  session.player.radius = map.tileSize * 0.28;
  session.player.facing = "right";
  session.player.resources = {
    health: session.player.definition.stats.health.max,
    stamina: session.player.definition.stats.stamina.max,
    mana: session.player.definition.stats.mana.max,
  };
  session.input = {
    up: false,
    down: false,
    left: false,
    right: false,
  };
  session.attackLog = [];
  session.player.inventoryOpen = false;
}

export function tickSession(session: GameSession, deltaMs: number): boolean {
  const previous = { ...session.player.resources };
  const moved = movePlayerContinuously(session, deltaMs);

  session.player.resources.health = regenerateResource(
    session.player.resources.health,
    session.player.definition.stats.health.max,
    session.player.definition.stats.health.regenPerSecond,
    deltaMs,
  );
  session.player.resources.stamina = regenerateResource(
    session.player.resources.stamina,
    session.player.definition.stats.stamina.max,
    session.player.definition.stats.stamina.regenPerSecond,
    deltaMs,
  );
  session.player.resources.mana = regenerateResource(
    session.player.resources.mana,
    session.player.definition.stats.mana.max,
    session.player.definition.stats.mana.regenPerSecond,
    deltaMs,
  );

  return (
    moved ||
    previous.health !== session.player.resources.health ||
    previous.stamina !== session.player.resources.stamina ||
    previous.mana !== session.player.resources.mana
  );
}

export function attack(session: GameSession, slot: AttackSlot): void {
  const event: AttackEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slot,
    label: `${attackLabelBySlot[slot]} toward ${session.player.facing}`,
    createdAt: Date.now(),
  };

  session.attackLog = [event, ...session.attackLog].slice(0, 6);
}

export function getPlayerTile(session: GameSession): TilePoint {
  return worldToTile(
    session.map,
    session.player.position.x,
    session.player.position.y,
  );
}
