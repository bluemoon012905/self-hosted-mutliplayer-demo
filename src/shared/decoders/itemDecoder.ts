import type { ItemDefinition, ItemEffect } from "../domain/gameTypes";
import type { ItemDefinitionInput, ItemEffectInput } from "../domain/rawDefinitions";
import { invariant } from "./assert";

function decodeEffect(effect: ItemEffectInput): ItemEffect {
  switch (effect.type) {
    case "projectile-burst":
      invariant(effect.count > 0, "Burst count must be > 0");
      invariant(effect.spreadDegrees >= 0, "Spread must be >= 0");
      return {
        type: effect.type,
        count: effect.count,
        spreadDegrees: effect.spreadDegrees,
      };
    case "temporary-shield":
      invariant(effect.durationMs > 0, "Shield duration must be > 0");
      invariant(effect.value > 0, "Shield value must be > 0");
      return {
        type: effect.type,
        durationMs: effect.durationMs,
        value: effect.value,
      };
  }
}

export function decodeItem(input: ItemDefinitionInput): ItemDefinition {
  invariant(input.id.length > 0, "Item id is required");
  invariant(input.name.length > 0, "Item name is required");

  return {
    id: input.id,
    name: input.name,
    kind: input.kind,
    rarity: input.rarity,
    effect: decodeEffect(input.effect),
  };
}
