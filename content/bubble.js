/* Enhanced content/bubble.js - Context-Aware Intelligent Bubble */
/* KEEPS ALL YOUR EXISTING FUNCTIONALITY + ADDS POWERFUL VISUAL IMPROVEMENTS */

class EnhancedIntelligentBubble {
  constructor() {
    this.bubbleElement = null;
    this.overlayElement = null; // NEW: Add overlay for center-screen effect
    this.isVisible = false;
    this.typingTimer = null;
    this.hideTimer = null;
    this.currentContext = null;
    this.messageHistory = [];
    this.extensionContextValid = true;
    this.currentUserProfile = null; // NEW: Store user profile
    this.init();
  }

  init() {
    if (document.getElementById('intelligent-bubble')) return; // Already exists
    this.createBubbleElement();
    this.createOverlay(); // NEW: Create dark overlay
    this.setupContextListener();
    this.setupContextInvalidationListener();
    this.loadUserProfile(); // NEW: Load user profile for personalization
  }

  // NEW: Load user profile for personalized messages
  async loadUserProfile() {
    try {
      const { settings } = await chrome.storage.local.get(['settings']);
      this.currentUserProfile = settings;
      console.log('User profile loaded for powerful messages:', this.currentUserProfile);
    } catch (error) {
      console.log('Could not load user profile:', error);
    }
  }

  // NEW: Create dark overlay for center-screen effect
  createOverlay() {
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'bubble-overlay';
    this.overlayElement.addEventListener('click', () => this.hideBubble());
    document.body.appendChild(this.overlayElement);
  }

  createBubbleElement() {
    this.bubbleElement = document.createElement('div');
    this.bubbleElement.id = 'intelligent-bubble';
    
    // Enhanced structure with profile icon and better layout
    this.bubbleElement.innerHTML = `
      <div class="bubble-content">
        <div class="profile-icon">
          <img class="profile-glow-i mg" alt="Profile Icon" width="64" height="64" style="border-radius:50%;object-fit:cover;" />
        </div>
        <div class="bubble-header">
          <div class="bubble-header-icon"></div>
          <span class="header-text">AI Coach</span>
          <div class="context-indicator"></div>
        </div>
        <div class="context-display"></div>
        <div class="bubble-message-area">
          <div class="message-text"></div>
          <div class="message-subtext"></div>
          <span class="typing-cursor"></span>
        </div>
        <div class="bubble-actions">
          <button class="action-btn primary-action" style="display: none;">Back to Task</button>
          <button class="action-btn secondary-action" style="display: none;">Dismiss</button>
        </div>
        <div class="bubble-controls">
          <button class="dismiss-btn">×</button>
        </div>
      </div>
    `;

    // Dynamically set the profile icon src using chrome.runtime.getURL
    const iconUrl = chrome.runtime.getURL('assets/icons/profile-glow.jpg');
    this.bubbleElement.querySelector('.profile-glow-img').src = iconUrl;
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

    // Prevent overlay clicks when clicking bubble (keep your existing functionality)
    this.bubbleElement.addEventListener('click', (e) => e.stopPropagation());
  }

