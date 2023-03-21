export const abilityCanBeActive = (module, states) => {
    return !module.cooldown() && (states.energy.val + module._definition.usageCost.energy) > 0;
};
