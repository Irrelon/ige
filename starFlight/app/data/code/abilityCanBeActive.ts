module.exports = function (module, states, $ige) {
	return !module.cooldown() && (states.energy.val + module._definition.usageCost.energy) > 0;
};