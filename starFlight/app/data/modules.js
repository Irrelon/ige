export const modules = [
    {
        "_id": "521a36aa3559382638c4254a",
        "type": "ability",
        "slotType": [
            "weapon",
            "mining"
        ],
        "slotSize": 1,
        "action": "mine",
        "classId": "Module_MiningLaser",
        "name": "Mining Laser 1",
        "abilityTitle": "MINE\nTARGET",
        "canBeActive": "./code/abilityCanBeActive",
        "usageCost": {
            "energy": -40
        },
        "input": {},
        "output": {},
        "state": {},
        "range": 200,
        "attachTo": [
            "ship"
        ],
        "baseCost": {
            "credits": 1000
        },
        "requiresTarget": true,
        "enabled": true,
        "active": false,
        "activeDuration": 8000,
        "cooldownDuration": 2000,
        "effects": {
            "onActive": [
                {
                    "action": "create",
                    "classId": "MiningLaserEffect",
                    "mount": "frontScene",
                    "data": {}
                }
            ],
            "onInactive": [
                {
                    "action": "destroy",
                    "classId": "MiningLaserEffect",
                    "mount": "frontScene",
                    "data": {}
                }
            ]
        },
        "audio": {
            "onActive": [
                {
                    "action": "play",
                    "audioId": "miningLaser",
                    "for": "all",
                    "loop": true,
                    "position": "target",
                    "mount": "backScene"
                }
            ],
            "onInactive": [
                {
                    "action": "stop",
                    "audioId": "miningLaser"
                }
            ],
            "onComplete": [
                {
                    "action": "stop",
                    "audioId": "miningLaser"
                },
                {
                    "action": "play",
                    "audioId": "actionComplete",
                    "for": "owner",
                    "position": "ambient"
                }
            ]
        }
    },
    {
        "_id": "521a36aa3559382638c4254g",
        "type": "ability",
        "slotType": [
            "weapon"
        ],
        "slotSize": 1,
        "action": "damage",
        "classId": "Module_Ability",
        "name": "Directed Laser Cannon 1",
        "abilityTitle": "LASER\nCANNON",
        "canBeActive": "./code/abilityCanBeActive",
        "usageCost": {
            "energy": -10
        },
        "input": {},
        "output": {
            "$target": {
                "integrity": -1
            }
        },
        "state": {},
        "range": 100,
        "attachTo": [
            "ship"
        ],
        "baseCost": {
            "credits": 1000
        },
        "requiresTarget": true,
        "enabled": true,
        "active": false,
        "activeDuration": 8000,
        "cooldownDuration": 2000,
        "effects": {
            "onActive": [
                {
                    "classId": "LaserEffect",
                    "mount": "frontScene",
                    "data": {}
                }
            ]
        }
    },
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
                "initial": 2
            },
            "inventoryCount": {
                "initial": 0
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
