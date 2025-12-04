# rdzwx-go

Mobile app for the rdz-ttgo-sonde firmware.

See https://github.com/dl9rdz/rdzwx-go/wiki for details how to use.

## How to compile and run

- Install Java (I used openjdk 23 with Android API level 35, gradle version 8.14, on MacOS)

- Install Android Studio (currently tested with Iguana 2023.2.1 Patch 1)

     In Settings > Languages&Frameworks > Android SDK
     
     SDK Platforms:  select some relevant platform (I used Android API 35)
      
     SDK Tools: I selected Build-Tools, NDK, SDK command line, emulator, SKK platform tools (maybe not all necessary)
     Specifically, build tools version 35.0.0
      
- `export ANDROID_SDK_ROOT=/Users/me/Library/Android/sdk`

  Use path shown in Android Studio preferences as "Android SDK Location"!
  
- Install node.js (after that you should be able to run "node" and "npm" on your command line)
  (On MacOS I did 'brew install nodejs', versionm 25.2.1)
- Install Cordova (used version 13.0.0): `sudo npm install -g cordova`
- clone the git repository (`git clone https://github.com/dl9rdz/rdzwx-go.git`)
- `cd rdzwx-go; cordova prepare`
- `cordova build` to build debug apk
- `cordova build --release` to build releaes apk
- `cordova run android` to upload apk via usb to phone
                                
