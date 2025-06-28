const http = require('http');
const GameController = require('./src/GameController');

const username = "admin";
const password = "admin";
const cameraLeft = "http://192.168.1.109/cgi-bin/ptzctrl.cgi";
const cameraRight = "http://192.168.1.110/cgi-bin/ptzctrl.cgi";
const ptzPan = {
    negative: "left",
    positive: "right",
    maxPanSpeed: 24,
    maxTiltSpeed: 0,
    zero: "ptzstop",
    isMoving: false,
    negativeShared: {
        negative: "leftup",
        positive: "leftdown"
    },
    positiveShared: {
        negative: "rightup",
        positive: "rightdown"
    },
};
const ptzTilt = {
    negative: "up",
    positive: "down",
    maxPanSpeed: 0,
    maxTiltSpeed: 20,
    zero: "ptzstop",
    negativeShared: {
        negative: "leftup",
        positive: "rightup"
    },
    positiveShared: {
        negative: "leftdown",
        positive: "rightdown"
    },
};
const deviceMapper = {
    "STICK_L_HORIZ": {
        url: cameraLeft,
        shared: "STICK_L_VERT",
        ...ptzPan,
        isMoving: false,
    },
    "STICK_L_VERT": {
        url: cameraLeft,
        shared: "STICK_L_HORIZ",
        ...ptzTilt,
        isMoving: false,
    },
    "TRIGGER_L": {
        url: cameraLeft,
        positive: "zoomin",
        negative: "",
        maxPanSpeed: 7,
        maxTiltSpeed: 0,
        zero: "zoomstop",
        isMoving: false,
    },
    "BUMPER_LEFT": {
        url: cameraLeft,
        buttonDown: "zoomout",
        buttonUp: "zoomstop",
        buttonSpeed: 4,
    },
    "STICK_R_HORIZ": {
        url: cameraRight,
        shared: "STICK_R_VERT",
        ...ptzPan,
        isMoving: false,
    },
    "STICK_R_VERT": {
        url: cameraRight,
        shared: "STICK_R_HORIZ",
        ...ptzTilt,
        isMoving: false,
    },
    "TRIGGER_R": {
        url: cameraRight,
        positive: "zoomin",
        negative: "",
        maxPanSpeed: 7,
        maxTiltSpeed: 0,
        zero: "zoomstop",
        isMoving: false,
    },
    "BUMPER_RIGHT": {
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

const init = async () => {
    const gameController = new GameController();
    await gameController.init();
    gameController.on( 'buttonDown', ( e ) => {
        try{
            gotButtonDown( e );
        } catch( e ){
            console.error( "Error controller Event Handler", e );
        }
    } );
    gameController.on( 'buttonUp', ( e ) => {
        try{
            gotButtonUp( e );
        } catch( e ){
            console.error( "Error controller Event Handler", e );
        }
    } );
    gameController.on( 'thumbsticks', ( e ) => {
        try{
            gotControllerEvent( e );
        } catch( e ){
            console.error( "Error controller Event Handler", e );
        }
    } );
    gameController.on( 'log', (msg) => console.warn(msg) );
};

const gotControllerEvent = ( event ) => {
    //console.log( event );
    
    // Determine mapped device / direction
    const processed = [];
    Object.keys(event).forEach((inputName) => {
        // Find matching device
        const device = deviceMapper[inputName] ?? null;
        if( null === device ){
            return;
        }
        // Skip, If this input has already been processed
        if( processed[inputName] ){
            return;
        }
        //console.log("Processing input for", inputName);
        const sDevice = device.shared ?? '';
        const rate = event[inputName] ?? 0;
    
        // If device is moving and input is now Zero, stop it
        if( 0 === rate && device.isMoving ){
            // Ensure shared device (other axis) does not still need to move
            let doStop = true;
            if( sDevice ){
                const sharedRate = event[sDevice] ?? 0;
                if( sharedRate !== 0 ){
                    doStop = false;
                } else {
                    processed[sDevice] = true;
                }
            }
            if( doStop ){
                device.isMoving = false;
                sendPTZCommand( device.url, device.zero );
            }
        } else {
            //console.log('Start device: ', device);
            // If rate is not zero, send a request to start moving at calculated speed
            let panSpeed = Math.round( Math.abs(rate) * device.maxPanSpeed );
            let tiltSpeed = Math.round( Math.abs(rate) * device.maxTiltSpeed );
            let action = (rate > 0) ? device.positive : device.negative;
            const sharedAction = (rate > 0) ? device.positiveShared : device.negativeShared;
            if( action && (panSpeed > 0 || tiltSpeed > 0) ){
                device.isMoving = true;
                // See if shared device (other axis) also wants to move
                if( sDevice ){
                    const sharedRate = event[sDevice] ?? 0;
                    if( sharedRate !== 0 ){
                        action = (sharedRate > 0) ? sharedAction.positive : sharedAction.negative;
                        const sharedDevice = deviceMapper[sDevice] ?? null;
                        if( null !== sharedDevice ){
                            const sPanSpeed = Math.round( Math.abs(sharedRate) * sharedDevice.maxPanSpeed );
                            const sTiltSpeed = Math.round( Math.abs(sharedRate) * sharedDevice.maxTiltSpeed );
                            panSpeed = Math.max( panSpeed, sPanSpeed );
                            tiltSpeed = Math.max( tiltSpeed, sTiltSpeed );
                            processed[sDevice] = true;
                        }
                    }
                }
                sendPTZCommand( device.url, action, panSpeed, tiltSpeed );
            }
        }
        processed[inputName] = true;
    });
};

const gotButtonDown = ( button ) => {
    //console.log( `Button: ${button} pressed` );
    const device = deviceMapper[button] ?? null;
    if( null === device ){
        return;
    }
    const action = device.buttonDown ?? null;
    if( null === action ){
        return;
    }
    const speed = device.buttonSpeed ?? null;
    sendPTZCommand( device.url, action, speed );
};
const gotButtonUp = ( button ) => {
    //console.log( `Button: ${button} released` );
    const device = deviceMapper[button] ?? null;
    if( null === device ){
        return;
    }
    const action = device.buttonUp ?? null;
    if( null === action ){
        return;
    }
    const speed = device.buttonSpeed ?? null;
    sendPTZCommand( device.url, action, speed );
};

const sendPTZCommand = ( deviceUrl, action, panSpeed, tiltSpeed ) => {
    let urls = [];
    if( !Array.isArray(deviceUrl) ){
        urls.push(deviceUrl);
    } else {
        urls = deviceUrl;
    }
    urls.forEach( indDeviceUrl => {
        let url = indDeviceUrl + "?ptzcmd&" + action;
        if( typeof panSpeed !== "undefined" && null !== panSpeed && 0 !== panSpeed ){
            url += "&" + panSpeed;
        }
        if( typeof tiltSpeed !== "undefined" && null !== tiltSpeed && 0 !== tiltSpeed  ){
            url += "&" + tiltSpeed;
        }

        pushToDevice( url );
    } );
};

const pushToDevice = async (url) => {
    console.log('Sending: ', url);
    
    try{
        const headers = new Headers({
            'Authorization': `Basic ${btoa(username + ':' + password)}`
        });
        const res = await fetch( url, headers );
        
        console.log('Status Code:', res.status);
    } catch( e ){
        console.warn('Fetch failed: ', e);
    }
    
};

init();
