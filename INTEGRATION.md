# Integration Guide

This guide explains how to integrate the Copilot UI into different platforms.

## SharePoint Integration

### Method 1: Script Editor Web Part (Classic SharePoint)

1. **Upload Files to SharePoint**

   - Upload the entire `micro-frontend` folder to a SharePoint Document Library
   - Note the URL path (e.g., `/sites/yoursite/Shared%20Documents/copilot/`)

2. **Add Script Editor Web Part**
   - Edit the page where you want to embed Copilot
   - Add a "Script Editor" web part
   - Insert the following code:

```html
<div id="copilot-container" style="height: 600px; width: 100%;"></div>
<script>
  window.CopilotConfig = {
    containerId: "copilot-container",
    iframeSrc: "https://your-domain.com/embed",
    // Or use SharePoint URL:
    // iframeSrc: '/sites/yoursite/Shared%20Documents/copilot/iframe.html',
    height: "600px",
    width: "100%",
    theme: "auto",
    apiEndpoint: "https://your-api-endpoint.com/api/chat",
  };
</script>
<script src="https://your-domain.com/copilot-loader.js"></script>
```

### Method 2: Modern SharePoint (SPFx)

Create a SharePoint Framework extension:

```typescript
// src/extensions/copilot/CopilotApplicationCustomizer.ts
import { ApplicationCustomizerContext } from "@microsoft/sp-application-base";
import * as React from "react";

export default class CopilotApplicationCustomizer {
  public onInit(context: ApplicationCustomizerContext): Promise<void> {
    // Load Copilot
    const script = document.createElement("script");
    script.src = "https://your-domain.com/copilot-loader.js";
    document.head.appendChild(script);

    window.CopilotConfig = {
      containerId: "copilot-container",
      iframeSrc: "https://your-domain.com/embed",
      apiEndpoint: "https://your-api-endpoint.com/api/chat",
    };

    return Promise.resolve();
  }
}
```

## Static HTML Page Integration

### Simple HTML Page

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My Page with Copilot</title>
    <link rel="stylesheet" href="./css/copilot.css" />
  </head>
  <body>
    <h1>Welcome to My Site</h1>

    <!-- Copilot Container -->
    <div
      id="copilot-container"
      style="height: 600px; width: 100%; max-width: 1200px; margin: 20px auto;"
    ></div>

    <script>
      window.CopilotConfig = {
        containerId: "copilot-container",
        iframeSrc: "./iframe.html",
        cssPath: "./css/copilot.css",
        height: "600px",
        width: "100%",
        theme: "auto",
        apiEndpoint: "https://your-api-endpoint.com/api/chat",
        onMessage: function (data) {
          console.log("Copilot message:", data);
        },
      };
    </script>
    <script src="./copilot-loader.js"></script>
  </body>
</html>
```

## CMS Integration (WordPress, Drupal, etc.)

### WordPress

1. **Using Custom HTML Block**

   - Add a "Custom HTML" block
   - Insert the embedding code from the static HTML example above

2. **Using a Plugin**
   - Create a shortcode plugin:

```php
<?php
// copilot-shortcode.php
function copilot_shortcode($atts) {
    $atts = shortcode_atts(array(
        'height' => '600px',
        'width' => '100%',
        'theme' => 'auto',
    ), $atts);

    return '<div id="copilot-container" style="height: ' . esc_attr($atts['height']) . '; width: ' . esc_attr($atts['width']) . ';"></div>
    <script>
      window.CopilotConfig = {
        containerId: "copilot-container",
        iframeSrc: "https://your-domain.com/embed",
        height: "' . esc_js($atts['height']) . '",
        width: "' . esc_js($atts['width']) . '",
        theme: "' . esc_js($atts['theme']) . '",
        apiEndpoint: "https://your-api-endpoint.com/api/chat"
      };
    </script>
    <script src="https://your-domain.com/copilot-loader.js"></script>';
}
add_shortcode('copilot', 'copilot_shortcode');
```

Usage: `[copilot height="600px" theme="dark"]`

### Drupal

Create a custom block:

```php
<?php
// modules/custom/copilot_block/src/Plugin/Block/CopilotBlock.php
namespace Drupal\copilot_block\Plugin\Block;

