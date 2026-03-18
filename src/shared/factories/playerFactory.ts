import type { CharacterDefinition, PlayerDefinition, PlayerStats } from "../domain/gameTypes";

const basePlayerStats: PlayerStats = {
  health: {
    max: 100,
    regenPerSecond: 8,
  },
  stamina: {
    max: 200,
    regenPerSecond: 8,
  },
  mana: {
    max: 100,
    regenPerSecond: 8,
  },
  speed: 5,
};

export function createPlayerDefinition(
  id: string,
  name: string,
  character: CharacterDefinition,
): PlayerDefinition {
  return {
    id,
    name,
    characterId: character.id,
    stats: {
      health: { ...basePlayerStats.health },
      stamina: { ...basePlayerStats.stamina },
      mana: { ...basePlayerStats.mana },
      speed: basePlayerStats.speed,
    },
    inventory: [...character.loadout],
  };
}
