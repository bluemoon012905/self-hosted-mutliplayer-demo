import type {
  CharacterDefinition,
  CharacterStats,
} from "../domain/gameTypes";
import type { CharacterDefinitionInput } from "../domain/rawDefinitions";
import { invariant } from "./assert";

function decodeStats(input: CharacterDefinitionInput["stats"]): CharacterStats {
  invariant(input.moveSpeed > 0, "Character moveSpeed must be > 0");
  invariant(input.turnSpeed > 0, "Character turnSpeed must be > 0");
  invariant(input.armor > 0, "Character armor must be > 0");
  invariant(input.fireCooldownMs > 0, "Character fireCooldownMs must be > 0");

  return {
    moveSpeed: input.moveSpeed,
    turnSpeed: input.turnSpeed,
    armor: input.armor,
    fireCooldownMs: input.fireCooldownMs,
  };
}

export function decodeCharacter(
  input: CharacterDefinitionInput,
): CharacterDefinition {
  invariant(input.id.length > 0, "Character id is required");
  invariant(input.name.length > 0, "Character name is required");
  invariant(input.loadout.length > 0, `Character ${input.id} needs a loadout`);

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    stats: decodeStats(input.stats),
    loadout: [...input.loadout],
  };
}
