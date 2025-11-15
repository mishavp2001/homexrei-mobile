# 🔗 Deep Linking & OAuth Configuration Guide

This guide explains how to configure deep linking for OAuth authentication in the HomeXREI mobile app.

---

## 📋 Table of Contents

1. [What is Deep Linking?](#what-is-deep-linking)
2. [Configuration Overview](#configuration-overview)
3. [Android Configuration](#android-configuration)
4. [iOS Configuration](#ios-configuration)
5. [Base44 OAuth Setup](#base44-oauth-setup)
6. [Testing Deep Links](#testing-deep-links)
7. [Universal Links (Advanced)](#universal-links-advanced)
8. [Troubleshooting](#troubleshooting)

---

## 🤔 What is Deep Linking?

Deep linking allows external URLs to open your mobile app and navigate to specific content. For OAuth authentication:

1. User clicks "Login" in your app
2. App opens Base44's OAuth page in browser
3. User authenticates
4. Base44 redirects to: `com.homexrei.app://callback?access_token=...`
5. Mobile OS opens your app with the token
6. App extracts token and completes login

---

## 📊 Configuration Overview

### Custom URL Scheme
- **Scheme**: `com.homexrei.app://`
- **Use case**: OAuth callbacks, deep links
- **Pros**: Easy to set up, works immediately
- **Cons**: Can be hijacked by other apps

### Universal Links (Optional)
- **URL**: `https://homexrei.com/auth/callback`
- **Use case**: More secure OAuth, better UX
- **Pros**: Secure, verified by domain
- **Cons**: Requires domain verification setup

---

## 🤖 Android Configuration

### ✅ Already Configured

The following has been added to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Deep link intent filter for custom URL scheme -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="@string/custom_url_scheme" />
</intent-filter>
```

### URL Scheme Definition

In `android/app/src/main/res/values/strings.xml`:

```xml
<string name="custom_url_scheme">com.homexrei.app</string>
```

### What This Does

- Registers `com.homexrei.app://` as a URL scheme
- Any URL with this scheme will open your app
- OAuth callback: `com.homexrei.app://callback?access_token=...`

### Testing on Android

```bash
# Test deep link via ADB
adb shell am start -W -a android.intent.action.VIEW -d "com.homexrei.app://callback?access_token=test123"
```

---

## 🍎 iOS Configuration

### ✅ Already Configured

The following has been added to `ios/App/App/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.homexrei.app</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.homexrei.app</string>
        </array>
    </dict>
</array>
```

### What This Does

- Registers `com.homexrei.app://` as a URL scheme
- Any URL with this scheme will open your app
- OAuth callback: `com.homexrei.app://callback?access_token=...`

### Testing on iOS

```bash
# Test deep link via xcrun (iOS Simulator)
xcrun simctl openurl booted "com.homexrei.app://callback?access_token=test123"

# Test on physical device (replace with your device ID)
idevice-url "com.homexrei.app://callback?access_token=test123"
```

---

## 🔐 Base44 OAuth Setup

### Step 1: Configure Redirect URI in Base44

1. **Login to Base44 Console**: https://base44.app/console
2. **Navigate to your app settings**
3. **Find OAuth/Authentication settings**
4. **Add redirect URI**:
   ```
   com.homexrei.app://callback
   ```

### Step 2: Update Your Web App (if needed)

If your web app's authentication code needs to know about the mobile redirect URI, update it:

```typescript
// In ../homexrei/src/lib/AuthContext.tsx or similar

const isMobile = () => {
  // Detect if running in Capacitor
  return window.Capacitor !== undefined;
};

const getRedirectUri = () => {
  if (isMobile()) {
    return 'com.homexrei.app://callback';
  }
  return window.location.origin + '/dashboard';
};

// When calling Base44 auth
base44.auth.redirectToLogin(getRedirectUri());
```

### Step 3: Handle the Callback

The web app already handles the `access_token` from URL params:

```typescript
// In ../homexrei/src/lib/app-params.ts
token: getAppParamValue("access_token", { removeFromUrl: true })
```

This works for both web and mobile!

---

## 🧪 Testing Deep Links

### Test Flow

1. **Build and install the app**:
   ```bash
   npm run sync:android
   # or
   npm run sync:ios
   ```

2. **Test the deep link**:
   
   **Android:**
   ```bash
   adb shell am start -W -a android.intent.action.VIEW \
     -d "com.homexrei.app://callback?access_token=test_token_123"
   ```
   
   **iOS Simulator:**
   ```bash
   xcrun simctl openurl booted \
     "com.homexrei.app://callback?access_token=test_token_123"
   ```

3. **Verify in app**:
   - App should open
   - Check localStorage for `base44_access_token`
   - Should contain `test_token_123`

### Test OAuth Flow

1. **Start the app**
2. **Click "Login"**
3. **Authenticate in browser**
4. **Should redirect back to app**
5. **Should be logged in**

---

## 🌐 Universal Links (Advanced)

For production, Universal Links provide better security and UX.

### Requirements

1. **Domain ownership**: You must own `homexrei.com`
2. **HTTPS**: Domain must support HTTPS
3. **Verification files**: Host verification files on your domain

### Android App Links Setup

1. **Uncomment in AndroidManifest.xml**:
   ```xml
   <intent-filter android:autoVerify="true">
       <action android:name="android.intent.action.VIEW" />
       <category android:name="android.intent.category.DEFAULT" />
       <category android:name="android.intent.category.BROWSABLE" />
       <data android:scheme="https" 
             android:host="homexrei.com" 
             android:pathPrefix="/auth/callback" />
   </intent-filter>
   ```

2. **Generate signing certificate fingerprint**:
   ```bash
   cd android
   ./gradlew signingReport
   ```

3. **Create assetlinks.json**:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.homexrei.app",
       "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
     }
   }]
   ```

4. **Host at**: `https://homexrei.com/.well-known/assetlinks.json`

### iOS Universal Links Setup

1. **Uncomment in App.entitlements**:
   ```xml
   <key>com.apple.developer.associated-domains</key>
   <array>
       <string>applinks:homexrei.com</string>
   </array>
   ```

2. **Create apple-app-site-association**:
   ```json
   {
     "applinks": {
       "apps": [],
       "details": [{
         "appID": "TEAM_ID.com.homexrei.app",
         "paths": ["/auth/callback"]
       }]
     }
   }
   ```

3. **Host at**: `https://homexrei.com/.well-known/apple-app-site-association`

4. **Update Base44 redirect URI**:
   ```
   https://homexrei.com/auth/callback
   ```

---

## 🐛 Troubleshooting

### Deep Link Not Opening App

**Android:**
```bash
# Check if intent filter is registered
adb shell dumpsys package com.homexrei.app | grep -A 5 "android.intent.action.VIEW"

# Clear app data and reinstall
adb uninstall com.homexrei.app
npm run sync:android
```

**iOS:**
```bash
# Reinstall app
npm run sync:ios
# Then rebuild in Xcode
```

### OAuth Redirect Not Working

1. **Check Base44 redirect URI**:
   - Must exactly match: `com.homexrei.app://callback`
   - No trailing slash
   - Case sensitive

2. **Check app is installed**:
   - Deep links only work if app is installed
   - Test with app already open

3. **Check URL scheme registration**:
   - Android: Check AndroidManifest.xml
   - iOS: Check Info.plist

### Token Not Being Captured

1. **Check URL params**:
   ```typescript
   // In web app, log the callback URL
   console.log('Callback URL:', window.location.href);
   ```

2. **Check token extraction**:
   ```typescript
   // In ../homexrei/src/lib/app-params.ts
   const urlParams = new URLSearchParams(window.location.search);
   console.log('access_token:', urlParams.get('access_token'));
   ```

3. **Check localStorage**:
   ```javascript
   // In app console
   console.log(localStorage.getItem('base44_access_token'));
   ```

---

## 📝 Summary

### What's Configured

- ✅ Android custom URL scheme: `com.homexrei.app://`
- ✅ iOS custom URL scheme: `com.homexrei.app://`
- ✅ Capacitor deep link handling
- ✅ Intent filters and URL type registration

### What You Need to Do

1. **Configure Base44**:
   - Add redirect URI: `com.homexrei.app://callback`

2. **Test the flow**:
   - Build app
   - Test deep link
   - Test OAuth login

3. **(Optional) Set up Universal Links**:
   - For production
   - Better security
   - Better UX

### OAuth Redirect URIs

**Development/Testing:**
```
com.homexrei.app://callback
```

**Production (with Universal Links):**
```
https://homexrei.com/auth/callback
```

---

## 🚀 Next Steps

1. Build and test the app
2. Configure Base44 redirect URI
3. Test OAuth login flow
4. (Optional) Set up Universal Links for production

For questions or issues, refer to:
- [Capacitor Deep Links Docs](https://capacitorjs.com/docs/guides/deep-links)
- [Android App Links](https://developer.android.com/training/app-links)
- [iOS Universal Links](https://developer.apple.com/ios/universal-links/)

