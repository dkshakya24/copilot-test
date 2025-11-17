# Deployment Guide

This guide covers deploying the Copilot micro-frontend to various hosting platforms.

## Building for Production

### Step 1: Build the Next.js Application

```bash
npm install
npm run build
```

### Step 2: Generate Micro-Frontend Bundle

```bash
npm run build:micro
```

This creates the `micro-frontend/` directory with all necessary files.

## Deployment Options

### Option 1: Static Hosting (Recommended for Micro-Frontend)

#### Vercel

1. **Deploy the main app:**

   ```bash
   vercel
   ```

2. **Deploy micro-frontend separately:**
   - Upload `micro-frontend/` folder to Vercel
   - Or use Vercel CLI:
   ```bash
   cd micro-frontend
   vercel
   ```

#### Netlify

1. **Via Netlify CLI:**

   ```bash
   npm install -g netlify-cli
   cd micro-frontend
   netlify deploy --prod
   ```

2. **Via Netlify Dashboard:**
   - Drag and drop the `micro-frontend/` folder
   - Or connect to Git repository

#### GitHub Pages

1. **Build and commit:**

   ```bash
   npm run build:micro
   git add micro-frontend/
   git commit -m "Add micro-frontend bundle"
   git push
   ```

2. **Enable GitHub Pages:**
   - Go to repository Settings > Pages
   - Select source branch/folder
   - Set to `/micro-frontend` directory

#### AWS S3 + CloudFront

1. **Upload to S3:**

   ```bash
   aws s3 sync micro-frontend/ s3://your-bucket-name/copilot/ --delete
   ```

2. **Configure CloudFront:**
   - Create CloudFront distribution
   - Point to S3 bucket
   - Enable compression
   - Set cache headers

#### Azure Static Web Apps

1. **Install Azure CLI:**

   ```bash
   az login
   az staticwebapp create --name copilot-app --resource-group your-rg
   ```

2. **Deploy:**
   ```bash
   cd micro-frontend
   az staticwebapp deploy --name copilot-app --source .
   ```

### Option 2: CDN Hosting

#### Cloudflare Pages

1. **Via Dashboard:**

   - Go to Cloudflare Pages
   - Create new project
   - Upload `micro-frontend/` folder
   - Deploy

2. **Via Wrangler CLI:**
   ```bash
   npm install -g wrangler
   wrangler pages deploy micro-frontend/
   ```

### Option 3: SharePoint Hosting

1. **Upload to SharePoint:**

   - Navigate to SharePoint Document Library
   - Create folder: `copilot`
   - Upload all files from `micro-frontend/`
   - Note the URL path

2. **Update iframe source:**
   - Use SharePoint URL in embedding code:
   ```javascript
   iframeSrc: "/sites/yoursite/Shared%20Documents/copilot/iframe.html";
   ```

## Environment Variables

If you need to configure different API endpoints per environment:

### Development

```bash
NEXT_PUBLIC_API_ENDPOINT=http://localhost:3000/api/chat
```

### Production

```bash
NEXT_PUBLIC_API_ENDPOINT=https://api.yourdomain.com/chat
```

Update `components/CopilotChat.tsx` to use:

```typescript
const apiEndpoint =
  process.env.NEXT_PUBLIC_API_ENDPOINT || "https://api.yourdomain.com/chat";
```

## Optimization Checklist

- [ ] Enable Gzip/Brotli compression on server
- [ ] Set appropriate cache headers
- [ ] Minify CSS and JavaScript
- [ ] Use CDN for static assets
- [ ] Enable HTTP/2 or HTTP/3
- [ ] Implement lazy loading
- [ ] Add service worker for offline support (optional)
- [ ] Optimize images (if any)
- [ ] Enable browser caching

## Cache Headers

Recommended cache headers for different file types:

```
# CSS and JS (versioned)
/css/copilot.css: Cache-Control: public, max-age=31536000, immutable

# HTML
/iframe.html: Cache-Control: public, max-age=3600

# Static assets
/_next/static/*: Cache-Control: public, max-age=31536000, immutable
```

## Monitoring

### Performance Monitoring

Add performance tracking:

```javascript
// In copilot-loader.js
window.addEventListener("load", function () {
  if (window.performance && window.performance.timing) {
    const loadTime =
      window.performance.timing.loadEventEnd -
      window.performance.timing.navigationStart;
    console.log("Copilot load time:", loadTime + "ms");

    // Send to analytics
    if (window.CopilotConfig && window.CopilotConfig.onLoad) {
      window.CopilotConfig.onLoad({ loadTime });
    }
  }
});
```

### Error Tracking

Add error handling:

```javascript
window.addEventListener("error", function (event) {
  if (event.filename && event.filename.includes("copilot")) {
    // Send to error tracking service
    console.error("Copilot error:", event);
  }
});
```

## Security Headers

Add security headers to your hosting configuration:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

## Testing Deployment

1. **Test iframe loading:**

   ```bash
   curl -I https://your-domain.com/iframe.html
   ```

2. **Test CSS loading:**

   ```bash
   curl -I https://your-domain.com/css/copilot.css
   ```

3. **Test loader script:**

   ```bash
   curl -I https://your-domain.com/copilot-loader.js
   ```

4. **Browser testing:**
   - Test in Chrome, Firefox, Safari, Edge
   - Test on mobile devices
   - Test with different network conditions

## Rollback Plan

1. **Keep previous versions:**

   - Version your deployments
   - Keep backup of previous `micro-frontend/` builds

2. **Quick rollback:**
   ```bash
   # Restore previous version
   aws s3 sync s3://your-bucket/copilot/v1.0.0/ s3://your-bucket/copilot/ --delete
   ```

## CI/CD Pipeline Example

### GitHub Actions

```yaml
name: Deploy Micro-Frontend

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "18"
      - run: npm install
      - run: npm run build
      - run: npm run build:micro
      - name: Deploy to S3
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - run: aws s3 sync micro-frontend/ s3://your-bucket/copilot/ --delete
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
```

## Troubleshooting

### Build Fails

- Check Node.js version (should be 18+)
- Clear `.next` and `node_modules`, reinstall
- Check for TypeScript errors

### Files Not Loading

- Verify file paths are correct
- Check CORS settings
- Verify file permissions on server

### Performance Issues

- Enable compression
- Use CDN
- Check bundle size
- Optimize images
