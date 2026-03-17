import { rawMaps } from "../../content/maps";
import type { MapDefinition } from "../domain/gameTypes";
import { decodeMapTemplate } from "../decoders/mapDecoder";
import { buildMapFromTemplate } from "./mapGenerator";

export function buildMaps(): MapDefinition[] {
  return rawMaps.map(decodeMapTemplate).map(buildMapFromTemplate);
}
