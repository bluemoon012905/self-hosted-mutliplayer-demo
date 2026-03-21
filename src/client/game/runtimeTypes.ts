import type {
  AttackSlot,
  FacingDirection,
  GameCatalog,
  ItemDefinition,
  MapDensity,
  MapDefinition,
  MapLayoutSize,
  MapTemplateDefinition,
  PlayerDefinition,
} from "../../shared/domain/gameTypes";

export type PlayerRole = "me" | "friend" | "enemy";
export type GameMode = "sandbox" | "levels" | "pvp";
export type GameFlow = "menu" | "setup" | "match" | "gameOver";
export type PvpRoomStatus = "lobby" | "countdown" | "active";

export interface PvpRoomPlayer {
  id: string;
  name: string;
  ready: boolean;
  isHost: boolean;
}

export interface PvpRoomSnapshot {
  roomCode: string;
  status: PvpRoomStatus;
  hostPlayerId: string;
  mapTemplateId: string;
  density: MapDensity;
  layoutSize: MapLayoutSize;
  waitTimeSeconds: number;
  countdownRemainingMs: number | null;
  players: PvpRoomPlayer[];
}

export interface PvpLobbyState {
  playerId: string;
  playerName: string;
  serverUrl: string;
  roomCodeInput: string;
  passwordInput: string;
  waitTimeSecondsInput: string;
  currentRoom: PvpRoomSnapshot | null;
  errorMessage: string | null;
  isBusy: boolean;
}

export interface PlayerRuntime {
  definition: PlayerDefinition;
  mapId: string;
  resources: {
    health: number;
    stamina: number;
    mana: number;
  };
  position: {
    x: number;
    y: number;
  };
  radius: number;
  facing: FacingDirection;
  inventoryOpen: boolean;
  isMoving: boolean;
  movementSpeed: number;
  walkCycle: number;
  isRolling: boolean;
  rollTimeRemainingMs: number;
  rollDirection: {
    x: number;
    y: number;
  };
  attackAnimationRemainingMs: number;
  attackCooldownRemainingMs: number;
  attackChargeMs: number;
  isChargingAttack: boolean;
  isBlocking: boolean;
  blockEffectiveness: number;
  role: PlayerRole;
  spriteKey: string;
}

export interface EnemyRuntime {
  id: string;
  definition: PlayerDefinition;
  weaponId: string;
  resources: {
    health: number;
    stamina: number;
    mana: number;
  };
  position: {
    x: number;
    y: number;
  };
  radius: number;
  facing: FacingDirection;
  isMoving: boolean;
  movementSpeed: number;
  walkCycle: number;
  attackAnimationRemainingMs: number;
  attackCooldownRemainingMs: number;
  role: PlayerRole;
  spriteKey: string;
}

export interface AttackEvent {
  id: string;
  slot: AttackSlot;
  label: string;
  createdAt: number;
}

export interface ProjectileRuntime {
  id: string;
  ownerRole: PlayerRole;
  damage: number;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  lifetimeMs: number;
  spriteKey: string;
}

export interface MeleeAttackRuntime {
  id: string;
  ownerRole: PlayerRole;
  damage: number;
  x: number;
  y: number;
  radius: number;
  directionX: number;
  directionY: number;
  lifetimeMs: number;
}

export interface GameSession {
  catalog: GameCatalog;
  flow: GameFlow;
  mode: GameMode | null;
  selectedMapTemplateId: string;
  selectedDensity: MapDensity;
  selectedLayoutSize: MapLayoutSize;
  availableDensities: MapDensity[];
  availableLayoutSizes: MapLayoutSize[];
  availableSpriteKeys: string[];
  availableWeaponIds: string[];
  selectedWeaponId: string | null;
  setupLoadoutWeaponIds: [string | null, string | null];
  activeWeaponSlot: 0 | 1;
  levelEnemyCounts: Record<string, number>;
  map: MapDefinition;
  player: PlayerRuntime;
  enemies: EnemyRuntime[];
  input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  inventoryItems: ItemDefinition[];
  attackLog: AttackEvent[];
  projectiles: ProjectileRuntime[];
  meleeAttacks: MeleeAttackRuntime[];
  pvp: PvpLobbyState;
  collapsedPanels: {
    mapLab: boolean;
    character: boolean;
    weapon: boolean;
  };
}

export interface MapSelectorState {
  selectedTemplate: MapTemplateDefinition;
  selectedDensity: MapDensity;
  selectedLayoutSize: MapLayoutSize;
}
