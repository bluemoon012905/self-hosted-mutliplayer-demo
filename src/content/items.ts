import type { ItemDefinitionInput } from "../shared/domain/rawDefinitions";
import { buildWeaponPackItems } from "./item-packs/weaponPack";

const baseItems: ItemDefinitionInput[] = [
  {
    id: "burst-shot",
    name: "Burst Shot",
    description: "Triple-shot modifier that spreads projectiles slightly.",
    kind: "weapon-mod",
    rarity: "common",
    effect: {
      type: "projectile-burst",
      count: 3,
      spreadDegrees: 10,
    },
  },
  {
    id: "shield-pulse",
    name: "Shield Pulse",
    description: "Temporary defensive pulse that grants bonus shield value.",
    kind: "active",
    rarity: "rare",
    effect: {
      type: "temporary-shield",
      durationMs: 1800,
      value: 35,
    },
  },
];

export const rawItems: ItemDefinitionInput[] = [
  ...baseItems,
  ...buildWeaponPackItems(),
];
