
// Define your Buttons. The value must match the key in your deviceMapper variable in controller.js
const buttons = {
    "0": "A",
    "1": "B",
    "2": "X",
    "3": "Y",
    "4": "BUMPER_L",
    "5": "BUMPER_R",
    "6": "SELECT",
    "7": "START",
    "8": "",
    "9": "THUMBSTICK_L_CLICK",
    "10": "THUMBSTICK_R_CLICK",
};

// Define your Axes. The value must match the key in your deviceMapper variable in controller.js
const axes = [
    "STICK_L_HORIZ",
    "STICK_L_VERT",
    "TRIGGER_L",
    "STICK_R_HORIZ",
    "STICK_R_VERT",
    "TRIGGER_R",
    "DPAD_HORIZ",
    "DPAD_VERT",
];

// Tell the system which inputs are triggers. Triggers rest at 0%, rather than 50%
const triggers = [
    "TRIGGER_L",
    "TRIGGER_R",
];

// Deadzone of the controller as a percentage of the total axis travel (0 = 0%, 0.5 = 50%, 1 = 100%)
const deadzone = 0.04;

// Used to filter out small movements. An axis movement less than this value will not send a second command
const noise = 0.05;

// Export const exponent. A multiplier used to ramp axes inputs logarithmically (min:1, max: 99)
const exponent = 1.5; //1 = 1:1 movement

module.exports = { buttons, axes, triggers, deadzone, noise, exponent };
