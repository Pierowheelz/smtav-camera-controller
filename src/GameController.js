const puppeteer = require('puppeteer');
const EventEmitter = require('events').EventEmitter;

const buttons = require('./controllers/xbox.json');

class GameController {
    constructor() {
        this.eventEmitter = new EventEmitter();
        this.POLL_INTERVAL_MS = 10;
        this.DEBOUNCE_MS = 150;
        this.DEADZONE = 0.08;
        this.NOISE_THRESHOLD = 0.05;
        this.EXPONENT = 1.5;
        this.INPUT_MAP = [
            "STICK_L_HORIZ",
            "STICK_L_VERT",
            "TRIGGER_L",
            "STICK_R_HORIZ",
            "STICK_R_VERT",
            "TRIGGER_R",
            // "DPAD_HORIZ",
            // "DPAD_VERT",
        ];
    }

    on(event, cb) {
        this.eventEmitter.on(event, cb);
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
        await page.evaluate(([ buttons, POLL_INTERVAL_MS, DEBOUNCE_MS, DEADZONE, NOISE_THRESHOLD, EXPONENT, INPUT_MAP ]) => {
            let interval = {};
            let triggerBugWorkaround = {"TRIGGER_L": 1,"TRIGGER_R": 1};
            
            const mapRange = (value) => {
                // Ensure the value is within the original range (-1 to 1)
                value = Math.max(-1, Math.min(1, value));

                // Step 1: Shift the value from [-1, 1] to [0, 2]
                let shiftedValue = value + 1;

                // Step 2: Scale the value from [0, 2] to [0, 1]
                let scaledValue = shiftedValue / 2;

                return scaledValue;
            };
            
            const triggerBugFix = (value, inputName) => {
                if( 0.5 === value && triggerBugWorkaround[inputName] ){
                    value = 0;
                } else {
                    triggerBugWorkaround[inputName] = 0;
                }
                
                return value;
            };

            let lastEvents = [];
            let inputDebounce = null;
            let buttonsPressed = [];
            window.addEventListener("gamepadconnected", (e) => {
                let gp = navigator.getGamepads()[e.gamepad.index];
                window.sendEventToProcessHandle('GAMEPAD_CONNECTED');
                lastEvents[e.gamepad.index] = null;
                buttonsPressed[e.gamepad.index] = [];

                interval[e.gamepad.index] = setInterval(() => {
                    gp = navigator.getGamepads()[e.gamepad.index];
                    // Map Axes to their Key
                    const axes = {};
                    INPUT_MAP.forEach((key, index) => {
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
                    axes["TRIGGER_L"] = mapRange(axes["TRIGGER_L"]);
                    axes["TRIGGER_R"] = mapRange(axes["TRIGGER_R"]);
                    
                    // Fix bug where triggers init at 0.50 (rather than 0)
                    axes["TRIGGER_L"] = triggerBugFix(axes["TRIGGER_L"], "TRIGGER_L");
                    axes["TRIGGER_R"] = triggerBugFix(axes["TRIGGER_R"], "TRIGGER_R");
                    
                    let toTrigger = false;
                    INPUT_MAP.forEach( key => {
                        // Round to 2 decimals
                        axes[key] = axes[key].toFixed(2);
                        
                        // Apply DEADZONE
                        if( Math.abs(axes[key]) < DEADZONE ){
                            axes[key] = 0;
                        }
                        
                        // Determine if moved enough since last Event to trigger a new Event
                        if( null === lastEvents[e.gamepad.index] ){
                            toTrigger = true;
                        } else if ( Math.abs(lastEvents[e.gamepad.index][key] - axes[key]) > NOISE_THRESHOLD ) {
                            toTrigger = true;
                        }
                    });

                    if ( toTrigger ) {
                        //window.consoleLog("inputval " + gp.axes);
                        lastEvents[e.gamepad.index] = axes;
                        clearTimeout( inputDebounce );
                        inputDebounce = setTimeout( () => {
                            window.sendEventToProcessHandle('thumbsticks', axes);
                        }, DEBOUNCE_MS );
                    }

                    for (let i = 0; i < gp.buttons.length; i++) {
                        const alreadyPressed = buttonsPressed[e.gamepad.index][buttons[i]] ?? false;
                        if (gp.buttons[i].pressed == true && !alreadyPressed) {
                            buttonsPressed[e.gamepad.index][buttons[i]] = true;
                            window.sendEventToProcessHandle('buttonDown', buttons[i]);
                        } else if ( gp.buttons[i].pressed == false && alreadyPressed ){
                            buttonsPressed[e.gamepad.index][buttons[i]] = false;
                            window.sendEventToProcessHandle('buttonUp', buttons[i]);
                        }
                    }
                }, POLL_INTERVAL_MS);
            });

            window.addEventListener("gamepaddisconnected", (e) => {
                window.sendEventToProcessHandle('GAMEPAD_DISCONNECTED');
                window.consoleLog("Gamepad disconnected at index " + gp.index);
                clearInterval(interval[e.gamepad.index]);
            });
        }, [ buttons, this.POLL_INTERVAL_MS, this.DEBOUNCE_MS, this.DEADZONE, this.NOISE_THRESHOLD, this.EXPONENT, this.INPUT_MAP ]);
    }
}

module.exports = GameController;
