import { rawMaps } from "../../content/maps";
import type { MapDefinition, MapTemplateDefinition } from "../domain/gameTypes";
import { decodeMapTemplate } from "../decoders/mapDecoder";
import { buildMapFromTemplate } from "./mapGenerator";

export function buildMapTemplates(): MapTemplateDefinition[] {
  return rawMaps.map(decodeMapTemplate);
}

export function buildMaps(): MapDefinition[] {
  return buildMapTemplates().map((template) => buildMapFromTemplate(template));
}
