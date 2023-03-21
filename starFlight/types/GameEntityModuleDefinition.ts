export type GameEntityModuleUsageCost = Record<string, number>;
export type GameEntityModuleBaseCost = Record<string, number>;
export type GameEntityModuleInputOutput = Record<string, number | Record<string, number>>;

export interface GameEntityModuleStateItem {
	initial: number;
	min: number;
	max: number;
}

export type GameEntityModuleStates = Record<string, GameEntityModuleStateItem>;

export interface GameEntityModuleEffectAction {
	action: "create" | "destroy",
	classId: string,
	mount: string,
	data: Record<string, any>;
}

export interface GameEntityModuleEffectAudio {
	"action": "play" | "stop",
	"audioId": string,
	"for"?: "all" | "owner",
	"loop"?: boolean,
	"position"?: "ambient" | "target",
	"mount"?: string
}

export interface GameEntityModuleAudio {
	onActive?: GameEntityModuleEffectAudio[];
	onInactive?: GameEntityModuleEffectAudio[];
	onComplete?: GameEntityModuleEffectAudio[];
}

export interface GameEntityModuleEffects {
	onActive?: GameEntityModuleEffectAction[];
	onInactive?: GameEntityModuleEffectAction[];
	onComplete?: GameEntityModuleEffectAction[];
}

export interface GameEntityModuleDefinition {
	_id: string,
	type: string,
	slotType: string[],
	slotSize: 1,
	classId: string,
	name: string,
	damageIndex?: number;
	input: GameEntityModuleInputOutput,
	output: GameEntityModuleInputOutput,
	state: GameEntityModuleStates,
	attachTo: string[],
	baseCost: GameEntityModuleBaseCost,
	enabled: boolean,
	active: boolean,
	effects?: GameEntityModuleEffects;
	audio?: GameEntityModuleAudio;
}

const modules: GameEntityModuleDefinition[] = [
	{
		"_id": "521a36aa3559382638c4254b",
		"type": "module",
		"slotType": [
			"engine"
		],
		"slotSize": 1,
		"classId": "Module_Generic",
		"name": "Old Reliable Inc. Mk 1",
		"input": {
			"fuel": -5
		},
		"output": {
			"energy": 3
		},
		"state": {
			"maxSpeed": {
				"initial": 10,
				"min": 0,
				"max": 100
			},
			"thrustPower": {
				"initial": 1.5,
				"min": 0,
				"max": 100
			},
			"reversePower": {
				"initial": 1.5,
				"min": 0,
				"max": 100
			},
			"linearDamping": {
				"initial": 1,
				"max": 3,
				"min": 1
			}
		},
		"attachTo": [
			"ship"
		],
		"baseCost": {
			"credits": 1000
		},
		"enabled": true,
		"active": true
	},
	{
		"_id": "521a36aa3559382638c4254c",
		"type": "module",
		"slotType": [
			"fuel"
		],
		"slotSize": 1,
		"classId": "Module_Generic",
		"name": "Big Tank Fuel Hold",
		"input": {},
		"output": {},
		"state": {
			"fuel": {
				"initial": 2000,
				"min": 0,
				"max": 2000
			}
		},
		"attachTo": [
			"ship"
		],
		"baseCost": {
			"credits": 1000
		},
		"enabled": true,
		"active": true
	},
	{
		"_id": "521a36aa3559382638c4254d",
		"type": "module",
		"slotType": [
			"shield"
		],
		"slotSize": 1,
		"classId": "Module_Generic",
		"name": "Lazy Boy Shield Generator",
		"damageIndex": 0,
		"input": {
			"energy": -5
		},
		"output": {
			"shield": 3
		},
		"state": {
			"shield": {
				"initial": 50,
				"min": 0,
				"max": 100
			}
		},
		"attachTo": [
			"ship"
		],
		"baseCost": {
			"credits": 1000
		},
		"enabled": true,
		"active": true
	},
	{
		"_id": "521a36aa3559382638c4254e",
		"type": "module",
		"slotType": [
			"armour"
		],
		"slotSize": 1,
		"classId": "Module_Generic",
		"name": "Lazy Boy Armour",
		"damageIndex": 1,
		"input": {},
		"output": {},
		"state": {
			"integrity": {
				"initial": 100,
				"min": 0,
				"max": 100
			}
		},
		"attachTo": [
			"ship"
		],
		"baseCost": {
			"credits": 1000
		},
		"enabled": true,
		"active": true
	},
	{
		"_id": "521a36aa3559382638c4254f",
		"type": "module",
		"slotType": [
			"capacitor"
		],
		"slotSize": 1,
		"classId": "Module_Generic",
		"name": "Energy Capacitor Mk1",
		"input": {},
		"output": {},
		"state": {
			"energy": {
				"initial": 100,
				"min": 0,
				"max": 100
			}
		},
		"attachTo": [
			"ship"
		],
		"baseCost": {
			"credits": 1000
		},
		"enabled": true,
		"active": true
	},
	{
		"_id": "521a36aa3559382638c4254h",
		"type": "module",
		"slotType": [
			"general"
		],
		"slotSize": 1,
		"classId": "Module_Generic",
		"name": "Cargo Hold 10",
		"input": {},
		"output": {},
		"state": {
			"inventorySpace": {
				"initial": 2,
				"min": 2,
				"max": 2
			},
			"inventoryCount": {
				"initial": 0,
				"min": 0,
				"max": 2
			}
		},
		"attachTo": [
			"ship"
		],
		"baseCost": {
			"credits": 1000
		},
		"enabled": true,
		"active": true
	}
];
