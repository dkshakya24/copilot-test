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
      botIconUrl: window.CopilotBubbleConfig?.botIconUrl || '' // Bot avatar icon URL
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
      script.src = 'https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js'
      script.onload = () => {
        markedLoaded = true
        // Configure marked
        if (window.marked) {
          window.marked.setOptions({
            breaks: false,
            gfm: true,
            headerIds: false,
            mangle: false
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
        background: ${colors.card};
        color: ${colors.foreground};
        border: 1px solid ${colors.border};
        border-bottom-left-radius: 4px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
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
        margin: 0.6em 0 0.3em 0;
        font-weight: 600;
        line-height: 1.3;
      }
      .copilot-h1 {
        font-size: 1.3em;
      }
      .copilot-h2 {
        font-size: 1.15em;
      }
      .copilot-h3 {
        font-size: 1.05em;
      }
      .copilot-h4 {
        font-size: 1em;
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
        text-decoration: underline;
        text-decoration-color: ${config.primaryColor}80;
      }
      .copilot-link:hover {
        text-decoration-color: ${config.primaryColor};
      }
      .copilot-blockquote {
        border-left: 3px solid ${colors.border};
        padding-left: 1em;
        margin: 0.3em 0;
        color: ${colors.mutedForeground};
        font-style: italic;
      }
      .copilot-hr {
        border: none;
        border-top: 1px solid ${colors.border};
        margin: 0.6em 0;
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
        background: transparent;
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
          <a href="${escapeHtml(path)}" target="_blank" rel="noopener noreferrer" style="color: ${config.primaryColor}; text-decoration: none; font-size: 11px; white-space: nowrap; padding: 4px 8px; border: 1px solid ${config.primaryColor}; border-radius: 4px; transition: all 0.2s;" onmouseover="this.style.background='${config.primaryColor}'; this.style.color='${colors.primaryForeground}';" onmouseout="this.style.background='transparent'; this.style.color='${config.primaryColor}';">
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

  function formatMessage(content) {
    if (!content) return ''

    // Use marked.js if available, otherwise fall back to custom parser
    if (markedLoaded && window.marked) {
      try {
        let html = window.marked.parse(content)

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
    let html = escapeHtml(content)

    // Basic code blocks
    html = html.replace(
      /```([\s\S]*?)```/g,
      '<pre class="copilot-code-block"><code>$1</code></pre>'
    )

    // Inline code
    html = html.replace(
      /`([^`]+)`/g,
      '<code class="copilot-inline-code">$1</code>'
    )

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Links
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="copilot-link">$1</a>'
    )

    // Paragraphs
    html = html
      .split(/\n\n+/)
      .map(para => {
        if (!para.trim()) return ''
        return `<p class="copilot-paragraph">${para.replace(/\n/g, ' ')}</p>`
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
          <span>Arcutis AI Copilot</span>
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
