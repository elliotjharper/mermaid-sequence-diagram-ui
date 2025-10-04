#!/bin/bash

# Quick start script for Mermaid Sequence Diagram UI (Electron)

echo "Building Angular app for Electron..."
npm run build:electron

if [ $? -eq 0 ]; then
  echo "Build successful! Starting Electron app..."
  npm run electron
else
  echo "Build failed. Please check the errors above."
  exit 1
fi
