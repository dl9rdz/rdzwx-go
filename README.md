# rdzwx-go

This was just some simple test code for my first Kotlin code in rdzwx-plugin. Its now a mostly usable app, not not really well-tested. Use at your own risk :)

See https://github.com/dl9rdz/rdzwx-go/wiki for details how to use.

## How to compile and run

- Install Android Studio

     In Preferences: Appearance&Behaviour > System Settings > Android SDK
     
     SDK Platforms:  select some relevant platform (I used API level 29)
      
     SDK Tools: I selected Build-Tools, NDK, SDK command line, emulator, SDKK platform tools (maybe not all necessary)
      
- `export ANDROID_SDK_ROOT=/Users/me/Library/Android/sdk`

  Use path shown in Android Studio preferences as "Android SDK Location"!
  
- Install node.js (after that you should be able to run "node" and "npm" on your command line)
- Install Cordova (used version 9.0.0): `sudo npm install -g cordova`
- clone the git repository (`git clone https://github.com/dl9rdz/rdzwx-go.git`)
- `cd rdzwx-go; cordova platform add android`
- `cordova build` to build debug apk
- `cordova build --release` to build releaes apk
- `cordova run android` to upload apk via usb to phone
                                
