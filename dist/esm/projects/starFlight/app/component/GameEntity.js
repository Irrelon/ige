import { ige } from "@/engine/instance";
import { isClient, isServer } from "@/engine/clientServer";
import { IgeEntityBox2d } from "@/engine/components/physics/box2d/IgeEntityBox2d";
import { AbilityButton } from "./ui/AbilityButton";
import { acceptedAction } from "../data/acceptedAction";
export class GameEntity extends IgeEntityBox2d {
    classId = "GameEntity";
    _publicGameData;
    _privateGameData;
    _tickTime = 0;
    _health = 0;
    constructor(publicGameData = {
        state: {},
        module: {},
        ability: {},
        acceptsActionObj: {},
    }) {
        super();
        publicGameData.state = publicGameData.state || {};
        publicGameData.module = publicGameData.module || {};
        publicGameData.ability = publicGameData.ability || {};
        publicGameData.acceptsActionObj = publicGameData.acceptsActionObj || {};
        this._publicGameData = publicGameData;
        this._privateGameData = {
            module: {}
        };
        // Define the data sections that will be included in the stream
        this.streamSections(["transform", "props"]);
        // Apply the basic ship modules
        if (publicGameData && publicGameData.module) {
            for (const i in publicGameData.module) {
                if (publicGameData.module.hasOwnProperty(i)) {
                    const module = publicGameData.module[i];
                    if (module && !module._id) {
                        this.log("Attempted to add module to game entity but module has no _id field!", "error", module);
                    }
                    this.module(i, module);
                    if (isServer || (isClient && publicGameData.clientId === ige.network._id)) {
                        // Check if this module has an ability id
                        if ("abilityId" in module) {
                            this.ability(module.abilityId, module._id);
                        }
                    }
                }
            }
        }
    }
    streamCreateConstructorArgs() {
        return [this._publicGameData];
    }
    /**
     * Override the default IgeEntity class streamSectionData() method
     * so that we can check for custom sections and handle how we deal
     * with them.
     * @param {String} sectionId A string identifying the section to
     * handle data get / set for.
     * @param {String=} data If present, this is the data that has been sent
     * from the server to the client for this entity.
     * @return {*}
     */
    streamSectionData(sectionId, data) {
        let stateName;
        if (!sectionId) {
            debugger;
        }
        // Check if the section is one that we are handling
        if (sectionId.indexOf("state:") === 0) {
            stateName = sectionId.substr(6, sectionId.length - 6);
            if (data) {
                // This is a setter
                this._publicGameData.state[stateName].val = parseFloat(data);
            }
            else {
                // This is a getter
                return this._publicGameData.state[stateName].val;
            }
        }
        else {
            // The section was not one that we handle here, so pass this
            // to the super-class streamSectionData() method - it handles
            // the "transform" section by itthis
            return super.streamSectionData(sectionId, data);
        }
    }
    _setup() {
        if (!isServer) {
            return;
        }
        const thisAcceptedActionsArr = acceptedAction[this.classId];
        if (!thisAcceptedActionsArr || !thisAcceptedActionsArr.length) {
            return;
        }
        for (let i = 0; i < thisAcceptedActionsArr.length; i++) {
            this.acceptsAction(thisAcceptedActionsArr[i], true);
        }
    }
    /**
     * Gets / sets an ability id to module id mapping.
     * @param abilityId
     * @param moduleId
     * @returns {*}
     */
    ability(abilityId, moduleId) {
        if (abilityId !== undefined) {
            if (moduleId !== undefined) {
                this._publicGameData.ability[abilityId] = moduleId;
                if (isClient) {
                    const module = this.module(moduleId);
                    const abilityButton = new AbilityButton({
                        abilityId: abilityId,
                        label: abilityId + "\n" + module.abilityTitle,
                        module: module
                    })
                        .id(`action${abilityId}`)
                        .top(10)
                        .left(10)
                        .mount(ige.$("uiScene"));
                    ige.network.on("ability_" + abilityId + ".active", function (data) {
                        abilityButton.active(data);
                    });
                }
                return this;
            }
            return this._publicGameData.ability[abilityId];
        }
        return this._publicGameData.ability;
    }
    /* CEXCLUDE */
    /**
     * Gets / sets the module by slot number.
     * @param {Number} moduleId The slot number to get / set component for.
     * @param {Object=} moduleDefinition The component object to set to the slot.
     * Set to null to remove the existing component.
     * @returns {*}
     */
    module(moduleId, moduleDefinition) {
        const modulesObj = this._publicGameData.module;
        if (moduleId !== undefined) {
            if (moduleDefinition !== undefined) {
                if (moduleDefinition !== null) {
                    this.log("Adding module to game entity: " + moduleDefinition.name);
                    const moduleClass = ige.classStore[moduleDefinition.classId];
                    if (!moduleClass) {
                        throw new Error(`Cannot find class with id: ${moduleDefinition.classId}`);
                    }
                    modulesObj[moduleId] = moduleDefinition;
                    if (isServer) {
                        this._privateGameData.module[moduleId] = new moduleClass(moduleDefinition)
                            .attachedTo(this);
                    }
                    // Set up the state values from the module
                    for (const stateId in moduleDefinition.state) {
                        if (moduleDefinition.state.hasOwnProperty(stateId)) {
                            const state = this._publicGameData.state[stateId] = this._publicGameData.state[stateId] || {};
                            if (state.min === undefined || moduleDefinition.state[stateId].min < state.min) {
                                state.min = moduleDefinition.state[stateId].min;
                            }
                            if (state.max === undefined || moduleDefinition.state[stateId].max > state.max) {
                                state.max = moduleDefinition.state[stateId].max;
                            }
                            if (typeof moduleDefinition.state[stateId].initial === "number" && state.val !== undefined) {
                                // Add to existing state value
                                state.val += moduleDefinition.state[stateId].initial;
                            }
                            else {
                                // Set value as not number or existing value not defined
                                state.val = moduleDefinition.state[stateId].initial;
                            }
                            this.log("Registering state " + stateId + " is now " + state.val);
                            if (this.streamSections().indexOf("state:" + stateId) === -1) {
                                // Define the data sections that will be included in the stream
                                this.streamSectionsPush("state:" + stateId);
                            }
                        }
                    }
                }
                else {
                    delete modulesObj[moduleId];
                }
                return this;
            }
            return modulesObj[moduleId];
        }
        return modulesObj;
    }
    /* CEXCLUDE */
    /**
     * Gets the private module data by slot number.
     * @param {Number} moduleId The slot number to get / set component for.
     * Set to null to remove the existing component.
     * @returns {*}
     */
    privateModule(moduleId) {
        if (moduleId !== undefined) {
            return this._privateGameData.module[moduleId];
        }
    }
    /**
     * Checks if this entity can accept the given action or sets the
     * `accept` value for an action.
     * @param {String} action
     * @param {Boolean=} val Optional, if supplied sets the action's
     * accepted flag rather than getting it.
     * @returns {Boolean|*}
     */
    acceptsAction(action, val) {
        if (action !== undefined) {
            if (val !== undefined) {
                //this.log('Accepts action "' + action + '": ' + val);
                this._publicGameData.acceptsActionObj = this._publicGameData.acceptsActionObj || {};
                this._publicGameData.acceptsActionObj[action] = val;
                return this;
            }
            return this._publicGameData && this._publicGameData.acceptsActionObj && this._publicGameData.acceptsActionObj[action];
        }
        return this._publicGameData.acceptsActionObj;
    }
    update(ctx, tickDelta) {
        if (isServer) {
            this._resolveModules(tickDelta);
        }
        if (isClient) {
            // Update ability button UIs
        }
        // Call the super-class update() method
        super.update(ctx, tickDelta);
    }
    /**
     * Updates the modules for this entity based on the tick delta.
     * This does things like add to state values (e.g. energy + 1)
     * and also drains state values (e.g. fuel -5) etc.
     * @param {Number} tickDelta The number of milliseconds since
     * the last tick.
     * @private
     */
    _resolveModules(tickDelta) {
        if (isClient)
            return;
        const modulesObj = this._privateGameData.module;
        if (modulesObj) {
            for (const moduleIndex in modulesObj) {
                if (modulesObj.hasOwnProperty(moduleIndex)) {
                    const module = modulesObj[moduleIndex];
                    if (module.enabled() && module.active()) {
                        module.resolve(this._publicGameData.state, tickDelta);
                    }
                }
            }
        }
    }
    /**
     * Called by the client requesting ability usage. Activates an ability if
     * the ability is not already active or on cooldown.
     * @param {Object} data Arbitrary data that the ability usage might need
     * and is sent by the client.
     * @param {Function} callback The callback to send the result to.
     * @returns {*}
     * @private
     */
    _onAbilityUseRequest = (data, clientId, callback) => {
        if (isClient)
            return;
        // Grab the component in the ship's module
        const module = this.privateModule(this.ability(data.abilityId));
        if (!module) {
            //console.log('Player tried to activate empty ability: ' + data.abilityId);
            return callback("abilityEmpty");
        }
        if (module.active()) {
            // Module already active, ignore the request
            //console.log('Player tried to activate already activated ability: ' + data.abilityId);
            return callback("alreadyActive");
        }
        // Check if the action requires a target
        if (module._definition.requiresTarget) {
            // Check if we were sent a target and the target is valid
            if (!data.targetId) {
                // No target was provided
                //console.log('Player tried to activate ability that requires target: ' + data.abilityId);
                return callback("targetRequired");
            }
            const targetEntity = ige.$(data.targetId);
            if (!targetEntity.acceptsAction(module.action())) {
                //console.log('Player tried to activate ability against invalid target: ' + data.abilityId);
                return callback("invalidTarget");
            }
            // Check distance to target
            if (module._definition.range && Math.abs(this.distanceTo(targetEntity)) > module._definition.range) {
                return callback("targetOutOfRange", Math.abs(this.distanceTo(targetEntity)));
            }
            // Set the target for the module
            //console.log('Accepted target for ability: ' + data.abilityId);
            module.target(targetEntity);
        }
        // Check if the ability can be activated
        if (!module.canBeActive(this._publicGameData.state)) {
            return callback("canBeActiveDenied");
        }
        // Activate the module
        //console.log('Activating ability: ' + data.abilityId);
        module.active(true, this._publicGameData.state);
        // Tell the client this ability use was accepted
        callback();
    };
    /**
     * Sends a request to the server to use an ability.
     * @param {String} abilityId The ID of the ability to use.
     * @param {String=} targetId Optional. The ID of the entity
     * that is targeted by the ability (if any).
     */
    useAbility(abilityId, targetId) {
        if (isServer) {
            return;
        }
        if (!this.target || !this.target._targetEntity) {
            return;
        }
        // Ask the server to start mining this asteroid
        ige.network.send("useAbility", {
            targetId: this.target._targetEntity.id(),
            abilityId: abilityId
        }, (err, data) => {
            if (err) {
                // Display error to UI
                switch (err) {
                    case "noAbilityId":
                        console.warn("useAbility ERROR CODE: noAbilityId");
                        break;
                    case "noPlayer":
                        console.warn("useAbility ERROR CODE: noPlayer");
                        break;
                    case "abilityEmpty":
                        console.warn("useAbility ERROR CODE: abilityEmpty");
                        break;
                    case "invalidTarget":
                        console.warn("useAbility ERROR CODE: invalidTarget");
                        break;
                    case "targetOutOfRange":
                        console.warn("useAbility ERROR CODE: targetOutOfRange: " + data);
                        break;
                    case "targetRequired":
                        console.warn("useAbility ERROR CODE: targetRequired");
                        break;
                    case "alreadyActive":
                        console.warn("useAbility ERROR CODE: alreadyActive");
                        // TODO: Flash the ability icon to let the user know it is already active
                        break;
                }
                ige.audio.play("actionDenied");
                return;
            }
            // Access the AbilityButton instance for this ability
            // and tell it to become active
            ige.$(`action${abilityId}`).active(true);
            ige.audio.play("actionAllowed");
        });
    }
    applyDamage(val) {
        return this;
    }
}
