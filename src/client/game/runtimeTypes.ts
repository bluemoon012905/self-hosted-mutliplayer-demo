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
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  lifetimeMs: number;
  spriteKey: string;
}

export interface GameSession {
  catalog: GameCatalog;
  selectedMapTemplateId: string;
  selectedDensity: MapDensity;
  selectedLayoutSize: MapLayoutSize;
  availableDensities: MapDensity[];
  availableLayoutSizes: MapLayoutSize[];
  availableSpriteKeys: string[];
  availableWeaponIds: string[];
  selectedWeaponId: string | null;
  map: MapDefinition;
  player: PlayerRuntime;
  input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  inventoryItems: ItemDefinition[];
  attackLog: AttackEvent[];
  projectiles: ProjectileRuntime[];
}

export interface MapSelectorState {
  selectedTemplate: MapTemplateDefinition;
  selectedDensity: MapDensity;
  selectedLayoutSize: MapLayoutSize;
}
