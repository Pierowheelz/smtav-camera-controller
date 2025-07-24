const http = require('http');
const GameController = require('./src/GameController');

const { username, password, deviceMapper } = require('./cameras');

const SHARED_DEADZONE = 0.1; // Deadzone for moving diagonally (0 = 0%, 0.5 = 50%, 1 = 100%)

const args = process.argv.slice(2);

const init = async () => {
    const gameController = new GameController();
    
    // (maybe) run in config mode
    const configMode = args[0] ?? "";
    if( '--config' === configMode ){
        gameController.loadDefaultController();
        await gameController.init();
        gameController.on( 'buttonDown', ( inputName ) => {
            console.log( "Button: ", inputName );
        } );
        gameController.on( 'axis', ( e ) => {
            let axes_map = {};
            Object.keys(e).forEach((inputName) => {
                const rate = e[inputName] ?? 0;
                axes_map[inputName] = rate;
            });
            console.log( "AXIS: ", axes_map );
        } );
        gameController.on( 'log', (msg) => console.warn(msg) );
        return;
    }
    
    // Run in regular operation mode
    gameController.loadController();
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
    gameController.on( 'axis', ( e ) => {
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
                    if( Math.abs(sharedRate) > SHARED_DEADZONE ){
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
    let actions = [];
    if( !Array.isArray(action) ){
        actions.push(action);
    } else {
        actions = action;
    }
    urls.forEach( indDeviceUrl => {
        if ( null === indDeviceUrl || "" === indDeviceUrl ){
            return; // Skip empty URLs
        }
        actions.forEach( indAction => {
            if ( null === indAction || "" === indAction ){
                return; // Skip empty actions
            }
            let url = indDeviceUrl + "?ptzcmd&" + indAction;
            if( typeof panSpeed !== "undefined" && null !== panSpeed && 0 !== panSpeed ){
                url += "&" + panSpeed;
            }
            if( typeof tiltSpeed !== "undefined" && null !== tiltSpeed && 0 !== tiltSpeed  ){
                url += "&" + tiltSpeed;
            }

            pushToDevice( url );
        } );
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
