# SharePoint Integration Guide

This guide explains how to embed the Copilot chat widget into SharePoint pages and other external applications.

## Overview

The Copilot widget can be embedded in SharePoint using three methods:

1. **Widget Script** (Recommended) - Easy integration with automatic initialization
2. **Direct Iframe** - Simple HTML iframe embedding
3. **SharePoint Web Part** - Custom SharePoint Framework (SPFx) solution

## Prerequisites

- Your Next.js app must be deployed and accessible via HTTPS
- The embed endpoint (`/embed`) must be publicly accessible
- SharePoint site with appropriate permissions to add custom scripts

## Method 1: Widget Script (Recommended)

This is the easiest method and provides the most flexibility.

### Step 1: Add the Widget Script

In your SharePoint page, add a **Script Editor Web Part** or use **Modern Script Editor**:

```html
<!-- Add this in the Script Editor Web Part -->
<script src="https://your-domain.com/copilot-widget.js"></script>
<script>
  // Configure the widget
  window.CopilotConfig = {
    containerId: "copilot-container",
    iframeSrc: "https://your-domain.com/embed",
    height: "600px",
    width: "100%",
    theme: "auto", // 'light', 'dark', or 'auto'
    position: "bottom-right", // 'bottom-right', 'bottom-left', 'top-right', 'top-left', or 'inline'
    apiEndpoint: "https://your-api-endpoint.com",
    zIndex: 9999,
    autoLoad: true,
  };
</script>
```

### Step 2: For Inline Embedding

If you want the widget to appear inline (not floating), add a container div:

```html
<div id="copilot-container" style="width: 100%; height: 600px;"></div>
<script src="https://your-domain.com/copilot-widget.js"></script>
<script>
  window.CopilotConfig = {
    containerId: "copilot-container",
    iframeSrc: "https://your-domain.com/embed",
    position: "inline", // Important: set to 'inline' for container-based embedding
    theme: "auto",
    autoLoad: true,
  };
</script>
```

### Step 3: Advanced Configuration

You can also initialize the widget programmatically:

```html
<script src="https://your-domain.com/copilot-widget.js"></script>
<script>
  // Wait for DOM to be ready
  document.addEventListener("DOMContentLoaded", function () {
    const widget = CopilotWidget.init({
      containerId: "copilot-container",
      iframeSrc: "https://your-domain.com/embed",
      position: "bottom-right",
      theme: "light",
      apiEndpoint: "https://your-api.com",
      height: "600px",
      width: "400px",
    });

    // Listen to widget events
    document.addEventListener("copilot:ready", function (event) {
      console.log("Copilot widget is ready!", event.detail);
    });

    document.addEventListener("copilot:message", function (event) {
      console.log("Message from copilot:", event.detail);
    });
  });
</script>
```

## Method 2: Direct Iframe Embedding

For simple embedding without the widget script:

### In SharePoint Script Editor:

```html
<div id="copilot-iframe-container" style="width: 100%; height: 600px;">
  <iframe
    src="https://your-domain.com/embed?theme=auto&position=inline"
    style="width: 100%; height: 100%; border: none; border-radius: 12px;"
    title="AI Copilot Chat"
    allow="microphone; camera"
  >
  </iframe>
</div>
```

### For Floating Bubble:

```html
<div
  style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; width: 400px; height: 600px;"
>
  <iframe
    src="https://your-domain.com/embed?theme=auto&position=bubble"
    style="width: 100%; height: 100%; border: none; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);"
    title="AI Copilot Chat"
    allow="microphone; camera"
  >
  </iframe>
</div>
```

## Method 3: SharePoint Framework (SPFx) Web Part

For a more integrated SharePoint experience, create a custom SPFx web part:

### 1. Create SPFx Project

```bash
yo @microsoft/sharepoint
```

### 2. Install Dependencies

```bash
npm install --save @microsoft/sp-core-library @microsoft/sp-webpart-base
```

### 3. Web Part Code Example

```typescript
import * as React from "react";
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";

export interface ICopilotWebPartProps {
  widgetUrl: string;
  apiEndpoint: string;
  theme: string;
}

export default class CopilotWebPart extends BaseClientSideWebPart<ICopilotWebPartProps> {
  public render(): void {
    const widgetUrl =
      this.properties.widgetUrl || "https://your-domain.com/embed";
    const theme = this.properties.theme || "auto";
    const apiEndpoint = this.properties.apiEndpoint || "";

    const iframeUrl = `${widgetUrl}?theme=${theme}&apiEndpoint=${encodeURIComponent(
      apiEndpoint
    )}&position=inline`;

    this.domElement.innerHTML = `
      <div style="width: 100%; height: 600px;">
        <iframe 
          src="${iframeUrl}"
          style="width: 100%; height: 100%; border: none; border-radius: 12px;"
          title="AI Copilot Chat"
          allow="microphone; camera">
        </iframe>
      </div>
    `;
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: "Configure Copilot Widget",
          },
          groups: [
            {
              groupName: "Settings",
              groupFields: [
                PropertyPaneTextField("widgetUrl", {
                  label: "Widget URL",
                  value: "https://your-domain.com/embed",
                }),
                PropertyPaneTextField("apiEndpoint", {
                  label: "API Endpoint",
                }),
                PropertyPaneTextField("theme", {
                  label: "Theme",
                  description: "light, dark, or auto",
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
```

