class AccountabilityBubble {
  constructor() {
    this.bubbleElement = null;
    this.isVisible = false;
    this.currentSite = window.location.hostname;
    this.messageTimer = null;
    this.init();
  }

  init() {
    // In the future, we will check settings before creating the bubble
    this.createBubbleElement();
    // Site category detection and bubble display will be handled by a message from the background script
  }

  createBubbleElement() {
    this.bubbleElement = document.createElement('div');
    this.bubbleElement.id = 'accountability-bubble';
    
    // The content of the bubble will be set dynamically
    this.bubbleElement.innerHTML = `
      <button class="bubble-close">X</button>
      <div class="bubble-header">
        <span class="emoji"></span>
        <span class="status"></span>
      </div>
      <div class="bubble-message"></div>
      <div class="bubble-actions">
        <button class="primary">Stay Focused</button>
        <button class="secondary">Dismiss</button>
      </div>
    `;

    document.body.appendChild(this.bubbleElement);

    this.bubbleElement.querySelector('.bubble-close').addEventListener('click', () => this.hideBubble());
    // Add event listeners for other actions later
  }

  showBubble(category, message) {
    if (!this.bubbleElement) return;

    // Update content
    this.bubbleElement.className = ''; // Reset classes
    this.bubbleElement.classList.add(category);
    this.bubbleElement.querySelector('.emoji').textContent = message.emoji;
    this.bubbleElement.querySelector('.status').textContent = category.charAt(0).toUpperCase() + category.slice(1);
    this.bubbleElement.querySelector('.bubble-message').textContent = message.text;
    
    // Show bubble
    this.isVisible = true;
    this.bubbleElement.classList.add('visible');

    // Auto-hide after 15 seconds
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.hideBubble(), 15000);
  }

  hideBubble() {
    if (!this.bubbleElement) return;
    this.isVisible = false;
    this.bubbleElement.classList.remove('visible');
    clearTimeout(this.messageTimer);
  }
}

// Logic to initialize the bubble will be more complex.
// We need to listen for messages from the background script.
// For now, we can create an instance for testing purposes if needed,
// but the final version will be triggered by the service worker.
console.log('Accountability Bubble content script loaded.');

// Example of how background script will communicate
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.type === 'SHOW_BUBBLE') {
//     // Ensure bubble is created
//     if (!window.accountabilityBubble) {
//       window.accountabilityBubble = new AccountabilityBubble();
//     }
//     window.accountabilityBubble.showBubble(request.category, request.message);
//   }
// });

// Note: A better approach for MV3 is to have a single instance manager.
// Let's create one.

class BubbleManager {
  constructor() {
    this.bubble = null;
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'SHOW_BUBBLE') {
        if (!this.bubble) {
          this.bubble = new AccountabilityBubble();
        }
        this.bubble.showBubble(request.category, request.message);
      }
    });
  }
}

new BubbleManager(); 