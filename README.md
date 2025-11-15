# HomeXREI Mobile App

This is the **mobile wrapper** for the HomeXREI web application. It uses [Capacitor](https://capacitorjs.com/) to package the web app as native iOS and Android applications.

## 📁 Project Architecture

This project follows a **separated architecture** approach:

```
/Users/mvp/Documents/work/
├── homexrei/              # Web app (source of truth)
│   ├── src/               # All React components, pages, logic
│   ├── package.json       # Web dependencies
│   └── dist/              # Build output
│
└── homexrei-mobile/       # Mobile wrapper (this project)
    ├── android/           # Android native project
    ├── ios/               # iOS native project
    ├── capacitor.config.ts
    ├── package.json       # Only Capacitor dependencies
    └── dist/              # Copied from ../homexrei/dist
```

**Benefits:**
- ✅ Web and mobile projects are independent
- ✅ Smaller mobile repository (no web source code)
- ✅ Single source of truth for business logic
- ✅ Easier to maintain and test
- ✅ Different release cycles for web and mobile

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js & npm** - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
2. **Web app setup** - The `../homexrei` project must exist and have dependencies installed
3. **Android Studio** (for Android builds) - [Download](https://developer.android.com/studio)
4. **Xcode** (for iOS builds, macOS only) - [Download](https://developer.apple.com/xcode/)

### Installation

```bash
# 1. Install mobile dependencies
cd homexrei-mobile
npm install

# 2. Make sure web app dependencies are installed
cd ../homexrei
npm install
cd ../homexrei-mobile
```

---

## 💻 Development Workflow

### Option 1: Live Reload (Recommended for Development)

Run the web app dev server and connect mobile app to it for instant updates:

```bash
# Terminal 1: Start web dev server
cd ../homexrei
npm run dev
# Web app runs at http://localhost:8080

# Terminal 2: Run mobile app with live reload
cd homexrei-mobile
DEV_MODE=true npm run dev:android   # For Android
# or
DEV_MODE=true npm run dev:ios       # For iOS
```

**How it works:**
- Web app runs on `localhost:8080`
- Mobile app loads content from dev server
- Changes to web app instantly reflect in mobile app
- No rebuild needed!

### Option 2: Build and Test

Build the web app and test in mobile:

```bash
# Build web app, copy to mobile, sync, and open Android Studio
npm run sync:android

# Or for iOS
npm run sync:ios
```

---

## 📦 Available Scripts

### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Start web app dev server (in ../homexrei) |
| `npm run dev:android` | Run Android app (use with DEV_MODE=true for live reload) |
| `npm run dev:ios` | Run iOS app (use with DEV_MODE=true for live reload) |

### Build Scripts

| Command | Description |
|---------|-------------|
| `npm run build:web` | Build web app (runs in ../homexrei) |
| `npm run copy:dist` | Copy built files from web app to mobile |
| `npm run build` | Full build: web app → copy → sync Capacitor |
| `npm run sync` | Sync Capacitor (copies dist to native projects) |

### Platform Scripts

| Command | Description |
|---------|-------------|
| `npm run sync:android` | Build everything and open Android Studio |
| `npm run sync:ios` | Build everything and open Xcode |
| `npm run open:android` | Open Android Studio (without building) |
| `npm run open:ios` | Open Xcode (without building) |

---

## 🏗️ Production Build Process

### For Android

```bash
# 1. Build and sync
npm run sync:android

# 2. In Android Studio:
#    - Build → Generate Signed Bundle / APK
#    - Choose "Android App Bundle" (AAB)
#    - Sign with your keystore
#    - Build release

# 3. Upload AAB to Google Play Console
```

### For iOS

```bash
# 1. Build and sync
npm run sync:ios

# 2. In Xcode:
#    - Select "Any iOS Device" as target
#    - Product → Archive
#    - Distribute App → App Store Connect
#    - Upload to App Store

# 3. Submit for review in App Store Connect
```

---

## 🔧 Configuration

### Capacitor Config (`capacitor.config.ts`)

The config automatically switches between development and production modes:

```typescript
// Development: Point to web dev server
DEV_MODE=true npm run dev:android

// Production: Use built files from dist/
npm run build
```

### Environment Variables

- `DEV_MODE=true` - Enable live reload from web dev server

---

## 📱 Native Features

This mobile wrapper includes:

- ✅ Camera access (for property photos)
- ✅ File system access
- ✅ Network requests
- ✅ Push notifications (configurable)
- ✅ Deep linking (for OAuth, needs configuration)

---

## 🐛 Troubleshooting

### "dist folder not found"

```bash
# Build the web app first
npm run build:web
npm run copy:dist
```

### "Cannot connect to localhost:8080"

```bash
# Make sure web dev server is running
cd ../homexrei
npm run dev
```

### Android build fails

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run sync:android
```

### iOS build fails

```bash
# Update pods
cd ios/App
pod install
cd ../..
npm run sync:ios
```

---

## 📚 Technologies

- **Capacitor 7.4.4** - Native mobile wrapper
- **React 18.3.1** - UI framework (from web app)
- **TypeScript** - Type safety (from web app)
- **Base44 SDK** - Backend integration (from web app)
- **Android SDK** - Android native features
- **iOS SDK** - iOS native features

---

## 🔗 Related Projects

- **Web App**: `../homexrei` - Main application source code
- **Backend**: Base44.app - Backend-as-a-Service platform

---

## 📖 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Publishing Guide](https://developer.android.com/studio/publish)
- [iOS Publishing Guide](https://developer.apple.com/app-store/submissions/)
- [Base44 Documentation](https://base44.app/docs)

---

## 🤝 Contributing

1. Make changes to the **web app** (`../homexrei`)
2. Test in browser first
3. Test in mobile wrapper
4. Build and test native features
5. Submit for review

---

## 📄 License

Private project - All rights reserved
