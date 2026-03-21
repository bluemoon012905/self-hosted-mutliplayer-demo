import type { ItemDefinition, ItemEffect } from "../domain/gameTypes";
import type { ItemDefinitionInput, ItemEffectInput } from "../domain/rawDefinitions";
import { invariant } from "./assert";

function decodeEffect(effect: ItemEffectInput): ItemEffect {
  switch (effect.type) {
    case "weapon-attack":
      invariant(effect.damage > 0, "Weapon damage must be > 0");
      invariant(
        effect.attackPeriodSeconds > 0,
        "Weapon attackPeriodSeconds must be > 0",
      );
      invariant(effect.staminaCost >= 0, "Weapon staminaCost must be >= 0");
      if (effect.projectileSpeed !== undefined) {
        invariant(
          effect.projectileSpeed > 0,
          "Weapon projectileSpeed must be > 0 when provided",
        );
      }
      return {
        type: effect.type,
        damage: effect.damage,
        attackPeriodSeconds: effect.attackPeriodSeconds,
        staminaCost: effect.staminaCost,
        damageType: effect.damageType,
        projectileSpeed: effect.projectileSpeed,
      };
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
    description: input.description ?? "",
    kind: input.kind,
    rarity: input.rarity,
    spriteKey: input.spriteKey,
    effect: decodeEffect(input.effect),
  };
}
