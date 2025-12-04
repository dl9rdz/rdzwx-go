ANDROID_HOME ?= /Users/hansr/Library/Android/sdk
export ANDROID_HOME

#find latest version of installed build tools
BUILD_TOOLS_DIR := $(shell ls -d "$(ANDROID_HOME)/build-tools/"* 2>/dev/null | sort -V | tail -1)
ifeq ($(BUILD_TOOLS_DIR),)
$(error Could not find Android build-tools under $(ANDROID_HOME)/build-tools)
endif

ZIPALIGN  := "$(BUILD_TOOLS_DIR)/zipalign"
APKSIGNER := "$(BUILD_TOOLS_DIR)/apksigner"


all:	run

el:	plugin
	cordova build electron

run:
	clear
	cordova run android --device

full:	plugin run

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
	$(ZIPALIGN) -v -p 4 app-release-unsigned.apk app-release-unsigned-aligned.apk &&  \
	$(APKSIGNER) sign --ks ../../../../../../../my-release-key.jks --out app-release.apk app-release-unsigned-aligned.apk

apkrelease:
	cordova build --release -- --packageType=apk
	
