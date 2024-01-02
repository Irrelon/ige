"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateModifierRatio = exports.roundNumber = void 0;
function roundNumber(number, digits) {
	return Number(number.toFixed(digits));
}
exports.roundNumber = roundNumber;
function calculateModifierRatio(states, modifierPerSecond, min, max, tickDelta, stateId) {
	// Deal with small numbers by doing some maths
	const calcMultiplier = 1;
	modifierPerSecond *= calcMultiplier;
	min *= calcMultiplier;
	max *= calcMultiplier;
	// Calculate maximum modifier value for the tickDelta
	const proposedModifierValue = (modifierPerSecond / 1000) * tickDelta;
	let newModifierValue = proposedModifierValue;
	// Calculate the potential new state value
	const proposedNewStateValue = states[stateId].val + proposedModifierValue;
	// Make sure the value is within the state's bounds
	if (proposedNewStateValue < min) {
		const proposalDifference = min - proposedNewStateValue;
		newModifierValue = proposedModifierValue + proposalDifference;
	} else if (proposedNewStateValue > max) {
		const proposalDifference = proposedNewStateValue - max;
		newModifierValue = proposedModifierValue - proposalDifference;
	}
	const tempRatio = newModifierValue / proposedModifierValue;
	return {
		proposedModifierValue: proposedModifierValue / calcMultiplier,
		ratio: tempRatio
	};
}
exports.calculateModifierRatio = calculateModifierRatio;
// appCore.module("options", function ($ige) {
// 	let options,
// 		optionsString,
// 		i;
//
// 	optionsString = localStorage.getItem("starflight_options");
// 	options = optionsString ? JSON.parse(optionsString) : {};
//
// 	ige.engine.log("User options loaded", "log");
//
// 	for (i in options) {
// 		if (options.hasOwnProperty(i)) {
// 			ige.engine.log("User option " + i + ": " + options[i]);
// 		}
// 	}
//
// 	return {
// 		get: function (optionName, defaultValue) {
// 			if (options[optionName] === undefined) {
// 				if (defaultValue !== undefined) {
// 					this.set(optionName, defaultValue);
// 				}
// 			}
//
// 			return options[optionName];
// 		},
//
// 		set: function (optionName, value) {
// 			options[optionName] = value;
// 			localStorage.setItem("starflight_options", JSON.stringify(options));
// 		}
// 	};
// });
