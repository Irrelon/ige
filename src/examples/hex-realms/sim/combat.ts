import { Feature, Relief } from "../terrain";
import { fortifyBonus } from "./orders";
import { cityDefence, damageFactor } from "./effects";
import { canEnter } from "./movement";
import { fail, ok } from "./result";
import { UNIT_TYPES, VETERAN_KILLS } from "./rules";
import type { Sim } from "./sim";
import type { CommandResult, UnitState } from "./types";

/**
 * Deterministic, Polytopia-style combat. Attack and defence are scaled by
 * each unit's health; the defender gets a terrain or city bonus; a melee
 * defender that survives strikes back. The same fight always ends the same
 * way, so the game can preview it before you commit.
 */

export interface CombatPreview {
	damage: number;
	retaliation: number;
	kills: boolean;
	dies: boolean;
}

export function attackValue (sim: Sim, unit: UnitState): number {
	return sim.map.isWater(unit.tile) ? Math.min(1, UNIT_TYPES[unit.type].attack) : UNIT_TYPES[unit.type].attack;
}

export function defenceValue (sim: Sim, unit: UnitState): number {
	return sim.map.isWater(unit.tile) ? 1 : UNIT_TYPES[unit.type].defence;
}

/** Defence multiplier from where the unit stands. */
export function defenceBonus (sim: Sim, unit: UnitState): number {
	const tile = unit.tile;
	if (sim.map.isWater(tile)) return 1;
	const dug = fortifyBonus(sim, unit);
	const city = sim.cityOn(tile);
	if (city && city.owner === unit.owner) return cityDefence(sim, unit.owner, city.walls) * dug;
	if (sim.map.relief[tile] === Relief.Hills || sim.map.feature[tile] !== Feature.None) return 1.5 * dug;
	return dug;
}

export function preview (sim: Sim, attacker: UnitState, defender: UnitState): CombatPreview {
	const atk = attackValue(sim, attacker);
	const def = defenceValue(sim, defender);
	const attackForce = atk * (attacker.hp / attacker.maxHp);
	const defenceForce = def * (defender.hp / defender.maxHp) * defenceBonus(sim, defender);
	const total = attackForce + defenceForce || 1;
	const damage = Math.round((attackForce / total) * atk * 4.5 * damageFactor(sim, attacker.owner));
	const kills = damage >= defender.hp;
	const distance = sim.distance(attacker.tile, defender.tile);
	const strikesBack = !kills && distance <= UNIT_TYPES[defender.type].range && def > 0;
	const retaliation = strikesBack ? Math.round((defenceForce / total) * def * 4.5 * damageFactor(sim, defender.owner)) : 0;
	return { damage, retaliation, kills, dies: retaliation >= attacker.hp };
}

/** Why the unit can't attack that tile, or null if it can. */
export function attackProblem (sim: Sim, attacker: UnitState, target: number): string | null {
	if (attacker.attacked) return "Already attacked this turn";
	if (attackValue(sim, attacker) <= 0) return "This unit can't attack";
	const defender = sim.unitOn(target);
	if (!defender || defender.owner === attacker.owner) return "No enemy there";
	if (!sim.atWar(attacker.owner, defender.owner)) return "You are not at war with them";
	if (!sim.canSee(attacker.owner, target)) return "You can't see that tile";
	const distance = sim.distance(attacker.tile, target);
	if (distance > UNIT_TYPES[attacker.type].range) return "Out of range";
	if (distance > 1 && sim.fog.los && !sim.fog.hasLineOfSight(attacker.tile, target, distance)) return "No line of sight";
	return null;
}

/** Enemy-held tiles this unit could attack now. */
export function attackTargets (sim: Sim, attacker: UnitState): number[] {
	const range = UNIT_TYPES[attacker.type].range;
	return sim.tilesWithin(attacker.tile, range).filter((t) => attackProblem(sim, attacker, t) === null);
}

export function attackCommand (sim: Sim, player: number, unitId: number, target: number): CommandResult {
	const attacker = sim.unit(unitId);
	if (!attacker || attacker.owner !== player) return fail("Not your unit");
	const problem = attackProblem(sim, attacker, target);
	if (problem) return fail(problem);
	const defender = sim.unitOn(target) as UnitState;
	const result = preview(sim, attacker, defender);
	const from = attacker.tile;
	const ranged = sim.distance(from, target) > 1;

	defender.hp -= result.damage;
	attacker.hp -= result.retaliation;
	attacker.attacked = true;
	attacker.moves = 0;
	attacker.acted = true;

	sim.emit({
		type: "attack", attacker: attacker.id, defender: defender.id, from, to: target,
		damage: result.damage, retaliation: result.retaliation, killed: defender.hp <= 0, ranged
	});

	if (defender.hp <= 0) {
		sim.player(defender.owner).stats.lost++;
		sim.player(attacker.owner).stats.kills++;
		sim.removeUnit(defender, "killed");
		attacker.kills++;
		if (!attacker.veteran && attacker.kills >= VETERAN_KILLS) {
			attacker.veteran = true;
			attacker.maxHp += 5;
			attacker.hp = attacker.maxHp;
		}
		// A melee attacker advances into the tile it cleared
		if (!ranged && attacker.hp > 0 && canEnter(sim, attacker, target) && sim.map.isWater(target) === sim.map.isWater(from)) {
			sim.relocateUnit(attacker, target);
			sim.emit({ type: "unitMoved", unit: attacker.id, path: [from, target] });
		}
	} else {
		sim.emit({ type: "unitChanged", unit: defender.id });
	}

	if (attacker.hp <= 0) {
		sim.player(attacker.owner).stats.lost++;
		sim.player(defender.owner).stats.kills++;
		sim.removeUnit(attacker, "killed");
	} else {
		sim.emit({ type: "unitChanged", unit: attacker.id });
	}
	return ok();
}
