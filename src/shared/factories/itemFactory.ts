import { rawItems } from "../../content/items";
import type { ItemDefinition } from "../domain/gameTypes";
import { decodeItem } from "../decoders/itemDecoder";

export function buildItems(): ItemDefinition[] {
  return rawItems.map(decodeItem);
}
