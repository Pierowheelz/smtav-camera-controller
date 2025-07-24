const puppeteer = require('puppeteer');
const EventEmitter = require('events').EventEmitter;

let buttons, axes, deadzone, noise, exponent;

class GameController {
    constructor() {
        this.eventEmitter = new EventEmitter();
        this.POLL_INTERVAL_MS = 10;
        this.DEBOUNCE_MS = 150;
    }

    on(event, cb) {
        this.eventEmitter.on(event, cb);
    }
    
    loadController() {
        const controller = require('../controller');
        buttons = controller.buttons;
        axes = controller.axes;
        triggers = controller.triggers;
        deadzone = controller.deadzone;
        noise = controller.noise;
        exponent = controller.exponent;
    }
    
    loadDefaultController() {
        const controller = require('./controller-setup');
        buttons = controller.buttons;
        axes = controller.axes;
        triggers = controller.triggers;
        deadzone = controller.deadzone;
        noise = controller.noise;
        exponent = controller.exponent;
    }

    async init() {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        // Expose a handler to the page
        await page.exposeFunction('sendEventToProcessHandle', (event, msg) => {
            this.eventEmitter.emit(event, msg);
        });

        await page.exposeFunction('consoleLog', (e) => {
            console.log(e);
        });

        // listen for events of type 'status' and
        // pass 'type' and 'detail' attributes to our exposed function
        await page.evaluate(([ BUTTON_MAP, AXES_MAP, TRIGGERS, DEADZONE, NOISE_THRESHOLD, EXPONENT, POLL_INTERVAL_MS, DEBOUNCE_MS ]) => {
            let interval = {};
            
            const mapRange = (value) => {
                // Ensure the value is within the original range (-1 to 1)
                value = Math.max(-1, Math.min(1, value));

                // Step 1: Shift the value from [-1, 1] to [0, 2]
                let shiftedValue = value + 1;

                // Step 2: Scale the value from [0, 2] to [0, 1]
                let scaledValue = shiftedValue / 2;

                return scaledValue;
            };
            
            // Fix triggers initialising at 50%, rather than 0 (most axes rest at 50%, but triggers rest at 0%)
            const triggerBugFix = (value) => {
                if( 0.5 === value ){ // It's almost impossible to actually hit 0.5 exactly, so this is fine
                    value = 0;
                }
                
                return value;
            };

            let lastEvents = [];
            let inputDebounce = null;
            let buttonDebounce = null;
            let buttonsPressed = [];
            window.addEventListener("gamepadconnected", (e) => {
                let gp = navigator.getGamepads()[e.gamepad.index];
                window.sendEventToProcessHandle('connected');
                lastEvents[e.gamepad.index] = null;
                buttonsPressed[e.gamepad.index] = [];

                interval[e.gamepad.index] = setInterval(() => {
                    gp = navigator.getGamepads()[e.gamepad.index];
                    // Map Axes to their Key
                    const axes = {};
                    AXES_MAP.forEach((key, index) => {
                        const inputValue = gp.axes[index] ?? 0;
                        // Apply exponential weighting to inputs
                        const isNegative = (inputValue < 0);
                        let scaledValue = Math.pow( Math.abs(inputValue), EXPONENT );
                        if( isNegative ){
                            scaledValue *= -1;
                        }
                        axes[key] = scaledValue;
                    });

                    // Triggers should be 0 -> 1 range.
                    TRIGGERS.forEach( key => {
                        axes[key] = mapRange(axes[key]);
                        // Fix bug where triggers init at 0.50 (rather than 0)
                        axes[key] = triggerBugFix(axes[key]);
                    });
                    
                    // Only send an Event if the input state has changed
                    let toTrigger = false;
                    AXES_MAP.forEach( key => {
                        // Round to 2 decimals
                        axes[key] = axes[key].toFixed(2);
                        
                        // Apply DEADZONE
                        if( Math.abs(axes[key]) < DEADZONE ){
                            axes[key] = 0;
                        }
                        
                        // Determine if moved enough since last Event to trigger a new Event
                        if( null === lastEvents[e.gamepad.index] ){
                            // Always trigger the first event from an input
                            toTrigger = true;
                        } else if ( Math.abs(lastEvents[e.gamepad.index][key] - axes[key]) > NOISE_THRESHOLD ) {
                            // Only trigger a movement event if above the noise threshold
                            toTrigger = true;
                        } else if ( Math.abs(lastEvents[e.gamepad.index][key] !== 0 && axes[key]) === 0 ) {
                            // Always trigger a zero event if the last event was not zero
                            toTrigger = true;
                        }
                    });

                    // Maybe sent an Axis event (axis)
                    if ( toTrigger ) {
                        lastEvents[e.gamepad.index] = axes;
                        window.sendEventToProcessHandle('axis', axes);
                    }
                    
                    // Maybe sent button Events (buttonUp / buttonDown)
                    for (let i = 0; i < gp.buttons.length; i++) {
                        const alreadyPressed = buttonsPressed[e.gamepad.index][buttons[i]] ?? false;
                        if (gp.buttons[i].pressed == true && !alreadyPressed) {
                            clearTimeout( buttonDebounce );
                            buttonsPressed[e.gamepad.index][buttons[i]] = true;
                            window.sendEventToProcessHandle('buttonDown', buttons[i]);
                        } else if ( gp.buttons[i].pressed == false && alreadyPressed ){
                            buttonDebounce = setTimeout(()=>{
                                const stillUnPressed = (gp.buttons[i].pressed == false); // if button is still not pressed
                                const lastEventDown = buttonsPressed[e.gamepad.index][buttons[i]] ?? false; // if last sent event was 'buttonDown'
                                if( stillUnPressed && lastEventDown ){ // Prevents multiple triggers due to debounce timeout
                                    buttonsPressed[e.gamepad.index][buttons[i]] = false;
                                    window.sendEventToProcessHandle('buttonUp', buttons[i]);
                                }
                            }, DEBOUNCE_MS );
                        }
                    }
                    
                }, POLL_INTERVAL_MS);
            });

            window.addEventListener("gamepaddisconnected", (e) => {
                window.sendEventToProcessHandle('disconnected');
                window.consoleLog("Gamepad disconnected at index " + gp.index);
                clearInterval(interval[e.gamepad.index]);
            });
        }, [ buttons, axes, triggers, deadzone, noise, exponent, this.POLL_INTERVAL_MS, this.DEBOUNCE_MS ]);
    }
}

module.exports = GameController;
