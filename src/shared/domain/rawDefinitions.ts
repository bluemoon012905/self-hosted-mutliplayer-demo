import type {
  DamageType,
  ItemKind,
  ItemRarity,
  MapArchetype,
  MapDensity,
} from "./gameTypes";

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

export interface WeaponAttackEffectInput {
  type: "weapon-attack";
  damage: number;
  attackPeriodSeconds: number;
  staminaCost: number;
  damageType: DamageType;
  projectileSpeed?: number;
}

export interface TemporaryShieldEffectInput {
  type: "temporary-shield";
  durationMs: number;
  value: number;
}

export type ItemEffectInput =
  | WeaponAttackEffectInput
  | BurstShotEffectInput
  | TemporaryShieldEffectInput;

export interface ItemDefinitionInput {
  id: string;
  name: string;
  description?: string;
  kind: ItemKind;
  rarity: ItemRarity;
  spriteKey?: string;
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
      defaultDensity: MapDensity;
      };
}
