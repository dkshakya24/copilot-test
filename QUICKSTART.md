# Quick Start Guide

Get up and running with the Copilot UI in minutes.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

## Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Building for Production

### Standard Next.js Build

```bash
npm run build
npm start
```

### Micro-Frontend Build

To create the embeddable bundle:

```bash
npm run build:micro
```

This creates a `micro-frontend/` directory with:
- `copilot.css` - All styles
- `copilot-loader.js` - Loader script
- `iframe.html` - Embeddable HTML
- `_next/` - Static assets

## Quick Embed Test

1. **Build the micro-frontend:**
   ```bash
   npm run build:micro
   ```

2. **Open the example:**
   ```bash
   # Serve the micro-frontend directory
   cd micro-frontend
   python3 -m http.server 8000
   # Or use any static file server
   ```

3. **Open in browser:**
   Navigate to `http://localhost:8000/iframe.html`

## Embedding in Your Site

### Minimal Example

```html
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
      apiEndpoint: 'https://your-api.com/chat'
    };
  </script>
  <script src="./copilot-loader.js"></script>
</body>
</html>
```

## Next Steps

- 📖 Read [README.md](./README.md) for full documentation
- 🔌 See [INTEGRATION.md](./INTEGRATION.md) for platform-specific guides
- 🚀 Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment options
- ⚙️ Configure your API endpoint in `components/CopilotChat.tsx`

## Troubleshooting

### Port Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Build Errors
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Support

For issues or questions:
1. Check the documentation files
2. Review the example code
3. Check browser console for errors

