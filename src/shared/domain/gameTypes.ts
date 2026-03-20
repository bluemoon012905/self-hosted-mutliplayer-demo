export type CharacterId = string;
export type ItemId = string;
export type MapId = string;

export type ItemKind = "weapon-mod" | "active" | "passive";
export type ItemRarity = "common" | "rare" | "epic";
export type MapArchetype = "shattered" | "enclosed";
export type MapDensity = "sparse" | "standard" | "dense";
export type MapLayoutSize = "small" | "medium" | "large";
export type FacingDirection = "up" | "down" | "left" | "right";
export type AttackSlot = "left" | "center" | "right";

export interface CharacterStats {
  moveSpeed: number;
  turnSpeed: number;
  armor: number;
  fireCooldownMs: number;
}

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  description: string;
  stats: CharacterStats;
  loadout: ItemId[];
}

export type ItemEffect =
  | {
      type: "projectile-burst";
      count: number;
      spreadDegrees: number;
    }
  | {
      type: "temporary-shield";
      durationMs: number;
      value: number;
    };

export interface ItemDefinition {
  id: ItemId;
  name: string;
  kind: ItemKind;
  rarity: ItemRarity;
  effect: ItemEffect;
}

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface TilePoint {
  column: number;
  row: number;
}

export interface StaticMapLayoutDefinition {
  type: "static";
  grid: string[];
}

export interface GeneratedMapLayoutDefinition {
  type: "generated";
  archetype: MapArchetype;
  columns: number;
  rows: number;
  maxPlayers: number;
  defaultDensity: MapDensity;
}

export type MapLayoutDefinition =
  | StaticMapLayoutDefinition
  | GeneratedMapLayoutDefinition;

export interface MapTemplateDefinition {
  id: MapId;
  name: string;
  tileSize: number;
  layout: MapLayoutDefinition;
}

export interface MapDefinition {
  id: MapId;
  name: string;
  tileSize: number;
  archetype: MapArchetype | "static";
  density: MapDensity;
  maxPlayers: number;
  grid: string[];
  size: {
    columns: number;
    rows: number;
  };
  walls: SpawnPoint[];
  wallTiles: TilePoint[];
  spawnPoints: SpawnPoint[];
  spawnTiles: TilePoint[];
}

export interface GameCatalog {
  characters: CharacterDefinition[];
  items: ItemDefinition[];
  mapTemplates: MapTemplateDefinition[];
  maps: MapDefinition[];
  indexes: {
    charactersById: Record<CharacterId, CharacterDefinition>;
    itemsById: Record<ItemId, ItemDefinition>;
    mapsById: Record<MapId, MapDefinition>;
    mapTemplatesById: Record<MapId, MapTemplateDefinition>;
  };
}

export interface PlayerStats {
  health: {
    max: number;
    regenPerSecond: number;
  };
  stamina: {
    max: number;
    regenPerSecond: number;
  };
  mana: {
    max: number;
    regenPerSecond: number;
  };
  speed: number;
}

export interface PlayerDefinition {
  id: string;
  name: string;
  characterId: CharacterId;
  stats: PlayerStats;
  inventory: ItemId[];
}
