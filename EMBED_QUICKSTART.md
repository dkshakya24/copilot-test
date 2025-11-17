# Quick Start: Embedding Copilot Widget

## For SharePoint or Any External App

### Step 1: Deploy Your Next.js App

Make sure your Next.js app is deployed and accessible via HTTPS:

```bash
npm run build
npm run start
# Or deploy to Vercel, Azure, AWS, etc.
```

### Step 2: Add Widget to Your Page

Copy and paste this code into your SharePoint Script Editor or any HTML page:

```html
<!-- Replace 'your-domain.com' with your actual domain -->
<script src="https://your-domain.com/copilot-widget.js"></script>
<script>
  window.CopilotConfig = {
    containerId: "copilot-container",
    iframeSrc: "https://your-domain.com/embed",
    position: "bottom-right", // or 'inline' for inline embedding
    theme: "auto",
    apiEndpoint: "https://your-api.com", // Optional: your API endpoint
    height: "600px",
    width: "400px",
    autoLoad: true,
  };
</script>

<!-- For inline embedding, add a container -->
<div id="copilot-container" style="height: 600px; width: 100%;"></div>
```

### Step 3: Test

1. Open your SharePoint page or external app
2. The widget should appear in the bottom-right corner (or inline if configured)
3. Click the chat button to open the copilot

## Configuration Options

| Option        | Values                                                                     | Default          | Description       |
| ------------- | -------------------------------------------------------------------------- | ---------------- | ----------------- |
| `position`    | `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'`, `'inline'` | `'bottom-right'` | Widget position   |
| `theme`       | `'light'`, `'dark'`, `'auto'`                                              | `'auto'`         | Color theme       |
| `height`      | CSS value                                                                  | `'600px'`        | Widget height     |
| `width`       | CSS value                                                                  | `'400px'`        | Widget width      |
| `apiEndpoint` | URL string                                                                 | `''`             | Your API endpoint |

## Alternative: Direct Iframe

If you prefer a simple iframe:

```html
<iframe
  src="https://your-domain.com/embed?theme=auto&position=bubble"
  style="width: 400px; height: 600px; border: none; border-radius: 12px;"
  title="AI Copilot Chat"
>
</iframe>
```

## Need Help?

- See [SHAREPOINT_INTEGRATION.md](./SHAREPOINT_INTEGRATION.md) for detailed SharePoint instructions
- Test locally: `http://localhost:3000/embed-example.html`
- Check browser console for errors
