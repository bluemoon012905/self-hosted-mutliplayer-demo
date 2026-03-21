import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

import { buildGameCatalog } from "../shared/factories/gameCatalogFactory";
import type { MapDensity, MapLayoutSize } from "../shared/domain/gameTypes";

const port = Number(process.env.PORT ?? 3001);
const countdownDurationMs = 10_000;
const distRoot = join(process.cwd(), "dist");

type RoomStatus = "lobby" | "countdown" | "active";

interface RoomPlayer {
  id: string;
  name: string;
  ready: boolean;
  isHost: boolean;
}

interface RoomState {
  roomCode: string;
  password: string;
  status: RoomStatus;
  hostPlayerId: string;
  mapTemplateId: string;
  density: MapDensity;
  layoutSize: MapLayoutSize;
  waitTimeSeconds: number;
  countdownStartedAt: number | null;
  players: RoomPlayer[];
}

const rooms = new Map<string, RoomState>();

function writeJson(
  response: ServerResponse,
  status: number,
  payload: unknown,
): void {
  response.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  response.end(JSON.stringify(payload));
}

function generateRoomCode(): string {
  let code = "";

  do {
    code = Math.random().toString(36).slice(2, 6).toUpperCase();
  } while (rooms.has(code));

  return code;
}

function getCountdownRemainingMs(room: RoomState): number | null {
  if (room.status !== "countdown" || room.countdownStartedAt === null) {
    return null;
  }

  return Math.max(0, countdownDurationMs - (Date.now() - room.countdownStartedAt));
}

function reconcileRoom(room: RoomState): void {
  const readyPlayers = room.players.filter((player) => player.ready).length;

  if (room.players.length < 2 || readyPlayers < 2) {
    room.status = "lobby";
    room.countdownStartedAt = null;
    return;
  }

  if (room.status === "active") {
    return;
  }

  if (room.countdownStartedAt === null) {
    room.status = "countdown";
    room.countdownStartedAt = Date.now();
    return;
  }

  if (Date.now() - room.countdownStartedAt >= countdownDurationMs) {
    room.status = "active";
  }
}

