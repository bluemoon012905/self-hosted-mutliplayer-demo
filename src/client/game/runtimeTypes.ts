import type {
  AttackSlot,
  FacingDirection,
  GameCatalog,
  ItemDefinition,
  MapDensity,
  MapDefinition,
  MapTemplateDefinition,
  PlayerDefinition,
} from "../../shared/domain/gameTypes";

export interface PlayerRuntime {
  definition: PlayerDefinition;
  mapId: string;
  resources: {
    health: number;
    stamina: number;
    mana: number;
  };
  position: {
    x: number;
    y: number;
  };
  radius: number;
  facing: FacingDirection;
  inventoryOpen: boolean;
}

export interface AttackEvent {
  id: string;
  slot: AttackSlot;
  label: string;
  createdAt: number;
}

export interface GameSession {
  catalog: GameCatalog;
  selectedMapTemplateId: string;
  selectedDensity: MapDensity;
  availableDensities: MapDensity[];
  map: MapDefinition;
  player: PlayerRuntime;
  input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  inventoryItems: ItemDefinition[];
  attackLog: AttackEvent[];
}

export interface MapSelectorState {
  selectedTemplate: MapTemplateDefinition;
  selectedDensity: MapDensity;
}
