# Capacitor iOS Setup Guide

This guide will help you set up your Gouache app for iOS using Capacitor.

## Prerequisites

1. **macOS** - Required for iOS development
2. **Xcode** - Install from Mac App Store (latest version recommended)
3. **Xcode Command Line Tools** - Run: `xcode-select --install`
4. **CocoaPods** - Install: `sudo gem install cocoapods`
5. **Apple Developer Account** - Required for App Store deployment ($99/year)

## Initial Setup

### Configuration Approach

This setup uses a **hybrid approach** where Capacitor loads your app from your production URL. This allows:
- ✅ API routes to work (they call your deployed server)
- ✅ Dynamic routes to work (no need for generateStaticParams)
- ✅ Full Next.js functionality
- ✅ Easy updates (just deploy to web, app updates automatically)

**Alternative:** If you want a fully offline app, you'll need to:
1. Convert all dynamic routes to use `generateStaticParams`
2. Enable static export in `next.config.js`
3. Pre-generate all pages at build time

### 1. Configure Production URL

The Capacitor config is set to load from `https://gouache.art` by default. You can override this:

```bash
# In capacitor.config.ts or via environment variable
CAPACITOR_SERVER_URL=https://gouache.art
```

### 2. Sync Capacitor

Sync the iOS project (creates the native project structure):

```bash
npm run cap:sync
```

Or specifically for iOS:

```bash
npm run build:ios
```

**Note:** With this approach, you don't need to build Next.js first - the app loads from your server.

### 3. Open in Xcode

Open the iOS project in Xcode:

```bash
npm run cap:open:ios
```

Or manually:
```bash
open ios/App/App.xcworkspace
```

## Important Notes

### API Routes

✅ **Your Next.js API routes WILL work in the native app!**

Since Capacitor loads your app from the production URL (`https://gouache.art`), all API routes work normally. The app makes requests to your deployed server, so:
- All `/api/*` routes work as expected
- No code changes needed for API calls
- Updates to your web app automatically reflect in the iOS app

**Optional:** I've created an API client utility (`src/lib/api-client.ts`) that can help with environment detection if needed, but it's not required with this setup.

### Environment Variables

Create a `.env.local` file for iOS-specific configuration:

```env
NEXT_PUBLIC_API_URL=https://gouache.art
NEXT_PUBLIC_FIREBASE_API_KEY=your-key
# ... other environment variables
```

## Development Workflow

1. **Make changes** to your Next.js app
2. **Build** the app: `npm run build`
3. **Sync** to iOS: `npm run cap:sync`
4. **Open in Xcode**: `npm run cap:open:ios`
5. **Run** from Xcode (or use `npm run cap:open:ios` and click Run)

## iOS Configuration

### App Icon and Splash Screen

1. Open `ios/App/App/Assets.xcassets/AppIcon.appiconset`
2. Add your app icons (various sizes required)
3. Configure splash screen in `capacitor.config.ts`

### Bundle Identifier

The app ID is set to `art.gouache.app` in `capacitor.config.ts`. You can change this if needed.

### Info.plist Configuration

You may need to configure:
- **Camera permissions** (if using camera)
- **Photo library permissions** (if uploading images)
- **Location permissions** (if using location features)
- **Network security** (for API calls)

Edit: `ios/App/App/Info.plist`

## Building for App Store

### 1. Configure Signing

1. Open Xcode project
2. Select the project in navigator
3. Go to "Signing & Capabilities"
4. Select your Team
5. Xcode will automatically manage provisioning

### 2. Update Version

In Xcode:
- Select project → General tab
- Update Version and Build number

### 3. Archive and Upload

1. Product → Archive
2. Once archived, click "Distribute App"
3. Follow the App Store Connect workflow

## Testing

### Simulator
- Run directly from Xcode to iOS Simulator

### Physical Device
1. Connect iPhone via USB
2. Select device in Xcode
3. Click Run (may need to trust developer certificate on device)

## Troubleshooting

### Build Errors

- **"Missing out directory"**: Run `npm run build` first
- **Pod install errors**: Run `cd ios/App && pod install`
- **Signing errors**: Check your Apple Developer account and certificates

### API Calls Not Working

- Ensure API calls point to your deployed server URL
- Check network security settings in Info.plist
- Use Capacitor HTTP plugin for better native support

### Images Not Loading

- Next.js Image optimization is disabled for static export
- All images use standard `<img>` tags
- Ensure image URLs are absolute (not relative)

## Next Steps

1. ✅ Capacitor is installed and configured
2. ✅ iOS platform is added
3. ⏭️ Build your app: `npm run build`
4. ⏭️ Sync to iOS: `npm run cap:sync`
5. ⏭️ Open in Xcode: `npm run cap:open:ios`
6. ⏭️ Configure app icons and splash screens
7. ⏭️ Update API endpoints to use production URL
8. ⏭️ Test on simulator/device
9. ⏭️ Submit to App Store

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Capacitor iOS Guide](https://capacitorjs.com/docs/ios)
- [App Store Connect](https://appstoreconnect.apple.com)
