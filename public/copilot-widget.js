/**
 * Copilot Widget Loader
 * Embed the Copilot chat widget in any external application
 * 
 * Usage:
 * <script src="https://your-domain.com/copilot-widget.js"></script>
 * <script>
 *   CopilotWidget.init({
 *     containerId: 'copilot-container',
 *     apiEndpoint: 'https://your-api.com',
 *     theme: 'auto'
 *   });
 * </script>
 */

(function(window, document) {
  'use strict';

  // Default configuration
  const defaultConfig = {
    containerId: 'copilot-container',
    iframeSrc: '/embed',
    height: '600px',
    width: '100%',
    theme: 'auto',
    apiEndpoint: '',
    position: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left', 'inline'
    zIndex: 9999,
    autoLoad: true
  };

  // Widget class
  function CopilotWidget(config) {
    this.config = Object.assign({}, defaultConfig, config);
    this.iframe = null;
    this.container = null;
    this.isLoaded = false;
  }

  // Initialize the widget
  CopilotWidget.prototype.init = function() {
    if (this.isLoaded) {
      console.warn('Copilot widget is already initialized');
      return;
    }

    // Get or create container
    this.container = this.getOrCreateContainer();
    
    // Create iframe
    this.createIframe();
    
    // Setup message listener
    this.setupMessageListener();
    
    this.isLoaded = true;
    
    // Dispatch ready event
    this.dispatchEvent('copilot:ready', { widget: this });
  };

  // Get or create container element
  CopilotWidget.prototype.getOrCreateContainer = function() {
    let container = document.getElementById(this.config.containerId);
    
    if (!container) {
      container = document.createElement('div');
      container.id = this.config.containerId;
      
      // Apply styles based on position
      if (this.config.position === 'inline') {
        container.style.width = this.config.width;
        container.style.height = this.config.height;
        container.style.position = 'relative';
      } else {
        // Floating position
        container.style.position = 'fixed';
        container.style.zIndex = this.config.zIndex;
        
        switch(this.config.position) {
          case 'bottom-right':
            container.style.bottom = '20px';
            container.style.right = '20px';
            break;
          case 'bottom-left':
            container.style.bottom = '20px';
            container.style.left = '20px';
            break;
          case 'top-right':
            container.style.top = '20px';
            container.style.right = '20px';
            break;
          case 'top-left':
            container.style.top = '20px';
            container.style.left = '20px';
            break;
        }
      }
      
      document.body.appendChild(container);
    }
    
    return container;
  };

  // Create iframe element
  CopilotWidget.prototype.createIframe = function() {
    this.iframe = document.createElement('iframe');
    
    // Build iframe URL with query parameters
    const url = new URL(this.config.iframeSrc, window.location.origin);
    if (this.config.theme) {
      url.searchParams.set('theme', this.config.theme);
    }
    if (this.config.apiEndpoint) {
      url.searchParams.set('apiEndpoint', this.config.apiEndpoint);
    }
    if (this.config.position) {
      url.searchParams.set('position', this.config.position);
    }
    
    this.iframe.src = url.toString();
    this.iframe.style.border = 'none';
    this.iframe.style.width = this.config.width;
    this.iframe.style.height = this.config.height;
    this.iframe.style.display = 'block';
    this.iframe.style.borderRadius = '12px';
    this.iframe.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
    this.iframe.setAttribute('allow', 'microphone; camera');
    this.iframe.setAttribute('title', 'AI Copilot Chat');
    this.iframe.setAttribute('loading', 'lazy');
    
    // Handle iframe load
    this.iframe.onload = () => {
      this.dispatchEvent('copilot:loaded', { iframe: this.iframe });
    };
    
    this.container.appendChild(this.iframe);
  };

  // Setup message listener for iframe communication
  CopilotWidget.prototype.setupMessageListener = function() {
    window.addEventListener('message', (event) => {
      // Security: Verify origin (in production, check against your domain)
      // if (event.origin !== 'https://your-domain.com') return;
      
      if (event.data && event.data.type && event.data.type.startsWith('copilot:')) {
        this.handleMessage(event.data);
      }
    });
  };

  // Handle messages from iframe
  CopilotWidget.prototype.handleMessage = function(data) {
    switch(data.type) {
      case 'copilot:message':
        this.dispatchEvent('copilot:message', data.payload);
        break;
      case 'copilot:error':
        this.dispatchEvent('copilot:error', data.payload);
        break;
      case 'copilot:resize':
        if (data.payload && data.payload.height) {
          this.iframe.style.height = data.payload.height + 'px';
        }
        break;
    }
  };

  // Send message to iframe
  CopilotWidget.prototype.sendMessage = function(type, payload) {
    if (this.iframe && this.iframe.contentWindow) {
      this.iframe.contentWindow.postMessage({
        type: type,
        payload: payload
      }, '*'); // In production, specify exact origin
    }
  };

  // Dispatch custom events
  CopilotWidget.prototype.dispatchEvent = function(eventName, detail) {
    const event = new CustomEvent(eventName, {
      detail: detail,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  };

  // Destroy widget
  CopilotWidget.prototype.destroy = function() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.iframe = null;
    this.container = null;
    this.isLoaded = false;
  };

  // Global API
  window.CopilotWidget = {
    // Create new widget instance
    init: function(config) {
      const widget = new CopilotWidget(config);
      widget.init();
      return widget;
    },
    
    // Create widget with default config
    create: function(containerId, options) {
      return this.init(Object.assign({ containerId: containerId }, options));
    }
  };

  // Auto-initialize if autoLoad is enabled
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (window.CopilotConfig && window.CopilotConfig.autoLoad !== false) {
        window.CopilotWidget.init(window.CopilotConfig);
      }
    });
  } else {
    if (window.CopilotConfig && window.CopilotConfig.autoLoad !== false) {
      window.CopilotWidget.init(window.CopilotConfig);
    }
  }

})(window, document);

