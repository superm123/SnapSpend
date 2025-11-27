#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# CONFIGURATION
# REPO_ROOT will be the project root where this script is located
REPO_ROOT=$(pwd)
# APP_ROOT is the ios/App directory relative to REPO_ROOT
APP_ROOT="$REPO_ROOT/ios/App"

WORKSPACE_PATH="$APP_ROOT/App.xcworkspace"
SCHEME_NAME="App"
CONFIGURATION="Release"
IPA_OUTPUT_DIR="$APP_ROOT/build" # IPA will be built here, inside ios/App/build
EXPORT_OPTIONS="$APP_ROOT/ExportOptions.plist" # ExportOptions.plist will be generated here
ARCHIVE_PATH="$IPA_OUTPUT_DIR/App.xcarchive"

# 🔐 Signing Environment Variables (Placeholders)
# IMPORTANT: These should be provided by environment variables in a real CI/CD setup
# For local use, replace these with your actual values or generate an ExportOptions.plist from Xcode.
PROVISION_FILE="$REPO_ROOT/mobile/myfam-app/ios/App/4DDA087D-F5C4-4B1D-A43E-D11A1F79EDD9.mobileprovision"
PROVISIONING_PROFILE_SPECIFIER="MyFamApp_Release"
CODE_SIGN_IDENTITY="Apple Distribution"
TEAM_ID="574D2QV4CS"

# ----------------------------------------------------------------------------------------------------------------------
echo "---------------------------------------------------------"
echo "STEP 1: Bumping build number"
echo "---------------------------------------------------------"

# Resolve Info.plist path (assuming standard Capacitor structure)
ABSOLUTE_PLIST_PATH="$APP_ROOT/App/Info.plist"

# Check if Info.plist exists
if [ ! -f "$ABSOLUTE_PLIST_PATH" ]; then
  echo "Error: Info.plist not found at $ABSOLUTE_PLIST_PATH"
  exit 1
fi

# Extract current build number
CURRENT_BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$ABSOLUTE_PLIST_PATH")
echo "🔍 Current build number: $CURRENT_BUILD"

# Increment build number
NEXT_BUILD=$((CURRENT_BUILD + 1))
echo "🔧 Incrementing build number to: $NEXT_BUILD"

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEXT_BUILD" "$ABSOLUTE_PLIST_PATH"

echo "Build number updated to $NEXT_BUILD in $ABSOLUTE_PLIST_PATH"

# ----------------------------------------------------------------------------------------------------------------------
echo "---------------------------------------------------------"
echo "STEP 2: Clean and archive project"
echo "---------------------------------------------------------"

echo "Navigating to iOS project directory: $APP_ROOT"
cd "$APP_ROOT"

echo "Cleaning previous build artifacts..."
xcodebuild clean \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration "$CONFIGURATION" || true # Allow clean to fail gracefully

echo "Archiving project for TestFlight distribution..."
xcodebuild archive \
  -workspace "$WORKSPACE_PATH" \
  -scheme "$SCHEME_NAME" \
  -configuration "$CONFIGURATION" \
  -sdk iphoneos \
  -archivePath "$ARCHIVE_PATH" \
  -destination generic/platform=iOS \
  SKIP_INSTALL=NO \
  BUILD_LIBRARIES_FOR_DISTRIBUTION=YES \
  # CODE_SIGN_STYLE="Manual" \ # Use manual if you prefer explicit identity/profile
  # DEVELOPMENT_TEAM="$TEAM_ID" \ 
  # PROVISIONING_PROFILE_SPECIFIER="$PROVISIONING_PROFILE_SPECIFIER" \ 
  # CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY"

echo "Checking if archive was created..."
if [ ! -d "$ARCHIVE_PATH" ]; then
  echo "Error: Archive not found at $ARCHIVE_PATH"
  exit 1
fi

echo "Archive created successfully at $ARCHIVE_PATH"

# ----------------------------------------------------------------------------------------------------------------------
echo "---------------------------------------------------------"
echo "STEP 3: Export signed IPA"
echo "---------------------------------------------------------"

echo "Creating ExportOptions.plist for App Store distribution (TestFlight)..."
# IMPORTANT: It is highly recommended to generate this file once from Xcode for your specific project
# (Product -> Archive -> Distribute App -> App Store Connect -> Export)
# and then copy it to APP_ROOT. This is a basic template.
cat << EOF > "${EXPORT_OPTIONS}"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>method</key>
	<string>app-store</string>
	<key>teamID</key>
	<string>${TEAM_ID}</string>
	<key>signingStyle</key>
	<string>automatic</string> <!-- Use automatic if managed by Xcode, manual if explicit -->
	<key>stripSwiftSymbols</key>
	<true/>
	<key>uploadBitcode</key>
	<true/>
	<key>uploadSymbols</key>
	<true/>
</dict>
</plist>
EOF

echo "Exporting IPA from archive..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -exportPath "$IPA_OUTPUT_DIR" \
  -allowProvisioningUpdates # Allows Xcode to manage provisioning profiles

echo "Checking if IPA was exported..."
# The exported IPA will be named after the scheme by default within the export path
if [ ! -f "$IPA_OUTPUT_DIR/${SCHEME_NAME}.ipa" ]; then
  echo "Error: IPA not found at $IPA_OUTPUT_DIR/${SCHEME_NAME}.ipa"
  exit 1
fi

IPA_PATH="$IPA_OUTPUT_DIR/SnapSend_${SCHEME_NAME}.ipa" # Desired final IPA name

echo "Renaming IPA from $IPA_OUTPUT_DIR/${SCHEME_NAME}.ipa to $IPA_PATH..."
mv "$IPA_OUTPUT_DIR/${SCHEME_NAME}.ipa" "$IPA_PATH"

echo "IPA exported and renamed successfully! Located at $IPA_PATH"

# Clean up temporary plist
rm "${EXPORT_OPTIONS}"

# ----------------------------------------------------------------------------------------------------------------------
echo "---------------------------------------------------------"
echo "STEP 4: Uploading to TestFlight (using ios-uploader)"
echo "----------------------------------------------------------------------------------------------------------------------

# IMPORTANT: You need to install ios-uploader globally: npm install -g ios-uploader
# It also requires an App-Specific Password for your Apple ID if you have 2FA enabled.

# Placeholders for sensitive credentials
APPLE_ID="YOUR_APPLE_ID_EMAIL" # Replace with your Apple ID email
APP_SPECIFIC_PASSWORD="YOUR_APP_SPECIFIC_PASSWORD" # Replace with your App-Specific Password

echo "Uploading IPA to App Store Connect via ios-uploader..."
# Note: ios-uploader might need you to be in the project root to find node_modules
# Ensure npm install -g ios-uploader is run first.
ios-uploader \
  -u "$APPLE_ID" \
  -p "$APP_SPECIFIC_PASSWORD" \
  -f "$IPA_PATH"

echo "Upload command initiated. Check App Store Connect for status."

# ----------------------------------------------------------------------------------------------------------------------
echo "---------------------------------------------------------"
echo "Cleanup and Final Notes"
echo "---------------------------------------------------------"

cd "$REPO_ROOT" # Navigate back to the project root
echo "Script finished. IPA ready for upload / uploaded."