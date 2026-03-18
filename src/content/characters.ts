import type { CharacterDefinitionInput } from "../shared/domain/rawDefinitions";

export const rawCharacters: CharacterDefinitionInput[] = [
  {
    id: "base-adventurer",
    name: "Base Adventurer",
    description: "Baseline character for movement, combat, and resource tuning.",
    stats: {
      moveSpeed: 5,
      turnSpeed: 5,
      armor: 100,
      fireCooldownMs: 800,
    },
    loadout: ["burst-shot", "shield-pulse"],
  },
];
