import type { MapDensity, MapLayoutSize } from "../../shared/domain/gameTypes";
import type { PvpRoomSnapshot } from "../game/runtimeTypes";

interface RoomResponse {
  room: PvpRoomSnapshot;
}

interface ErrorResponse {
  error?: string;
}

async function requestJson<TResponse>(
  url: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(url, init);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const payload = (await response.json()) as ErrorResponse;
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // Ignore malformed JSON error payloads and keep the status-based message.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return {} as TResponse;
  }

  return (await response.json()) as TResponse;
}

export async function createPvpRoom(options: {
  serverUrl: string;
  playerId: string;
  playerName: string;
  password: string;
  mapTemplateId: string;
  density: MapDensity;
  layoutSize: MapLayoutSize;
  waitTimeSeconds: number;
}): Promise<PvpRoomSnapshot> {
  const payload = await requestJson<RoomResponse>(`${options.serverUrl}/pvp/rooms/create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      playerId: options.playerId,
      playerName: options.playerName,
      password: options.password,
      mapTemplateId: options.mapTemplateId,
      density: options.density,
      layoutSize: options.layoutSize,
      waitTimeSeconds: options.waitTimeSeconds,
    }),
  });

  return payload.room;
}

export async function joinPvpRoom(options: {
  serverUrl: string;
  roomCode: string;
  playerId: string;
  playerName: string;
  password: string;
}): Promise<PvpRoomSnapshot> {
  const payload = await requestJson<RoomResponse>(`${options.serverUrl}/pvp/rooms/join`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      roomCode: options.roomCode,
      playerId: options.playerId,
      playerName: options.playerName,
      password: options.password,
    }),
  });

  return payload.room;
}

export async function leavePvpRoom(options: {
  serverUrl: string;
  roomCode: string;
  playerId: string;
}): Promise<void> {
  await requestJson(`${options.serverUrl}/pvp/rooms/leave`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      roomCode: options.roomCode,
      playerId: options.playerId,
    }),
  });
}

export async function fetchPvpRoom(options: {
  serverUrl: string;
  roomCode: string;
}): Promise<PvpRoomSnapshot> {
  const payload = await requestJson<RoomResponse>(
    `${options.serverUrl}/pvp/rooms/${encodeURIComponent(options.roomCode)}`,
  );

  return payload.room;
}

export async function setPvpReady(options: {
  serverUrl: string;
  roomCode: string;
  playerId: string;
  ready: boolean;
}): Promise<PvpRoomSnapshot> {
  const payload = await requestJson<RoomResponse>(
    `${options.serverUrl}/pvp/rooms/${encodeURIComponent(options.roomCode)}/ready`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: options.playerId,
        ready: options.ready,
      }),
    },
  );

  return payload.room;
}

export async function updatePvpRoomConfig(options: {
  serverUrl: string;
  roomCode: string;
  playerId: string;
  mapTemplateId: string;
  density: MapDensity;
  layoutSize: MapLayoutSize;
  waitTimeSeconds: number;
}): Promise<PvpRoomSnapshot> {
  const payload = await requestJson<RoomResponse>(
    `${options.serverUrl}/pvp/rooms/${encodeURIComponent(options.roomCode)}/config`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        playerId: options.playerId,
        mapTemplateId: options.mapTemplateId,
        density: options.density,
        layoutSize: options.layoutSize,
        waitTimeSeconds: options.waitTimeSeconds,
      }),
    },
  );

  return payload.room;
}
