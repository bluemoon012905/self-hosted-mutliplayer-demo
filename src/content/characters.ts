import type { CharacterDefinitionInput } from "../shared/domain/rawDefinitions";

export const rawCharacters: CharacterDefinitionInput[] = [
  {
    id: "runner",
    name: "Runner",
    description: "Fast chassis with lower armor for aggressive movement.",
    stats: {
      moveSpeed: 8.5,
      turnSpeed: 6.2,
      armor: 70,
      fireCooldownMs: 700,
    },
    loadout: ["burst-shot"],
  },
  {
    id: "bulwark",
    name: "Bulwark",
    description: "Heavy frame that absorbs damage and controls lanes.",
    stats: {
      moveSpeed: 6.2,
      turnSpeed: 4.8,
      armor: 120,
      fireCooldownMs: 950,
    },
    loadout: ["shield-pulse"],
  },
];
