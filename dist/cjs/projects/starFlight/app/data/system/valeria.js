"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.valeria = void 0;
exports.valeria = {
    "_id": "valeria",
    "name": "Valeria",
    "station": [
        {
            "_id": "valeria1",
            "name": "Valeria Shipyard",
            "classId": "SpaceStation",
            "public": {
                "texture": "spaceStation1"
            },
            "position": [
                -650,
                -550,
                0
            ],
            "market": {
                "jobs": [],
                "resources": [{
                        "_id": "acanthite",
                        "name": "Acanthite Ore",
                        "type": "Ore"
                    }]
            },
            "interior": [{
                    "_id": "groundFloor",
                    "name": "Ground Floor",
                    "width": 10,
                    "height": 5,
                    "floorTiles": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
                    "wallTiles": [],
                    "features": [{
                            "_id": "atm1",
                            "name": "ATM",
                            "classId": "FurnitureAtm",
                            "position": [
                                -650,
                                -550,
                                0
                            ]
                        }]
                }]
        }
    ],
    "jumpGate": [
        {
            "_id": "valeriaToOrhaan",
            "name": "Orhaan Jumpgate",
            "classId": "JumpGate",
            "visible": true,
            "position": [
                -1050,
                1050,
                0
            ],
            "public": {
                "texture": "jumpGate1"
            },
            "destination": {
                "_id": "orhaan",
                "name": "Orhaan"
            }
        }
    ],
    "asteroidBelt": [{
            "_id": "asteroidBelt1",
            "position": [
                800,
                0,
                0
            ]
        }]
};
