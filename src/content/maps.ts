import type { MapDefinitionInput } from "../shared/domain/rawDefinitions";

export const rawMaps: MapDefinitionInput[] = [
  {
    id: "shattered-foundry",
    name: "Shattered Foundry",
    tileSize: 64,
    layout: {
      type: "generated",
      archetype: "shattered",
      columns: 66,
      rows: 42,
      maxPlayers: 4,
      defaultDensity: "sparse",
    },
  },
  {
    id: "enclosed-vault",
    name: "Enclosed Vault",
    tileSize: 64,
    layout: {
      type: "generated",
      archetype: "enclosed",
      columns: 74,
      rows: 46,
      maxPlayers: 4,
      defaultDensity: "dense",
    },
  },
];
