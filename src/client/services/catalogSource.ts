import type { GameCatalog } from "../../shared/domain/gameTypes";
import { buildGameCatalog } from "../../shared/factories/gameCatalogFactory";

export interface CatalogSourceOptions {
  mode: "embedded" | "local-server";
  localServerUrl?: string;
}

export async function loadCatalog(
  options: CatalogSourceOptions,
): Promise<GameCatalog> {
  if (options.mode === "embedded") {
    return buildGameCatalog();
  }

  const baseUrl = options.localServerUrl ?? "http://localhost:3001";
  const response = await fetch(`${baseUrl}/catalog`);

  if (!response.ok) {
    throw new Error(`Failed to load catalog from ${baseUrl}: ${response.status}`);
  }

  return (await response.json()) as GameCatalog;
}
