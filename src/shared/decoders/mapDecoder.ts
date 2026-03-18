import type {
  GeneratedMapLayoutDefinition,
  MapTemplateDefinition,
  StaticMapLayoutDefinition,
} from "../domain/gameTypes";
import type { MapDefinitionInput } from "../domain/rawDefinitions";
import { invariant } from "./assert";

function decodeStaticLayout(
  id: string,
  layout: Extract<MapDefinitionInput["layout"], { type: "static" }>,
): StaticMapLayoutDefinition {
  invariant(layout.grid.length > 0, `Map ${id} grid must not be empty`);

  const width = layout.grid[0].length;
  invariant(width > 0, `Map ${id} grid rows must not be empty`);

  layout.grid.forEach((row, rowIndex) => {
    invariant(
      row.length === width,
      `Map ${id} row ${rowIndex} does not match width ${width}`,
    );
  });

  return {
    type: "static",
    grid: [...layout.grid],
  };
}

function decodeGeneratedLayout(
  id: string,
  layout: Extract<MapDefinitionInput["layout"], { type: "generated" }>,
): GeneratedMapLayoutDefinition {
  invariant(layout.columns >= 9, `Map ${id} needs at least 9 columns`);
  invariant(layout.rows >= 9, `Map ${id} needs at least 9 rows`);
  invariant(layout.maxPlayers >= 2, `Map ${id} needs at least 2 players`);
  invariant(layout.maxPlayers <= 4, `Map ${id} supports at most 4 players`);

  return {
    type: "generated",
    archetype: layout.archetype,
    columns: layout.columns,
    rows: layout.rows,
    maxPlayers: layout.maxPlayers,
    defaultDensity: layout.defaultDensity,
  };
}

export function decodeMapTemplate(
  input: MapDefinitionInput,
): MapTemplateDefinition {
  invariant(input.id.length > 0, "Map id is required");
  invariant(input.name.length > 0, "Map name is required");
  invariant(input.tileSize > 0, "Map tileSize must be > 0");

  return {
    id: input.id,
    name: input.name,
    tileSize: input.tileSize,
    layout:
      input.layout.type === "static"
        ? decodeStaticLayout(input.id, input.layout)
        : decodeGeneratedLayout(input.id, input.layout),
  };
}
