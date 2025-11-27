#!/bin/bash

# CONFIGURATION

REPO_ROOT=${CI_PRIMARY_REPOSITORY_PATH:-$(git rev-parse --show-toplevel)}
APP_ROOT="$REPO_ROOT/mobile/myfam-app"

WORKSPACE_PATH="$APP_ROOT/ios/App/App.xcworkspace"
SCHEME_NAME="App"
CONFIGURATION="Release"
IPA_OUTPUT_DIR="$APP_ROOT/ios/App/build"
EXPORT_OPTIONS="$APP_ROOT/ios/App/ExportOptions.plist"
ARCHIVE_PATH="$APP_ROOT/ios/App/App.xcarchive"
IPA_OUTPUT_DIR="$APP_ROOT/ios/App/build"

# 🔐 Signing Environment Variables

P12_FILE="$REPO_ROOT/mobile/myfam-app/ios/App/dev-cert.p12"
IOS_CERT_PASSWORD="IAmYourFather1988!"  # Replace with actual secret or use CI secret manager

PROVISION_FILE="$REPO_ROOT/mobile/myfam-app/ios/App/4DDA087D-F5C4-4B1D-A43E-D11A1F79EDD9.mobileprovision"
PROVISIONING_PROFILE_SPECIFIER="MyFamApp_Release"
CODE_SIGN_IDENTITY="Apple Distribution"
TEAM_ID="574D2QV4CS"
# STEP 1: Bump build number

# Resolve Info.plist path from build settings
ABSOLUTE_PLIST_PATH="$APP_ROOT/ios/App/App/Info.plist"

# Extract current build number
CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$ABSOLUTE_PLIST_PATH")
echo "🔍 Current build number: $CURRENT_BUILD"

# Increment build number
NEXT_BUILD=$((CURRENT_BUILD + 1))
echo "🔧 Incrementing build number to: $NEXT_BUILD"

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT_BUILD" "$ABSOLUTE_PLIST_PATH"

# STEP 1: Signing prep
echo "🔐 Setting up signing assets..."
set -euxo pipefail

# CI inputs (set these to your CI secrets/paths)
P12_PATH="/Volumes/workspace/repository/mobile/myfam-app/ios/App/dev-cert.p12"
P12_PASS="IAmYourFather1988!"
PROV_SRC="/Volumes/workspace/repository/mobile/myfam-app/ios/App/4DDA087D-F5C4-4B1D-A43E-D11A1F79EDD9.mobileprovision"

# Ensure HOME is defined and use it (do NOT use ~)
export HOME="${HOME:-/Users/$(whoami)}"

# Keychain location (use full path)
KEYCHAIN_NAME="build.keychain"
KEYCHAIN_PATH="$HOME/Library/Keychains/${KEYCHAIN_NAME}-db"

# Create, unlock and make default
#security create-keychain -p "" "$KEYCHAIN_NAME"
#security unlock-keychain -p "" "$KEYCHAIN_NAME"
#security default-keychain -s "$KEYCHAIN_NAME"

# Import p12 with full-trust (-A) and allow /usr/bin/codesign access
#security import "$P12_PATH" \
 # -k "$KEYCHAIN_NAME" \
 # -P "$P12_PASS" \
 # -T /usr/bin/codesign \
#  -A

# Ensure the keychain is in the search list (absolute name acceptable)
# This writes the keychain search order so xcodebuild/codesign can find it
#security list-keychains -s "$KEYCHAIN_NAME" || true
#security list-keychains -d user -s "$KEYCHAIN_NAME"

# Optional: make key available for non-interactive codesign (forces partitions)
# Empty password used for the keychain above, repeat here
#security set-key-partition-list -S apple:codesign -s -k "" "$KEYCHAIN_NAME" || true

# Diagnostics: show usable identities
echo "---- identities (codesigning) ----"
#security find-identity -v -p codesigning "$KEYCHAIN_NAME" || true

# Short dump to show private key entries (first 200 lines)
echo "---- dump-keychain head ----"
#security dump-keychain "$KEYCHAIN_NAME" | sed -n '1,200p' || true

# Install provisioning profile correctly
#mkdir -p "$HOME/Library/MobileDevice/Provisioning Profiles"
#cp -v "$PROV_SRC" "$HOME/Library/MobileDevice/Provisioning Profiles/"

# Confirm profile present
##ls -la "$HOME/Library/MobileDevice/Provisioning Profiles" || true

# Final check: run codesign dry run to show team id not set yet (ok) but identity visible
#xcrun codesign -dv --verbose=4 /usr/bin/codesign || true

echo "DONE"

# STEP 2: Clean and archive
echo "📦 Archiving project..."

rm -rf build/*

xcodebuild clean \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration "$CONFIGURATION"

xcodebuild archive \
  -workspace $WORKSPACE_PATH \
  -scheme "$SCHEME_NAME" \
  -configuration "$CONFIGURATION"\
  -sdk iphoneos \
  -archivePath build/App.xcarchive \
  -destination generic/platform=iOS \
  -resultBundlePath build/ResultBundle\
  ##CODE_SIGN_STYLE=Manual \
  ##DEVELOPMENT_TEAM=574D2QV4CS \
  ##PROVISIONING_PROFILE=C87230C185AFF0F1DAA50A96325CE704683582D9 \
  ##CODE_SIGN_IDENTITY="Apple Distribution" \

  
# STEP 3: Export signed IPA

echo "🚀 Exporting signed .ipa..."
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/App.ipa \
  -exportOptionsPlist $EXPORT_OPTIONS \
  -allowProvisioningUpdates \
  ##CODE_SIGN_IDENTITY="Apple Distribution" \
  ##PROVISIONING_PROFILE=C87230C185AFF0F1DAA50A96325CE704683582D9 \
  DEVELOPMENT_TEAM=574D2QV4CS

echo "✅ Done. IPA located at: build/App.ipa"

az storage blob upload \
  --account-name myfamattach \
  --account-key "S/cbN2r68ser3p3NlQiiC/t4+3J42ohMpAmCjiIRRcwoovgH9PnJX2ZnA3kGBD9t/VQd5FvkA5rE+AStz6cm4g==" \
  --container-name builds \
  --name "App$NEXT_BUILD.ipa" \
  --file build/App.ipa/App.ipa

  echo "✅ Uploaded to Azure: build/App.ipa"
 
 npm install -g ios-uploader

 ios-uploader  `
  -u martin8821@gmail.com `
  -p xzka-gzvr-nejl-eefq `
  -f "build/App.ipa/App.ipa"
