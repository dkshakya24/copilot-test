/**
 * Copilot Widget - Self-contained Chat Widget with WebSocket
 * Works like Intercom/Yellow.ai - just add the script and it works!
 *
 * Usage:
 * <script src="https://your-domain.com/copilot-widget.js"></script>
 * <script>
 *   window.CopilotBubbleConfig = {
 *     websocketUrl: 'wss://your-websocket-url/ws',
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
      websocketUrl: window.CopilotBubbleConfig?.websocketUrl || '',
      position: window.CopilotBubbleConfig?.position || 'bottom-right',
      zIndex: window.CopilotBubbleConfig?.zIndex || 999999,
      primaryColor: window.CopilotBubbleConfig?.primaryColor || '#a67c52', // Vintage paper primary
      bubbleText: window.CopilotBubbleConfig?.bubbleText || 'AI',
      theme: window.CopilotBubbleConfig?.theme || 'light',
      userId: window.CopilotBubbleConfig?.userId || 'guest@example.com',
      role: window.CopilotBubbleConfig?.role || 'user',
      botIconUrl: window.CopilotBubbleConfig?.botIconUrl || '', // Bot avatar icon URL
      suggestedQuestions: window.CopilotBubbleConfig?.suggestedQuestions || [
        'What equity-related policies and plans are available for employees?',
        'What are all the travel policies, including domestic and international travel guidelines?',
        'Show me all HR policies related to employee benefits and compensation.',
        'What finance policies cover expense reimbursement and budget approval processes?'
      ]
    },
    window.CopilotBubbleConfig || {}
  )

  // State
  let isOpen = false
  let bubbleContainer = null
  let chatWindow = null
  let socket = null
  let messages = []
  let chatMessages = []
  let isStreaming = false
  let isConnected = false
  let animation = false
  let streamingResponse = ''
  let renderTimeout = null
  let lastBotMessageElement = null
  let currentChatId = null // Track current chat session to ignore old messages
  let currentCitations = [] // Store citations for current response
  let markedLoaded = false // Track if marked.js is loaded

  // Generate UUID for chatter_id (will be set when starting a new chat)
  let chatterId = null

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
      // Use local marked.js to avoid CSP violations
      script.src = 'https://copilot-test-theta.vercel.app/marked.min.js'
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

  // Vintage Paper Theme Colors
  const themeColors = {
    light: {
      background: '#fef9f2', // hsl(42, 25%, 97%)
      foreground: '#4a3d2f', // hsl(30, 15%, 25%)
      card: '#fffcf5', // hsl(42, 4%, 98%)
      primary: '#a67c52', // hsl(30, 33%, 49%)
      primaryForeground: '#fef9f2',
      border: '#d4c4a8', // hsl(35, 20%, 80%)
      muted: '#c4b5a0', // hsl(42, 15%, 75%)
      mutedForeground: '#6b5d4f' // hsl(30, 10%, 45%)
    },
    dark: {
      background: '#1f1812', // hsl(30, 15%, 12%)
      foreground: '#e6d9c4', // hsl(42, 20%, 90%)
      card: '#261f18', // hsl(30, 15%, 15%)
      primary: '#a67c52',
      primaryForeground: '#e6d9c4',
      border: '#3d3228', // hsl(30, 10%, 25%)
      muted: '#3d3228',
      mutedForeground: '#b8a890' // hsl(42, 15%, 70%)
    }
  }

  const colors = themeColors[config.theme] || themeColors.light
  const isDark = config.theme === 'dark'

  // Helper function to add opacity to hex color
  function hexToRgba(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
  }

  // Helper function to adjust opacity (for colors already in rgba or hex)
  function withOpacity(color, opacity) {
    if (!color) return color
    if (color.startsWith('#')) {
      return hexToRgba(color, opacity)
    }
    // If already rgba, extract and update
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`
    }
    // If color doesn't match expected formats, return as-is
    return color
  }

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
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: ${colors.card};
        border: 2px solid ${colors.border};
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        color: ${colors.foreground};
        font-weight: bold;
        font-size: 18px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        padding: 0px;
      }
      .copilot-bubble-button img {
        width: 70%;
        height: 70%;
        object-fit: contain;
      }
      .copilot-bubble-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.15);
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
        border: 2px solid ${colors.card};
      }
      .copilot-chat-window {
        position: fixed;
        width: 600px;
        height: 100vh;
        max-width: calc(100vw - 40px);
        background: ${colors.card};
        border-radius: 0;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        opacity: 0;
        transform: scale(0.9) translateY(10px);
        pointer-events: none;
        border: 1px solid ${colors.border};
        top: 0;
        bottom: 0;
      }
      .copilot-chat-window.open {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: all;
      }
      .copilot-chat-window.bottom-right {
        right: 0;
      }
      .copilot-chat-window.bottom-left {
        left: 0;
      }
      .copilot-chat-window.top-right {
        right: 0;
      }
      .copilot-chat-window.top-left {
        left: 0;
      }
      .copilot-chat-header {
        padding: 16px 20px;
        background: ${colors.card};
        border-bottom: 1px solid ${colors.border};
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }
      .copilot-chat-header-title {
        font-size: 15px;
        font-weight: 600;
        color: ${colors.foreground};
        display: flex;
        align-items: center;
      }
      .copilot-chat-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .copilot-chat-header-button {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid ${colors.border};
        background: ${colors.card};
        color: ${colors.foreground};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 18px;
        position: relative;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .copilot-chat-header-button:hover {
        background: ${colors.muted};
        border-color: ${config.primaryColor}40;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .copilot-chat-header-button:active {
        transform: scale(0.95);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .copilot-chat-header-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
      }
      .copilot-chat-header-close {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: ${colors.foreground};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        font-size: 20px;
      }
      .copilot-chat-header-close:hover {
        background: ${colors.muted};
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
        background-color: ${colors.foreground};
        color: ${colors.card};
        text-align: center;
        border-radius: 6px;
        padding: 6px 10px;
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
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }
      .copilot-tooltip .copilot-tooltip-text::after {
        content: "";
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: transparent transparent ${colors.foreground} transparent;
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
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 12px;
        word-wrap: break-word;
        line-height: 1.5;
        font-size: 13px;
      }
      .copilot-message-user .copilot-message-content {
        background: ${config.primaryColor};
        color: ${colors.primaryForeground};
        border-bottom-right-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      .copilot-message-bot .copilot-message-content {
        background: #ffffff;
        color: ${withOpacity(colors.foreground, 0.95)};
        border: 1px solid ${withOpacity(colors.border, 0.7)};
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06);
      }
      .copilot-message-bot .copilot-message-content :first-child {
        margin-top: 0;
      }
      .copilot-message-bot .copilot-message-content :last-child {
        margin-bottom: 0;
      }
      .copilot-paragraph {
        margin: 0.5em 0;
        line-height: 1.8;
        color: ${withOpacity(colors.foreground, 0.95)};
      }
      .copilot-h1, .copilot-h2, .copilot-h3, .copilot-h4 {
        font-weight: 600;
        line-height: 1.3;
        color: ${withOpacity(colors.foreground, 0.98)};
        margin-top: 1.2em;
        margin-bottom: 0.6em;
      }
      .copilot-h1 {
        font-size: 1.4em;
        font-weight: 700;
        border-bottom: 2px solid ${withOpacity(config.primaryColor, 0.4)};
        padding-bottom: 0.4em;
        margin-top: 1.4em;
        margin-bottom: 0.8em;
      }
      .copilot-h2 {
        font-size: 1.25em;
        font-weight: 700;
        border-bottom: 1px solid ${withOpacity(config.primaryColor, 0.3)};
        padding-bottom: 0.3em;
        margin-top: 1.2em;
        margin-bottom: 0.7em;
      }
      .copilot-h3 {
        font-size: 1.15em;
        font-weight: 600;
        margin-top: 1em;
        margin-bottom: 0.6em;
        color: ${withOpacity(colors.foreground, 0.97)};
      }
      .copilot-h4 {
        font-size: 1.05em;
        font-weight: 600;
        margin-top: 0.9em;
        margin-bottom: 0.5em;
        color: ${withOpacity(colors.foreground, 0.96)};
      }
      .copilot-message-content h1:first-child,
      .copilot-message-content h2:first-child,
      .copilot-message-content h3:first-child,
      .copilot-message-content h4:first-child {
        margin-top: 0;
      }
      .copilot-code-block {
        background: ${isDark ? '#1e1e1e' : withOpacity(config.primaryColor, 0.15)};
        border: 1px solid ${withOpacity(config.primaryColor, 0.3)};
        border-radius: 6px;
        padding: 12px;
        margin: 0.6em 0;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.9em;
        line-height: 1.5;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .copilot-code-block code {
        background: transparent;
        padding: 0;
        border: none;
        color: ${withOpacity(colors.foreground, 0.95)};
        font-family: inherit;
      }
      pre.copilot-code-block {
        white-space: pre;
        word-wrap: normal;
      }
      .copilot-inline-code {
        background: ${isDark ? '#2d2d2d' : withOpacity(config.primaryColor, 0.15)};
        border: 1px solid ${withOpacity(config.primaryColor, 0.3)};
        border-radius: 4px;
        padding: 3px 8px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.9em;
        font-weight: 600;
        color: ${config.primaryColor};
      }
      .copilot-list {
        margin: 0.8em 0;
        padding-left: 1.5em;
        list-style-position: outside;
      }
      .copilot-list-item {
        margin: 0.3em 0;
        line-height: 1.6;
        color: ${withOpacity(colors.foreground, 0.95)};
      }
      ol.copilot-list {
        list-style-type: decimal;
      }
      ul.copilot-list {
        list-style-type: disc;
      }
      .copilot-list::marker,
      .copilot-list-item::marker {
        color: ${withOpacity(config.primaryColor, 0.9)};
        font-weight: 600;
      }
      .copilot-link {
        color: ${config.primaryColor};
        text-decoration: underline;
        text-decoration-color: ${withOpacity(config.primaryColor, 0.6)};
        text-underline-offset: 3px;
        font-weight: 500;
        transition: all 0.2s;
      }
      .copilot-link:hover {
        text-decoration-color: ${config.primaryColor};
        text-underline-offset: 4px;
      }
      .copilot-blockquote {
        border-left: 4px solid ${withOpacity(config.primaryColor, 0.6)};
        padding: 0.8em 1em;
        margin: 0.8em 0;
        color: ${withOpacity(colors.foreground, 0.92)};
        background: ${withOpacity(config.primaryColor, 0.08)};
        border-radius: 0 6px 6px 0;
        font-style: italic;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .copilot-hr {
        border: none;
        border-top: 2px solid ${withOpacity(colors.border, 0.6)};
        margin: 1.2em 0;
      }
      .copilot-message-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border: 2px solid ${colors.border};
        background: ${colors.card};
        color: ${colors.foreground};
        font-size: 12px;
        font-weight: 600;
        overflow: hidden;
      }
      .copilot-message-avatar img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 50%;
      }
      .copilot-message-user .copilot-message-avatar {
        order: 2;
        background: ${colors.card};
      }
      .copilot-empty-screen {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px 20px;
        text-align: center;
      }
      .copilot-empty-screen h2 {
        font-size: 16px;
        font-weight: 600;
        color: ${colors.foreground};
        margin: 0;
      }
      .copilot-suggested-questions {
        padding: 12px 16px;
        background: ${colors.background};
        border-top: 1px solid ${colors.border};
        display: flex;
        flex-direction: column;
        gap: 8px;
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
        font-weight: 600;
        color: ${colors.mutedForeground};
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .copilot-suggested-question {
        padding: 10px 12px;
        background: ${colors.card};
        border: 1px solid ${colors.border};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px;
        color: ${colors.foreground};
        text-align: left;
        line-height: 1.4;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }
      .copilot-suggested-question:hover {
        background: ${colors.muted};
        border-color: ${config.primaryColor};
        transform: translateX(2px);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      .copilot-suggested-question:active {
        transform: scale(0.98);
      }
      .copilot-chat-input-container {
        padding: 12px 16px;
        background: ${colors.card};
        border-top: 1px solid ${colors.border};
        flex-shrink: 0;
      }
      .copilot-chat-input-wrapper {
        display: flex;
        gap: 6px;
        align-items: center;
        background: ${colors.card};
        border: 1px solid ${colors.border};
        border-radius: 10px;
        padding: 6px;
        transition: all 0.2s;
      }
      .copilot-chat-input-wrapper:focus-within {
        border-color: ${config.primaryColor};
        box-shadow: 0 0 0 3px ${config.primaryColor}20;
      }
      .copilot-chat-input {
        flex: 1;
        border: none;
        background: #ffffff;
        color: ${colors.foreground};
        font-size: 13px;
        padding: 6px 10px;
        resize: none;
        outline: none;
        max-height: 100px;
        min-height: 32px;
        font-family: inherit;
        line-height: 1.4;
      }
      .copilot-chat-input::placeholder {
        color: ${colors.mutedForeground};
      }
      .copilot-chat-send {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: none;
        background: ${config.primaryColor};
        color: ${colors.primaryForeground};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
        font-size: 14px;
      }
      .copilot-chat-send:hover:not(:disabled) {
        background: ${config.primaryColor}dd;
        transform: scale(1.05);
      }
      .copilot-chat-send:active:not(:disabled) {
        transform: scale(0.95);
      }
      .copilot-chat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .copilot-status-indicator {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 8px;
        background: ${isConnected ? '#10b981' : '#ef4444'};
      }
      .copilot-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid ${colors.border};
        border-top-color: ${config.primaryColor};
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
        }
        .copilot-chat-window.bottom-right,
        .copilot-chat-window.bottom-left,
        .copilot-chat-window.top-right,
        .copilot-chat-window.top-left {
          left: 0;
          right: 0;
        }
      }
    `
    document.head.appendChild(style)
  }

  // WebSocket connection
  function connectWebSocket() {
    if (!config.websocketUrl) {
      console.warn(
        'Copilot Widget: WebSocket URL not configured. Please set window.CopilotBubbleConfig.websocketUrl'
      )
      updateConnectionStatus()
      return
    }

    try {
      socket = new WebSocket(config.websocketUrl)

      socket.onopen = () => {
        isConnected = true
        updateConnectionStatus()
        if (chatWindow) {
          updateConnectionStatus()
        }
      }

      socket.onmessage = event => {
        try {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        } catch (e) {
          // Error parsing message
        }
      }

      socket.onclose = event => {
        isConnected = false
        updateConnectionStatus()
        if (chatWindow) {
          updateConnectionStatus()
        }
        // Reconnect after 3 seconds if not a normal closure
        if (event.code !== 1000) {
          setTimeout(connectWebSocket, 3000)
        }
      }

      socket.onerror = error => {
        isConnected = false
        updateConnectionStatus()
        if (chatWindow) {
          updateConnectionStatus()
        }
      }
    } catch (error) {
      isConnected = false
      updateConnectionStatus()
    }
  }

  function handleWebSocketMessage(data) {
    // Ignore messages if we've started a new chat (ignore delayed messages from previous conversation)
    if (
      currentChatId === null &&
      (data.type === 'streaming' || data.type === 'end_of_stream')
    ) {
      return
    }

    if (data.type === 'streaming') {
      isStreaming = true
      animation = false
      updateNewChatButtonState() // Disable new chat button while streaming
      messages.push(data)

      // Accumulate streaming response - check both 'message' and 'content' fields
      const messageContent = data.message || data.content || ''
      if (messageContent) {
        streamingResponse += messageContent
        // Throttle updates for smoother streaming (update every 50ms max)
        if (renderTimeout) {
          clearTimeout(renderTimeout)
        }
        renderTimeout = setTimeout(() => {
          updateLastBotMessage(streamingResponse, false)
        }, 50)
      }
    } else if (data.type === 'end_of_rag_streaming') {
      // Handle RAG streaming end
    } else if (data.type === 'end_of_stream') {
      // Clear any pending render timeout
      if (renderTimeout) {
        clearTimeout(renderTimeout)
        renderTimeout = null
      }

      isStreaming = false
      animation = false
      updateNewChatButtonState() // Re-enable new chat button when streaming ends

      // Get final message from accumulated messages or data
      const finalMessage =
        messages.length > 0
          ? messages.map(item => item.message || item.content || '').join('')
          : data.message || data.content || streamingResponse

      // Capture citations data
      currentCitations = data.specific_citations || []

      streamingResponse = ''
      messages = [] // Clear messages array
      updateLastBotMessage(finalMessage, true)
      currentChatId = null // Reset chat ID after stream completes
    } else if (data.type === 'error') {
      if (renderTimeout) {
        clearTimeout(renderTimeout)
        renderTimeout = null
      }
      isStreaming = false
      animation = false
      updateNewChatButtonState() // Re-enable new chat button on error
      currentCitations = [] // Clear citations on error
      addMessage('bot', 'Sorry, I encountered an error. Please try again.')
      currentChatId = null // Reset on error
    }
  }

  function sendMessage(messageText) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      addMessage('bot', 'Not connected to server. Please wait...')
      return
    }

    if (isStreaming) {
      return
    }

    // Clear previous messages array for new conversation
    messages = []
    streamingResponse = ''
    currentCitations = [] // Clear previous citations

    // Format message according to app's payload structure with generated chatter_id
    const messageData = {
      bot: 'copilot',
      chatter_id: chatterId,
      question: messageText
    }

    socket.send(JSON.stringify(messageData))

    // Set current chat ID to track this conversation
    currentChatId = Date.now().toString()

    // Add user message to UI
    addMessage('user', messageText)
    animation = true
    isStreaming = true
    updateNewChatButtonState() // Disable new chat button when sending message

    // Show loading indicator
    addMessage('bot', '')
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
        isStreaming = false
        animation = false
        lastBotMessageElement = null // Reset for next message
      }
      // Optimize: Only update the streaming message element, not all messages
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
        <div style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: ${colors.background}; border: 1px solid ${colors.border}; border-radius: 6px; margin-bottom: 6px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${config.primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
          <span style="flex: 1; font-size: 12px; color: ${colors.foreground}; word-break: break-all;">${documentName}</span>
          <a href="${escapeHtml(path)}" target="_blank" rel="noopener noreferrer" style="color: ${config.primaryColor}; text-decoration: none; font-size: 11px; white-space: nowrap; padding: 4px 8px; border: 1px solid ${config.primaryColor}; border-radius: 4px; transition: all 0.2s; cursor: pointer;" onmouseover="this.style.background='${config.primaryColor}'; this.style.color='${colors.primaryForeground}';" onmouseout="this.style.background='transparent'; this.style.color='${config.primaryColor}';" onclick="window.open(this.href, '_blank', 'noopener,noreferrer'); return false;">
            View
          </a>
        </div>
      `
      })
      .join('')

    return `
      <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid ${colors.border};">
        <div style="font-size: 11px; font-weight: 600; color: ${colors.mutedForeground}; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
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
      statusEl.style.background = isConnected ? '#10b981' : '#ef4444'
    }

    if (textEl) {
      if (!config.websocketUrl) {
        textEl.textContent = 'Not configured'
        textEl.style.color = '#ef4444'
      } else if (isConnected) {
        textEl.textContent = 'Connected'
        textEl.style.color = '#10b981'
      } else {
        textEl.textContent = 'Connecting...'
        textEl.style.color = '#f59e0b'
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

    const connectionStatus = isConnected
      ? 'Connected'
      : config.websocketUrl
        ? 'Connecting...'
        : 'Not configured'
    chatWindow.innerHTML = `
      <div class="copilot-chat-header">
        <div class="copilot-chat-header-title">
          <span class="copilot-status-indicator" id="copilot-status-indicator"></span>
          <span>Arcutis AI</span>
          <span style="font-size: 10px; font-weight: normal; margin-left: 8px; opacity: 0.7;" id="copilot-connection-text">${connectionStatus}</span>
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
      // Generate new UUID for chatter_id if this is the first time opening or no chatterId exists
      if (!chatterId) {
        chatterId = generateUUID()
      }

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
      // Clear render timeout if any
      if (renderTimeout) {
        clearTimeout(renderTimeout)
        renderTimeout = null
      }

      // Stop streaming state
      isStreaming = false
      animation = false

      // Reset current chat ID to ignore any delayed messages from previous conversation
      currentChatId = null
    }

    // Generate new UUID for this chat session
    chatterId = generateUUID()

    // Clear all messages and state
    chatMessages = []
    messages = []
    streamingResponse = ''
    lastBotMessageElement = null
    currentChatId = null // Reset chat tracking
    currentCitations = [] // Clear citations

    // Clear render timeout if any (double check)
    if (renderTimeout) {
      clearTimeout(renderTimeout)
      renderTimeout = null
    }

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
        if (config.websocketUrl) {
          connectWebSocket()
        }
      })
    } else {
      injectStyles()
      createBubble()
      if (config.websocketUrl) {
        connectWebSocket()
      }
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
    isConnected: function () {
      return isConnected
    },
    getChatterId: function () {
      return chatterId
    },
    startNewChat: startNewChat
  }

  // Auto-initialize
  init()
})(window, document)
