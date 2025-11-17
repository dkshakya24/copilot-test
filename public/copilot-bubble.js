/**
 * Copilot Bubble - Auto-injecting Chat Widget
 * Works like Intercom/Yellow.ai - just add the script and it works!
 * 
 * Usage in SharePoint:
 * <script src="https://copilot-test-theta.vercel.app/copilot-bubble.js"></script>
 * 
 * That's it! The bubble will automatically appear.
 */

(function(window, document) {
  'use strict';

  // Prevent multiple initializations
  if (window.CopilotBubbleLoaded) {
    return;
  }
  window.CopilotBubbleLoaded = true;

  // Configuration - can be overridden via window.CopilotBubbleConfig
  const config = Object.assign({
    appId: window.CopilotBubbleConfig?.appId || 'default',
    apiEndpoint: window.CopilotBubbleConfig?.apiEndpoint || '',
    widgetUrl: window.CopilotBubbleConfig?.widgetUrl || 'https://copilot-test-theta.vercel.app/embed',
    position: window.CopilotBubbleConfig?.position || 'bottom-right',
    theme: window.CopilotBubbleConfig?.theme || 'auto',
    zIndex: window.CopilotBubbleConfig?.zIndex || 999999,
    primaryColor: window.CopilotBubbleConfig?.primaryColor || '#2563eb',
    bubbleText: window.CopilotBubbleConfig?.bubbleText || 'AI',
  }, window.CopilotBubbleConfig || {});

  // State
  let isOpen = false;
  let iframe = null;
  let bubbleContainer = null;
  let chatWindow = null;

  // Create styles
  function injectStyles() {
    if (document.getElementById('copilot-bubble-styles')) return;

    const style = document.createElement('style');
    style.id = 'copilot-bubble-styles';
    style.textContent = `
      .copilot-bubble-container {
        position: fixed;
        z-index: ${config.zIndex};
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      }
      .copilot-bubble-container.bottom-right {
        bottom: 20px;
        right: 20px;
      }
      .copilot-bubble-container.bottom-left {
        bottom: 20px;
        left: 20px;
      }
      .copilot-bubble-container.top-right {
        top: 20px;
        right: 20px;
      }
      .copilot-bubble-container.top-left {
        top: 20px;
        left: 20px;
      }
      .copilot-bubble-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${config.primaryColor} 0%, ${config.primaryColor}dd 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
        transition: all 0.3s ease;
        position: relative;
      }
      .copilot-bubble-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
      }
      .copilot-bubble-button:active {
        transform: scale(0.95);
      }
      .copilot-bubble-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: #ef4444;
        color: white;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border: 2px solid white;
      }
      .copilot-chat-window {
        position: absolute;
        width: 380px;
        height: 600px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 100px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s ease;
        opacity: 0;
        transform: scale(0.9) translateY(10px);
        pointer-events: none;
      }
      .copilot-chat-window.open {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: all;
      }
      .copilot-chat-window.bottom-right {
        bottom: 80px;
        right: 0;
      }
      .copilot-chat-window.bottom-left {
        bottom: 80px;
        left: 0;
      }
      .copilot-chat-window.top-right {
        top: 80px;
        right: 0;
      }
      .copilot-chat-window.top-left {
        top: 80px;
        left: 0;
      }
      .copilot-chat-iframe {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
      @media (max-width: 480px) {
        .copilot-chat-window {
          width: calc(100vw - 20px);
          height: calc(100vh - 100px);
        }
        .copilot-chat-window.bottom-right,
        .copilot-chat-window.bottom-left {
          bottom: 80px;
          left: 10px;
          right: 10px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create bubble button
  function createBubble() {
    bubbleContainer = document.createElement('div');
    bubbleContainer.className = `copilot-bubble-container ${config.position}`;
    bubbleContainer.id = 'copilot-bubble-container';

    const button = document.createElement('button');
    button.className = 'copilot-bubble-button';
    button.setAttribute('aria-label', 'Open AI Copilot');
    button.innerHTML = config.bubbleText;
    button.onclick = toggleChat;

    // Add notification badge (hidden by default)
    const badge = document.createElement('div');
    badge.className = 'copilot-bubble-badge';
    badge.id = 'copilot-bubble-badge';
    badge.style.display = 'none';
    badge.textContent = '1';
    button.appendChild(badge);

    bubbleContainer.appendChild(button);
    document.body.appendChild(bubbleContainer);
  }

  // Create chat window
  function createChatWindow() {
    chatWindow = document.createElement('div');
    chatWindow.className = `copilot-chat-window ${config.position}`;
    chatWindow.id = 'copilot-chat-window';

    iframe = document.createElement('iframe');
    iframe.className = 'copilot-chat-iframe';
    iframe.setAttribute('title', 'AI Copilot Chat');
    iframe.setAttribute('allow', 'microphone; camera');
    iframe.setAttribute('loading', 'lazy');

    // Build iframe URL
    const url = new URL(config.widgetUrl);
    url.searchParams.set('theme', config.theme);
    url.searchParams.set('position', 'bubble');
    if (config.apiEndpoint) {
      url.searchParams.set('apiEndpoint', config.apiEndpoint);
    }

    iframe.src = url.toString();
    chatWindow.appendChild(iframe);
    bubbleContainer.appendChild(chatWindow);
  }

  // Toggle chat window
  function toggleChat() {
    isOpen = !isOpen;

    if (!chatWindow) {
      createChatWindow();
    }

    if (isOpen) {
      chatWindow.classList.add('open');
      // Hide badge when opened
      const badge = document.getElementById('copilot-bubble-badge');
      if (badge) badge.style.display = 'none';
    } else {
      chatWindow.classList.remove('open');
    }

    // Update button icon/text
    const button = bubbleContainer.querySelector('.copilot-bubble-button');
    if (button) {
      button.innerHTML = isOpen ? '✕' : config.bubbleText;
    }
  }

  // Close chat (can be called externally)
  function closeChat() {
    if (isOpen) {
      toggleChat();
    }
  }

  // Show notification badge
  function showBadge(count) {
    const badge = document.getElementById('copilot-bubble-badge');
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count.toString();
      badge.style.display = 'flex';
    }
  }

  // Setup message listener
  function setupMessageListener() {
    window.addEventListener('message', function(event) {
      // Security: In production, verify event.origin
      // if (event.origin !== 'https://your-domain.com') return;

      if (event.data && event.data.type) {
        switch (event.data.type) {
          case 'copilot:loaded':
            // Chat loaded
            break;
          case 'copilot:message':
            // New message received
            if (!isOpen) {
              showBadge(1);
            }
            break;
          case 'copilot:close':
            // Close chat requested from iframe
            closeChat();
            break;
        }
      }
    });
  }

  // Initialize
  function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        injectStyles();
        createBubble();
        setupMessageListener();
      });
    } else {
      injectStyles();
      createBubble();
      setupMessageListener();
    }
  }

  // Public API
  window.CopilotBubble = {
    open: function() {
      if (!isOpen) toggleChat();
    },
    close: function() {
      if (isOpen) closeChat();
    },
    toggle: toggleChat,
    showBadge: showBadge,
    isOpen: function() {
      return isOpen;
    }
  };

  // Auto-initialize
  init();

})(window, document);

