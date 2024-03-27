"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IgeInputKeyboardMap = exports.IgeInputPointerMap = exports.IgeInputGamePadMap = exports.IgeInputDevice = void 0;
var IgeInputDevice;
(function (IgeInputDevice) {
    IgeInputDevice[IgeInputDevice["keyboard"] = 0] = "keyboard";
    IgeInputDevice[IgeInputDevice["pointer1"] = 1] = "pointer1";
    IgeInputDevice[IgeInputDevice["pointer2"] = 2] = "pointer2";
    IgeInputDevice[IgeInputDevice["pointer3"] = 3] = "pointer3";
    IgeInputDevice[IgeInputDevice["pointer4"] = 4] = "pointer4";
    IgeInputDevice[IgeInputDevice["pointer5"] = 5] = "pointer5";
    IgeInputDevice[IgeInputDevice["pointer6"] = 6] = "pointer6";
    IgeInputDevice[IgeInputDevice["pointer7"] = 7] = "pointer7";
    IgeInputDevice[IgeInputDevice["pointer8"] = 8] = "pointer8";
    IgeInputDevice[IgeInputDevice["pointer9"] = 9] = "pointer9";
    IgeInputDevice[IgeInputDevice["pointer10"] = 10] = "pointer10";
    IgeInputDevice[IgeInputDevice["pointer11"] = 11] = "pointer11";
    IgeInputDevice[IgeInputDevice["pointer12"] = 12] = "pointer12";
    IgeInputDevice[IgeInputDevice["gamePad1"] = 13] = "gamePad1";
    IgeInputDevice[IgeInputDevice["gamePad2"] = 14] = "gamePad2";
    IgeInputDevice[IgeInputDevice["gamePad3"] = 15] = "gamePad3";
    IgeInputDevice[IgeInputDevice["gamePad4"] = 16] = "gamePad4";
    IgeInputDevice[IgeInputDevice["gamePad5"] = 17] = "gamePad5";
    IgeInputDevice[IgeInputDevice["gamePad6"] = 18] = "gamePad6";
    IgeInputDevice[IgeInputDevice["gamePad7"] = 19] = "gamePad7";
    IgeInputDevice[IgeInputDevice["gamePad8"] = 20] = "gamePad8";
})(IgeInputDevice || (exports.IgeInputDevice = IgeInputDevice = {}));
var IgeInputGamePadMap;
(function (IgeInputGamePadMap) {
    IgeInputGamePadMap[IgeInputGamePadMap["button1"] = 0] = "button1";
    IgeInputGamePadMap[IgeInputGamePadMap["button2"] = 1] = "button2";
    IgeInputGamePadMap[IgeInputGamePadMap["button3"] = 2] = "button3";
    IgeInputGamePadMap[IgeInputGamePadMap["button4"] = 3] = "button4";
    IgeInputGamePadMap[IgeInputGamePadMap["button5"] = 4] = "button5";
    IgeInputGamePadMap[IgeInputGamePadMap["button6"] = 5] = "button6";
    IgeInputGamePadMap[IgeInputGamePadMap["button7"] = 6] = "button7";
    IgeInputGamePadMap[IgeInputGamePadMap["button8"] = 7] = "button8";
    IgeInputGamePadMap[IgeInputGamePadMap["button9"] = 8] = "button9";
    IgeInputGamePadMap[IgeInputGamePadMap["button10"] = 9] = "button10";
    IgeInputGamePadMap[IgeInputGamePadMap["button11"] = 10] = "button11";
    IgeInputGamePadMap[IgeInputGamePadMap["button12"] = 11] = "button12";
    IgeInputGamePadMap[IgeInputGamePadMap["button13"] = 12] = "button13";
    IgeInputGamePadMap[IgeInputGamePadMap["button14"] = 13] = "button14";
    IgeInputGamePadMap[IgeInputGamePadMap["button15"] = 14] = "button15";
    IgeInputGamePadMap[IgeInputGamePadMap["button16"] = 15] = "button16";
    IgeInputGamePadMap[IgeInputGamePadMap["button17"] = 16] = "button17";
    IgeInputGamePadMap[IgeInputGamePadMap["button18"] = 17] = "button18";
    IgeInputGamePadMap[IgeInputGamePadMap["button19"] = 18] = "button19";
    IgeInputGamePadMap[IgeInputGamePadMap["button20"] = 19] = "button20";
    IgeInputGamePadMap[IgeInputGamePadMap["axisLeftX"] = 20] = "axisLeftX";
    IgeInputGamePadMap[IgeInputGamePadMap["axisLeftY"] = 21] = "axisLeftY";
    IgeInputGamePadMap[IgeInputGamePadMap["axisRightX"] = 22] = "axisRightX";
    IgeInputGamePadMap[IgeInputGamePadMap["axisRightY"] = 23] = "axisRightY";
})(IgeInputGamePadMap || (exports.IgeInputGamePadMap = IgeInputGamePadMap = {}));
var IgeInputPointerMap;
(function (IgeInputPointerMap) {
    IgeInputPointerMap[IgeInputPointerMap["down"] = 0] = "down";
    IgeInputPointerMap[IgeInputPointerMap["up"] = 1] = "up";
    IgeInputPointerMap[IgeInputPointerMap["dblClick"] = 2] = "dblClick";
    IgeInputPointerMap[IgeInputPointerMap["move"] = 3] = "move";
    IgeInputPointerMap[IgeInputPointerMap["wheel"] = 4] = "wheel";
    IgeInputPointerMap[IgeInputPointerMap["wheelX"] = 5] = "wheelX";
    IgeInputPointerMap[IgeInputPointerMap["wheelY"] = 6] = "wheelY";
    IgeInputPointerMap[IgeInputPointerMap["wheelZ"] = 7] = "wheelZ";
    IgeInputPointerMap[IgeInputPointerMap["wheelUp"] = 8] = "wheelUp";
    IgeInputPointerMap[IgeInputPointerMap["wheelDown"] = 9] = "wheelDown";
    IgeInputPointerMap[IgeInputPointerMap["wheelLeft"] = 10] = "wheelLeft";
    IgeInputPointerMap[IgeInputPointerMap["wheelRight"] = 11] = "wheelRight";
    IgeInputPointerMap[IgeInputPointerMap["wheelForward"] = 12] = "wheelForward";
    IgeInputPointerMap[IgeInputPointerMap["wheelBackward"] = 13] = "wheelBackward";
    IgeInputPointerMap[IgeInputPointerMap["x"] = 14] = "x";
    IgeInputPointerMap[IgeInputPointerMap["y"] = 15] = "y";
    IgeInputPointerMap[IgeInputPointerMap["button0"] = 16] = "button0";
    IgeInputPointerMap[IgeInputPointerMap["button1"] = 17] = "button1";
    IgeInputPointerMap[IgeInputPointerMap["button2"] = 18] = "button2";
    IgeInputPointerMap[IgeInputPointerMap["button3"] = 19] = "button3";
    IgeInputPointerMap[IgeInputPointerMap["button4"] = 20] = "button4";
    IgeInputPointerMap[IgeInputPointerMap["button5"] = 21] = "button5";
})(IgeInputPointerMap || (exports.IgeInputPointerMap = IgeInputPointerMap = {}));
var IgeInputKeyboardMap;
(function (IgeInputKeyboardMap) {
    // Modifiers
    IgeInputKeyboardMap[IgeInputKeyboardMap["ShiftLeft"] = 0] = "ShiftLeft";
    IgeInputKeyboardMap[IgeInputKeyboardMap["ShiftRight"] = 1] = "ShiftRight";
    IgeInputKeyboardMap[IgeInputKeyboardMap["ControlLeft"] = 2] = "ControlLeft";
    IgeInputKeyboardMap[IgeInputKeyboardMap["ControlRight"] = 3] = "ControlRight";
    IgeInputKeyboardMap[IgeInputKeyboardMap["MetaLeft"] = 4] = "MetaLeft";
    IgeInputKeyboardMap[IgeInputKeyboardMap["MetaRight"] = 5] = "MetaRight";
    IgeInputKeyboardMap[IgeInputKeyboardMap["AltLeft"] = 6] = "AltLeft";
    IgeInputKeyboardMap[IgeInputKeyboardMap["AltRight"] = 7] = "AltRight";
    // Extra Cluster
    IgeInputKeyboardMap[IgeInputKeyboardMap["Insert"] = 8] = "Insert";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Home"] = 9] = "Home";
    IgeInputKeyboardMap[IgeInputKeyboardMap["End"] = 10] = "End";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Delete"] = 11] = "Delete";
    IgeInputKeyboardMap[IgeInputKeyboardMap["PageUp"] = 12] = "PageUp";
    IgeInputKeyboardMap[IgeInputKeyboardMap["PageDown"] = 13] = "PageDown";
    IgeInputKeyboardMap[IgeInputKeyboardMap["ArrowUp"] = 14] = "ArrowUp";
    IgeInputKeyboardMap[IgeInputKeyboardMap["ArrowDown"] = 15] = "ArrowDown";
    IgeInputKeyboardMap[IgeInputKeyboardMap["ArrowLeft"] = 16] = "ArrowLeft";
    IgeInputKeyboardMap[IgeInputKeyboardMap["ArrowRight"] = 17] = "ArrowRight";
    // Keypad
    IgeInputKeyboardMap[IgeInputKeyboardMap["NumLock"] = 18] = "NumLock";
    IgeInputKeyboardMap[IgeInputKeyboardMap["NumpadEnter"] = 19] = "NumpadEnter";
    IgeInputKeyboardMap[IgeInputKeyboardMap["NumpadMultiply"] = 20] = "NumpadMultiply";
    IgeInputKeyboardMap[IgeInputKeyboardMap["NumpadDivide"] = 21] = "NumpadDivide";
    IgeInputKeyboardMap[IgeInputKeyboardMap["NumpadAdd"] = 22] = "NumpadAdd";
    IgeInputKeyboardMap[IgeInputKeyboardMap["NumpadSubtract"] = 23] = "NumpadSubtract";
    IgeInputKeyboardMap[IgeInputKeyboardMap["NumpadDecimal"] = 24] = "NumpadDecimal";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad0"] = 25] = "Numpad0";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad1"] = 26] = "Numpad1";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad2"] = 27] = "Numpad2";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad3"] = 28] = "Numpad3";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad4"] = 29] = "Numpad4";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad5"] = 30] = "Numpad5";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad6"] = 31] = "Numpad6";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad7"] = 32] = "Numpad7";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad8"] = 33] = "Numpad8";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Numpad9"] = 34] = "Numpad9";
    // Main keyboard
    IgeInputKeyboardMap[IgeInputKeyboardMap["IntlBackslash"] = 35] = "IntlBackslash";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Backslash"] = 36] = "Backslash";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Slash"] = 37] = "Slash";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Backspace"] = 38] = "Backspace";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Enter"] = 39] = "Enter";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Tab"] = 40] = "Tab";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Quote"] = 41] = "Quote";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Semicolon"] = 42] = "Semicolon";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Period"] = 43] = "Period";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Comma"] = 44] = "Comma";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Equal"] = 45] = "Equal";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Minus"] = 46] = "Minus";
    IgeInputKeyboardMap[IgeInputKeyboardMap["BracketLeft"] = 47] = "BracketLeft";
    IgeInputKeyboardMap[IgeInputKeyboardMap["BracketRight"] = 48] = "BracketRight";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Escape"] = 49] = "Escape";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit0"] = 50] = "Digit0";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit1"] = 51] = "Digit1";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit2"] = 52] = "Digit2";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit3"] = 53] = "Digit3";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit4"] = 54] = "Digit4";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit5"] = 55] = "Digit5";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit6"] = 56] = "Digit6";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit7"] = 57] = "Digit7";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit8"] = 58] = "Digit8";
    IgeInputKeyboardMap[IgeInputKeyboardMap["Digit9"] = 59] = "Digit9";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyA"] = 60] = "KeyA";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyB"] = 61] = "KeyB";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyC"] = 62] = "KeyC";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyD"] = 63] = "KeyD";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyE"] = 64] = "KeyE";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyF"] = 65] = "KeyF";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyG"] = 66] = "KeyG";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyH"] = 67] = "KeyH";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyI"] = 68] = "KeyI";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyJ"] = 69] = "KeyJ";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyK"] = 70] = "KeyK";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyL"] = 71] = "KeyL";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyM"] = 72] = "KeyM";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyN"] = 73] = "KeyN";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyO"] = 74] = "KeyO";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyP"] = 75] = "KeyP";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyQ"] = 76] = "KeyQ";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyR"] = 77] = "KeyR";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyS"] = 78] = "KeyS";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyT"] = 79] = "KeyT";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyU"] = 80] = "KeyU";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyV"] = 81] = "KeyV";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyW"] = 82] = "KeyW";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyX"] = 83] = "KeyX";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyY"] = 84] = "KeyY";
    IgeInputKeyboardMap[IgeInputKeyboardMap["KeyZ"] = 85] = "KeyZ";
})(IgeInputKeyboardMap || (exports.IgeInputKeyboardMap = IgeInputKeyboardMap = {}));
