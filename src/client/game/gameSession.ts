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
import type {
  AttackEvent,
  EnemyRuntime,
  GameFlow,
  GameMode,
  GameSession,
  MeleeAttackRuntime,
  PlayerRuntime,
  ProjectileRuntime,
} from "./runtimeTypes";

const attackLabelBySlot: Record<AttackSlot, string> = {
  left: "Left-angle shot",
  center: "Forward shot",
  right: "Right-angle shot",
};
const playerHitboxRadiusRatio = 0.42;
const rollCost = 40;
const rollDurationMs = 180;
const rollSpeedMultiplier = 3.6;
const projectileLifetimeMs = 1400;
const meleeAttackLifetimeMs = 120;
const meleeAttackRadiusMultiplier = 0.95;
const meleeAttackDistanceMultiplier = 1.95;
const maxLevelEnemiesPerWeapon = 4;
const blockDecayPerSecond = 0.2;
const blockStaminaDrainPerSecond = 10;
const availableSpriteKeys = [
  "turtle_glasses",
  "turtle_cowboy",
  "turtle_frog",
  "turtle_scholar",
  "turtle_cheese",
  "turtle_poop",
  "turtle_scropion",
] as const;

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
    radius: map.tileSize * playerHitboxRadiusRatio,
    facing: "right",
    inventoryOpen: false,
    isMoving: false,
    movementSpeed: 0,
    walkCycle: 0,
    isRolling: false,
    rollTimeRemainingMs: 0,
    rollDirection: {
      x: 1,
      y: 0,
    },
    attackAnimationRemainingMs: 0,
    attackCooldownRemainingMs: 0,
    attackChargeMs: 0,
    isChargingAttack: false,
    isBlocking: false,
    blockEffectiveness: 1,
    role: "me",
    spriteKey: "turtle_glasses",
  };
}

function attackPeriodMs(weapon: ItemDefinition): number {
  return weapon.effect.type === "weapon-attack"
    ? weapon.effect.attackPeriodSeconds * 1000
    : 0;
}

function weaponBehavior(weapon: ItemDefinition | null): "cooldown" | "bow" | "crossbow" {
  if (!weapon) {
    return "cooldown";
  }

  if (weapon.id === "bow") {
    return "bow";
  }

  if (weapon.id === "crossbow") {
    return "crossbow";
  }

  return "cooldown";
}

function getDefaultWeaponId(catalog: GameCatalog): string | null {
  return catalog.items.find((item) => item.kind === "weapon")?.id ?? null;
}

function buildEmptyInput(): GameSession["input"] {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
  };
}

function randomSpriteKey(): string {
  return pickRandomTile([...availableSpriteKeys]);
}

