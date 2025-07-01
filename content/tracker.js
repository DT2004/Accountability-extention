// Enhanced content/tracker.js - Behavioral Tracking with Context Awareness

// Global message sending utility that can be used by other files
window.extensionMessageSender = {
  extensionContextValid: true,
  
  async sendMessage(messageData) {
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
        // Notify all components that extension context is invalid
        this.notifyContextInvalidation();
        return false;
      } else {
        console.log('Error sending message to background:', error);
        return false;
      }
    }
  },

  notifyContextInvalidation() {
    // Dispatch a custom event to notify other components
    document.dispatchEvent(new CustomEvent('extensionContextInvalidated'));
  },

  isContextValid() {
    return this.extensionContextValid;
  }
};

class ContextualTracker {
    constructor() {
      this.sessionStart = Date.now();
      this.lastActivity = Date.now();
      this.currentContext = null;
      this.sessionId = null;
      this.trackingInterval = null;
      this.extensionContextValid = true;
      this.init();
    }
  
    init() {
      console.log('Contextual tracker initialized');
      
      // Start tracking session
      this.startTrackingSession();
      
      // Set up activity monitoring
      this.setupActivityMonitoring();
      
      // Listen for context updates from detector
      this.setupContextListener();
      
      // Track session end
      this.setupSessionEndHandlers();
      
      // Listen for extension context invalidation
      this.setupContextInvalidationListener();
    }

    // Helper method to safely send messages to background
    async sendMessageToBackground(messageData) {
      return await window.extensionMessageSender.sendMessage(messageData);
    }

