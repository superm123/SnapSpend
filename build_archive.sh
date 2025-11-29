#!/bin/bash
set -e

# CONFIGURATION
REPO_ROOT=$(pwd)
APP_ROOT="$REPO_ROOT/ios/App"
WORKSPACE_PATH="$APP_ROOT/App.xcworkspace"
SCHEME_NAME="App"
CONFIGURATION="Release"
IPA_OUTPUT_DIR="$APP_ROOT/build"
ARCHIVE_PATH="$IPA_OUTPUT_DIR/App.xcarchive"
EXPORT_OPTIONS="$IPA_OUTPUT_DIR/ExportOptions.plist"


echo "xcodebuild -exportArchive \
  -archivePath \"$ARCHIVE_PATH\" \
  -exportOptionsPlist \"$EXPORT_OPTIONS\" \
  -exportPath \"$IPA_OUTPUT_DIR\" \
  -allowProvisioningUpdates"


echo "---------------------------------------------------------"
echo "STEP 1: Bump build number"
echo "---------------------------------------------------------"

PLIST_PATH="$APP_ROOT/App/Info.plist"
CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$PLIST_PATH")
NEXT_BUILD=$((CURRENT_BUILD + 1))
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT_BUILD" "$PLIST_PATH"
echo "Build number updated to $NEXT_BUILD"

echo "---------------------------------------------------------"
echo "STEP 2: Archive project"
echo "---------------------------------------------------------"

xcodebuild clean \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration "$CONFIGURATION"

xcodebuild archive \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration "$CONFIGURATION" \
  -sdk iphoneos \
  -archivePath "$ARCHIVE_PATH" \
  -destination generic/platform=iOS \
  SKIP_INSTALL=NO

echo "---------------------------------------------------------"
echo "STEP 3: Export IPA"
echo "---------------------------------------------------------"

cat << EOF > "$EXPORT_OPTIONS"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>destination</key>
	<string>export</string>
	<key>manageAppVersionAndBuildNumber</key>
	<true/>
	<key>method</key>
	<string>app-store-connect</string>
	<key>signingStyle</key>
	<string>automatic</string>
	<key>stripSwiftSymbols</key>
	<true/>
	<key>teamID</key>
	<string>574D2QV4CS</string>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
EOF

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -exportPath "$IPA_OUTPUT_DIR" \
  -allowProvisioningUpdates

IPA_PATH="$IPA_OUTPUT_DIR/$SCHEME_NAME.ipa"
echo "IPA exported successfully: $IPA_PATH"

rm "$EXPORT_OPTIONS"