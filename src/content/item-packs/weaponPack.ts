import type { ItemDefinitionInput } from "../../shared/domain/rawDefinitions";
import weaponsJson from "./weapons.json";

interface WeaponPackTag {
  id: string;
  name: string;
}

interface WeaponPackNode {
  id: string;
  name: string;
  tagIds: string[];
  stats: {
    quantitative: Record<string, number>;
    qualitative: Record<string, string>;
  };
  description: string;
}

interface WeaponPackEdge {
  from: string;
  to: string;
  type: string;
}

interface WeaponPackData {
  tags: WeaponPackTag[];
  nodes: WeaponPackNode[];
  edges: WeaponPackEdge[];
}

const weaponPack = weaponsJson as WeaponPackData;

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildWeaponDescription(node: WeaponPackNode): string {
  const damageType = node.stats.qualitative["damage type"];
  const damage = node.stats.quantitative.Damage;
  const period = node.stats.quantitative["attack period"];
  const projectileSpeed = node.stats.quantitative["projectile speed"];
  const segments = [
    `${toTitleCase(node.name)} weapon`,
    typeof damage === "number" ? `${damage} damage` : undefined,
    typeof period === "number" ? `${period}s attack period` : undefined,
    damageType ? `${damageType} damage` : undefined,
    typeof projectileSpeed === "number"
      ? `${projectileSpeed} projectile speed`
      : undefined,
  ].filter((segment): segment is string => Boolean(segment));

  return segments.join(" · ");
}

export function buildWeaponPackItems(): ItemDefinitionInput[] {
  const itemTagId = weaponPack.tags.find((tag) => tag.name === "item")?.id;
  const rootNode = weaponPack.nodes.find((node) => node.name === "weapons");

  if (!itemTagId || !rootNode) {
    return [];
  }

  const weaponNodeIds = new Set(
    weaponPack.edges
      .filter((edge) => edge.from === rootNode.id && edge.type === "next")
      .map((edge) => edge.to),
  );

  return weaponPack.nodes
    .filter(
      (node) =>
        weaponNodeIds.has(node.id) &&
        node.tagIds.includes(itemTagId) &&
        node.name !== "weapons",
    )
    .map((node) => {
      const id = node.name.toLowerCase().replace(/\s+/g, "-");

      return {
        id,
        name: toTitleCase(node.name),
        description: node.description || buildWeaponDescription(node),
        kind: "weapon",
        rarity: "common",
        spriteKey: id,
        effect: {
          type: "weapon-attack",
          damage: node.stats.quantitative.Damage,
          attackPeriodSeconds: node.stats.quantitative["attack period"],
          staminaCost: node.stats.quantitative["stamina cost"],
          damageType:
            node.stats.qualitative["damage type"] === "proj"
              ? "projectile"
              : node.stats.qualitative["damage type"],
          projectileSpeed: node.stats.quantitative["projectile speed"],
        },
      };
    });
}
