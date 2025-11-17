# Copilot Micro-Frontend

This directory contains the embeddable Copilot UI that can be integrated into any website.

## Files

- `copilot.css` - Combined CSS stylesheet
- `copilot-loader.js` - Loader script for iframe-based embedding
- `copilot-standalone.js` - Standalone bundle (placeholder, needs build output)
- `iframe.html` - HTML file for iframe embedding
- `_next/` - Next.js static assets

## Usage Options

### Option 1: Iframe Embedding (Recommended)

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
```

### Option 2: Direct Script Embedding

```html
<div id="copilot-container"></div>
<script src="./copilot-standalone.js"></script>
<script>
  Copilot.init({
    container: '#copilot-container',
    apiEndpoint: 'https://your-api-endpoint.com'
  });
</script>
```

### Option 3: SharePoint Integration

1. Upload the `micro-frontend` folder to SharePoint
2. Add a Content Editor Web Part or Script Editor
3. Use the iframe embedding code above

## Configuration

- `apiEndpoint`: Your API endpoint for chat messages
- `theme`: 'light', 'dark', or 'auto'
- `height`: Container height (e.g., '600px', '100%')
- `width`: Container width (e.g., '100%', '800px')
- `containerId`: ID of the container element

## Optimization Notes

- CSS is minified and combined
- Static assets are optimized
- Iframe isolation prevents style conflicts
- Lazy loading supported
