/* intelligent-bubble.js */

class IntelligentBubble {
  constructor() {
    this.bubbleElement = null;
    this.isVisible = false;
    this.typingTimer = null;
    this.hideTimer = null;
    this.init();
  }

  init() {
    if (document.getElementById('intelligent-bubble')) return; // Already exists
    this.createBubbleElement();
  }

  createBubbleElement() {
    this.bubbleElement = document.createElement('div');
    this.bubbleElement.id = 'intelligent-bubble';
    
    // Using a more semantic and structured inner HTML
    this.bubbleElement.innerHTML = `
      <div class="bubble-content">
        <div class="bubble-header">
          <div class="bubble-header-icon"></div>
          <span>AI Coach</span>
        </div>
        <div class="bubble-message-area">
          <span class="message-text"></span>
          <span class="typing-cursor"></span>
        </div>
      </div>
    `;

    document.body.appendChild(this.bubbleElement);
  }

  typeMessage(message) {
    const messageTextElement = this.bubbleElement.querySelector('.message-text');
    const cursorElement = this.bubbleElement.querySelector('.typing-cursor');
    messageTextElement.textContent = '';
    cursorElement.style.display = 'inline-block';
    
    let i = 0;
    // Clear any existing typing animation
    clearInterval(this.typingTimer);

    this.typingTimer = setInterval(() => {
      if (i < message.length) {
        messageTextElement.textContent += message.charAt(i);
        i++;
      } else {
        clearInterval(this.typingTimer);
        cursorElement.style.display = 'none'; // Hide cursor when done
      }
    }, 30); // Adjust typing speed here (ms)
  }

  showBubble(category, message) {
    if (!this.bubbleElement) this.createBubbleElement();

    // Reset state
    this.bubbleElement.className = '';
    this.bubbleElement.classList.add(category);
    
    // Make it visible and trigger animation
    this.bubbleElement.classList.add('visible');

    // Start typing the message
    this.typeMessage(message.text);

    // Set timer to auto-hide
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => this.hideBubble(), 12000); // 12-second auto-hide

    // Allow clicking the bubble to hide it immediately
    this.bubbleElement.onclick = () => this.hideBubble();
  }

  hideBubble() {
    if (!this.isVisible) return;
    
    clearInterval(this.typingTimer);
    clearTimeout(this.hideTimer);

    this.bubbleElement.classList.remove('visible');
    this.bubbleElement.onclick = null; // Remove click listener
    this.isVisible = false;
  }
}

// The Manager remains to handle communication with the background script.
class BubbleManager {
  constructor() {
    this.bubble = null;
    this.init();
  }

  init() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'SHOW_BUBBLE') {
        if (!this.bubble) {
          this.bubble = new IntelligentBubble();
        }
        // This makes the bubble instance accessible for showing
        this.bubble.isVisible = true; 
        this.bubble.showBubble(request.category, request.message);
        sendResponse({ status: 'Bubble triggered' });
      }
    });
  }
}

new BubbleManager(); 