    // Cleanup method for when extension context becomes invalid
    cleanup() {
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
        this.trackingInterval = null;
      }
      this.sessionId = null;
      console.log('Tracker cleaned up due to extension context invalidation');
    }

    setupContextInvalidationListener() {
      document.addEventListener('extensionContextInvalidated', () => {
        this.extensionContextValid = false;
        this.cleanup();
      });
    }
  
    startTrackingSession() {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStart = Date.now();
      
      console.log('Tracking session started:', this.sessionId);
      
      // Send session start to background with error handling
      try {
        this.sendMessageToBackground({
          type: 'SESSION_START',
          sessionId: this.sessionId,
          hostname: window.location.hostname,
          url: window.location.href,
          timestamp: this.sessionStart
        }).catch(error => {
          console.log('Error sending session start:', error);
        });
      } catch (error) {
        console.log('Error in startTrackingSession:', error);
      }
    }
  
    setupActivityMonitoring() {
      // Track user activity indicators
      const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'click'];
      
      activityEvents.forEach(eventType => {
        document.addEventListener(eventType, () => {
          this.updateLastActivity();
        }, { passive: true });
      });
  
      // Periodic activity check
      this.trackingInterval = setInterval(() => {
        this.checkAndReportActivity();
      }, 30000); // Every 30 seconds
    }
  
    setupContextListener() {
      // Listen for context changes from the detector
      document.addEventListener('contextChange', (event) => {
        this.updateContext(event.detail);
      });
      
      // Check if chrome.runtime is available and extension context is valid
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) {
        console.log('Chrome runtime not available, skipping message listener setup');
        return;
      }
      
      if (!window.extensionMessageSender || !window.extensionMessageSender.isContextValid()) {
        console.log('Extension context not valid, skipping message listener setup');
        return;
      }
      
      // Also listen for messages from background script with proper error handling
      const setupMessageListener = () => {
        try {
          chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            try {
              if (request.type === 'CONTEXT_UPDATE') {
                this.updateContext(request.context);
                sendResponse({ status: 'Context updated in tracker' });
              }
            } catch (error) {
              console.log('Error handling message in tracker:', error);
              if (error.message.includes('Extension context invalidated')) {
                this.extensionContextValid = false;
                this.cleanup();
              }
            }
          });
          console.log('Message listener set up successfully in tracker');
        } catch (error) {
          console.log('Error setting up message listener in tracker:', error);
          if (error.message.includes('Extension context invalidated')) {
            this.extensionContextValid = false;
            this.cleanup();
          }
        }
      };
      
      // Try to set up the listener
      setupMessageListener();
    }
  
    updateContext(context) {
      this.currentContext = context;
      console.log('Tracker received context update:', context);
      
      // Send context-aware activity data to background with error handling
      try {
        this.sendMessageToBackground({
          type: 'ACTIVITY_WITH_CONTEXT',
          sessionId: this.sessionId,
          context: context,
          timestamp: Date.now(),
          timeOnPage: Date.now() - this.sessionStart
        }).catch(error => {
          console.log('Error sending context update:', error);
          if (error.message.includes('Extension context invalidated')) {
            this.extensionContextValid = false;
            this.cleanup();
          }
        });
      } catch (error) {
        console.log('Error in updateContext:', error);
        if (error.message.includes('Extension context invalidated')) {
          this.extensionContextValid = false;
          this.cleanup();
        }
      }
    }
  
    updateLastActivity() {
      this.lastActivity = Date.now();
    }
  
    checkAndReportActivity() {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivity;
      const timeOnPage = now - this.sessionStart;
      
      // Determine activity level
      let activityLevel = 'active';
      if (timeSinceActivity > 120000) { // 2 minutes
        activityLevel = 'idle';
      } else if (timeSinceActivity > 60000) { // 1 minute
        activityLevel = 'low';
      }
      
      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore(timeOnPage, activityLevel);
      
      // Send activity report to background with error handling
      try {
        this.sendMessageToBackground({
          type: 'ACTIVITY_REPORT',
          sessionId: this.sessionId,
          context: this.currentContext,
          activityLevel: activityLevel,
          engagementScore: engagementScore,
          timeOnPage: timeOnPage,
          timestamp: now
        }).catch(error => {
          console.log('Error sending activity report:', error);
          if (error.message.includes('Extension context invalidated')) {
            this.extensionContextValid = false;
            this.cleanup();
          }
        });
      } catch (error) {
        console.log('Error in checkAndReportActivity:', error);
        if (error.message.includes('Extension context invalidated')) {
          this.extensionContextValid = false;
          this.cleanup();
        }
      }
    }
  
    calculateEngagementScore(timeOnPage, activityLevel) {
      // Simple engagement scoring algorithm
      let baseScore = Math.min(timeOnPage / 60000, 10); // Max 10 points for time (up to 10 minutes)
      
      const activityMultiplier = {
        'active': 1.0,
        'low': 0.7,
        'idle': 0.3
      };
      
      const contextMultiplier = this.getContextMultiplier();
      
      return Math.round(baseScore * activityMultiplier[activityLevel] * contextMultiplier);
    }
  
    getContextMultiplier() {
      if (!this.currentContext) return 1.0;
      
      // Boost score for productive activities
      const productiveActivities = [
        'educational_video', 'work_related', 'development', 
        'problem_solving', 'learning', 'job_search'
      ];
      
      if (productiveActivities.includes(this.currentContext.activity)) {
        return 1.5;
      }
      
      // Reduce score for distracting activities
      const distractingActivities = [
        'entertainment_video', 'social_scrolling', 'feed_browsing', 'casual_chat'
      ];
      
      if (distractingActivities.includes(this.currentContext.activity)) {
        return 0.5;
      }
      
      return 1.0;
    }
  
    setupSessionEndHandlers() {
      // Track when user leaves the page
      window.addEventListener('beforeunload', () => {
        this.endTrackingSession();
      });
      
      // Track when tab becomes inactive
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseTrackingSession();
        } else {
          this.resumeTrackingSession();
        }
      });
    }
  
    endTrackingSession() {
      if (!this.sessionId) return;
      
      const sessionEnd = Date.now();
      const totalTime = sessionEnd - this.sessionStart;
      
      console.log('Ending tracking session:', this.sessionId);
      
      // Send session end to background with error handling
      try {
        this.sendMessageToBackground({
          type: 'SESSION_END',
          sessionId: this.sessionId,
          context: this.currentContext,
          totalTime: totalTime,
          endTime: sessionEnd
        }).catch(error => {
          console.log('Error sending session end:', error);
        });
      } catch (error) {
        console.log('Error in endTrackingSession:', error);
      }
      
      // Cleanup
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
      }
      
      this.sessionId = null;
    }
  
    pauseTrackingSession() {
      console.log('Pausing tracking session');
      
      try {
        this.sendMessageToBackground({
          type: 'SESSION_PAUSE',
          sessionId: this.sessionId,
          timestamp: Date.now()
        }).catch(error => {
          console.log('Error sending session pause:', error);
        });
      } catch (error) {
        console.log('Error in pauseTrackingSession:', error);
      }
    }
  
    resumeTrackingSession() {
      console.log('Resuming tracking session');
      
      try {
        this.sendMessageToBackground({
          type: 'SESSION_RESUME',
          sessionId: this.sessionId,
          timestamp: Date.now()
        }).catch(error => {
          console.log('Error sending session resume:', error);
        });
      } catch (error) {
        console.log('Error in resumeTrackingSession:', error);
      }
    }
  
    // Public method to get current tracking data
    getCurrentTrackingData() {
      return {
        sessionId: this.sessionId,
        timeOnPage: Date.now() - this.sessionStart,
        context: this.currentContext,
        lastActivity: this.lastActivity
      };
    }
  }
  
  // Initialize contextual tracker
  const contextualTracker = new ContextualTracker();
  
  // Make tracker available globally for other scripts
  window.contextualTracker = contextualTracker;
  
  console.log('Enhanced tracker script loaded.');

console.log('📊 TRACKER SCRIPT LOADED - Accountability Bubble Extension');