import { ige } from "../../../../engine/instance.js";
import { isServer } from "../../../../engine/clientServer.js";
import { Module_Generic } from "./Module_Generic.js";
const abilities = [
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
                    "action": "create",
                    "classId": "LaserEffect",
                    "mount": "frontScene",
                    "data": {}
                }
            ]
        }
    }
];
export class Module_Ability extends Module_Generic {
    constructor(definition) {
        super(definition);
        this.classId = "Module_Ability";
        this._cooldown = false;
        this._cooldownStartTime = 0;
        this._cooldown = false;
    }
    active(val, states) {
        if (val !== undefined && states !== undefined) {
            if (val && !this._active) {
                this._activeStartTime = ige.engine.currentTime();
                this._onActive(states);
            }
            else if (!val && this._active) {
                this._onInactive(states);
            }
            this._active = val;
            return this;
        }
        return this._active;
    }
    /**
     * Determines if the active flag can transition from false
     * to true. This is useful for checking pre-flight conditions
     * for allowing an ability to activate etc.
     * @param {Object} states The current states that we read values
     * from to determine if the module can activate.
     * @returns {boolean} If true, allows the active flag to become
     * true. If false, denies it.
     */
    canBeActive(states) {
        return !this.cooldown() && (states.energy.val + this._definition.usageCost.energy) > 0;
    }
    /**
     * Determines if the active flag can transition from true
     * to false. This is useful for checking post-flight conditions
     * for allowing an ability to deactivate etc.
     * @returns {boolean} If true, allows the active flag to become
     * false. If false, denies it.
     */
    canBeInactive(states) {
        // Check if the module definition has a custom method
        if (this._definition.canBeInactive) {
            return (require(path.resolve("./app/data", this._definition.canBeInactive)))(this, states, ige);
        }
        return true;
    }
    /**
     * Called when an ability's active flag has been set to true
     * when it was previously set to false.
     * @private
     */
    _onActive(states) {
        // Abilities simply debit the usage of usageCosts they need
        // up front and then apply their output over time based
        // on their activeDuration setting.
        let usageCosts, stateName;
        usageCosts = this._definition.usageCost;
        // Debit usage costs from input in definition
        for (stateName in usageCosts) {
            if (usageCosts.hasOwnProperty(stateName) && states.hasOwnProperty(stateName)) {
                states[stateName].val += usageCosts[stateName];
            }
        }
        // Activate effects
        this.processEffects("onActive");
        this.processAudio("onActive");
    }
    /**
     * Called when an ability's active flag has been set to false
     * when it was previously set to true.
     * @private
     */
    _onInactive(states) {
        // Deactivate effects
        this.processEffects("onInactive");
        this.processAudio("onInactive");
        // Enable cooldown timer
        this.cooldown(true);
    }
    complete() {
        this.processEffects("onComplete");
        this.processAudio("onComplete");
        Module_Generic.prototype.complete.call(this);
    }
    cooldown(val) {
        if (val !== undefined) {
            if (val && !this._cooldown) {
                if (!this._definition.cooldownDuration) {
                    // Do nothing, there is no cooldown duration so never
                    // enable cooldown period
                    return this;
                }
                this._cooldownStartTime = ige.engine.currentTime();
            }
            this._cooldown = val;
            return this;
        }
        // Check if we should be cancelling cooldown
        if (this._cooldown) {
            if (ige.engine.currentTime() - this._cooldownStartTime >= this._definition.cooldownDuration) {
                this._cooldown = false;
            }
        }
        return this._cooldown;
    }
    /**
     * Takes the states in the module's definition for input and output
     * and based on the tickDelta, calculates the amount of input and
     * amount of output the module should provide for this tick.
     * @param {Object} states The current states and their values.
     * @param {Number} tickDelta The tick delta for this tick.
     */
    resolve(states, tickDelta) {
        if (this.active()) {
            // Check if the module has a max range to target
            if (this._definition.requiresTarget && this._definition.range) {
                // Module has a max range, check if we are inside that range
                if (Math.abs(this._attachedTo.distanceTo(this._target)) > this._definition.range) {
                    // Deactivate the module
                    this.active(false);
                    if (isServer) {
                        // Send network message to client telling them their ability when
                        // out of range
                        ige.network.send("ability_" + this._definition.abilityId + ".active", false, this._attachedTo.clientId());
                    }
                }
            }
        }
        Module_Generic.prototype.resolve.call(this, states, tickDelta);
    }
}
