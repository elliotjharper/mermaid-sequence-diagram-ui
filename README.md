# mermaid-sequence-diagram-ui

A user-friendly UI for creating and editing Mermaid sequence diagrams. Available as both a web application and a desktop app (Electron).

## Features

- Visual editing of Mermaid sequence diagrams
- Real-time preview
- Export diagrams
- Participant management
- Action sequencing

## Development

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Install Dependencies

```bash
npm install
```

### Run as Web Application

```bash
npm start
```

The application will be available at `http://localhost:4200/`

### Run as Desktop Application (Electron)

1. Build the Angular app for Electron:
```bash
npm run build:electron
```

2. Launch the Electron app:
```bash
npm run electron
```

Or combine both steps:
```bash
npm run electron:dev
```

## Building Desktop Executables

### Build for Current Platform

```bash
npm run package
```

This will create distributable files in the `release/` directory.

### Build for Specific Platforms

**Windows:**
```bash
npm run package:win
```
Outputs: `.exe` installer (NSIS)

**macOS:**
```bash
npm run package:mac
```
Outputs: `.dmg` disk image

**Linux:**
```bash
npm run package:linux
```
Outputs: `.AppImage` and `.deb` packages

## Scripts Reference

- `npm start` - Start development server (web)
- `npm run build` - Build for production (web)
- `npm run build:electron` - Build for Electron (development mode)
- `npm run build:electron:prod` - Build for Electron (production mode)
- `npm run electron` - Run the Electron app (requires build first)
- `npm run electron:dev` - Build and run Electron app
- `npm run package` - Build distributable for current platform
- `npm run package:win` - Build Windows installer
- `npm run package:mac` - Build macOS DMG
- `npm run package:linux` - Build Linux packages
- `npm test` - Run unit tests

## Project Structure

```
├── src/                    # Angular source files
├── public/                 # Static assets
├── electron-main.js        # Electron main process
├── dist/                   # Angular build output
└── release/                # Electron distributable output
```

## Technologies

- Angular 20
- Mermaid.js
- Electron
- TypeScript

## License

See LICENSE file for details.
