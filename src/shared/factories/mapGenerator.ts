import type {
  GeneratedMapLayoutDefinition,
  MapArchetype,
  MapDefinition,
  MapDensity,
  MapLayoutSize,
  MapTemplateDefinition,
  SpawnPoint,
  TilePoint,
} from "../domain/gameTypes";
import { invariant } from "../decoders/assert";

interface ArchetypeTuning {
  wallTargetRatio: number;
  segmentMinLength: number;
  segmentMaxLength: number;
  minSpawnPathDistance: number;
}

const archetypeTuning: Record<MapArchetype, ArchetypeTuning> = {
  shattered: {
    wallTargetRatio: 0.18,
    segmentMinLength: 1,
    segmentMaxLength: 3,
    minSpawnPathDistance: 14,
  },
  enclosed: {
    wallTargetRatio: 0.29,
    segmentMinLength: 2,
    segmentMaxLength: 5,
    minSpawnPathDistance: 18,
  },
};

const densityMultiplier: Record<MapDensity, number> = {
  sparse: 0.9,
  standard: 1.1,
  dense: 1.3,
};

const layoutSizeMultiplier: Record<MapLayoutSize, number> = {
  small: 0.5,
  medium: 1,
  large: 2,
};

export interface MapBuildOptions {
  density?: MapDensity;
  layoutSize?: MapLayoutSize;
}

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function shuffle<T>(values: T[]): T[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function buildCoordinate(tile: TilePoint, tileSize: number): SpawnPoint {
  return {
    x: tile.column * tileSize,
    y: tile.row * tileSize,
  };
}

function isWalkable(grid: string[], tile: TilePoint): boolean {
  return grid[tile.row]?.[tile.column] !== "#";
}

function collectWalkableTiles(grid: string[]): TilePoint[] {
  const walkableTiles: TilePoint[] = [];

  for (let row = 1; row < grid.length - 1; row += 1) {
    for (let column = 1; column < grid[row].length - 1; column += 1) {
      if (grid[row][column] !== "#") {
        walkableTiles.push({ row, column });
      }
    }
  }

  return walkableTiles;
}

function neighbors(tile: TilePoint): TilePoint[] {
  return [
    { row: tile.row - 1, column: tile.column },
    { row: tile.row + 1, column: tile.column },
    { row: tile.row, column: tile.column - 1 },
    { row: tile.row, column: tile.column + 1 },
  ];
}

function keyOf(tile: TilePoint): string {
  return `${tile.column},${tile.row}`;
}

function shortestPathLength(
  grid: string[],
  start: TilePoint,
  goal: TilePoint,
): number | null {
  const queue: Array<{ tile: TilePoint; distance: number }> = [
    { tile: start, distance: 0 },
  ];
  const seen = new Set<string>([keyOf(start)]);

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      continue;
    }

    if (
      current.tile.column === goal.column &&
      current.tile.row === goal.row
    ) {
      return current.distance;
    }

    neighbors(current.tile).forEach((next) => {
      const key = keyOf(next);

      if (seen.has(key) || !isWalkable(grid, next)) {
        return;
      }

      seen.add(key);
      queue.push({ tile: next, distance: current.distance + 1 });
    });
  }

  return null;
}

function hasDirectLineOfSight(
  grid: string[],
  first: TilePoint,
  second: TilePoint,
): boolean {
  if (first.row === second.row) {
    const minColumn = Math.min(first.column, second.column);
    const maxColumn = Math.max(first.column, second.column);

    for (let column = minColumn + 1; column < maxColumn; column += 1) {
      if (grid[first.row][column] === "#") {
        return false;
      }
    }

    return true;
  }

  if (first.column === second.column) {
    const minRow = Math.min(first.row, second.row);
    const maxRow = Math.max(first.row, second.row);

    for (let row = minRow + 1; row < maxRow; row += 1) {
      if (grid[row][first.column] === "#") {
        return false;
      }
    }

    return true;
  }

  return false;
}

function hasSpawnCover(grid: string[], tile: TilePoint): boolean {
  return neighbors(tile).some(
    (neighbor) => grid[neighbor.row]?.[neighbor.column] === "#",
  );
}

function buildBorderedGrid(columns: number, rows: number): string[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: columns }, (_, column) =>
      row === 0 || row === rows - 1 || column === 0 || column === columns - 1
        ? "#"
        : ".",
    ),
  );
}

function stampWallSegment(
  grid: string[][],
  row: number,
  column: number,
  length: number,
  horizontal: boolean,
): void {
  for (let index = 0; index < length; index += 1) {
    const nextRow = horizontal ? row : row + index;
    const nextColumn = horizontal ? column + index : column;

    if (
      nextRow <= 0 ||
      nextRow >= grid.length - 1 ||
      nextColumn <= 0 ||
      nextColumn >= grid[0].length - 1
    ) {
      return;
    }

    grid[nextRow][nextColumn] = "#";
  }
}

function countWalls(grid: string[][]): number {
  return grid.flat().filter((cell) => cell === "#").length;
}

