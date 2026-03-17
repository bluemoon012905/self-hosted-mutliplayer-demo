import type { GameCatalog } from "../domain/gameTypes";
import { invariant } from "../decoders/assert";
import { buildCharacters } from "./characterFactory";
import { indexById } from "./catalogUtils";
import { buildItems } from "./itemFactory";
import { buildMaps } from "./mapFactory";

export function buildGameCatalog(): GameCatalog {
  const items = buildItems();
  const itemIds = new Set(items.map((item) => item.id));
  const characters = buildCharacters();

  characters.forEach((character) => {
    character.loadout.forEach((itemId) => {
      invariant(
        itemIds.has(itemId),
        `Character ${character.id} references unknown item ${itemId}`,
      );
    });
  });

  const maps = buildMaps();

  return {
    characters,
    items,
    maps,
    indexes: {
      charactersById: indexById(characters),
      itemsById: indexById(items),
      mapsById: indexById(maps),
    },
  };
}
