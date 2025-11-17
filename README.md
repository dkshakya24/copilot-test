# Arcutis Copilot - Next.js Micro-Frontend

A Copilot-style AI chat interface built with Next.js (App Router), TypeScript, and Tailwind CSS. Can be embedded as a lightweight micro-frontend in any website, including SharePoint, static pages, or CMS platforms.

## Features

- 🎨 Modern Copilot-style UI with dark mode support
- 💬 Real-time chat interface
- 📦 Lightweight micro-frontend bundle
- 🔌 Multiple embedding options (iframe, script, direct)
- 🎯 Optimized for performance
- 📱 Responsive design
- ♿ Accessible components

## Getting Started

### Development

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

1. Build the Next.js app:

```bash
npm run build
```

2. Generate the micro-frontend bundle:

```bash
npm run build:micro
```

The micro-frontend will be output to the `micro-frontend/` directory.

## Embedding Options

### Option 1: Iframe Embedding (Recommended)

Best for SharePoint, CMS, and static sites. Provides complete isolation.

```html
<div id="copilot-container" style="height: 600px; width: 100%;"></div>
<script>
  window.CopilotConfig = {
    containerId: "copilot-container",
    iframeSrc: "https://your-domain.com/embed",
    height: "600px",
    width: "100%",
    theme: "auto",
    apiEndpoint: "https://your-api-endpoint.com",
  };
</script>
<script src="https://your-domain.com/copilot-loader.js"></script>
```

### Option 2: Direct Integration

For Next.js or React applications:

```tsx
import CopilotChat from "@/components/CopilotChat";

export default function Page() {
  return <CopilotChat />;
}
```

### Option 3: SharePoint Integration

1. Upload the `micro-frontend` folder to SharePoint Document Library
2. Add a Script Editor Web Part or Content Editor
3. Use the iframe embedding code with the SharePoint URL

## Configuration

### API Integration

Update the `handleSend` function in `components/CopilotChat.tsx` to connect to your API:

```typescript
const response = await fetch("https://your-api-endpoint.com/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: userMessage.content }),
});
const data = await response.json();
```

### Theming

The component supports three theme modes:

- `light`: Light theme
- `dark`: Dark theme
- `auto`: Follows system preference (default)

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   ├── embed/
│   │   └── page.tsx        # Embeddable page
│   └── globals.css         # Global styles
├── components/
│   ├── CopilotChat.tsx     # Main chat component
│   └── CopilotEmbed.tsx    # Embeddable wrapper
├── scripts/
│   └── build-micro.js      # Micro-frontend build script
├── micro-frontend/         # Generated output (after build)
└── public/
    └── embed-example.html  # Example embedding
```

## Optimization

The micro-frontend build includes:

- ✅ Minified CSS
- ✅ Combined static assets
- ✅ Tree-shaking for unused code
- ✅ Code splitting
- ✅ Lazy loading support
- ✅ Iframe isolation to prevent conflicts

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
