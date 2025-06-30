// Enhanced content/tracker.js - Behavioral Tracking with Context Awareness

class ContextualTracker {
    constructor() {
      this.sessionStart = Date.now();
      this.lastActivity = Date.now();
      this.currentContext = null;
      this.sessionId = null;
      this.trackingInterval = null;
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
    }
  
    startTrackingSession() {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.sessionStart = Date.now();
      
      console.log('Tracking session started:', this.sessionId);
      
      // Send session start to background
      chrome.runtime.sendMessage({
        type: 'SESSION_START',
        sessionId: this.sessionId,
        hostname: window.location.hostname,
        url: window.location.href,
        timestamp: this.sessionStart
      }).catch(error => console.log('Error sending session start:', error));
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
      
      // Also listen for messages from background script
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'CONTEXT_UPDATE') {
          this.updateContext(request.context);
          sendResponse({ status: 'Context updated in tracker' });
        }
      });
    }
  
    updateContext(context) {
      this.currentContext = context;
      console.log('Tracker received context update:', context);
      
      // Send context-aware activity data to background
      chrome.runtime.sendMessage({
        type: 'ACTIVITY_WITH_CONTEXT',
        sessionId: this.sessionId,
        context: context,
        timestamp: Date.now(),
        timeOnPage: Date.now() - this.sessionStart
      }).catch(error => console.log('Error sending context activity:', error));
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
      
      // Send activity report to background
      chrome.runtime.sendMessage({
        type: 'ACTIVITY_REPORT',
        sessionId: this.sessionId,
        context: this.currentContext,
        activityLevel: activityLevel,
        engagementScore: engagementScore,
        timeOnPage: timeOnPage,
        timestamp: now
      }).catch(error => console.log('Error sending activity report:', error));
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
      
      // Send session end to background
      chrome.runtime.sendMessage({
        type: 'SESSION_END',
        sessionId: this.sessionId,
        context: this.currentContext,
        totalTime: totalTime,
        endTime: sessionEnd
      }).catch(error => console.log('Error sending session end:', error));
      
      // Cleanup
      if (this.trackingInterval) {
        clearInterval(this.trackingInterval);
      }
      
      this.sessionId = null;
    }
  
    pauseTrackingSession() {
      console.log('Pausing tracking session');
      
      chrome.runtime.sendMessage({
        type: 'SESSION_PAUSE',
        sessionId: this.sessionId,
        timestamp: Date.now()
      }).catch(error => console.log('Error sending session pause:', error));
    }
  
    resumeTrackingSession() {
      console.log('Resuming tracking session');
      
      chrome.runtime.sendMessage({
        type: 'SESSION_RESUME',
        sessionId: this.sessionId,
        timestamp: Date.now()
      }).catch(error => console.log('Error sending session resume:', error));
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