// REQUIRED: Camera Username/Password
const username = "admin";
const password = "admin";

// Helper variable for camera endpoints (optionally, define these in your deviceMapper)
const cameraLeft = "http://192.168.1.1/cgi-bin/ptzctrl.cgi";
const cameraRight = "http://192.168.1.2/cgi-bin/ptzctrl.cgi";

// REQUIRED: Map your controls to device actions
const deviceMapper = {
    "STICK_L_HORIZ": {
        url: cameraLeft,
        shared: "STICK_L_VERT",
        negative: "left",
        positive: "right",
        maxPanSpeed: 4,
        maxTiltSpeed: 0,
        zero: "ptzstop",
        negativeShared: {
            negative: "leftup",
            positive: "leftdown"
        },
        positiveShared: {
            negative: "rightup",
            positive: "rightdown"
        },
        isMoving: false,
    },
    "STICK_L_VERT": {
        url: cameraLeft,
        shared: "STICK_L_HORIZ",
        negative: "up",
        positive: "down",
        maxPanSpeed: 0,
        maxTiltSpeed: 4,
        zero: "ptzstop",
        negativeShared: {
            negative: "leftup",
            positive: "rightup"
        },
        positiveShared: {
            negative: "leftdown",
            positive: "rightdown"
        },
        isMoving: false,
    },
    "STICK_R_HORIZ": {
        url: cameraRight,
        shared: "STICK_R_VERT",
        negative: "left",
        positive: "right",
        maxPanSpeed: 4,
        maxTiltSpeed: 0,
        zero: "ptzstop",
        negativeShared: {
            negative: "leftup",
            positive: "leftdown"
        },
        positiveShared: {
            negative: "rightup",
            positive: "rightdown"
        },
        isMoving: false,
    },
    "STICK_R_VERT": {
        url: cameraRight,
        shared: "STICK_R_HORIZ",
        negative: "up",
        positive: "down",
        maxPanSpeed: 0,
        maxTiltSpeed: 4,
        zero: "ptzstop",
        negativeShared: {
            negative: "leftup",
            positive: "rightup"
        },
        positiveShared: {
            negative: "leftdown",
            positive: "rightdown"
        },
        isMoving: false,
    },
    "TRIGGER_L": {
        url: cameraLeft,
        positive: "zoomin",
        negative: "",
        maxPanSpeed: 5, // Also used for Zoom speed
        maxTiltSpeed: 0,
        zero: "zoomstop",
        isMoving: false,
    },
    "BUMPER_L": {
        url: cameraLeft,
        buttonDown: "zoomout",
        buttonUp: "zoomstop",
        buttonSpeed: 4,
    },
    "TRIGGER_R": {
        url: cameraRight,
        positive: "zoomin",
        negative: "",
        maxPanSpeed: 5, // Also used for Zoom speed
        maxTiltSpeed: 0,
        zero: "zoomstop",
        isMoving: false,
    },
    "BUMPER_R": {
        url: cameraRight,
        buttonDown: "zoomout",
        buttonUp: "zoomstop",
        buttonSpeed: 4,
    },
    "B": {
        url: [
            cameraLeft,
            cameraRight,
        ],
        buttonDown: "ptzstop",
    }
};

module.exports = { username, password, deviceMapper };
