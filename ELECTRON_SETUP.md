# Electron Desktop App Setup - Implementation Summary

## What Was Implemented

This repository now supports building and distributing the Mermaid Sequence Diagram UI as a standalone desktop application using Electron.

## Files Added

1. **electron-main.js** - The main Electron process file that:
   - Creates the application window (1400x900px)
   - Loads the Angular application from the dist folder
   - Handles window lifecycle events
   - Implements security best practices (contextIsolation, no nodeIntegration)

2. **start-electron.sh** - Convenience script for quick testing:
   - Builds the Angular app for Electron
   - Launches the Electron application

## Files Modified

1. **package.json**:
   - Added Electron and electron-builder as dev dependencies
   - Added `main` entry point to electron-main.js
   - Added package metadata (version 1.0.0, description, author)
   - Added 9 new npm scripts for Electron development and packaging
   - Added electron-builder configuration with platform-specific settings

2. **.gitignore**:
   - Added `/release/` directory
   - Added Electron build artifacts (*.exe, *.dmg, *.AppImage, *.deb, *.rpm)

3. **angular.json**:
   - Added new "electron" build configuration optimized for desktop packaging

4. **README.md**:
   - Comprehensive documentation for running and building the Electron app
   - Instructions for all platforms (Windows, macOS, Linux)
   - Complete scripts reference

## Available NPM Scripts

### Development
- `npm run electron:dev` - Build and run the Electron app in development mode
- `npm run build:electron` - Build Angular app for Electron (development mode)
- `npm run electron` - Run Electron (requires build first)

### Production Packaging
- `npm run package` - Build distributable for current platform
- `npm run package:win` - Build Windows NSIS installer (.exe)
- `npm run package:mac` - Build macOS DMG disk image
- `npm run package:linux` - Build Linux AppImage and .deb packages

## How to Use

### Quick Test
```bash
npm run electron:dev
```

### Build Distributable
```bash
# For your current platform
npm run package

# Platform-specific
npm run package:win    # Windows
npm run package:mac    # macOS
npm run package:linux  # Linux
```

Distributable files will be created in the `release/` directory.

## Package Configuration

The electron-builder is configured with:
- **App ID**: com.mermaid-sequence-ui.app
- **Product Name**: Mermaid Sequence Diagram UI
- **Windows**: NSIS installer
- **macOS**: DMG disk image
- **Linux**: AppImage and Debian package

## Technical Details

- **Electron Version**: 38.2.1
- **electron-builder Version**: 26.0.12
- **Angular Build**: Uses development configuration with relative paths (base-href: ./)
- **Security**: Context isolation enabled, Node integration disabled
- **Window Size**: 1400x900 pixels

## Testing Status

✅ Electron dependencies installed successfully  
✅ Angular builds correctly for Electron  
✅ Electron main process created and configured  
✅ Package build process verified (tested with Linux)  
✅ Application files correctly bundled in app.asar  
✅ Build configuration validated  

## Known Limitations

- Production builds require internet access for Google Fonts inlining. The current setup uses development builds which work in offline environments.
- Icon files are not included (optional feature that can be added later)

## Next Steps for Users

1. Install dependencies: `npm install`
2. Test the Electron app: `npm run electron:dev`
3. Build distributables: `npm run package:win|mac|linux`
4. Find your executable in the `release/` directory

## Platform Requirements

- **Node.js**: v18 or higher recommended
- **npm**: Included with Node.js
- **For building**:
  - Windows builds: Windows or cross-compilation setup
  - macOS builds: macOS (due to code signing requirements)
  - Linux builds: Any platform

## Support

For issues or questions about the Electron implementation, refer to:
- [Electron Documentation](https://www.electronjs.org/docs/latest/)
- [electron-builder Documentation](https://www.electron.build/)
