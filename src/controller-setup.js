
// Define your Buttons. The value must match the key in your deviceMapper variable in controller.js
const buttons = {
    "0": "0",
    "1": "1",
    "2": "2",
    "3": "3",
    "4": "4",
    "5": "5",
    "6": "6",
    "7": "7",
    "8": "8",
    "9": "9",
    "10": "10",
    "11": "11",
    "12": "12",
    "13": "13",
    "14": "14",
    "15": "15",
    "16": "16",
    "17": "17",
    "18": "18",
    "19": "19",
    "20": "20",
    "21": "21",
    "22": "22",
    "23": "23",
    "24": "24",
    "25": "25",
    "26": "26",
    "27": "27",
    "28": "28",
    "29": "29",
    "30": "30",
};

// Define your Axes. The value must match the key in your deviceMapper variable in controller.js
const axes = [
    "AXIS_0",
    "AXIS_1",
    "AXIS_2",
    "AXIS_3",
    "AXIS_4",
    "AXIS_5",
    "AXIS_6",
    "AXIS_7",
    "AXIS_8",
    "AXIS_9",
    "AXIS_10",
    "AXIS_11",
    "AXIS_12",
];

// Deadzone of the controller as a percentage of the total axis travel (0 = 0%, 0.5 = 50%, 1 = 100%)
const deadzone = 0.04;

// Used to filter out small movements. An axis movement less than this value will not send a second command
const noise = 0.05;

// Export const exponent. A multiplier used to ramp (min:1, max: 99)
const exponent = 1.5; //1 = 1:1 movement

module.exports = { buttons, axes, deadzone, noise, exponent };
