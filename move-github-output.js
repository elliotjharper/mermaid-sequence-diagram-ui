const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, 'dist-github-pages', 'browser');
const targetDir = path.join(__dirname, 'docs');

// Remove target directory if it exists
if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
}

// Move/rename the browser directory to docs
fs.renameSync(sourceDir, targetDir);

// Remove the now-empty dist-github-pages parent directory
fs.rmSync(path.join(__dirname, 'dist-github-pages'), { recursive: true, force: true });

console.log('✓ Files moved from dist-github-pages/browser to docs');
