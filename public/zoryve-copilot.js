/**
 * Copilot Widget - Self-contained Chat Widget with REST API
 * Works like Intercom/Yellow.ai - just add the script and it works!
 *
 * Usage:
 * <script src="https://your-domain.com/copilot-widget.js"></script>
 * <script>
 *   window.CopilotBubbleConfig = {
 *     apiUrl: 'https://your-api-url/send_message',
 *     position: 'bottom-right',
 *     primaryColor: '#a67c52'
 *   };
 * </script>
 */

;(function (window, document) {
  'use strict'

  // Prevent multiple initializations
  if (window.CopilotBubbleLoaded) {
    return
  }
  window.CopilotBubbleLoaded = true

  // Configuration - can be overridden via window.CopilotBubbleConfig
  const config = Object.assign(
    {
      apiUrl: window.CopilotBubbleConfig?.apiUrl || 'https://zoryve-chatbot-gggkb3g0cbe0emee.eastus2-01.azurewebsites.net/send_message',
      position: window.CopilotBubbleConfig?.position || 'bottom-right',
      zIndex: window.CopilotBubbleConfig?.zIndex || 999999,
      primaryColor: window.CopilotBubbleConfig?.primaryColor || '#016c8e', // Professional blue primary
      bubbleText: window.CopilotBubbleConfig?.bubbleText || 'AI',
      theme: window.CopilotBubbleConfig?.theme || 'light',
      userId: window.CopilotBubbleConfig?.userId || 'guest@example.com',
      role: window.CopilotBubbleConfig?.role || 'user',
      botIconUrl: window.CopilotBubbleConfig?.botIconUrl || '', // Bot avatar icon URL
      suggestedQuestions: window.CopilotBubbleConfig?.suggestedQuestions || [
        'Is ZORYVE cream approved for treating plaque psoriasis?',
        'What are the approved uses for ZORYVE?',
        'How is ZORYVE cream used for plaque psoriasis?',
        'What conditions is ZORYVE cream approved to treat?'
      ]
    },
    window.CopilotBubbleConfig || {}
  )

  // State
  let isOpen = false
  let bubbleContainer = null
  let chatWindow = null
  let chatMessages = []
  let isStreaming = false
  let animation = false
  let lastBotMessageElement = null
  let currentCitations = [] // Store citations for current response
  let markedLoaded = false // Track if marked.js is loaded

  // UUID v4 generator function
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
      }
    )
  }

  // Load marked.js library dynamically
  function loadMarkedLibrary() {
    return new Promise((resolve, reject) => {
      if (window.marked) {
        markedLoaded = true
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js'
      script.onload = () => {
        markedLoaded = true
        // Configure marked
        if (window.marked) {
          window.marked.setOptions({
            breaks: false, // Don't treat single line breaks as <br>
            gfm: true, // GitHub Flavored Markdown
            headerIds: false,
            mangle: false,
            pedantic: false,
            smartLists: true
          })
        }
        resolve()
      }
      script.onerror = () => {
        reject()
      }
      document.head.appendChild(script)
    })
  }

  // Professional Theme Colors - Blue & Gold
  const accentColor = '#ffb81c' // Gold accent color
  const themeColors = {
    light: {
      background: '#f8fafb', // Light neutral background
      foreground: '#1a202c', // Dark text for readability
      card: '#ffffff', // Pure white cards
      primary: '#016c8e', // Professional blue
      primaryForeground: '#ffffff',
      border: '#e2e8f0', // Subtle border
      muted: '#f1f5f9', // Light muted background
      mutedForeground: '#64748b' // Medium gray text
    },
    dark: {
      background: '#0f172a', // Dark blue-gray background
      foreground: '#f1f5f9', // Light text
      card: '#1e293b', // Dark card background
      primary: '#016c8e',
      primaryForeground: '#ffffff',
      border: '#334155', // Dark border
      muted: '#1e293b',
      mutedForeground: '#94a3b8' // Light gray text
    }
  }

  const colors = themeColors[config.theme] || themeColors.light
  const isDark = config.theme === 'dark'

  // Create styles
  function injectStyles() {
    if (document.getElementById('copilot-bubble-styles')) return

    const style = document.createElement('style')
    style.id = 'copilot-bubble-styles'
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
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${config.primaryColor} 0%, #014d6b 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(1, 108, 142, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 600;
        font-size: 20px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        padding: 0px;
      }
      .copilot-bubble-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, ${accentColor} 0%, #ffa500 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      .copilot-bubble-button:hover::before {
        opacity: 0.2;
      }
      .copilot-bubble-button img {
        width: 70%;
        height: 70%;
        object-fit: contain;
        position: relative;
        z-index: 1;
      }
      .copilot-bubble-button:hover {
        transform: scale(1.08) translateY(-2px);
        box-shadow: 0 12px 32px rgba(1, 108, 142, 0.4), 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      .copilot-bubble-button:active {
        transform: scale(0.96) translateY(0);
      }
      .copilot-bubble-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        background: ${accentColor};
        color: #ffffff;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border: 2px solid ${colors.card};
        box-shadow: 0 2px 8px rgba(255, 184, 28, 0.4);
      }
      .copilot-chat-window {
        position: fixed;
        width: 420px;
        height: 680px;
        max-width: calc(100vw - 40px);
        max-height: calc(100vh - 40px);
        background: ${colors.card};
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        transform: scale(0.95) translateY(20px);
        pointer-events: none;
        border: 1px solid ${colors.border};
        top: auto;
        bottom: 90px;
      }
      .copilot-chat-window.open {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: all;
      }
      .copilot-chat-window.bottom-right {
        right: 20px;
        bottom: 90px;
      }
      .copilot-chat-window.bottom-left {
        left: 20px;
        bottom: 90px;
      }
      .copilot-chat-window.top-right {
        right: 20px;
        top: 20px;
        bottom: auto;
      }
      .copilot-chat-window.top-left {
        left: 20px;
        top: 20px;
        bottom: auto;
      }
      .copilot-chat-header {
        padding: 18px 24px;
        background: linear-gradient(135deg, ${config.primaryColor} 0%, #014d6b 100%);
        border-bottom: none;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .copilot-chat-header-title {
        font-size: 16px;
        font-weight: 600;
        color: #ffffff;
        display: flex;
        align-items: center;
        letter-spacing: 0.3px;
      }
      .copilot-chat-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .copilot-chat-header-button {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 18px;
        position: relative;
        backdrop-filter: blur(10px);
      }
      .copilot-chat-header-button:hover {
        background: rgba(255, 255, 255, 0.25);
        transform: scale(1.05);
      }
      .copilot-chat-header-button:active {
        transform: scale(0.95);
      }
      .copilot-chat-header-button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        pointer-events: none;
      }
      .copilot-chat-header-close {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 20px;
        backdrop-filter: blur(10px);
      }
      .copilot-chat-header-close:hover {
        background: rgba(255, 184, 28, 0.3);
        transform: scale(1.05);
      }
      .copilot-tooltip {
        position: relative;
      }
      .copilot-tooltip.hidden {
        display: none;
      }
      .copilot-tooltip .copilot-tooltip-text {
        visibility: hidden;
        opacity: 0;
        background-color: ${config.primaryColor};
        color: #ffffff;
        text-align: center;
        border-radius: 8px;
        padding: 8px 12px;
        position: absolute;
        z-index: 1000000;
        top: 125%;
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        font-size: 11px;
        font-weight: 500;
        transition: opacity 0.2s, visibility 0.2s;
        pointer-events: none;
        box-shadow: 0 4px 12px rgba(1, 108, 142, 0.3);
      }
      .copilot-tooltip .copilot-tooltip-text::after {
        content: "";
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent ${config.primaryColor} transparent;
      }
      .copilot-tooltip:hover .copilot-tooltip-text {
        visibility: visible;
        opacity: 1;
      }
      .copilot-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        background: ${colors.background};
        scrollbar-width: thin;
        scrollbar-color: ${colors.border} transparent;
      }
      .copilot-chat-messages::-webkit-scrollbar {
        width: 6px;
      }
      .copilot-chat-messages::-webkit-scrollbar-track {
        background: transparent;
      }
      .copilot-chat-messages::-webkit-scrollbar-thumb {
        background: ${colors.border};
        border-radius: 3px;
      }
      .copilot-message {
        display: flex;
        gap: 12px;
        animation: fadeIn 0.3s ease;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .copilot-message-user {
        justify-content: flex-end;
      }
      .copilot-message-content {
        max-width: 75%;
        padding: 14px 18px;
        border-radius: 18px;
        word-wrap: break-word;
        line-height: 1.6;
        font-size: 14px;
      }
      .copilot-message-user .copilot-message-content {
        background: linear-gradient(135deg, ${config.primaryColor} 0%, #014d6b 100%);
        color: #ffffff;
        border-bottom-right-radius: 4px;
        box-shadow: 0 4px 12px rgba(1, 108, 142, 0.25);
      }
      .copilot-message-bot .copilot-message-content {
        background: ${colors.card};
        color: ${colors.foreground};
        border: 1px solid ${colors.border};
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      }
      .copilot-message-bot .copilot-message-content :first-child {
        margin-top: 0;
      }
      .copilot-message-bot .copilot-message-content :last-child {
        margin-bottom: 0;
      }
      .copilot-paragraph {
        margin: 0.25em 0;
        line-height: 1.5;
      }
      .copilot-h1, .copilot-h2, .copilot-h3, .copilot-h4 {
        margin: 0.8em 0 0.4em 0;
        font-weight: 600;
        line-height: 1.3;
        color: ${colors.foreground};
      }
      .copilot-h1 {
        font-size: 1.4em;
        border-bottom: 2px solid ${colors.border};
        padding-bottom: 0.3em;
      }
      .copilot-h2 {
        font-size: 1.25em;
        border-bottom: 1px solid ${colors.border};
        padding-bottom: 0.2em;
      }
      .copilot-h3 {
        font-size: 1.15em;
      }
      .copilot-h4 {
        font-size: 1.05em;
      }
      .copilot-message-content h1:first-child,
      .copilot-message-content h2:first-child,
      .copilot-message-content h3:first-child,
      .copilot-message-content h4:first-child {
        margin-top: 0;
      }
      .copilot-code-block {
        background: ${isDark ? '#1e1e1e' : '#f5f5f5'};
        border: 1px solid ${colors.border};
        border-radius: 6px;
        padding: 12px;
        margin: 0.3em 0;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.9em;
        line-height: 1.5;
      }
      .copilot-code-block code {
        background: transparent;
        padding: 0;
        border: none;
        color: ${colors.foreground};
        font-family: inherit;
      }
      pre.copilot-code-block {
        white-space: pre;
        word-wrap: normal;
      }
      .copilot-inline-code {
        background: ${isDark ? '#2d2d2d' : '#f0f0f0'};
        border: 1px solid ${colors.border};
        border-radius: 3px;
        padding: 2px 6px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.9em;
        color: ${isDark ? '#d4d4d4' : '#e83e8c'};
      }
      .copilot-list {
        margin: 0.3em 0;
        padding-left: 1.5em;
      }
      .copilot-list-item {
        margin: 0.15em 0;
        line-height: 1.5;
      }
      ol.copilot-list {
        list-style-type: decimal;
      }
      ul.copilot-list {
        list-style-type: disc;
      }
      .copilot-link {
        color: ${config.primaryColor};
        text-decoration: none;
        border-bottom: 1px solid ${config.primaryColor}60;
        transition: all 0.2s;
      }
      .copilot-link:hover {
        color: ${accentColor};
        border-bottom-color: ${accentColor};
      }
      .copilot-blockquote {
        border-left: 4px solid ${accentColor};
        padding-left: 1em;
        margin: 0.3em 0;
        color: ${colors.mutedForeground};
        font-style: italic;
        background: ${colors.muted};
        padding: 12px 16px;
        border-radius: 6px;
      }
      .copilot-hr {
        border: none;
        border-top: 1px solid ${colors.border};
        margin: 0.6em 0;
      }
      .copilot-message-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 2px solid ${colors.border};
        background: ${colors.card};
        color: ${colors.foreground};
        font-size: 13px;
        font-weight: 600;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .copilot-message-bot .copilot-message-avatar {
        background: linear-gradient(135deg, ${config.primaryColor} 0%, #014d6b 100%);
        color: #ffffff;
        border-color: ${config.primaryColor};
      }
      .copilot-message-user .copilot-message-avatar {
        order: 2;
        background: ${accentColor};
        color: #ffffff;
        border-color: ${accentColor};
      }
      .copilot-message-avatar img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 50%;
      }
      .copilot-message-avatar svg {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        fill: none;
      }
      .copilot-empty-screen {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 20px;
        text-align: center;
      }
      .copilot-empty-screen h2 {
        font-size: 18px;
        font-weight: 600;
        color: ${colors.foreground};
        margin: 0 0 8px 0;
        letter-spacing: -0.2px;
      }
      .copilot-empty-screen::before {
        content: '💬';
        font-size: 48px;
        margin-bottom: 16px;
        opacity: 0.6;
      }
      .copilot-suggested-questions {
        padding: 16px 20px;
        background: ${colors.background};
        border-top: 1px solid ${colors.border};
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 200px;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: ${colors.border} transparent;
      }
      .copilot-suggested-questions::-webkit-scrollbar {
        width: 4px;
      }
      .copilot-suggested-questions::-webkit-scrollbar-track {
        background: transparent;
      }
      .copilot-suggested-questions::-webkit-scrollbar-thumb {
        background: ${colors.border};
        border-radius: 2px;
      }
      .copilot-suggested-questions.hidden {
        display: none;
      }
      .copilot-suggested-questions-title {
        font-size: 11px;
        font-weight: 700;
        color: ${colors.mutedForeground};
        text-transform: uppercase;
        letter-spacing: 0.8px;
        margin-bottom: 8px;
      }
      .copilot-suggested-question {
        padding: 12px 16px;
        background: ${colors.card};
        border: 1.5px solid ${colors.border};
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 13px;
        color: ${colors.foreground};
        text-align: left;
        line-height: 1.5;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        position: relative;
      }
      .copilot-suggested-question::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 3px;
        background: ${config.primaryColor};
        border-radius: 10px 0 0 10px;
        opacity: 0;
        transition: opacity 0.2s;
      }
      .copilot-suggested-question:hover {
        background: ${colors.muted};
        border-color: ${config.primaryColor};
        transform: translateX(4px);
        box-shadow: 0 4px 12px rgba(1, 108, 142, 0.15);
      }
      .copilot-suggested-question:hover::before {
        opacity: 1;
      }
      .copilot-suggested-question:active {
        transform: translateX(2px) scale(0.98);
      }
      .copilot-chat-input-container {
        padding: 16px 20px;
        background: ${colors.card};
        border-top: 1px solid ${colors.border};
        flex-shrink: 0;
      }
      .copilot-chat-input-wrapper {
        display: flex;
        gap: 8px;
        align-items: flex-end;
        background: ${colors.muted};
        border: 2px solid ${colors.border};
        border-radius: 12px;
        padding: 8px 12px;
        transition: all 0.2s;
      }
      .copilot-chat-input-wrapper:focus-within {
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 4px ${config.primaryColor}15;
        background: ${colors.card};
      }
      .copilot-chat-input {
        flex: 1;
        border: none;
        background: transparent;
        color: ${colors.foreground};
        font-size: 14px;
        padding: 8px 4px;
        resize: none;
        outline: none;
        max-height: 120px;
        min-height: 24px;
        font-family: inherit;
        line-height: 1.5;
      }
      .copilot-chat-input::placeholder {
        color: ${colors.mutedForeground};
      }
      .copilot-chat-send {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, ${config.primaryColor} 0%, #014d6b 100%);
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
        font-size: 16px;
        box-shadow: 0 2px 8px rgba(1, 108, 142, 0.3);
      }
      .copilot-chat-send:hover:not(:disabled) {
        background: linear-gradient(135deg, #014d6b 0%, ${config.primaryColor} 100%);
        transform: scale(1.05) translateY(-1px);
        box-shadow: 0 4px 12px rgba(1, 108, 142, 0.4);
      }
      .copilot-chat-send:active:not(:disabled) {
        transform: scale(0.95) translateY(0);
      }
      .copilot-chat-send:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }
      .copilot-status-indicator {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        margin-right: 10px;
        background: ${accentColor};
        box-shadow: 0 0 8px ${accentColor}80;
        animation: pulse 2s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
      .copilot-spinner {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 3px solid ${colors.border};
        border-top-color: ${config.primaryColor};
        border-right-color: ${accentColor};
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @media (max-width: 480px) {
        .copilot-chat-window {
          width: 100vw;
          height: 100vh;
          max-width: 100vw;
          max-height: 100vh;
          border-radius: 0;
          bottom: 0 !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
        }
        .copilot-bubble-container.bottom-right,
        .copilot-bubble-container.bottom-left {
          bottom: 16px;
        }
        .copilot-bubble-container.top-right,
        .copilot-bubble-container.top-left {
          top: 16px;
        }
      }
    `
    document.head.appendChild(style)
  }

  // Build conversation history from chatMessages for API request
  // Excludes the last user message (which we're currently sending) and any pending bot response
  function buildConversationHistory() {
    const history = []
    // Pair up user and bot messages sequentially
    // We need to exclude the last user message (which doesn't have a response yet)
    for (let i = 0; i < chatMessages.length - 1; i++) {
      const msg = chatMessages[i]
      if (msg.sender === 'user') {
        // Find the next bot message after this user message
        const botMsg = chatMessages[i + 1]
        if (botMsg && botMsg.sender === 'bot' && botMsg.content) {
          // Only include if bot message has content (not just a loading placeholder)
          history.push({
            question: msg.content,
            answer: botMsg.content
          })
        }
      }
    }
    return history
  }

  async function sendMessage(messageText) {
    if (!config.apiUrl) {
      addMessage('bot', 'API URL not configured. Please set window.CopilotBubbleConfig.apiUrl')
      return
    }

    if (isStreaming) {
      return
    }

    // Add user message to UI first
    addMessage('user', messageText)
    animation = true
    isStreaming = true
    updateNewChatButtonState() // Disable new chat button when sending message

    // Show loading indicator
    addMessage('bot', '')

    try {
      // Build conversation history from previous messages
      const conversationHistory = buildConversationHistory()

      // Prepare request payload
      const requestPayload = {
        user_question: messageText
      }

      // Add previous conversation history if available
      if (conversationHistory.length > 0) {
        requestPayload.previous_question_answer_list = conversationHistory
      }

      // Make REST API call
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Extract answer from response (adjust field name based on actual API response)
      const answer = data.answer || data.response || data.message || data.content || 'Sorry, I could not generate a response.'

      // Extract citations if available
      currentCitations = data.specific_citations || data.citations || []

      // Update the bot message with the response
      updateLastBotMessage(answer, true)
      
      isStreaming = false
      animation = false
      updateNewChatButtonState() // Re-enable new chat button when response is received

    } catch (error) {
      console.error('Error sending message:', error)
      isStreaming = false
      animation = false
      updateNewChatButtonState() // Re-enable new chat button on error
      currentCitations = [] // Clear citations on error
      
      // Update the loading message with error
      const lastMessage = chatMessages[chatMessages.length - 1]
      if (lastMessage && lastMessage.sender === 'bot' && !lastMessage.content) {
        lastMessage.content = 'Sorry, I encountered an error. Please try again.'
        renderMessages()
      } else {
        addMessage('bot', 'Sorry, I encountered an error. Please try again.')
      }
    }
  }

  function addMessage(sender, content, citations = []) {
    const message = {
      id: Date.now() + Math.random(),
      sender: sender,
      content: content,
      timestamp: new Date(),
      citations: citations
    }

    chatMessages.push(message)
    renderMessages()
  }

  function updateLastBotMessage(content, isComplete = false) {
    const lastMessage = chatMessages[chatMessages.length - 1]
    if (lastMessage && lastMessage.sender === 'bot') {
      lastMessage.content = content
      if (isComplete) {
        lastMessage.citations = currentCitations // Add citations when complete
        lastBotMessageElement = null // Reset for next message
      }
      // Update the message element
      updateStreamingMessage(content, isComplete)
    } else if (content) {
      addMessage('bot', content, isComplete ? currentCitations : [])
    }
  }

  // Extract unique PDF file paths from citations
  function extractPdfPaths(citations) {
    if (!citations || !Array.isArray(citations)) return []

    const pdfPaths = citations
      .map(citation => citation.source_file_path)
      .filter(path => path && typeof path === 'string' && path.trim() !== '')

    // Return unique paths
    return [...new Set(pdfPaths)]
  }

  // Format PDF files display
  function formatPdfFiles(pdfPaths) {
    if (!pdfPaths || pdfPaths.length === 0) return ''

    const pdfItems = pdfPaths
      .map((path, index) => {
        const documentName = `Document ${index + 1}`
        return `
        <div style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: ${colors.muted}; border: 1.5px solid ${colors.border}; border-radius: 8px; margin-bottom: 8px; transition: all 0.2s;" onmouseover="this.style.borderColor='${config.primaryColor}'; this.style.background='${colors.card}';" onmouseout="this.style.borderColor='${colors.border}'; this.style.background='${colors.muted}';">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${config.primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span style="flex: 1; font-size: 13px; color: ${colors.foreground}; word-break: break-all; font-weight: 500;">${documentName}</span>
          <a href="${escapeHtml(path)}" target="_blank" rel="noopener noreferrer" style="color: #ffffff; text-decoration: none; font-size: 12px; white-space: nowrap; padding: 6px 12px; background: linear-gradient(135deg, ${config.primaryColor} 0%, #014d6b 100%); border-radius: 6px; transition: all 0.2s; font-weight: 500; box-shadow: 0 2px 4px rgba(1, 108, 142, 0.2);" onmouseover="this.style.background='linear-gradient(135deg, #014d6b 0%, ${config.primaryColor} 100%)'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(1, 108, 142, 0.3)';" onmouseout="this.style.background='linear-gradient(135deg, ${config.primaryColor} 0%, #014d6b 100%)'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(1, 108, 142, 0.2)';">
            View
          </a>
        </div>
      `
      })
      .join('')

    return `
      <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid ${colors.border};">
        <div style="font-size: 11px; font-weight: 700; color: ${config.primaryColor}; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${config.primaryColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          Referenced Documents (${pdfPaths.length})
        </div>
        ${pdfItems}
      </div>
    `
  }

  // Optimized function to update only the streaming message
  function updateStreamingMessage(content, isComplete) {
    const messagesContainer = document.getElementById('copilot-chat-messages')
    if (!messagesContainer) {
      // Fallback to full render if container not found
      renderMessages()
      return
    }

    // Find or create the last bot message element
    if (!lastBotMessageElement || !lastBotMessageElement.parentElement) {
      // Find the last bot message in the DOM
      const botMessages = messagesContainer.querySelectorAll(
        '.copilot-message-bot'
      )
      if (botMessages.length > 0) {
        lastBotMessageElement = botMessages[
          botMessages.length - 1
        ].querySelector('.copilot-message-content')
      }
    }

    if (lastBotMessageElement) {
      // Update only the content of the streaming message
      if (isComplete || content) {
        const formattedContent = formatMessage(content)
        const pdfPaths = isComplete ? extractPdfPaths(currentCitations) : []
        const pdfSection =
          isComplete && pdfPaths.length > 0 ? formatPdfFiles(pdfPaths) : ''
        lastBotMessageElement.innerHTML = formattedContent + pdfSection
      } else {
        lastBotMessageElement.innerHTML = '<div class="copilot-spinner"></div>'
      }

      // Auto-scroll to bottom
      messagesContainer.scrollTop = messagesContainer.scrollHeight
      
      // Update suggested questions visibility
      updateSuggestedQuestionsVisibility()
    } else {
      // Fallback to full render
      renderMessages()
    }
  }

  function renderMessages() {
    const messagesContainer = document.getElementById('copilot-chat-messages')
    if (!messagesContainer) return

    if (chatMessages.length === 0) {
      messagesContainer.innerHTML = `
        <div class="copilot-empty-screen">
          <h2>How can I help you today?</h2>
        </div>
      `
      return
    }

    messagesContainer.innerHTML = chatMessages
      .map((msg, index) => {
        if (msg.sender === 'user') {
          return `
          <div class="copilot-message copilot-message-user">
            <div class="copilot-message-content">${escapeHtml(msg.content)}</div>
            <div class="copilot-message-avatar">U</div>
          </div>
        `
        } else {
          const isLoading = !msg.content && animation
          const isLastMessage = index === chatMessages.length - 1
          const botAvatar = config.botIconUrl
            ? `<img src="${escapeHtml(config.botIconUrl)}" alt="AI" />`
            : 'AI'
          const pdfPaths = extractPdfPaths(msg.citations || [])
          const pdfSection = pdfPaths.length > 0 ? formatPdfFiles(pdfPaths) : ''
          return `
          <div class="copilot-message copilot-message-bot" data-message-id="${msg.id}">
            <div class="copilot-message-avatar">${botAvatar}</div>
            <div class="copilot-message-content" ${isLastMessage ? 'data-streaming="true"' : ''}>
              ${isLoading ? '<div class="copilot-spinner"></div>' : formatMessage(msg.content) + pdfSection}
            </div>
          </div>
        `
        }
      })
      .join('')

    // Update reference to last bot message element for streaming
    const lastBotMsg = messagesContainer.querySelector(
      '.copilot-message-bot:last-child'
    )
    if (lastBotMsg) {
      lastBotMessageElement = lastBotMsg.querySelector(
        '.copilot-message-content'
      )
    }

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight

    // Update new chat button visibility
    updateNewChatButtonVisibility()
    
    // Update suggested questions visibility
    updateSuggestedQuestionsVisibility()
  }

  // Update new chat button visibility based on message count
  function updateNewChatButtonVisibility() {
    const newChatBtnContainer = document.querySelector('.copilot-tooltip')
    if (newChatBtnContainer) {
      // Show button only if there are messages (more than 0)
      if (chatMessages.length > 0) {
        newChatBtnContainer.classList.remove('hidden')
      } else {
        newChatBtnContainer.classList.add('hidden')
      }
    }
  }

  // Update new chat button state based on streaming status
  function updateNewChatButtonState() {
    const newChatBtn = document.getElementById('copilot-new-chat-btn')
    if (newChatBtn) {
      newChatBtn.disabled = isStreaming
      if (isStreaming) {
        newChatBtn.style.opacity = '0.5'
        newChatBtn.style.cursor = 'not-allowed'
      } else {
        newChatBtn.style.opacity = '1'
        newChatBtn.style.cursor = 'pointer'
      }
    }
  }

  // Update suggested questions visibility based on message count
  function updateSuggestedQuestionsVisibility() {
    const suggestedQuestionsContainer = document.getElementById('copilot-suggested-questions')
    if (suggestedQuestionsContainer) {
      // Show suggested questions only when there are no messages
      if (chatMessages.length === 0) {
        suggestedQuestionsContainer.classList.remove('hidden')
      } else {
        suggestedQuestionsContainer.classList.add('hidden')
      }
    }
  }

  // Process markdown content to ensure proper formatting
  function processMarkdown(content) {
    if (!content) return ''

    // Remove any extra escaping or encoding issues
    let processed = content
      .replace(/\\n/g, '\n') // Replace literal \n with actual newlines
      .replace(/\\#/g, '#') // Replace escaped # with actual #
      .replace(/\\\*/g, '*') // Replace escaped * with actual *
      .replace(/\\`/g, '`') // Replace escaped ` with actual `
      .replace(/\\_/g, '_') // Replace escaped _ with actual _
      .replace(/\\\[/g, '[') // Replace escaped [ with actual [
      .replace(/\\\]/g, ']') // Replace escaped ] with actual ]
      .trim()

    // Ensure proper spacing around headers (critical for markdown parsing)
    const lines = processed.split('\n')
    const processedLines = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const prevLine = i > 0 ? lines[i - 1] : ''
      const nextLine = i < lines.length - 1 ? lines[i + 1] : ''
      const isHeader = /^#{1,6}\s/.test(line.trim())

      if (isHeader) {
        // Add blank line before header if previous line is not blank
        if (prevLine.trim() !== '' && processedLines.length > 0) {
          processedLines.push('')
        }
        processedLines.push(line)
        // Add blank line after header if next line is not blank and not another header
        if (nextLine.trim() !== '' && !/^#{1,6}\s/.test(nextLine.trim())) {
          processedLines.push('')
        }
      } else {
        processedLines.push(line)
      }
    }

    return processedLines.join('\n')
  }

  function formatMessage(content) {
    if (!content) return ''

    // Process markdown to ensure proper formatting
    const processedContent = processMarkdown(content)

    // Use marked.js if available, otherwise fall back to custom parser
    if (markedLoaded && window.marked) {
      try {
        // Try both API formats (marked.parse for v5+, marked() for older versions)
        let html = typeof window.marked.parse === 'function' 
          ? window.marked.parse(processedContent)
          : window.marked(processedContent)

        // Apply custom CSS classes to marked output
        html = html.replace(/<p>/g, '<p class="copilot-paragraph">')
        html = html.replace(/<h1>/g, '<h1 class="copilot-h1">')
        html = html.replace(/<h2>/g, '<h2 class="copilot-h2">')
        html = html.replace(/<h3>/g, '<h3 class="copilot-h3">')
        html = html.replace(/<h4>/g, '<h4 class="copilot-h4">')
        html = html.replace(/<ul>/g, '<ul class="copilot-list">')
        html = html.replace(/<ol>/g, '<ol class="copilot-list">')
        html = html.replace(/<li>/g, '<li class="copilot-list-item">')
        html = html.replace(/<code>/g, '<code class="copilot-inline-code">')
        html = html.replace(
          /<pre><code class="copilot-inline-code"/g,
          '<pre class="copilot-code-block"><code'
        )
        html = html.replace(
          /<blockquote>/g,
          '<blockquote class="copilot-blockquote">'
        )
        html = html.replace(/<hr>/g, '<hr class="copilot-hr">')
        html = html.replace(/<hr\/>/g, '<hr class="copilot-hr" />')
        html = html.replace(
          /<a /g,
          '<a class="copilot-link" target="_blank" rel="noopener noreferrer" '
        )

        // Fix code blocks to have proper class
        html = html.replace(
          /<pre class="copilot-code-block"><code class="language-(\w+)">/g,
          '<pre class="copilot-code-block"><code class="language-$1">'
        )
        html = html.replace(
          /<pre class="copilot-code-block"><code>/g,
          '<pre class="copilot-code-block"><code>'
        )

        return html
      } catch (e) {
        // Fall through to custom parser
      }
    }

    // Minimal fallback parser (only used if marked.js fails to load)
    // DON'T escape HTML first - parse markdown first, then escape will happen naturally through proper HTML tags
    let html = processedContent

    // Basic code blocks (escape content inside)
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      return `<pre class="copilot-code-block"><code>${escapeHtml(code)}</code></pre>`
    })

    // Inline code (escape content inside)
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      return `<code class="copilot-inline-code">${escapeHtml(code)}</code>`
    })

    // Headers (must be processed before paragraphs)
    html = html.replace(/^#### (.+)$/gm, (match, text) => {
      return `<h4 class="copilot-h4">${escapeHtml(text)}</h4>`
    })
    html = html.replace(/^### (.+)$/gm, (match, text) => {
      return `<h3 class="copilot-h3">${escapeHtml(text)}</h3>`
    })
    html = html.replace(/^## (.+)$/gm, (match, text) => {
      return `<h2 class="copilot-h2">${escapeHtml(text)}</h2>`
    })
    html = html.replace(/^# (.+)$/gm, (match, text) => {
      return `<h1 class="copilot-h1">${escapeHtml(text)}</h1>`
    })

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, (match, text) => {
      return `<strong>${escapeHtml(text)}</strong>`
    })

    // Italic
    html = html.replace(/\*([^*]+)\*/g, (match, text) => {
      return `<em>${escapeHtml(text)}</em>`
    })

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="copilot-link">${escapeHtml(text)}</a>`
    })

    // Unordered lists
    html = html.replace(/^\* (.+)$/gm, (match, text) => {
      return `<li class="copilot-list-item">${escapeHtml(text)}</li>`
    })
    html = html.replace(/(<li class="copilot-list-item">[\s\S]*?<\/li>)/g, '<ul class="copilot-list">$1</ul>')

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, (match, text) => {
      return `<li class="copilot-list-item">${escapeHtml(text)}</li>`
    })

    // Paragraphs - now we need to escape remaining text
    html = html
      .split(/\n\n+/)
      .map(para => {
        if (!para.trim()) return ''
        // Don't wrap headers, lists, or code blocks in paragraphs
        if (
          para.match(/^<h[1-6]/) ||
          para.match(/^<ul/) ||
          para.match(/^<ol/) ||
          para.match(/^<pre/) ||
          para.match(/^<li/)
        ) {
          return para
        }
        // Escape any remaining plain text
        const escapedText = para
          .split(/(<[^>]+>)/g) // Split on HTML tags
          .map((part, i) => {
            // Every other part is either HTML tag or plain text
            if (i % 2 === 0 && !part.match(/^<[^>]+>$/)) {
              // Plain text - escape it
              return escapeHtml(part)
            }
            return part
          })
          .join('')
        return `<p class="copilot-paragraph">${escapedText.replace(/\n/g, ' ')}</p>`
      })
      .join('')

    return html || '<p class="copilot-paragraph"></p>'
  }

  function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  function updateConnectionStatus() {
    const statusEl = document.getElementById('copilot-status-indicator')
    const textEl = document.getElementById('copilot-connection-text')

    if (statusEl) {
      // For REST API, always show gold accent if API URL is configured
      statusEl.style.background = config.apiUrl ? accentColor : '#ef4444'
      statusEl.style.boxShadow = config.apiUrl ? `0 0 8px ${accentColor}80` : 'none'
    }

    if (textEl) {
      if (!config.apiUrl) {
        textEl.textContent = 'Not configured'
        textEl.style.color = '#ff6b6b'
      } else {
        textEl.textContent = 'Ready'
        textEl.style.color = 'rgba(255, 255, 255, 0.9)'
      }
    }
  }

  // Create bubble button
  function createBubble() {
    bubbleContainer = document.createElement('div')
    bubbleContainer.className = `copilot-bubble-container ${config.position}`
    bubbleContainer.id = 'copilot-bubble-container'

    const button = document.createElement('button')
    button.className = 'copilot-bubble-button'
    button.setAttribute('aria-label', 'Open AI Copilot')

    // Use icon if available, otherwise use bubbleText
    if (config.botIconUrl) {
      const img = document.createElement('img')
      img.src = config.botIconUrl
      img.alt = 'AI Copilot'
      button.appendChild(img)
    } else {
      button.innerHTML = config.bubbleText
    }

    button.onclick = toggleChat

    const badge = document.createElement('div')
    badge.className = 'copilot-bubble-badge'
    badge.id = 'copilot-bubble-badge'
    badge.style.display = 'none'
    badge.textContent = '1'
    button.appendChild(badge)

    bubbleContainer.appendChild(button)
    document.body.appendChild(bubbleContainer)
  }

  // Create chat window
  function createChatWindow() {
    chatWindow = document.createElement('div')
    chatWindow.className = `copilot-chat-window ${config.position}`
    chatWindow.id = 'copilot-chat-window'

    const connectionStatus = config.apiUrl ? 'Ready' : 'Not configured'
    chatWindow.innerHTML = `
      <div class="copilot-chat-header">
        <div class="copilot-chat-header-title">
          <span class="copilot-status-indicator" id="copilot-status-indicator"></span>
          <span>Zoryve AI</span>
          <span style="font-size: 11px; font-weight: normal; margin-left: 10px; opacity: 0.85; color: rgba(255, 255, 255, 0.9);" id="copilot-connection-text">${connectionStatus}</span>
        </div>
        <div class="copilot-chat-header-actions">
          <div class="copilot-tooltip hidden" id="copilot-new-chat-container">
            <button class="copilot-chat-header-button" id="copilot-new-chat-btn" aria-label="Start new chat" title="Start new chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            </button>
            <span class="copilot-tooltip-text">Start new chat</span>
          </div>
          <button class="copilot-chat-header-close" onclick="window.CopilotBubble.close()" aria-label="Close chat">✕</button>
        </div>
      </div>
      <div class="copilot-chat-messages" id="copilot-chat-messages">
        <div class="copilot-empty-screen">
          <h2>How can I help you today?</h2>
        </div>
      </div>
      <div class="copilot-suggested-questions" id="copilot-suggested-questions">
        <div class="copilot-suggested-questions-title">Suggested Questions</div>
        ${config.suggestedQuestions
          .map(
            (question, index) => `
          <button class="copilot-suggested-question" data-question-index="${index}">
            ${escapeHtml(question)}
          </button>
        `
          )
          .join('')}
      </div>
      <div class="copilot-chat-input-container">
        <div class="copilot-chat-input-wrapper">
          <textarea 
            class="copilot-chat-input" 
            id="copilot-chat-input"
            placeholder="Type a message..."
            rows="1"
          ></textarea>
          <button class="copilot-chat-send" id="copilot-chat-send" aria-label="Send message">
            ➤
          </button>
        </div>
      </div>
    `

    bubbleContainer.appendChild(chatWindow)

    // Setup new chat button
    const newChatBtn = document.getElementById('copilot-new-chat-btn')
    if (newChatBtn) {
      newChatBtn.addEventListener('click', function () {
        startNewChat()
      })
    }

    // Initially hide the button (no messages yet)
    updateNewChatButtonVisibility()
    
    // Set initial button state
    updateNewChatButtonState()

    // Setup suggested questions click handlers
    const suggestedQuestionBtns = document.querySelectorAll('.copilot-suggested-question')
    suggestedQuestionBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        const questionIndex = this.getAttribute('data-question-index')
        const question = config.suggestedQuestions[questionIndex]
        if (question && !isStreaming) {
          sendMessage(question)
        }
      })
    })

    // Setup input handlers
    const input = document.getElementById('copilot-chat-input')
    const sendButton = document.getElementById('copilot-chat-send')

    if (input && sendButton) {
      // Auto-resize textarea
      input.addEventListener('input', function () {
        this.style.height = 'auto'
        this.style.height = Math.min(this.scrollHeight, 100) + 'px'
        sendButton.disabled = !this.value.trim() || isStreaming
      })

      // Send on Enter (Shift+Enter for new line)
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          if (this.value.trim() && !isStreaming) {
            handleSend()
          }
        }
      })

      // Send button click
      sendButton.addEventListener('click', handleSend)

      function handleSend() {
        const message = input.value.trim()
        if (!message || isStreaming) return

        input.value = ''
        input.style.height = 'auto'
        sendButton.disabled = true

        sendMessage(message)
      }
    }

    updateConnectionStatus()
    renderMessages()
    updateSuggestedQuestionsVisibility()
  }

  // Toggle chat window
  function toggleChat() {
    isOpen = !isOpen

    if (!chatWindow) {
      createChatWindow()
    }

    if (isOpen) {
      chatWindow.classList.add('open')
      const badge = document.getElementById('copilot-bubble-badge')
      if (badge) badge.style.display = 'none'

      // Focus input
      setTimeout(() => {
        const input = document.getElementById('copilot-chat-input')
        if (input) input.focus()
      }, 100)
    } else {
      chatWindow.classList.remove('open')
    }

    // Update button
    const button = bubbleContainer.querySelector('.copilot-bubble-button')
    if (button) {
      if (isOpen) {
        // Show close icon
        button.innerHTML = '✕'
      } else {
        // Show icon or text
        if (config.botIconUrl) {
          button.innerHTML = ''
          const img = document.createElement('img')
          img.src = config.botIconUrl
          img.alt = 'AI Copilot'
          button.appendChild(img)
        } else {
          button.innerHTML = config.bubbleText
        }
      }
    }
  }

  // Close chat
  function closeChat() {
    if (isOpen) {
      toggleChat()
    }
  }

  // Start new chat
  function startNewChat() {
    // Stop any ongoing streaming first
    if (isStreaming) {
      // Stop streaming state
      isStreaming = false
      animation = false
    }

    // Clear all messages and state
    chatMessages = []
    lastBotMessageElement = null
    currentCitations = [] // Clear citations

    // Re-render to show empty screen
    renderMessages()
    
    // Update suggested questions visibility
    updateSuggestedQuestionsVisibility()
    
    // Update new chat button state (should be enabled after reset)
    updateNewChatButtonState()

    // Focus input
    const input = document.getElementById('copilot-chat-input')
    if (input) {
      input.focus()
    }

    // Re-enable send button
    const sendButton = document.getElementById('copilot-chat-send')
    if (sendButton) {
      sendButton.disabled = false
    }
  }

  // Show notification badge
  function showBadge(count) {
    const badge = document.getElementById('copilot-bubble-badge')
    if (badge) {
      badge.textContent = count > 9 ? '9+' : count.toString()
      badge.style.display = 'flex'
    }
  }

  // Initialize
  function init() {
    // Load marked.js library
    loadMarkedLibrary().catch(() => {})

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        injectStyles()
        createBubble()
        updateConnectionStatus()
      })
    } else {
      injectStyles()
      createBubble()
      updateConnectionStatus()
    }
  }

  // Public API
  window.CopilotBubble = {
    open: function () {
      if (!isOpen) toggleChat()
    },
    close: function () {
      if (isOpen) closeChat()
    },
    toggle: toggleChat,
    showBadge: showBadge,
    isOpen: function () {
      return isOpen
    },
    sendMessage: sendMessage,
    startNewChat: startNewChat
  }

  // Auto-initialize
  init()
})(window, document)