function buildLevelEnemyCounts(weaponIds: string[]): Record<string, number> {
  return Object.fromEntries(weaponIds.map((weaponId) => [weaponId, 0]));
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
  const availableWeaponIds = catalog.items
    .filter((item) => item.kind === "weapon")
    .map((item) => item.id);
  const defaultWeaponId = availableWeaponIds[0] ?? null;

  return {
    catalog,
    flow: "menu",
    mode: null,
    selectedMapTemplateId: template.id,
    selectedDensity: density,
    selectedLayoutSize: layoutSize,
    availableDensities: ["sparse", "standard", "dense"],
    availableLayoutSizes: ["small", "medium", "large"],
    availableSpriteKeys: [...availableSpriteKeys],
    availableWeaponIds,
    selectedWeaponId: defaultWeaponId,
    setupLoadoutWeaponIds: [defaultWeaponId, availableWeaponIds[1] ?? defaultWeaponId],
    activeWeaponSlot: 0,
    levelEnemyCounts: buildLevelEnemyCounts(availableWeaponIds),
    map,
    player,
    enemies: [],
    input: buildEmptyInput(),
    inventoryItems: buildInventory(catalog, player.definition.inventory),
    attackLog: [],
    projectiles: [],
    meleeAttacks: [],
    pvp: {
      playerId: `player-${Math.random().toString(36).slice(2, 10)}`,
      playerName: `Pilot-${Math.random().toString(36).slice(2, 6)}`,
      serverUrl: "http://localhost:3001",
      roomCodeInput: "",
      passwordInput: "",
      currentRoom: null,
      errorMessage: null,
      isBusy: false,
    },
    collapsedPanels: {
      mapLab: false,
      character: false,
      weapon: false,
    },
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

function moveActorAxis(
  map: GameSession["map"],
  actor: {
    position: { x: number; y: number };
    radius: number;
  },
  nextX: number,
  nextY: number,
): void {
  if (!collidesWithWalls(map, nextX, actor.position.y, actor.radius)) {
    actor.position.x = nextX;
  }

  if (!collidesWithWalls(map, actor.position.x, nextY, actor.radius)) {
    actor.position.y = nextY;
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

function updateActorFacing(
  actor: Pick<PlayerRuntime | EnemyRuntime, "facing">,
  xAxis: number,
  yAxis: number,
): void {
  if (xAxis === 0 && yAxis === 0) {
    return;
  }

  if (Math.abs(xAxis) >= Math.abs(yAxis)) {
    actor.facing = xAxis >= 0 ? "right" : "left";
    return;
  }

  actor.facing = yAxis >= 0 ? "down" : "up";
}

function movePlayerContinuously(session: GameSession, deltaMs: number): number {
  const xAxis = Number(session.input.right) - Number(session.input.left);
  const yAxis = Number(session.input.down) - Number(session.input.up);

  if (xAxis === 0 && yAxis === 0) {
    return 0;
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

  updateActorFacing(session.player, normalizedX, normalizedY);
  movePlayerAxis(session, nextX, nextY);

  return Math.hypot(
    session.player.position.x - previousX,
    session.player.position.y - previousY,
  );
}

function facingToVector(facing: FacingDirection): { x: number; y: number } {
  switch (facing) {
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
  }
}

function normalizeVector(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y) || 1;

  return {
    x: x / length,
    y: y / length,
  };
}

function movePlayerRolling(session: GameSession, deltaMs: number): number {
  const durationMs = Math.min(deltaMs, session.player.rollTimeRemainingMs);
  const speedPerSecond =
    session.player.definition.stats.speed * 52 * rollSpeedMultiplier;
  const distance = (speedPerSecond * durationMs) / 1000;
  const nextX =
    session.player.position.x + session.player.rollDirection.x * distance;
  const nextY =
    session.player.position.y + session.player.rollDirection.y * distance;
  const previousX = session.player.position.x;
  const previousY = session.player.position.y;

  movePlayerAxis(session, nextX, nextY);
  session.player.rollTimeRemainingMs = Math.max(
    0,
    session.player.rollTimeRemainingMs - deltaMs,
  );
  session.player.isRolling = session.player.rollTimeRemainingMs > 0;

  return Math.hypot(
    session.player.position.x - previousX,
    session.player.position.y - previousY,
  );
}

function buildEnemy(
  session: GameSession,
  weaponId: string,
  spawnTile: TilePoint,
  index: number,
): EnemyRuntime {
  const character = session.catalog.characters[0];
  const definition = createPlayerDefinition(
    `enemy-${weaponId}-${index}`,
    `Enemy ${index + 1}`,
    character,
  );

  return {
    id: `enemy-${weaponId}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    definition,
    weaponId,
    resources: {
      health: definition.stats.health.max,
      stamina: definition.stats.stamina.max,
      mana: definition.stats.mana.max,
    },
    position: tileCenter(session.map, spawnTile),
    radius: session.map.tileSize * playerHitboxRadiusRatio,
    facing: "left",
    isMoving: false,
    movementSpeed: 0,
    walkCycle: 0,
    attackAnimationRemainingMs: 0,
    attackCooldownRemainingMs: 0,
    role: "enemy",
    spriteKey: randomSpriteKey(),
  };
}

function rebuildLevelEnemies(session: GameSession): void {
  const requestedWeaponIds = Object.entries(session.levelEnemyCounts)
    .flatMap(([weaponId, count]) =>
      Array.from({ length: Math.max(0, count) }, () => weaponId),
    );
  const candidateTiles = session.map.spawnTiles.filter((tile) => {
    const playerTile = worldToTile(
      session.map,
      session.player.position.x,
      session.player.position.y,
    );

    return tile.column !== playerTile.column || tile.row !== playerTile.row;
  });

  session.enemies = requestedWeaponIds.map((weaponId, index) => {
    const spawnTile = candidateTiles[index % Math.max(candidateTiles.length, 1)] ?? session.map.spawnTiles[0];
    return buildEnemy(session, weaponId, spawnTile, index);
  });
}

function updateEnemies(session: GameSession, deltaMs: number): boolean {
  let moved = false;

  session.enemies = session.enemies.filter((enemy) => enemy.resources.health > 0);

  for (const enemy of session.enemies) {
    const deltaX = session.player.position.x - enemy.position.x;
    const deltaY = session.player.position.y - enemy.position.y;
    const distanceToPlayer = Math.hypot(deltaX, deltaY);

    enemy.attackAnimationRemainingMs = Math.max(
      0,
      enemy.attackAnimationRemainingMs - deltaMs,
    );
    enemy.attackCooldownRemainingMs = Math.max(
      0,
      enemy.attackCooldownRemainingMs - deltaMs,
    );
    updateActorFacing(enemy, deltaX, deltaY);

    const enemyWeapon = getWeaponById(session, enemy.weaponId);
    const attackRange =
      enemyWeapon?.effect.type === "weapon-attack" &&
      enemyWeapon.effect.damageType === "projectile"
        ? session.map.tileSize * 5
        : enemy.radius * 1.8;

    if (
      enemyWeapon?.effect.type === "weapon-attack" &&
      distanceToPlayer <= attackRange &&
      enemy.attackCooldownRemainingMs <= 0
    ) {
      performWeaponAttack(
        session,
        enemy,
        enemyWeapon,
        "center",
        {
          x: session.player.position.x,
          y: session.player.position.y,
        },
      );
      enemy.attackCooldownRemainingMs =
        enemyWeapon.effect.attackPeriodSeconds * 1000;
      moved = true;
    }

    if (distanceToPlayer < session.map.tileSize * 0.9 || distanceToPlayer <= attackRange * 0.8) {
      enemy.isMoving = false;
      enemy.movementSpeed = 0;
      continue;
    }

    const normalizedX = deltaX / Math.max(distanceToPlayer, 1);
    const normalizedY = deltaY / Math.max(distanceToPlayer, 1);
    const speedPerSecond = enemy.definition.stats.speed * 52;
    const distance = (speedPerSecond * deltaMs) / 1000;
    const nextX = enemy.position.x + normalizedX * distance;
    const nextY = enemy.position.y + normalizedY * distance;
    const previousX = enemy.position.x;
    const previousY = enemy.position.y;

    moveActorAxis(session.map, enemy, nextX, nextY);

    const movedDistance = Math.hypot(
      enemy.position.x - previousX,
      enemy.position.y - previousY,
    );
    enemy.isMoving = movedDistance > 0;
    enemy.movementSpeed = deltaMs > 0 ? movedDistance / (deltaMs / 1000) : 0;

    if (enemy.isMoving) {
      enemy.walkCycle +=
        deltaMs * (enemy.movementSpeed / Math.max(speedPerSecond, 1));
      moved = true;
    }
  }

  return moved;
}

function angleForAttackSlot(slot: AttackSlot): number {
  switch (slot) {
    case "left":
      return -18;
    case "center":
      return 0;
    case "right":
      return 18;
  }
}

function rotateVector(x: number, y: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

function getWeaponById(
  session: GameSession,
  weaponId: string | null | undefined,
): ItemDefinition | null {
  if (!weaponId) {
    return null;
  }

  return session.catalog.indexes.itemsById[weaponId] ?? null;
}

function getClosestEnemy(session: GameSession): EnemyRuntime | null {
  let closestEnemy: EnemyRuntime | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const enemy of session.enemies) {
    const distance = Math.hypot(
      enemy.position.x - session.player.position.x,
      enemy.position.y - session.player.position.y,
    );

    if (distance < closestDistance) {
      closestDistance = distance;
      closestEnemy = enemy;
    }
  }

  return closestEnemy;
}

function applyBlockMitigation(session: GameSession, damage: number): number {
  if (!session.player.isBlocking) {
    return damage;
  }

  return damage * (1 - session.player.blockEffectiveness);
}

function getSelectedWeapon(session: GameSession): ItemDefinition | null {
  return getWeaponById(session, session.selectedWeaponId);
}

function syncInventorySelection(session: GameSession): void {
  if (session.mode === "sandbox") {
    return;
  }

  const nextWeaponId = session.setupLoadoutWeaponIds[session.activeWeaponSlot];
  session.selectedWeaponId = nextWeaponId ?? session.setupLoadoutWeaponIds[0] ?? null;
}

function spawnProjectile(
  session: GameSession,
  actor: Pick<PlayerRuntime | EnemyRuntime, "position" | "radius" | "facing" | "role">,
  item: Extract<ItemDefinition, { effect: { type: "weapon-attack" } }> | ItemDefinition,
  slot: AttackSlot,
  targetPosition?: { x: number; y: number },
  damageOverride?: number,
): void {
  if (item.effect.type !== "weapon-attack" || item.effect.damageType !== "projectile") {
    return;
  }

  const baseDirection = targetPosition
    ? normalizeVector(
        targetPosition.x - actor.position.x,
        targetPosition.y - actor.position.y,
      )
    : facingToVector(actor.facing);
  const direction = rotateVector(
    baseDirection.x,
    baseDirection.y,
    angleForAttackSlot(slot),
  );
  const speed = (item.effect.projectileSpeed ?? 12) * session.map.tileSize;
  const spawnDistance = actor.radius * 1.4;
  const projectile: ProjectileRuntime = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerRole: actor.role,
    damage: damageOverride ?? item.effect.damage,
    x: actor.position.x + direction.x * spawnDistance,
    y: actor.position.y + direction.y * spawnDistance,
    velocityX: direction.x * speed,
    velocityY: direction.y * speed,
    lifetimeMs: projectileLifetimeMs,
    spriteKey: "arrow",
  };

  session.projectiles = [...session.projectiles, projectile];
}

function spawnMeleeAttack(
  session: GameSession,
  actor: Pick<PlayerRuntime | EnemyRuntime, "position" | "radius" | "facing" | "role">,
  damage: number,
  slot: AttackSlot,
  targetPosition?: { x: number; y: number },
): void {
  const baseDirection = targetPosition
    ? normalizeVector(
        targetPosition.x - actor.position.x,
        targetPosition.y - actor.position.y,
      )
    : facingToVector(actor.facing);
  const direction = rotateVector(
    baseDirection.x,
    baseDirection.y,
    angleForAttackSlot(slot),
  );
  const distance = actor.radius * meleeAttackDistanceMultiplier;
  const meleeAttack: MeleeAttackRuntime = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ownerRole: actor.role,
    damage,
    x: actor.position.x + direction.x * distance,
    y: actor.position.y + direction.y * distance,
    radius: actor.radius * meleeAttackRadiusMultiplier,
    directionX: direction.x,
    directionY: direction.y,
    lifetimeMs: meleeAttackLifetimeMs,
  };

  session.meleeAttacks = [...session.meleeAttacks, meleeAttack];
}

function performWeaponAttack(
  session: GameSession,
  actor: Pick<
    PlayerRuntime | EnemyRuntime,
    "position" | "radius" | "facing" | "role" | "attackAnimationRemainingMs"
  >,
  weapon: ItemDefinition,
  slot: AttackSlot,
  targetPosition?: { x: number; y: number },
  damageOverride?: number,
): void {
  if (weapon.effect.type !== "weapon-attack") {
    return;
  }

  const direction = targetPosition
    ? normalizeVector(
        targetPosition.x - actor.position.x,
        targetPosition.y - actor.position.y,
      )
    : facingToVector(actor.facing);
  updateActorFacing(actor, direction.x, direction.y);

  if (weapon.effect.damageType === "projectile") {
    spawnProjectile(session, actor, weapon, slot, targetPosition, damageOverride);
  } else {
    spawnMeleeAttack(
      session,
      actor,
      damageOverride ?? weapon.effect.damage,
      slot,
      targetPosition,
    );
  }

  actor.attackAnimationRemainingMs = meleeAttackLifetimeMs;
}

function updateProjectiles(session: GameSession, deltaMs: number): boolean {
  let moved = false;

  session.projectiles = session.projectiles.filter((projectile) => {
    const nextX = projectile.x + (projectile.velocityX * deltaMs) / 1000;
    const nextY = projectile.y + (projectile.velocityY * deltaMs) / 1000;
    const nextLifetime = projectile.lifetimeMs - deltaMs;

    if (nextLifetime <= 0) {
      return false;
    }

    const hitRadius = session.player.radius * 0.12;

    if (collidesWithWalls(session.map, nextX, nextY, hitRadius)) {
      return false;
    }

    if (projectile.ownerRole === "me") {
      const hitEnemy = session.enemies.find(
        (enemy) =>
          Math.hypot(enemy.position.x - nextX, enemy.position.y - nextY) <
          enemy.radius + hitRadius,
      );

      if (hitEnemy) {
        hitEnemy.resources.health = Math.max(
          0,
          hitEnemy.resources.health - projectile.damage,
        );
        return false;
      }
    } else {
      const hitPlayer =
        Math.hypot(
          session.player.position.x - nextX,
          session.player.position.y - nextY,
        ) < session.player.radius + hitRadius;

      if (hitPlayer) {
        const damage = applyBlockMitigation(session, projectile.damage);
        session.player.resources.health = Math.max(
          0,
          session.player.resources.health - damage,
        );
        return false;
      }
    }

    projectile.x = nextX;
    projectile.y = nextY;
    projectile.lifetimeMs = nextLifetime;
    moved = true;
    return true;
  });

  return moved;
}

function updateMeleeAttacks(session: GameSession, deltaMs: number): boolean {
  const hadAttacks = session.meleeAttacks.length > 0;

  session.meleeAttacks = session.meleeAttacks.filter((attack) => {
    if (attack.ownerRole === "enemy") {
      const hitPlayer =
        Math.hypot(
          session.player.position.x - attack.x,
          session.player.position.y - attack.y,
        ) <
        session.player.radius + attack.radius;

      if (hitPlayer) {
        const damage = applyBlockMitigation(session, attack.damage);
        session.player.resources.health = Math.max(
          0,
          session.player.resources.health - damage,
        );
        return false;
      }
    } else {
      const hitEnemy = session.enemies.find(
        (enemy) =>
          Math.hypot(enemy.position.x - attack.x, enemy.position.y - attack.y) <
          enemy.radius + attack.radius,
      );

      if (hitEnemy) {
        hitEnemy.resources.health = Math.max(
          0,
          hitEnemy.resources.health - attack.damage,
        );
        return false;
      }
    }

    attack.lifetimeMs -= deltaMs;
    return attack.lifetimeMs > 0;
  });

  return hadAttacks;
}

export function triggerRoll(session: GameSession): boolean {
  if (session.player.isRolling || session.player.resources.stamina < rollCost) {
    return false;
  }

  const xAxis = Number(session.input.right) - Number(session.input.left);
  const yAxis = Number(session.input.down) - Number(session.input.up);
  const direction =
    xAxis === 0 && yAxis === 0
      ? facingToVector(session.player.facing)
      : (() => {
          const length = Math.hypot(xAxis, yAxis) || 1;
          return {
            x: xAxis / length,
            y: yAxis / length,
          };
        })();

  session.player.resources.stamina = Math.max(
    0,
    session.player.resources.stamina - rollCost,
  );
  session.player.isRolling = true;
  session.player.rollTimeRemainingMs = rollDurationMs;
  session.player.rollDirection = direction;
  updateActorFacing(session.player, direction.x, direction.y);

  return true;
}

export function startBlocking(session: GameSession): boolean {
  if (session.player.isBlocking) {
    return false;
  }

  const selectedWeapon = getSelectedWeapon(session);
  const activationCost =
    selectedWeapon?.effect.type === "weapon-attack"
      ? selectedWeapon.effect.staminaCost
      : 0;

  if (session.player.resources.stamina < activationCost) {
    return false;
  }

  session.player.resources.stamina = Math.max(
    0,
    session.player.resources.stamina - activationCost,
  );
  session.player.isBlocking = true;
  session.player.blockEffectiveness = 1;
  return true;
}

export function stopBlocking(session: GameSession): boolean {
  if (!session.player.isBlocking) {
    return false;
  }

  session.player.isBlocking = false;
  return true;
}

export function startPrimaryAttack(session: GameSession): boolean {
  const selectedWeapon = getSelectedWeapon(session);

  if (selectedWeapon?.effect.type !== "weapon-attack") {
    return false;
  }

  const behavior = weaponBehavior(selectedWeapon);

  if (behavior === "bow") {
    if (
      session.player.isChargingAttack ||
      session.player.resources.stamina < selectedWeapon.effect.staminaCost
    ) {
      return false;
    }

    session.player.isChargingAttack = true;
    session.player.attackChargeMs = 0;
    return true;
  }

  if (
    session.player.attackCooldownRemainingMs > 0 ||
    session.player.resources.stamina < selectedWeapon.effect.staminaCost
  ) {
    return false;
  }

  session.player.resources.stamina = Math.max(
    0,
    session.player.resources.stamina - selectedWeapon.effect.staminaCost,
  );
  const closestEnemy = getClosestEnemy(session);
  performWeaponAttack(
    session,
    session.player,
    selectedWeapon,
    "center",
    closestEnemy
      ? { x: closestEnemy.position.x, y: closestEnemy.position.y }
      : undefined,
  );
  session.player.attackCooldownRemainingMs = attackPeriodMs(selectedWeapon);
  return true;
}

export function releasePrimaryAttack(session: GameSession): boolean {
  const selectedWeapon = getSelectedWeapon(session);

  if (
    selectedWeapon?.effect.type !== "weapon-attack" ||
    weaponBehavior(selectedWeapon) !== "bow" ||
    !session.player.isChargingAttack
  ) {
    return false;
  }

  session.player.isChargingAttack = false;
  const chargeRatio = Math.max(
    0,
    Math.min(1, session.player.attackChargeMs / Math.max(attackPeriodMs(selectedWeapon), 1)),
  );
  session.player.attackChargeMs = 0;

  if (session.player.resources.stamina < selectedWeapon.effect.staminaCost) {
    return true;
  }

  session.player.resources.stamina = Math.max(
    0,
    session.player.resources.stamina - selectedWeapon.effect.staminaCost,
  );
  const closestEnemy = getClosestEnemy(session);
  performWeaponAttack(
    session,
    session.player,
    selectedWeapon,
    "center",
    closestEnemy
      ? { x: closestEnemy.position.x, y: closestEnemy.position.y }
      : undefined,
    Math.max(1, selectedWeapon.effect.damage * chargeRatio),
  );
  return true;
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

export function setPlayerSprite(
  session: GameSession,
  spriteKey: string,
): void {
  if (!session.availableSpriteKeys.includes(spriteKey)) {
    return;
  }

  session.player.spriteKey = spriteKey;
}

export function setSelectedWeapon(session: GameSession, itemId: string): void {
  if (!session.availableWeaponIds.includes(itemId)) {
    return;
  }

  if (session.mode !== "sandbox") {
    session.setupLoadoutWeaponIds[session.activeWeaponSlot] = itemId;
  }

  session.selectedWeaponId = itemId;
  session.player.isChargingAttack = false;
  session.player.attackChargeMs = 0;
  const weapon = getWeaponById(session, itemId);
  session.player.attackCooldownRemainingMs =
    weapon?.effect.type === "weapon-attack" && weaponBehavior(weapon) === "crossbow"
      ? Math.max(session.player.attackCooldownRemainingMs, attackPeriodMs(weapon))
      : 0;
}

export function setSetupLoadoutWeapon(
  session: GameSession,
  slot: 0 | 1,
  itemId: string,
): void {
  if (!session.availableWeaponIds.includes(itemId)) {
    return;
  }

  session.setupLoadoutWeaponIds[slot] = itemId;
  if (session.activeWeaponSlot === slot) {
    session.selectedWeaponId = itemId;
  }
}

export function adjustLevelEnemyCount(
  session: GameSession,
  weaponId: string,
  delta: number,
): void {
  if (!(weaponId in session.levelEnemyCounts)) {
    return;
  }

  session.levelEnemyCounts[weaponId] = Math.max(
    0,
    Math.min(
      maxLevelEnemiesPerWeapon,
      (session.levelEnemyCounts[weaponId] ?? 0) + delta,
    ),
  );
}

export function setActiveWeaponSlot(
  session: GameSession,
  slot: 0 | 1,
): boolean {
  if (session.mode === "sandbox") {
    return false;
  }

  const weaponId = session.setupLoadoutWeaponIds[slot];

  if (!weaponId) {
    return false;
  }

  session.activeWeaponSlot = slot;
  session.selectedWeaponId = weaponId;
  session.player.isChargingAttack = false;
  session.player.attackChargeMs = 0;
  const weapon = getWeaponById(session, weaponId);
  session.player.attackCooldownRemainingMs =
    weapon?.effect.type === "weapon-attack" && weaponBehavior(weapon) === "crossbow"
      ? Math.max(session.player.attackCooldownRemainingMs, attackPeriodMs(weapon))
      : 0;
  return true;
}

export function goToMenu(session: GameSession): void {
  session.flow = "menu";
  session.mode = null;
  session.selectedWeaponId = session.setupLoadoutWeaponIds[0] ?? getDefaultWeaponId(session.catalog);
  session.projectiles = [];
  session.meleeAttacks = [];
  session.enemies = [];
  session.attackLog = [];
  session.input = buildEmptyInput();
  session.player.attackCooldownRemainingMs = 0;
  session.player.attackChargeMs = 0;
  session.player.isChargingAttack = false;
}

export function selectMode(session: GameSession, mode: GameMode): void {
  session.mode = mode;
  session.projectiles = [];
  session.meleeAttacks = [];
  session.attackLog = [];
  session.input = buildEmptyInput();
  session.activeWeaponSlot = 0;
  session.player.attackCooldownRemainingMs = 0;
  session.player.attackChargeMs = 0;
  session.player.isChargingAttack = false;
  syncInventorySelection(session);

  if (mode === "sandbox") {
    session.flow = "match";
    rerollMap(session);
    return;
  }

  session.flow = "setup";
}

export function startMatch(session: GameSession): void {
  if (!session.mode) {
    return;
  }

  syncInventorySelection(session);
  session.flow = "match";
  rerollMap(session);
}

export function replayMatch(session: GameSession): void {
  if (!session.mode) {
    return;
  }

  session.flow = "match";
  rerollMap(session);
}

export function togglePanelCollapse(
  session: GameSession,
  panel: keyof GameSession["collapsedPanels"],
): void {
  session.collapsedPanels[panel] = !session.collapsedPanels[panel];
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
  session.player.radius = map.tileSize * playerHitboxRadiusRatio;
  session.player.facing = "right";
  session.player.isMoving = false;
  session.player.movementSpeed = 0;
  session.player.walkCycle = 0;
  session.player.isRolling = false;
  session.player.rollTimeRemainingMs = 0;
  session.player.rollDirection = { x: 1, y: 0 };
  session.player.attackAnimationRemainingMs = 0;
  session.player.attackCooldownRemainingMs = 0;
  session.player.attackChargeMs = 0;
  session.player.isChargingAttack = false;
  session.player.isBlocking = false;
  session.player.blockEffectiveness = 1;
  session.player.resources = {
    health: session.player.definition.stats.health.max,
    stamina: session.player.definition.stats.stamina.max,
    mana: session.player.definition.stats.mana.max,
  };
  session.input = buildEmptyInput();
  session.attackLog = [];
  session.projectiles = [];
  session.meleeAttacks = [];
  session.enemies = [];
  session.player.inventoryOpen = false;
  syncInventorySelection(session);

  const selectedWeapon = getSelectedWeapon(session);
  if (
    selectedWeapon?.effect.type === "weapon-attack" &&
    weaponBehavior(selectedWeapon) === "crossbow"
  ) {
    session.player.attackCooldownRemainingMs = attackPeriodMs(selectedWeapon);
  }

  if (session.mode === "levels" && session.flow === "match") {
    rebuildLevelEnemies(session);
  }
}

export function tickSession(session: GameSession, deltaMs: number): boolean {
  if (session.flow !== "match") {
    return false;
  }

  const previous = { ...session.player.resources };
  const movedDistance = session.player.isRolling
    ? movePlayerRolling(session, deltaMs)
    : movePlayerContinuously(session, deltaMs);
  const moved = movedDistance > 0;
  const maxSpeedPerSecond = session.player.definition.stats.speed * 52;
  const movementSpeed =
    deltaMs > 0 ? movedDistance / (deltaMs / 1000) : 0;

  session.player.isMoving = moved || session.player.isRolling;
  session.player.movementSpeed = movementSpeed;
  session.player.attackCooldownRemainingMs = Math.max(
    0,
    session.player.attackCooldownRemainingMs - deltaMs,
  );

  if (moved) {
    session.player.walkCycle +=
      deltaMs * (movementSpeed / Math.max(maxSpeedPerSecond, 1));
  }

  if (session.player.isBlocking) {
    session.player.blockEffectiveness = Math.max(
      0,
      session.player.blockEffectiveness - (blockDecayPerSecond * deltaMs) / 1000,
    );
    session.player.resources.stamina = Math.max(
      0,
      session.player.resources.stamina - (blockStaminaDrainPerSecond * deltaMs) / 1000,
    );

    if (session.player.resources.stamina <= 0 || session.player.blockEffectiveness <= 0) {
      session.player.isBlocking = false;
    }
  }

  const selectedWeapon = getSelectedWeapon(session);

  if (
    session.player.isChargingAttack &&
    selectedWeapon?.effect.type === "weapon-attack" &&
    weaponBehavior(selectedWeapon) === "bow"
  ) {
    session.player.attackChargeMs = Math.min(
      attackPeriodMs(selectedWeapon),
      session.player.attackChargeMs + deltaMs,
    );
  }

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
  const projectileMoved = updateProjectiles(session, deltaMs);
  const meleeUpdated = updateMeleeAttacks(session, deltaMs);
  const enemiesMoved = updateEnemies(session, deltaMs);
  session.player.attackAnimationRemainingMs = Math.max(
    0,
    session.player.attackAnimationRemainingMs - deltaMs,
  );

  if (session.player.resources.health <= 0) {
    session.flow = "gameOver";
    session.player.isBlocking = false;
    return true;
  }

  return (
    moved ||
    enemiesMoved ||
    projectileMoved ||
    meleeUpdated ||
    session.player.attackAnimationRemainingMs > 0 ||
    previous.health !== session.player.resources.health ||
    previous.stamina !== session.player.resources.stamina ||
    previous.mana !== session.player.resources.mana
  );
}

export function attack(session: GameSession, slot: AttackSlot): void {
  const triggered =
    slot === "center" ? startPrimaryAttack(session) : false;

  if (!triggered) {
    return;
  }

  const event: AttackEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slot,
    label: `${selectedWeapon?.name ?? attackLabelBySlot[slot]} toward ${session.player.facing}`,
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
