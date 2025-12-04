export ANDROID_SDK_ROOT=/Users/hansr/Library/Android/sdk

all:	run

el:	plugin
	cordova build electron

run:
	clear
	# cp ../rdzwx-plugin/src/android/*.kt ./platforms/android/app/src/main/kotlin/de/dl9rdz/
	cordova run android --device

full:
	clear
	# cordova plugin rm rdzwx-plugin
	# cordova plugin add ../rdzwx-plugin/
	cordova run android --device

plugin:
	cordova plugin rm rdzwx-plugin
	cordova plugin add plugin-src/rdzwx-plugin/ --link

release: apkrelease sign

mkrelease:
	cordova build --release

.ONESHELL:
sign:
	cd platforms/android/app/build/outputs/apk/release/ && \
	rm -f app-release-unsigned-aligned.apk && \
	/Users/hansr/Library/Android//sdk/build-tools/30.0.3/zipalign -v -p 4 app-release-unsigned.apk app-release-unsigned-aligned.apk &&  \
	/Users/hansr/Library/Android//sdk/build-tools/30.0.3/apksigner sign --ks ~/src/rdzwx-go/my-release-key.jks --out app-release.apk app-release-unsigned-aligned.apk

apkrelease:
	cordova build --release -- --packageType=apk
	