function generateGrid(
  layout: GeneratedMapLayoutDefinition,
  density: MapDensity,
): string[] {
  const tuning = archetypeTuning[layout.archetype];
  const grid = buildBorderedGrid(layout.columns, layout.rows);
  const totalTiles = layout.columns * layout.rows;
  const targetWalls = Math.floor(
    totalTiles * tuning.wallTargetRatio * densityMultiplier[density],
  );
  let attempts = 0;

  while (countWalls(grid) < targetWalls && attempts < totalTiles * 10) {
    const row = randomInt(layout.rows - 2) + 1;
    const column = randomInt(layout.columns - 2) + 1;
    const length =
      tuning.segmentMinLength +
      randomInt(tuning.segmentMaxLength - tuning.segmentMinLength + 1);
    const horizontal = Math.random() > 0.5;

    stampWallSegment(grid, row, column, length, horizontal);
    attempts += 1;
  }

  return grid.map((row) => row.join(""));
}

function scaleGeneratedLayout(
  layout: GeneratedMapLayoutDefinition,
  layoutSize: MapLayoutSize,
): GeneratedMapLayoutDefinition {
  const multiplier = layoutSizeMultiplier[layoutSize];
  const columns = Math.max(9, Math.round(layout.columns * multiplier));
  const rows = Math.max(9, Math.round(layout.rows * multiplier));

  return {
    ...layout,
    columns,
    rows,
  };
}

function pickSpawnTiles(
  grid: string[],
  layout: GeneratedMapLayoutDefinition,
): TilePoint[] {
  const tuning = archetypeTuning[layout.archetype];
  const candidates = shuffle(collectWalkableTiles(grid)).filter((tile) =>
    hasSpawnCover(grid, tile),
  );
  const selected: TilePoint[] = [];

  for (const candidate of candidates) {
    const fitsAllSelected = selected.every((spawnTile) => {
      if (hasDirectLineOfSight(grid, spawnTile, candidate)) {
        return false;
      }

      const distance = shortestPathLength(grid, spawnTile, candidate);
      return distance !== null && distance >= tuning.minSpawnPathDistance;
    });

    if (!fitsAllSelected) {
      continue;
    }

    selected.push(candidate);

    if (selected.length === layout.maxPlayers) {
      return selected;
    }
  }

  return [];
}

function buildTilesFromGrid(grid: string[]): {
  wallTiles: TilePoint[];
} {
  const wallTiles: TilePoint[] = [];

  grid.forEach((row, rowIndex) => {
    [...row].forEach((cell, columnIndex) => {
      if (cell === "#") {
        wallTiles.push({ row: rowIndex, column: columnIndex });
      }
    });
  });

  return { wallTiles };
}

function buildStaticMap(
  template: MapTemplateDefinition,
  density: MapDensity,
): MapDefinition {
  invariant(template.layout.type === "static", "Expected static map layout");

  const { wallTiles } = buildTilesFromGrid(template.layout.grid);
  const spawnTiles = collectWalkableTiles(template.layout.grid).slice(0, 4);

  return {
    id: template.id,
    name: template.name,
    tileSize: template.tileSize,
    archetype: "static",
    density,
    maxPlayers: spawnTiles.length,
    grid: template.layout.grid,
    size: {
      columns: template.layout.grid[0].length,
      rows: template.layout.grid.length,
    },
    walls: wallTiles.map((tile) => buildCoordinate(tile, template.tileSize)),
    wallTiles,
    spawnPoints: spawnTiles.map((tile) => buildCoordinate(tile, template.tileSize)),
    spawnTiles,
  };
}

function buildGeneratedMap(
  template: MapTemplateDefinition,
  density: MapDensity,
  layoutSize: MapLayoutSize,
): MapDefinition {
  invariant(template.layout.type === "generated", "Expected generated map layout");
  const layout = scaleGeneratedLayout(template.layout, layoutSize);

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const grid = generateGrid(layout, density);
    const spawnTiles = pickSpawnTiles(grid, layout);

    if (spawnTiles.length !== layout.maxPlayers) {
      continue;
    }

    const { wallTiles } = buildTilesFromGrid(grid);

    return {
      id: template.id,
      name: template.name,
      tileSize: template.tileSize,
      archetype: template.layout.archetype,
      density,
      maxPlayers: layout.maxPlayers,
      grid,
      size: {
        columns: layout.columns,
        rows: layout.rows,
      },
      walls: wallTiles.map((tile) => buildCoordinate(tile, template.tileSize)),
      wallTiles,
      spawnPoints: spawnTiles.map((tile) => buildCoordinate(tile, template.tileSize)),
      spawnTiles,
    };
  }

  throw new Error(`Failed to generate a valid map for ${template.id}`);
}

export function buildMapFromTemplate(
  template: MapTemplateDefinition,
  options: MapBuildOptions = {},
): MapDefinition {
  const density =
    template.layout.type === "generated"
      ? options.density ?? template.layout.defaultDensity
      : options.density ?? "standard";
  const layoutSize = options.layoutSize ?? "medium";

  if (template.layout.type === "static") {
    return buildStaticMap(template, density);
  }

  return buildGeneratedMap(template, density, layoutSize);
}
