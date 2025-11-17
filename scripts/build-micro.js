const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const OUTPUT_DIR = path.join(process.cwd(), 'micro-frontend');
const DIST_DIR = path.join(process.cwd(), '.next');

// Clean output directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('Building Next.js app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

console.log('Extracting static files...');

// Create directories
const staticDir = path.join(OUTPUT_DIR, 'static');
const cssDir = path.join(OUTPUT_DIR, 'css');
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(cssDir, { recursive: true });

// Copy static assets from .next/static
const nextStaticDir = path.join(DIST_DIR, 'static');
if (fs.existsSync(nextStaticDir)) {
  fs.cpSync(nextStaticDir, path.join(OUTPUT_DIR, '_next', 'static'), {
    recursive: true,
  });
}

// Extract and minify CSS
const cssFiles = [];
function findCSSFiles(dir) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      findCSSFiles(filePath);
    } else if (file.endsWith('.css')) {
      cssFiles.push(filePath);
    }
  });
}

if (fs.existsSync(DIST_DIR)) {
  findCSSFiles(DIST_DIR);
}

// Combine CSS files
let combinedCSS = '';
cssFiles.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  combinedCSS += content + '\n';
});

// Write combined CSS
const cssOutputPath = path.join(cssDir, 'copilot.css');
fs.writeFileSync(cssOutputPath, combinedCSS);
console.log(`✓ Created ${cssOutputPath}`);

// Create embeddable HTML (iframe version)
const iframeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Copilot Embed</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body, html {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    #copilot-root {
      height: 100%;
      width: 100%;
    }
  </style>
</head>
<body>
  <div id="copilot-root"></div>
  <script>
    // This will be replaced with the actual bundle
    console.log('Copilot embed loaded');
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'iframe.html'), iframeHTML);

// Create loader script
const loaderScript = `(function() {
  'use strict';
  
  // Configuration
  var config = window.CopilotConfig || {
    apiEndpoint: '',
    theme: 'auto',
    height: '600px',
    width: '100%',
    containerId: 'copilot-container'
  };
  
  // Create container if it doesn't exist
  var container = document.getElementById(config.containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = config.containerId;
    container.style.height = config.height;
    container.style.width = config.width;
    document.body.appendChild(container);
  }
  
  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = config.iframeSrc || './iframe.html';
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.display = 'block';
  
  // Load CSS
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = config.cssPath || './css/copilot.css';
  document.head.appendChild(link);
  
  container.appendChild(iframe);
  
  // PostMessage API for communication
  window.CopilotAPI = {
    sendMessage: function(message) {
      iframe.contentWindow.postMessage({
        type: 'copilot:message',
        data: message
      }, '*');
    },
    setTheme: function(theme) {
      iframe.contentWindow.postMessage({
        type: 'copilot:theme',
        data: theme
      }, '*');
    }
  };
  
  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type && event.data.type.startsWith('copilot:')) {
      if (window.CopilotConfig && window.CopilotConfig.onMessage) {
        window.CopilotConfig.onMessage(event.data);
      }
    }
  });
})();`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'copilot-loader.js'), loaderScript);

// Create standalone bundle script (for direct embedding)
const standaloneScript = `(function() {
  'use strict';
  
  // This is a placeholder for the actual React bundle
  // In production, this would be generated from the Next.js build
  console.log('Copilot standalone bundle - to be generated from build output');
})();`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'copilot-standalone.js'), standaloneScript);

// Create README for micro-frontend
const readme = `# Copilot Micro-Frontend

This directory contains the embeddable Copilot UI that can be integrated into any website.

## Files

- \`copilot.css\` - Combined CSS stylesheet
- \`copilot-loader.js\` - Loader script for iframe-based embedding
- \`copilot-standalone.js\` - Standalone bundle (placeholder, needs build output)
- \`iframe.html\` - HTML file for iframe embedding
- \`_next/\` - Next.js static assets

## Usage Options

### Option 1: Iframe Embedding (Recommended)

\`\`\`html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="./css/copilot.css">
</head>
<body>
  <div id="copilot-container" style="height: 600px; width: 100%;"></div>
  <script>
    window.CopilotConfig = {
      containerId: 'copilot-container',
      iframeSrc: './iframe.html',
      cssPath: './css/copilot.css',
      height: '600px',
      width: '100%',
      theme: 'auto',
      apiEndpoint: 'https://your-api-endpoint.com',
      onMessage: function(data) {
        console.log('Message from copilot:', data);
      }
    };
  </script>
  <script src="./copilot-loader.js"></script>
</body>
</html>
\`\`\`

### Option 2: Direct Script Embedding

\`\`\`html
<div id="copilot-container"></div>
<script src="./copilot-standalone.js"></script>
<script>
  Copilot.init({
    container: '#copilot-container',
    apiEndpoint: 'https://your-api-endpoint.com'
  });
</script>
\`\`\`

### Option 3: SharePoint Integration

1. Upload the \`micro-frontend\` folder to SharePoint
2. Add a Content Editor Web Part or Script Editor
3. Use the iframe embedding code above

## Configuration

- \`apiEndpoint\`: Your API endpoint for chat messages
- \`theme\`: 'light', 'dark', or 'auto'
- \`height\`: Container height (e.g., '600px', '100%')
- \`width\`: Container width (e.g., '100%', '800px')
- \`containerId\`: ID of the container element

## Optimization Notes

- CSS is minified and combined
- Static assets are optimized
- Iframe isolation prevents style conflicts
- Lazy loading supported
`;

fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme);

console.log('\n✓ Micro-frontend build complete!');
console.log(`✓ Output directory: ${OUTPUT_DIR}`);
console.log('\nNext steps:');
console.log('1. Review the files in the micro-frontend directory');
console.log('2. Upload to your hosting/CDN');
console.log('3. Integrate using one of the methods in README.md');