  setupContextListener() {
    // Listen for context updates from detector (KEEP YOUR EXISTING CODE)
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

    // Update context indicator (KEEP YOUR EXISTING LOGIC)
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

    // Update context display with relevant info (KEEP YOUR EXISTING LOGIC)
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

  // ENHANCED: More dramatic typing with personal messages
  typeMessage(message) {
    const messageTextElement = this.bubbleElement.querySelector('.message-text');
    const messageSubTextElement = this.bubbleElement.querySelector('.message-subtext');
    const cursorElement = this.bubbleElement.querySelector('.typing-cursor');
    
    // Parse message for enhanced format
    let mainText = message.text || message;
    let subText = message.subText || '';

    // NEW: Create powerful personal messages if we have user profile
    if (this.currentUserProfile && this.currentContext) {
      const enhancedMessage = this.createPowerfulMessage(message, this.currentContext);
      mainText = enhancedMessage.mainText;
      subText = enhancedMessage.subText;
    }
    
    messageTextElement.textContent = '';
    messageSubTextElement.textContent = '';
    cursorElement.style.display = 'inline-block';
    
    let i = 0;
    clearInterval(this.typingTimer);

    // ENHANCED: Slower, more dramatic typing (60ms vs 25ms)
    const typingSpeed = 60;

    this.typingTimer = setInterval(() => {
      if (i < mainText.length) {
        messageTextElement.textContent += mainText.charAt(i);
        i++;
      } else {
        clearInterval(this.typingTimer);
        cursorElement.style.display = 'none';
        
        // Show subtext if available
        if (subText) {
          messageSubTextElement.textContent = subText;
        }
        
        // Small delay before showing actions for dramatic effect
        setTimeout(() => {
          this.showContextualActions();
        }, 800);
      }
    }, typingSpeed);
  }

  // NEW: Create powerful, personal messages like your image
  createPowerfulMessage(message, context) {
    const { userName, userGoal, currentTaskId, dailyTasks } = this.currentUserProfile || {};
    
    if (!userName || !currentTaskId || !dailyTasks) {
      return { mainText: message.text || message, subText: '' };
    }

    // Get current task
    const currentTask = dailyTasks.find(task => task.id === currentTaskId);
    if (!currentTask) {
      return { mainText: message.text || message, subText: '' };
    }

    const taskText = currentTask.text;
    
    // Create messages like your image: "You opened this tab while saying you'd work on X"
    if (context.platform === 'youtube' && context.activity === 'entertainment_video') {
      return {
        mainText: `You opened this tab while saying you'd work on "${taskText}".`,
        subText: `Still feel good about that choice, ${userName}?`
      };
    } else if (context.platform === 'twitter' || context.platform === 'x') {
      return {
        mainText: `You opened Twitter while "${taskText}" sits unfinished.`,
        subText: `Your future self is watching this decision.`
      };
    } else if (context.activity === 'social_scrolling' || context.activity === 'feed_browsing') {
      return {
        mainText: `You said "${taskText}" was important today.`,
        subText: `This isn't how important goals get achieved, ${userName}.`
      };
    }

    // Fallback to original message
    return { mainText: message.text || message, subText: '' };
  }

  showContextualActions() {
    if (!this.currentContext) return;

    const primaryAction = this.bubbleElement.querySelector('.primary-action');
    const secondaryAction = this.bubbleElement.querySelector('.secondary-action');

    // Show different actions based on context (KEEP YOUR EXISTING LOGIC)
    const { platform, activity } = this.currentContext;

    if (activity === 'entertainment_video' || activity === 'social_scrolling' || activity === 'feed_browsing') {
      // Distraction activities - use more powerful language
      primaryAction.textContent = 'Back to Task';
      primaryAction.style.display = 'inline-block';
      
      secondaryAction.textContent = 'Dismiss';
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

  showBubble(category, message, context = null, position = 'top-right') {
    if (!this.bubbleElement) this.createBubbleElement();

    // Update context if provided (KEEP YOUR EXISTING LOGIC)
    if (context) {
      this.updateContextDisplay(context);
    }

    // NEW: Show overlay for dramatic center-screen effect only if center
    if (position === 'center') {
      this.overlayElement.classList.add('visible');
    } else {
      this.overlayElement.classList.remove('visible');
    }

    // Reset state and apply category styling (KEEP YOUR EXISTING LOGIC)
    this.bubbleElement.className = '';
    this.bubbleElement.classList.add(category, 'visible', position);
    
    // NEW: Add high-impact mode for severe distractions
    if (category === 'distracted') {
      this.bubbleElement.classList.add('high-impact');
    }
    
    // Update header based on category (KEEP YOUR EXISTING LOGIC)
    const headerText = this.bubbleElement.querySelector('.header-text');
    const categoryLabels = {
      'focused': 'AI Coach',
      'distracted': 'Reality Check',
      'neutral': 'Quick Reminder'
    };
    headerText.textContent = categoryLabels[category] || 'AI Coach';

    // Start typing animation (ENHANCED VERSION)
    this.typeMessage(message);

    // Store in message history (KEEP YOUR EXISTING LOGIC)
    this.messageHistory.push({
      category,
      message: typeof message === 'string' ? message : message.text,
      context,
      timestamp: Date.now(),
      position
    });

    // Auto-hide timer (KEEP YOUR EXISTING LOGIC)
    clearTimeout(this.hideTimer);
    const autoHideDelay = category === 'distracted' ? 15000 : 12000;
    this.hideTimer = setTimeout(() => this.hideBubble(), autoHideDelay);

    this.isVisible = true;

    // Track bubble display (KEEP YOUR EXISTING LOGIC)
    this.trackBubbleDisplay(category, context);
  }

  hideBubble() {
    if (!this.isVisible) return;
    
    clearInterval(this.typingTimer);
    clearTimeout(this.hideTimer);

    this.bubbleElement.classList.remove('visible');
    this.overlayElement.classList.remove('visible'); // NEW: Hide overlay
    
    // Hide action buttons (KEEP YOUR EXISTING LOGIC)
    this.bubbleElement.querySelector('.primary-action').style.display = 'none';
    this.bubbleElement.querySelector('.secondary-action').style.display = 'none';
    
    this.isVisible = false;

    // Track bubble dismissal (KEEP YOUR EXISTING LOGIC)
    this.trackBubbleDismissal();
  }

  // Helper method to safely send messages to background (KEEP YOUR EXISTING CODE)
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
    
    // Send action to background for tracking (KEEP YOUR EXISTING LOGIC)
    this.sendMessageToBackground({
      type: 'BUBBLE_ACTION',
      action: 'primary',
      actionText: action,
      context: this.currentContext,
      timestamp: Date.now()
    });

    if (action === 'Back to Task') {
      // NEW: Enhanced focus action
      this.handleBackToTaskAction();
    } else if (action === 'Focus Now') {
      // KEEP YOUR EXISTING LOGIC
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
      // Set a reminder for 5 minutes (KEEP YOUR EXISTING LOGIC)
      this.setBreakReminder();
    }

    this.hideBubble();
  }

  // NEW: Enhanced back to task action
  handleBackToTaskAction() {
    const focusMessage = "💪 Good choice! Your future self thanks you.";
    this.showTemporaryMessage(focusMessage);
  }

  handleFocusNowAction() {
    // Show motivational message (KEEP YOUR EXISTING LOGIC)
    const focusMessage = "💪 Great choice! Let's get back to what matters.";
    this.showTemporaryMessage(focusMessage);

    // Optionally close tab or redirect (be careful with this)
    // For now, just show the message
  }

  setBreakReminder() {
    const reminderMessage = "⏰ 5-minute break timer set. I'll check in soon!";
    this.showTemporaryMessage(reminderMessage);
    
    // Send break timer to background (KEEP YOUR EXISTING LOGIC)
    this.sendMessageToBackground({
      type: 'SET_BREAK_TIMER',
      duration: 5 * 60 * 1000, // 5 minutes
      timestamp: Date.now()
    });
  }

  showTemporaryMessage(text) {
    // KEEP YOUR EXISTING TEMPORARY MESSAGE LOGIC
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

  // Public method to show bubble (called by background script) (KEEP YOUR EXISTING CODE)
  showBubbleWithData(data) {
    this.showBubble(data.category, data.message, data.context, data.position || 'top-right');
  }

  // Get bubble statistics (KEEP YOUR EXISTING CODE)
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

// Enhanced Bubble Manager with better message handling (KEEP ALL YOUR EXISTING FUNCTIONALITY)
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

          // Handle usage warnings (priority) (KEEP YOUR EXISTING LOGIC)
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

    // Listen for extension context invalidation (KEEP YOUR EXISTING LOGIC)
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
      
      // Show the bubble (KEEP YOUR EXISTING LOGIC)
      this.bubble.showBubble(messageData.category, messageData.message, messageData.context, messageData.position || 'top-right');
      
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

  // Handle immediate usage warnings (bypasses queue) (KEEP YOUR EXISTING LOGIC)
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

// Initialize enhanced bubble manager (KEEP YOUR EXISTING INITIALIZATION)
new EnhancedBubbleManager();