function serializeRoom(room: RoomState) {
  reconcileRoom(room);

  return {
    roomCode: room.roomCode,
    status: room.status,
    hostPlayerId: room.hostPlayerId,
    mapTemplateId: room.mapTemplateId,
    density: room.density,
    layoutSize: room.layoutSize,
    waitTimeSeconds: room.waitTimeSeconds,
    countdownRemainingMs: getCountdownRemainingMs(room),
    players: room.players,
  };
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

function getRoom(roomCode: string): RoomState | null {
  return rooms.get(roomCode.toUpperCase()) ?? null;
}

function mimeTypeFor(pathname: string): string {
  switch (extname(pathname)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".json":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

async function serveStaticAsset(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  if (request.method !== "GET" || !request.url) {
    return false;
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host ?? "localhost"}`);

  if (requestUrl.pathname.startsWith("/pvp/") || requestUrl.pathname === "/catalog" || requestUrl.pathname === "/health") {
    return false;
  }

  const normalizedPath = normalize(requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname);
  const assetPath = join(distRoot, normalizedPath);

  if (!assetPath.startsWith(distRoot)) {
    writeJson(response, 403, { error: "Forbidden" });
    return true;
  }

  try {
    const file = await readFile(assetPath);
    response.writeHead(200, { "content-type": mimeTypeFor(assetPath) });
    response.end(file);
    return true;
  } catch {
    try {
      const indexHtml = await readFile(join(distRoot, "index.html"));
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end(indexHtml);
      return true;
    } catch {
      writeJson(response, 404, { error: "Not found" });
      return true;
    }
  }
}

const server = createServer((request, response) => {
  if (request.method === "OPTIONS") {
    writeJson(response, 204, {});
    return;
  }

  if (request.url === "/health") {
    writeJson(response, 200, { ok: true, mode: "local-server" });
    return;
  }

  if (request.url === "/catalog") {
    writeJson(response, 200, buildGameCatalog());
    return;
  }

  void (async () => {
    try {
      if (await serveStaticAsset(request, response)) {
        return;
      }

      if (request.method === "POST" && request.url === "/pvp/rooms/create") {
        const body = await readJson<{
          playerId?: string;
          playerName?: string;
          password?: string;
          mapTemplateId?: string;
          density?: MapDensity;
          layoutSize?: MapLayoutSize;
          waitTimeSeconds?: number;
        }>(request);

        if (!body.playerId || !body.playerName || !body.mapTemplateId || !body.density || !body.layoutSize) {
          writeJson(response, 400, { error: "Missing required room fields." });
          return;
        }

        const roomCode = generateRoomCode();
        const room: RoomState = {
          roomCode,
          password: body.password ?? "",
          status: "lobby",
          hostPlayerId: body.playerId,
          mapTemplateId: body.mapTemplateId,
          density: body.density,
          layoutSize: body.layoutSize,
          waitTimeSeconds: Math.max(5, Math.min(120, Math.round(body.waitTimeSeconds ?? 20))),
          countdownStartedAt: null,
          players: [
            {
              id: body.playerId,
              name: body.playerName,
              ready: false,
              isHost: true,
            },
          ],
        };

        rooms.set(roomCode, room);
        writeJson(response, 201, { room: serializeRoom(room) });
        return;
      }

      if (request.method === "POST" && request.url === "/pvp/rooms/join") {
        const body = await readJson<{
          roomCode?: string;
          playerId?: string;
          playerName?: string;
          password?: string;
        }>(request);
        const room = body.roomCode ? getRoom(body.roomCode) : null;

        if (!room) {
          writeJson(response, 404, { error: "Room not found." });
          return;
        }

        if ((room.password || "") !== (body.password ?? "")) {
          writeJson(response, 403, { error: "Room password is incorrect." });
          return;
        }

        if (!body.playerId || !body.playerName) {
          writeJson(response, 400, { error: "Missing player identity." });
          return;
        }

        const existingPlayer = room.players.find((player) => player.id === body.playerId);
        if (!existingPlayer && room.players.length >= 2) {
          writeJson(response, 409, { error: "Room is full." });
          return;
        }

        if (existingPlayer) {
          existingPlayer.name = body.playerName;
        } else {
          room.players.push({
            id: body.playerId,
            name: body.playerName,
            ready: false,
            isHost: false,
          });
        }

        room.players.forEach((player) => {
          player.ready = false;
        });
        room.status = "lobby";
        room.countdownStartedAt = null;

        writeJson(response, 200, { room: serializeRoom(room) });
        return;
      }

      if (request.method === "POST" && request.url === "/pvp/rooms/leave") {
        const body = await readJson<{ roomCode?: string; playerId?: string }>(request);
        const room = body.roomCode ? getRoom(body.roomCode) : null;

        if (!room || !body.playerId) {
          writeJson(response, 200, { ok: true });
          return;
        }

        room.players = room.players.filter((player) => player.id !== body.playerId);

        if (room.players.length === 0) {
          rooms.delete(room.roomCode);
          writeJson(response, 200, { ok: true });
          return;
        }

        if (!room.players.some((player) => player.id === room.hostPlayerId)) {
          room.hostPlayerId = room.players[0].id;
        }

        room.players = room.players.map((player, index) => ({
          ...player,
          isHost: player.id === room.hostPlayerId,
          ready: false,
        }));
        room.status = "lobby";
        room.countdownStartedAt = null;

        writeJson(response, 200, { ok: true, room: serializeRoom(room) });
        return;
      }

      if (request.method === "POST" && request.url?.match(/^\/pvp\/rooms\/[^/]+\/ready$/)) {
        const roomCode = request.url.split("/")[3] ?? "";
        const room = getRoom(roomCode);
        const body = await readJson<{ playerId?: string; ready?: boolean }>(request);

        if (!room) {
          writeJson(response, 404, { error: "Room not found." });
          return;
        }

        const player = room.players.find((entry) => entry.id === body.playerId);

        if (!player) {
          writeJson(response, 404, { error: "Player not found in room." });
          return;
        }

        player.ready = Boolean(body.ready);
        reconcileRoom(room);
        writeJson(response, 200, { room: serializeRoom(room) });
        return;
      }

      if (request.method === "POST" && request.url?.match(/^\/pvp\/rooms\/[^/]+\/config$/)) {
        const roomCode = request.url.split("/")[3] ?? "";
        const room = getRoom(roomCode);
        const body = await readJson<{
          playerId?: string;
          mapTemplateId?: string;
          density?: MapDensity;
          layoutSize?: MapLayoutSize;
          waitTimeSeconds?: number;
        }>(request);

        if (!room) {
          writeJson(response, 404, { error: "Room not found." });
          return;
        }

        if (body.playerId !== room.hostPlayerId) {
          writeJson(response, 403, { error: "Only the host can change room rules." });
          return;
        }

        if (room.status === "active") {
          writeJson(response, 409, { error: "Room is already active." });
          return;
        }

        if (body.mapTemplateId) {
          room.mapTemplateId = body.mapTemplateId;
        }
        if (body.density) {
          room.density = body.density;
        }
        if (body.layoutSize) {
          room.layoutSize = body.layoutSize;
        }
        if (typeof body.waitTimeSeconds === "number") {
          room.waitTimeSeconds = Math.max(5, Math.min(120, Math.round(body.waitTimeSeconds)));
        }

        room.players.forEach((player) => {
          player.ready = false;
        });
        room.status = "lobby";
        room.countdownStartedAt = null;

        writeJson(response, 200, { room: serializeRoom(room) });
        return;
      }

      if (request.method === "GET" && request.url?.startsWith("/pvp/rooms/")) {
        const roomCode = request.url.split("/")[3] ?? "";
        const room = getRoom(roomCode);

        if (!room) {
          writeJson(response, 404, { error: "Room not found." });
          return;
        }

        writeJson(response, 200, { room: serializeRoom(room) });
        return;
      }

      writeJson(response, 404, { error: "Not found" });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown server error.";
      writeJson(response, 500, { error: message });
    }
  })();
});

server.listen(port, () => {
  console.log(`Local server running at http://localhost:${port}`);
});
