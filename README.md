# rdzwx-go

This was just some simple test code for my first Kotlin code in rdzwx-plugin. Its now a mostly usable app, not not really well-tested. Use at your own risk :)

See https://github.com/dl9rdz/rdzwx-go/wiki for details how to use.

## How to compile and run

- Install Java (I used openjdk 11, gradle and android on API level 30 do not support later openjdk version) and gradle (I used version 7.4.2) (I installed both on MacOS with brew)

- Install Android Studio (currently tested with Chipmunk 2021.2.1)

     In Preferences: Appearance&Behaviour > System Settings > Android SDK
     
     SDK Platforms:  select some relevant platform (I used API level 32)
      
     SDK Tools: I selected Build-Tools, NDK, SDK command line, emulator, SKK platform tools (maybe not all necessary)
     Specifically, build tools 30.0.3 are needed!!!
      
- `export ANDROID_SDK_ROOT=/Users/me/Library/Android/sdk`

  Use path shown in Android Studio preferences as "Android SDK Location"!
  
- Install node.js (after that you should be able to run "node" and "npm" on your command line)
  (On MacOS I did 'brew install nodejs')
- Install Cordova (used version 9.0.0): `sudo npm install -g cordova`
- clone the git repository (`git clone https://github.com/dl9rdz/rdzwx-go.git`)
- `cd rdzwx-go; cordova platform add android`
- cordova plugin add cordova-plugin-androidx-adapter
- npm i jetifier
- npx jetifier
- `cordova build` to build debug apk
- `cordova build --release` to build releaes apk
- `cordova run android` to upload apk via usb to phone
                                
