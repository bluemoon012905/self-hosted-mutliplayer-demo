import type { ItemDefinitionInput } from "../shared/domain/rawDefinitions";

export const rawItems: ItemDefinitionInput[] = [
  {
    id: "burst-shot",
    name: "Burst Shot",
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
    kind: "active",
    rarity: "rare",
    effect: {
      type: "temporary-shield",
      durationMs: 1800,
      value: 35,
    },
  },
];
