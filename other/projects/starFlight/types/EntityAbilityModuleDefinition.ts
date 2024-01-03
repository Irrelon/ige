import type {
	EntityModuleAudio,
	EntityModuleBaseCost,
	EntityModuleDefinition,
	EntityModuleEffects,
	EntityModuleInputOutput,
	EntityModuleStates,
	EntityModuleUsageCost
} from "./EntityModuleDefinition";

export interface EntityAbilityModuleDefinition extends EntityModuleDefinition {
	_id: string;
	type: string;
	slotType: string[];
	slotSize: 1;
	action: string;
	classId: string;
	name: string;
	abilityTitle: string;
	damageIndex?: number;
	usageCost: EntityModuleUsageCost;
	input: EntityModuleInputOutput;
	output: EntityModuleInputOutput;
	state: EntityModuleStates;
	range?: number;
	attachTo: string[];
	baseCost: EntityModuleBaseCost;
	requiresTarget?: boolean;
	enabled: boolean;
	active: boolean;
	activeDuration: number;
	cooldown: boolean;
	cooldownDuration: number;
	effects?: EntityModuleEffects;
	audio?: EntityModuleAudio;
	_activeStartTime?: number;
	_cooldownStartTime?: number;
}

const abilities: EntityAbilityModuleDefinition[] = [
	{
		_id: "521a36aa3559382638c4254a",
		type: "ability",
		slotType: ["weapon", "mining"],
		slotSize: 1,
		action: "mine",
		classId: "Module_MiningLaser",
		name: "Mining Laser 1",
		abilityTitle: "MINE\nTARGET",
		usageCost: {
			energy: -40
		},
		input: {},
		output: {},
		state: {},
		range: 200,
		attachTo: ["ship"],
		baseCost: {
			credits: 1000
		},
		requiresTarget: true,
		enabled: true,
		active: false,
		activeDuration: 8000,
		cooldownDuration: 2000,
		effects: {
			onActive: [
				{
					action: "create",
					classId: "MiningLaserEffect",
					mount: "frontScene",
					data: {}
				}
			],
			onInactive: [
				{
					action: "destroy",
					classId: "MiningLaserEffect",
					mount: "frontScene",
					data: {}
				}
			]
		},
		audio: {
			onActive: [
				{
					action: "play",
					audioId: "miningLaser",
					for: "all",
					loop: true,
					position: "target",
					mount: "backScene"
				}
			],
			onInactive: [
				{
					action: "stop",
					audioId: "miningLaser"
				}
			],
			onComplete: [
				{
					action: "stop",
					audioId: "miningLaser"
				},
				{
					action: "play",
					audioId: "actionComplete",
					for: "owner",
					position: "ambient"
				}
			]
		}
	},
	{
		_id: "521a36aa3559382638c4254g",
		type: "ability",
		slotType: ["weapon"],
		slotSize: 1,
		action: "damage",
		classId: "Module_Ability",
		name: "Directed Laser Cannon 1",
		abilityTitle: "LASER\nCANNON",
		usageCost: {
			energy: -10
		},
		input: {},
		output: {
			$target: {
				integrity: -1
			}
		},
		state: {},
		range: 100,
		attachTo: ["ship"],
		baseCost: {
			credits: 1000
		},
		requiresTarget: true,
		enabled: true,
		active: false,
		activeDuration: 8000,
		cooldownDuration: 2000,
		effects: {
			onActive: [
				{
					action: "create",
					classId: "LaserEffect",
					mount: "frontScene",
					data: {}
				}
			]
		}
	}
];
