import type { ItemKind, ItemRarity, MapArchetype } from "./gameTypes";

export interface CharacterDefinitionInput {
  id: string;
  name: string;
  description: string;
  stats: {
    moveSpeed: number;
    turnSpeed: number;
    armor: number;
    fireCooldownMs: number;
  };
  loadout: string[];
}

export interface BurstShotEffectInput {
  type: "projectile-burst";
  count: number;
  spreadDegrees: number;
}

export interface TemporaryShieldEffectInput {
  type: "temporary-shield";
  durationMs: number;
  value: number;
}

export type ItemEffectInput = BurstShotEffectInput | TemporaryShieldEffectInput;

export interface ItemDefinitionInput {
  id: string;
  name: string;
  kind: ItemKind;
  rarity: ItemRarity;
  effect: ItemEffectInput;
}

export interface MapDefinitionInput {
  id: string;
  name: string;
  tileSize: number;
  layout:
    | {
        type: "static";
        grid: string[];
      }
    | {
        type: "generated";
        archetype: MapArchetype;
        columns: number;
        rows: number;
        maxPlayers: number;
      };
}
