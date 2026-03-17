import { rawCharacters } from "../../content/characters";
import type { CharacterDefinition } from "../domain/gameTypes";
import { decodeCharacter } from "../decoders/characterDecoder";

export function buildCharacters(): CharacterDefinition[] {
  return rawCharacters.map(decodeCharacter);
}
