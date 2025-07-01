/* Enhanced content/bubble.js - Context-Aware Intelligent Bubble */

class EnhancedIntelligentBubble {
  constructor() {
    this.bubbleElement = null;
    this.isVisible = false;
    this.typingTimer = null;
    this.hideTimer = null;
    this.currentContext = null;
    this.messageHistory = [];
    this.extensionContextValid = true;
    this.init();
  }

  init() {
    if (document.getElementById('intelligent-bubble')) return; // Already exists
    this.createBubbleElement();
    this.setupContextListener();
    this.setupContextInvalidationListener();
  }

  createBubbleElement() {
    this.bubbleElement = document.createElement('div');
    this.bubbleElement.id = 'intelligent-bubble';
    
    // Enhanced structure with context display
    this.bubbleElement.innerHTML = `
      <div class="bubble-content">
        <div class="bubble-header">
          <div class="bubble-header-icon"></div>
          <span class="header-text">AI Coach</span>
          <div class="context-indicator"></div>
        </div>
        <div class="context-display"></div>
        <div class="bubble-message-area">
          <span class="message-text"></span>
          <span class="typing-cursor"></span>
        </div>
        <div class="bubble-actions">
          <button class="action-btn primary-action" style="display: none;">Focus Now</button>
          <button class="action-btn secondary-action" style="display: none;">5 Min Break</button>
        </div>
        <div class="bubble-controls">
          <button class="dismiss-btn">×</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.bubbleElement);
    this.setupBubbleInteractions();
  }

  setupBubbleInteractions() {
    // Dismiss button
    const dismissBtn = this.bubbleElement.querySelector('.dismiss-btn');
    dismissBtn.addEventListener('click', () => this.hideBubble());

    // Action buttons
    const primaryAction = this.bubbleElement.querySelector('.primary-action');
    const secondaryAction = this.bubbleElement.querySelector('.secondary-action');

    primaryAction.addEventListener('click', () => this.handlePrimaryAction());
    secondaryAction.addEventListener('click', () => this.handleSecondaryAction());

    // Click outside to dismiss
    document.addEventListener('click', (event) => {
      if (this.isVisible && !this.bubbleElement.contains(event.target)) {
        this.hideBubble();
      }
    });
  }

  setupContextListener() {
    // Listen for context updates from detector
    if (window.contentDetector) {
      // Custom event listener for context changes
      document.addEventListener('contextDetected', (event) => {
        this.updateContextDisplay(event.detail);
      });
    }
  }

  updateContextDisplay(context) {
    this.currentContext = context;
    const contextDisplay = this.bubbleElement?.querySelector('.context-display');
    const contextIndicator = this.bubbleElement?.querySelector('.context-indicator');
    
    if (!contextDisplay || !contextIndicator) return;

    // Update context indicator
    const platformEmojis = {
      'youtube': '📺',
      'twitter': '🐦',
      'linkedin': '💼',
      'github': '💻',
      'stackoverflow': '❓',
      'ai_chat': '🤖'
    };

    const platformEmoji = platformEmojis[context.platform] || '🌐';
    contextIndicator.textContent = platformEmoji;
    contextIndicator.title = `${context.platform} - ${context.activity}`;

    // Update context display with relevant info
    let contextText = '';
    
    if (context.data.video_title) {
      contextText = `📹 ${context.data.video_title.substring(0, 40)}...`;
    } else if (context.data.tweet_author) {
      contextText = `🐦 Tweet from ${context.data.tweet_author}`;
    } else if (context.platform === 'linkedin') {
      contextText = `💼 ${context.activity.replace('_', ' ')}`;
    } else if (context.platform === 'ai_chat') {
      contextText = `🤖 ${context.activity === 'work_related' ? 'Work chat' : 'Casual chat'}`;
    } else {
      contextText = `${platformEmoji} ${context.activity.replace('_', ' ')}`;
    }

    contextDisplay.textContent = contextText;
    contextDisplay.style.display = contextText ? 'block' : 'none';
  }

  typeMessage(message) {
    const messageTextElement = this.bubbleElement.querySelector('.message-text');
    const cursorElement = this.bubbleElement.querySelector('.typing-cursor');
    
    messageTextElement.textContent = '';
    cursorElement.style.display = 'inline-block';
    
    let i = 0;
    clearInterval(this.typingTimer);

    // Faster typing for shorter messages
    const typingSpeed = message.length > 100 ? 40 : 25;

    this.typingTimer = setInterval(() => {
      if (i < message.length) {
        messageTextElement.textContent += message.charAt(i);
        i++;
      } else {
        clearInterval(this.typingTimer);
        cursorElement.style.display = 'none';
        this.showContextualActions();
      }
    }, typingSpeed);
  }

  showContextualActions() {
    if (!this.currentContext) return;

    const primaryAction = this.bubbleElement.querySelector('.primary-action');
    const secondaryAction = this.bubbleElement.querySelector('.secondary-action');

    // Show different actions based on context
    const { platform, activity } = this.currentContext;

    if (activity === 'entertainment_video' || activity === 'social_scrolling' || activity === 'feed_browsing') {
      // Distraction activities
      primaryAction.textContent = 'Focus Now';
      primaryAction.style.display = 'inline-block';
      
      secondaryAction.textContent = '5 Min Break';
      secondaryAction.style.display = 'inline-block';
    } else if (activity === 'educational_video' || activity === 'work_related' || activity === 'development') {
      // Productive activities
      primaryAction.textContent = 'Keep Going';
      primaryAction.style.display = 'inline-block';
      
      secondaryAction.style.display = 'none';
    } else {
      // Neutral activities
      primaryAction.textContent = 'Got It';
      primaryAction.style.display = 'inline-block';
      
      secondaryAction.style.display = 'none';
    }
  }

  showBubble(category, message, context = null) {
    if (!this.bubbleElement) this.createBubbleElement();

    // Update context if provided
    if (context) {
      this.updateContextDisplay(context);
    }

    // Reset state and apply category styling
    this.bubbleElement.className = '';
    this.bubbleElement.classList.add(category, 'visible');
    
    // Update header based on category
    const headerText = this.bubbleElement.querySelector('.header-text');
    const categoryLabels = {
      'focused': 'AI Coach',
      'distracted': 'Reality Check',
      'neutral': 'Quick Reminder'
    };
    headerText.textContent = categoryLabels[category] || 'AI Coach';

    // Start typing animation
    this.typeMessage(message.text);

    // Store in message history
    this.messageHistory.push({
      category,
      message: message.text,
      context,
      timestamp: Date.now()
    });

    // Auto-hide timer
    clearTimeout(this.hideTimer);
    const autoHideDelay = category === 'distracted' ? 15000 : 12000;
    this.hideTimer = setTimeout(() => this.hideBubble(), autoHideDelay);

    this.isVisible = true;

    // Track bubble display
    this.trackBubbleDisplay(category, context);
  }

  hideBubble() {
    if (!this.isVisible) return;
    
    clearInterval(this.typingTimer);
    clearTimeout(this.hideTimer);

    this.bubbleElement.classList.remove('visible');
    
    // Hide action buttons
    this.bubbleElement.querySelector('.primary-action').style.display = 'none';
    this.bubbleElement.querySelector('.secondary-action').style.display = 'none';
    
    this.isVisible = false;

    // Track bubble dismissal
    this.trackBubbleDismissal();
  }

  // Helper method to safely send messages to background
  async sendMessageToBackground(messageData) {
    // Use global message sender if available, otherwise fall back to local method
    if (window.extensionMessageSender) {
      return await window.extensionMessageSender.sendMessage(messageData);
    }
    
    // Fallback local method
    if (!this.extensionContextValid) {
      console.log('Extension context invalid, skipping message send');
      return false;
    }

    try {
      await chrome.runtime.sendMessage(messageData);
      return true;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.log('Extension context invalidated, stopping message sending');
        this.extensionContextValid = false;
        return false;
      } else {
        console.log('Error sending message to background:', error);
        return false;
      }
    }
  }

  handlePrimaryAction() {
    const action = this.bubbleElement.querySelector('.primary-action').textContent;
    
    // Send action to background for tracking
    this.sendMessageToBackground({
      type: 'BUBBLE_ACTION',
      action: 'primary',
      actionText: action,
      context: this.currentContext,
      timestamp: Date.now()
    });

    if (action === 'Focus Now') {
      // Close current tab if it's distracting
      this.handleFocusNowAction();
    }

    this.hideBubble();
  }

  handleSecondaryAction() {
    const action = this.bubbleElement.querySelector('.secondary-action').textContent;
    
    this.sendMessageToBackground({
      type: 'BUBBLE_ACTION',
      action: 'secondary', 
      actionText: action,
      context: this.currentContext,
      timestamp: Date.now()
    });

    if (action === '5 Min Break') {
      // Set a reminder for 5 minutes
      this.setBreakReminder();
    }

    this.hideBubble();
  }

  handleFocusNowAction() {
    // Show motivational message
    const focusMessage = "💪 Great choice! Let's get back to what matters.";
    this.showTemporaryMessage(focusMessage);

    // Optionally close tab or redirect (be careful with this)
    // For now, just show the message
  }

  setBreakReminder() {
    const reminderMessage = "⏰ 5-minute break timer set. I'll check in soon!";
    this.showTemporaryMessage(reminderMessage);
    
    // Send break timer to background
    this.sendMessageToBackground({
      type: 'SET_BREAK_TIMER',
      duration: 5 * 60 * 1000, // 5 minutes
      timestamp: Date.now()
    });
  }

  showTemporaryMessage(text) {
    const tempBubble = this.bubbleElement.cloneNode(true);
    tempBubble.id = 'temp-bubble';
    tempBubble.querySelector('.message-text').textContent = text;
    tempBubble.querySelector('.typing-cursor').style.display = 'none';
    tempBubble.querySelector('.bubble-actions').style.display = 'none';
    tempBubble.querySelector('.context-display').style.display = 'none';
    tempBubble.classList.add('temp-message');
    
    document.body.appendChild(tempBubble);
    
    setTimeout(() => {
      tempBubble.remove();
    }, 3000);
  }

  trackBubbleDisplay(category, context) {
    this.sendMessageToBackground({
      type: 'BUBBLE_DISPLAYED',
      category,
      context,
      timestamp: Date.now()
    });
  }

  trackBubbleDismissal() {
    const lastMessage = this.messageHistory[this.messageHistory.length - 1];
    
    this.sendMessageToBackground({
      type: 'BUBBLE_DISMISSED',
      messageData: lastMessage,
      timestamp: Date.now()
    });
  }

  // Public method to show bubble (called by background script)
  showBubbleWithData(data) {
    this.showBubble(data.category, data.message, data.context);
  }

  // Get bubble statistics
  getBubbleStats() {
    return {
      totalShown: this.messageHistory.length,
      recentMessages: this.messageHistory.slice(-5),
      currentContext: this.currentContext
    };
  }

  setupContextInvalidationListener() {
    document.addEventListener('extensionContextInvalidated', () => {
      this.extensionContextValid = false;
    });
  }
}

// Enhanced Bubble Manager with better message handling
class EnhancedBubbleManager {
  constructor() {
    this.bubble = null;
    this.messageQueue = [];
    this.isProcessing = false;
    this.extensionContextValid = true;
    this.init();
  }

  init() {
    try {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          if (request.type === 'SHOW_BUBBLE') {
            this.queueMessage(request);
            sendResponse({ status: 'Bubble message queued' });
          }

          // NEW: Handle usage warnings (priority)
          if (request.type === 'SHOW_USAGE_WARNING') {
            this.showUsageWarningImmediate(request);
            sendResponse({ status: 'Usage warning shown immediately' });
          }
          
          if (request.type === 'BREAK_TIMER_FINISHED') {
            this.showBreakEndReminder();
            sendResponse({ status: 'Break reminder shown' });
          }
        } catch (error) {
          console.log('Error handling message in bubble manager:', error);
          if (error.message.includes('Extension context invalidated')) {
            this.extensionContextValid = false;
          }
        }
      });
    } catch (error) {
      console.log('Error setting up message listener in bubble manager:', error);
      if (error.message.includes('Extension context invalidated')) {
        this.extensionContextValid = false;
      }
    }

    // Listen for extension context invalidation
    document.addEventListener('extensionContextInvalidated', () => {
      this.extensionContextValid = false;
    });
  }

  queueMessage(messageData) {
    this.messageQueue.push(messageData);
    this.processQueue();
  }

  async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.messageQueue.length > 0) {
      const messageData = this.messageQueue.shift();
      
      if (!this.bubble) {
        this.bubble = new EnhancedIntelligentBubble();
      }
      
      // Show the bubble
      this.bubble.showBubble(messageData.category, messageData.message, messageData.context);
      
      // Wait for current bubble to be dismissed before showing next
      await this.waitForBubbleDismissal();
    }
    
    this.isProcessing = false;
  }

  waitForBubbleDismissal() {
    return new Promise((resolve) => {
      const checkDismissal = () => {
        if (!this.bubble.isVisible) {
          resolve();
        } else {
          setTimeout(checkDismissal, 1000);
        }
      };
      checkDismissal();
    });
  }

  showBreakEndReminder() {
    if (!this.bubble) {
      this.bubble = new EnhancedIntelligentBubble();
    }
    
    this.bubble.showBubble('neutral', {
      text: "⏰ Break time's up! Ready to get back to crushing your goals?"
    });
  }

  // NEW: Handle immediate usage warnings (bypasses queue)
  showUsageWarningImmediate(request) {
    if (!this.bubble) {
      this.bubble = new EnhancedIntelligentBubble();
    }
    
    // Usage warnings are high priority and should show immediately
    // They can interrupt current bubbles if needed
    if (this.bubble.isVisible) {
      this.bubble.hideBubble(); // Hide current bubble
    }
    
    // Show the usage warning with high priority styling
    this.bubble.showBubble('distracted', {
      text: request.message || "⚠️ Usage pattern detected - time to refocus!"
    }, request.context);
    
    // Usage warnings stay visible longer
    clearTimeout(this.bubble.hideTimer);
    this.bubble.hideTimer = setTimeout(() => this.bubble.hideBubble(), 20000); // 20 seconds
  }
}

// Initialize enhanced bubble manager
new EnhancedBubbleManager();