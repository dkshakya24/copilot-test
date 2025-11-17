(function() {
  'use strict';
  
  // Configuration
  var config = window.CopilotConfig || {
    apiEndpoint: '',
    theme: 'auto',
    height: '600px',
    width: '100%',
    containerId: 'copilot-container'
  };
  
  // Create container if it doesn't exist
  var container = document.getElementById(config.containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = config.containerId;
    container.style.height = config.height;
    container.style.width = config.width;
    document.body.appendChild(container);
  }
  
  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = config.iframeSrc || './iframe.html';
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.display = 'block';
  
  // Load CSS
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = config.cssPath || './css/copilot.css';
  document.head.appendChild(link);
  
  container.appendChild(iframe);
  
  // PostMessage API for communication
  window.CopilotAPI = {
    sendMessage: function(message) {
      iframe.contentWindow.postMessage({
        type: 'copilot:message',
        data: message
      }, '*');
    },
    setTheme: function(theme) {
      iframe.contentWindow.postMessage({
        type: 'copilot:theme',
        data: theme
      }, '*');
    }
  };
  
  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type && event.data.type.startsWith('copilot:')) {
      if (window.CopilotConfig && window.CopilotConfig.onMessage) {
        window.CopilotConfig.onMessage(event.data);
      }
    }
  });
})();