## Configuration Options

### Widget Configuration Parameters

| Parameter     | Type    | Default               | Description                                                                             |
| ------------- | ------- | --------------------- | --------------------------------------------------------------------------------------- |
| `containerId` | string  | `'copilot-container'` | ID of the container element                                                             |
| `iframeSrc`   | string  | `'/embed'`            | URL to the embed page                                                                   |
| `height`      | string  | `'600px'`             | Height of the widget                                                                    |
| `width`       | string  | `'100%'`              | Width of the widget                                                                     |
| `theme`       | string  | `'auto'`              | Theme: `'light'`, `'dark'`, or `'auto'`                                                 |
| `position`    | string  | `'bottom-right'`      | Position: `'bottom-right'`, `'bottom-left'`, `'top-right'`, `'top-left'`, or `'inline'` |
| `apiEndpoint` | string  | `''`                  | Your API endpoint URL                                                                   |
| `zIndex`      | number  | `9999`                | CSS z-index for floating widget                                                         |
| `autoLoad`    | boolean | `true`                | Automatically initialize on page load                                                   |

### URL Query Parameters

You can also pass configuration via URL parameters:

- `?theme=light` - Set theme
- `?apiEndpoint=https://api.example.com` - Set API endpoint
- `?position=inline` - Set position mode

## Event Handling

The widget dispatches custom events that you can listen to:

```javascript
// Widget is ready
document.addEventListener("copilot:ready", function (event) {
  console.log("Widget ready:", event.detail);
});

// Message received from copilot
document.addEventListener("copilot:message", function (event) {
  console.log("Message:", event.detail);
});

// Error occurred
document.addEventListener("copilot:error", function (event) {
  console.error("Error:", event.detail);
});

// Widget loaded
document.addEventListener("copilot:loaded", function (event) {
  console.log("Iframe loaded:", event.detail);
});
```

## Security Considerations

### Content Security Policy (CSP)

SharePoint may have CSP restrictions. You may need to:

1. **Add to SharePoint CSP**: Allow your domain in SharePoint's Content Security Policy
2. **Update Next.js CSP**: Ensure your Next.js app allows embedding (already configured in `next.config.mjs`)

### Origin Verification

In production, update the widget script to verify message origins:

```javascript
// In copilot-widget.js, update the message listener:
window.addEventListener("message", (event) => {
  // Verify origin
  if (event.origin !== "https://your-trusted-domain.com") {
    return; // Reject messages from untrusted origins
  }
  // ... handle message
});
```

### Authentication

If your widget requires authentication:

1. **Token-based**: Pass tokens via URL parameters (use HTTPS only)
2. **Cookie-based**: Ensure cookies are set with appropriate SameSite attributes
3. **OAuth**: Implement OAuth flow in the parent application

## Troubleshooting

### Widget Not Appearing

1. **Check Console**: Open browser DevTools and check for errors
2. **Verify URL**: Ensure the widget script URL is accessible
3. **CSP Issues**: Check if Content Security Policy is blocking the script
4. **Permissions**: Verify SharePoint permissions allow custom scripts

### Iframe Blocked

1. **X-Frame-Options**: Ensure your Next.js app allows iframe embedding (configured in `next.config.mjs`)
2. **CSP frame-ancestors**: Verify the CSP header allows SharePoint domain
3. **HTTPS**: Both SharePoint and your app must use HTTPS

### Styling Issues

1. **Container Size**: Ensure the container has explicit width and height
2. **Z-Index**: Adjust z-index if widget is hidden behind other elements
3. **Responsive**: Test on different screen sizes

## Testing

### Local Testing

1. Run your Next.js app: `npm run dev`
2. Test the embed page: `http://localhost:3000/embed`
3. Test widget script: `http://localhost:3000/copilot-widget.js`

### SharePoint Testing

1. Deploy your Next.js app to production
2. Update widget URLs to production domain
3. Add to SharePoint test page
4. Test in different browsers and devices

## Example: Complete SharePoint Integration

Here's a complete example for SharePoint:

```html
<!-- SharePoint Script Editor Web Part -->
<div id="copilot-widget-container"></div>

<script src="https://your-production-domain.com/copilot-widget.js"></script>
<script>
  // Configuration
  window.CopilotConfig = {
    containerId: "copilot-widget-container",
    iframeSrc: "https://your-production-domain.com/embed",
    position: "bottom-right",
    theme: "auto",
    apiEndpoint: "https://your-api.com/v1/chat",
    height: "600px",
    width: "400px",
    zIndex: 9999,
    autoLoad: true,
  };

  // Event listeners
  document.addEventListener("copilot:ready", function (event) {
    console.log("Copilot widget initialized successfully");
    // You can perform additional setup here
  });

  document.addEventListener("copilot:message", function (event) {
    // Handle messages from the copilot
    console.log("Copilot message:", event.detail);
  });
</script>
```

## Support

For issues or questions:

1. Check the browser console for errors
2. Verify network requests in DevTools
3. Test the embed URL directly in a browser
4. Review Next.js server logs

## Next Steps

1. **Deploy your Next.js app** to a production environment
2. **Update widget URLs** in SharePoint to point to production
3. **Configure authentication** if needed
4. **Test thoroughly** in SharePoint environment
5. **Monitor performance** and user feedback
