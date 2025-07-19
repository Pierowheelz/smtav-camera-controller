SMTAV PTZ Camera Control using an xbox controller
===========
This repo allows control of one or more SMTAV PTZ cameras using a standard xbox controller or other joystick. It does this using the gamepad API in Chrome/Chromium, run using Puppeteer.
 
Note that this only seems to work in Linux. Windows doesn't allow controllers to operate in puppeteer. I also tried deploying this using Electron, which worked on Windows, but only when the window is in focus. Mac OS might work, but is untested.
 
Installation and setup
---
1. Download the repo using `git clone https://github.com/Pierowheelz/smtav-camera-controller.git`.
1. Navigate into the repo using `cd smtav-camera-controller`.
1. Install dependencies using `npm install`.
1. Clone the cameras-default.js and controller-default.js files to cameras.js and controller.js respectively.
    ```
    cp cameras-default.js cameras.js
    cp controller-default.js controller.js
    ```
1. Run the setup `node index.js --config` and map out your controller. Edit your controller.js file and name/label your inputs correctly (note: these defaults are based on an 8bitdo xbox-style controller).
1. Edit the camera.js file and set up your actions.
1. Run `node index.js`.

Troubleshooting
---
If nothing displays in the console when pressing buttons on your controller, make sure that you are running in Linux (I recommend Fedora KDE) on a desktop-based operating system and that Chrome and Puppeteer are installed.
 
If inputs are double-triggering or doing strange things, make sure you only have one controller connected.
 
Automation / Deployment
---
This can be automated and deployed by installing Linux onto a mini-pc and configuring this to run `node index.js` on boot.
Consider the following...
1. Automate startup using either Boot on AC power restoration (in the BIOS), or Wake-On-LAN.
1. Make sure that you install a Desktop version of Linux (I couldn't get headless to work).
1. Make sure to use an x86 based PC. I tried but failed to deploy this on a Raspberry Pi.
1. Create a bash script to simplify the process of running the `node index.js` script. Bash scripts are simple to run on startup.
    eg.
    ```
    #!/bin/bash

    node index.js
    ```