use Drupal\Core\Block\BlockBase;

/**
 * @Block(
 *   id = "copilot_block",
 *   admin_label = @Translation("Copilot Chat")
 * )
 */
class CopilotBlock extends BlockBase {
  public function build() {
    return [
      '#markup' => '<div id="copilot-container" style="height: 600px; width: 100%;"></div>',
      '#attached' => [
        'library' => ['copilot_block/copilot'],
        'drupalSettings' => [
          'copilot' => [
            'iframeSrc' => 'https://your-domain.com/embed',
            'apiEndpoint' => 'https://your-api-endpoint.com/api/chat',
          ],
        ],
      ],
    ];
  }
}
```

## React/Next.js Integration

### Direct Component Import

```tsx
import CopilotChat from "@/components/CopilotChat";

export default function Page() {
  return (
    <div>
      <h1>My App</h1>
      <CopilotChat />
    </div>
  );
}
```

### As a Micro-Frontend

```tsx
"use client";

import { useEffect } from "react";

export default function CopilotWidget() {
  useEffect(() => {
    // Load Copilot script
    const script = document.createElement("script");
    script.src = "https://your-domain.com/copilot-loader.js";
    script.async = true;
    document.head.appendChild(script);

    window.CopilotConfig = {
      containerId: "copilot-container",
      iframeSrc: "https://your-domain.com/embed",
      apiEndpoint: "https://your-api-endpoint.com/api/chat",
    };

    return () => {
      // Cleanup
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div id="copilot-container" style={{ height: "600px", width: "100%" }} />
  );
}
```

## API Configuration

### Setting Up Your API Endpoint

Update the `handleSend` function in `components/CopilotChat.tsx`:

```typescript
const handleSend = async () => {
  if (!input.trim() || isLoading) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    role: "user",
    content: input.trim(),
    timestamp: new Date(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setInput("");
  setIsLoading(true);

  try {
    const response = await fetch("https://your-api-endpoint.com/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer YOUR_API_KEY", // If needed
      },
      body: JSON.stringify({
        message: userMessage.content,
        conversationId: conversationId, // If maintaining context
      }),
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const data = await response.json();

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: data.response || data.message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
  } catch (error) {
    console.error("Error:", error);
    const errorMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Sorry, I encountered an error. Please try again.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setIsLoading(false);
  }
};
```

## Security Considerations

1. **CSP (Content Security Policy)**

   - If your site uses CSP, add the Copilot domain to allowed sources:

   ```
   script-src 'self' https://your-domain.com;
   frame-src 'self' https://your-domain.com;
   ```

2. **CORS**

   - Ensure your API endpoint allows requests from the embedding domain
   - Configure CORS headers appropriately

3. **API Keys**
   - Never expose API keys in client-side code
   - Use server-side proxy for API calls if needed

## Performance Optimization

1. **Lazy Loading**

   ```html
   <script>
     window.addEventListener("load", function () {
       // Load Copilot after page load
       const script = document.createElement("script");
       script.src = "https://your-domain.com/copilot-loader.js";
       document.head.appendChild(script);
     });
   </script>
   ```

2. **CDN Hosting**

   - Host the micro-frontend files on a CDN for faster loading
   - Use versioned URLs for cache busting

3. **Preconnect**
   ```html
   <link rel="preconnect" href="https://your-domain.com" />
   <link rel="dns-prefetch" href="https://your-domain.com" />
   ```

## Troubleshooting

### Iframe Not Loading

- Check browser console for errors
- Verify iframe source URL is correct
- Check CORS settings

### Styles Not Applying

- Ensure CSS file is loaded before the script
- Check for CSS conflicts with parent page
- Verify CSS path is correct

### API Not Responding

- Check network tab for API requests
- Verify API endpoint URL
- Check CORS configuration
- Verify API authentication if required
