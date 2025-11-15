# 🚀 OAuth Quick Start Guide

Quick reference for setting up OAuth authentication in the HomeXREI mobile app.

---

## ✅ What's Already Done

Deep linking is **already configured** in both mobile and web apps:

- ✅ Android intent filters added
- ✅ iOS URL schemes added
- ✅ Capacitor deep link handling enabled
- ✅ Custom URL scheme: `com.homexrei.app://`
- ✅ **Web app automatically detects mobile and uses correct redirect URI**
- ✅ Platform detection utility created (`platform-utils.js`)
- ✅ AuthContext updated to use mobile deep links when in Capacitor

---

## 🔧 What You Need to Do

### 1. Configure Base44 OAuth Redirect URI

**Login to Base44 Console**: https://base44.app/console

**Add this redirect URI to your app settings:**
```
com.homexrei.app://callback
```

**Screenshot guide:**
1. Go to your app in Base44 console
2. Navigate to Settings → Authentication/OAuth
3. Add redirect URI: `com.homexrei.app://callback`
4. Save changes

---

### 2. Test the Setup

#### Build the App

```bash
# Android
npm run sync:android

# iOS
npm run sync:ios
```

#### Test Deep Link

**Android:**
```bash
adb shell am start -W -a android.intent.action.VIEW \
  -d "com.homexrei.app://callback?access_token=test123"
```

**iOS Simulator:**
```bash
xcrun simctl openurl booted \
  "com.homexrei.app://callback?access_token=test123"
```

#### Verify Token

Open app and check console or localStorage:
```javascript
localStorage.getItem('base44_access_token')
// Should show: test123
```

---

### 3. Test OAuth Login Flow

1. **Open the app**
2. **Click "Login" or "Sign In"**
3. **Authenticate in the browser**
4. **App should open automatically**
5. **You should be logged in**

---

## 🔍 How It Works

### OAuth Flow Diagram

```
┌─────────────┐
│  Mobile App │
│             │
│ [Login] ────┼──────────────────────────────┐
└─────────────┘                              │
                                             │
                                             ▼
                                    ┌────────────────┐
                                    │  Base44 OAuth  │
                                    │  (Browser)     │
                                    │                │
                                    │  User logs in  │
                                    └────────┬───────┘
                                             │
                                             │ Redirect to:
                                             │ com.homexrei.app://callback
                                             │ ?access_token=abc123
                                             │
                                             ▼
┌─────────────┐                    ┌────────────────┐
│  Mobile App │◄───────────────────┤   Mobile OS    │
│             │                    │                │
│ Extracts    │                    │ Opens app via  │
│ token from  │                    │ deep link      │
│ URL params  │                    └────────────────┘
│             │
│ Saves to    │
│ localStorage│
│             │
│ ✅ Logged in│
└─────────────┘
```

### Code Flow

1. **User clicks login**:
   ```typescript
   base44.auth.redirectToLogin('com.homexrei.app://callback');
   ```

2. **Browser opens Base44 OAuth page**

3. **User authenticates**

4. **Base44 redirects to**:
   ```
   com.homexrei.app://callback?access_token=abc123
   ```

5. **Mobile OS opens your app**

6. **App extracts token** (already implemented):
   ```typescript
   // In ../homexrei/src/lib/app-params.ts
   token: getAppParamValue("access_token", { removeFromUrl: true })
   ```

7. **Token saved to localStorage**:
   ```typescript
   localStorage.setItem('base44_access_token', token);
   ```

8. **User is logged in!**

---

## 🎯 Base44 Configuration

### Required Settings

**Redirect URI (Custom URL Scheme):**
```
com.homexrei.app://callback
```

### Optional: Universal Links (Production)

For better security in production, also add:
```
https://homexrei.com/auth/callback
```

Then follow the Universal Links setup in `DEEP_LINKING_SETUP.md`.

---

## 🧪 Testing Checklist

- [ ] Base44 redirect URI configured
- [ ] App built and installed on device/simulator
- [ ] Deep link test successful (token appears in localStorage)
- [ ] Login button opens browser
- [ ] OAuth page loads
- [ ] After login, app opens automatically
- [ ] User is logged in (can see authenticated content)

---

## 🐛 Common Issues

### Issue: Deep link doesn't open app

**Solution:**
```bash
# Reinstall the app
npm run sync:android  # or sync:ios
```

### Issue: OAuth redirects to browser, not app

**Cause:** Base44 redirect URI not configured

**Solution:** Add `com.homexrei.app://callback` to Base44 console

### Issue: Token not captured

**Check:**
1. URL in browser after OAuth: Should be `com.homexrei.app://callback?access_token=...`
2. localStorage: `localStorage.getItem('base44_access_token')`
3. Console logs in web app

### Issue: "App not installed" error

**Solution:** Make sure app is installed before testing OAuth flow

---

## 📱 Platform-Specific Notes

### Android

- Deep links work immediately after installation
- No additional setup needed
- Test with: `adb shell am start -W -a android.intent.action.VIEW -d "com.homexrei.app://callback?access_token=test"`

### iOS

- Deep links work immediately after installation
- No additional setup needed
- Test with: `xcrun simctl openurl booted "com.homexrei.app://callback?access_token=test"`

---

## 📚 Additional Resources

- **Full Documentation**: See `DEEP_LINKING_SETUP.md`
- **Capacitor Docs**: https://capacitorjs.com/docs/guides/deep-links
- **Base44 Docs**: https://base44.app/docs

---

## ✨ Summary

**You only need to do ONE thing:**

1. Add `com.homexrei.app://callback` to Base44 OAuth redirect URIs

Everything else is already configured! 🎉

**Then test:**
```bash
npm run sync:android
# Click login in app
# Should work!
```

