import type { MapDefinitionInput } from "../shared/domain/rawDefinitions";

export const rawMaps: MapDefinitionInput[] = [
  {
    id: "shattered-foundry",
    name: "Shattered Foundry",
    tileSize: 64,
    layout: {
      type: "generated",
      archetype: "shattered",
      columns: 17,
      rows: 11,
      maxPlayers: 4,
    },
  },
  {
    id: "enclosed-vault",
    name: "Enclosed Vault",
    tileSize: 64,
    layout: {
      type: "generated",
      archetype: "enclosed",
      columns: 17,
      rows: 11,
      maxPlayers: 4,
    },
  },
];
