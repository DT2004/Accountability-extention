// Enhanced content/usage-tracker.js - Behavioral Pattern Detection

class UsagePatternTracker {
    constructor() {
      this.sessionStartTime = Date.now();
      this.siteVisits = new Map(); // hostname -> visit count today
      this.siteTotalTime = new Map(); // hostname -> total time today
      this.lastVisitTime = null;
      this.currentSiteStartTime = Date.now();
      this.hostname = window.location.hostname;
      this.dailyStorageKey = `usage_${new Date().toISOString().split('T')[0]}`; // YYYY-MM-DD
      this.timeTrackingInterval = null;
      this.extensionContextValid = true;
      
      this.init();
    }
  
    async init() {
      console.log('Usage Pattern Tracker initialized for:', this.hostname);
      
      // Load today's usage data
      await this.loadDailyUsage();
      
      // Record this visit
      await this.recordSiteVisit();
      
      // Set up time tracking
      this.setupTimeTracking();
      
      // Set up page unload tracking
      this.setupUnloadTracking();
      
      // Set up context invalidation listener
      this.setupContextInvalidationListener();
      
      // Check for patterns and show warnings if needed
      await this.checkForPatterns();
    }
  
    async loadDailyUsage() {
      try {
        const { [this.dailyStorageKey]: dailyUsage } = await chrome.storage.local.get([this.dailyStorageKey]);
        
        if (dailyUsage) {
          // Convert stored data back to Maps
          this.siteVisits = new Map(Object.entries(dailyUsage.siteVisits || {}));
          this.siteTotalTime = new Map(Object.entries(dailyUsage.siteTotalTime || {}));
          console.log('Loaded daily usage:', dailyUsage);
        } else {
          console.log('No existing usage data for today');
        }
      } catch (error) {
        console.log('Error loading daily usage:', error);
      }
    }
  
    async saveDailyUsage() {
      try {
        const dailyUsage = {
          date: new Date().toISOString().split('T')[0],
          siteVisits: Object.fromEntries(this.siteVisits),
          siteTotalTime: Object.fromEntries(this.siteTotalTime),
          lastUpdated: Date.now()
        };
        
        await chrome.storage.local.set({ [this.dailyStorageKey]: dailyUsage });
        console.log('Saved daily usage:', dailyUsage);
      } catch (error) {
        console.log('Error saving daily usage:', error);
      }
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
          this.cleanup();
          return false;
        } else {
          console.log('Error sending message to background:', error);
          return false;
        }
      }
    }
  
    // Cleanup method for when extension context becomes invalid
    cleanup() {
      if (this.timeTrackingInterval) {
        clearInterval(this.timeTrackingInterval);
        this.timeTrackingInterval = null;
      }
      console.log('Usage tracker cleaned up due to extension context invalidation');
    }
  
    async recordSiteVisit() {
      const currentVisits = this.siteVisits.get(this.hostname) || 0;
      this.siteVisits.set(this.hostname, currentVisits + 1);
      
      console.log(`Visit #${currentVisits + 1} to ${this.hostname} today`);
      
      // Save immediately
      await this.saveDailyUsage();
      
      // Send to background for processing
      this.sendMessageToBackground({
        type: 'SITE_VISIT_RECORDED',
        hostname: this.hostname,
        visitCount: currentVisits + 1,
        timestamp: Date.now()
      });
    }
  
    setupTimeTracking() {
      // Track time spent on this site
      this.timeTrackingInterval = setInterval(async () => {
        if (document.visibilityState === 'visible') {
          // Add 30 seconds to total time for this site
          const currentTime = this.siteTotalTime.get(this.hostname) || 0;
          this.siteTotalTime.set(this.hostname, currentTime + 30000); // 30 seconds in ms
          
          // Save every minute
          if (currentTime % 60000 < 30000) { // Every 2 intervals (1 minute)
            await this.saveDailyUsage();
          }
        }
      }, 30000); // Every 30 seconds
    }
  
    setupUnloadTracking() {
      // Save data when leaving the page
      window.addEventListener('beforeunload', async () => {
        await this.saveDailyUsage();
        
        if (this.timeTrackingInterval) {
          clearInterval(this.timeTrackingInterval);
        }
      });
  
      // Save data when tab becomes hidden
      document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
          await this.saveDailyUsage();
        }
      });
    }
  
    async checkForPatterns() {
      const visitCount = this.siteVisits.get(this.hostname) || 0;
      const totalTimeToday = this.siteTotalTime.get(this.hostname) || 0;
      
      console.log(`Pattern check: ${visitCount} visits, ${Math.round(totalTimeToday / 60000)} minutes today`);
      
      // Check for various warning patterns
      const patterns = this.analyzeUsagePatterns(visitCount, totalTimeToday);
      
      if (patterns.shouldWarn) {
        // Send pattern warning to background
        this.sendMessageToBackground({
          type: 'USAGE_PATTERN_WARNING',
          hostname: this.hostname,
          patterns: patterns,
          visitCount: visitCount,
          totalTimeMinutes: Math.round(totalTimeToday / 60000),
          timestamp: Date.now()
        });
      }
    }
  
    analyzeUsagePatterns(visitCount, totalTimeMs) {
      const totalMinutes = Math.round(totalTimeMs / 60000);
      let warningType = null;
      let severity = 'low';
      let shouldWarn = false;
      let message = '';
  
      // Define warning thresholds
      const thresholds = {
        youtube: { visits: 5, time: 120 }, // 5 visits or 2 hours
        twitter: { visits: 10, time: 90 }, // 10 visits or 1.5 hours
        tiktok: { visits: 3, time: 60 },   // 3 visits or 1 hour
        instagram: { visits: 8, time: 90 },
        reddit: { visits: 15, time: 120 },
        netflix: { visits: 2, time: 180 },  // 2 visits or 3 hours
        facebook: { visits: 12, time: 100 }
      };
  
      // Get threshold for current site
      const siteKey = Object.keys(thresholds).find(key => this.hostname.includes(key));
      const threshold = siteKey ? thresholds[siteKey] : { visits: 8, time: 100 }; // default
  
      // Check visit count patterns
      if (visitCount >= threshold.visits) {
        warningType = 'compulsive_checking';
        severity = visitCount >= threshold.visits * 2 ? 'high' : 'medium';
        shouldWarn = true;
        
        if (this.hostname.includes('youtube')) {
          message = `${visitCount}th time opening YouTube today. That's ${totalMinutes} minutes of scrolling.`;
        } else if (this.hostname.includes('twitter') || this.hostname.includes('x.com')) {
          message = `${visitCount}th time checking Twitter today. ${totalMinutes} minutes of endless scrolling.`;
        } else {
          message = `${visitCount}th visit to ${this.hostname} today. ${totalMinutes} minutes spent here.`;
        }
      }
  
      // Check time-based patterns (binge usage)
      if (totalMinutes >= threshold.time) {
        warningType = 'binge_usage';
        severity = totalMinutes >= threshold.time * 1.5 ? 'high' : 'medium';
        shouldWarn = true;
        
        const hours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal
        
        if (this.hostname.includes('youtube')) {
          message = `${hours} hours on YouTube today across ${visitCount} visits. Your goals are waiting.`;
        } else if (this.hostname.includes('netflix')) {
          message = `${hours} hours binge-watching today. Time is your most valuable resource.`;
        } else {
          message = `${hours} hours on ${this.hostname} today. That's serious time investment.`;
        }
      }
  
      // Extreme usage (reality check)
      if (visitCount >= threshold.visits * 3 || totalMinutes >= threshold.time * 2) {
        warningType = 'extreme_usage';
        severity = 'critical';
        shouldWarn = true;
        
        const hours = Math.round(totalMinutes / 60 * 10) / 10;
        message = `🚨 REALITY CHECK: ${visitCount} visits, ${hours} hours on ${this.hostname} today. At this rate, your goals will take months longer to achieve.`;
      }
  
      return {
        warningType,
        severity,
        shouldWarn,
        message,
        visitCount,
        totalMinutes,
        threshold
      };
    }
  
    // Get current usage stats for this site
    getCurrentStats() {
      return {
        hostname: this.hostname,
        visitsToday: this.siteVisits.get(this.hostname) || 0,
        minutesToday: Math.round((this.siteTotalTime.get(this.hostname) || 0) / 60000),
        sessionTime: Math.round((Date.now() - this.sessionStartTime) / 60000),
        allSiteVisits: Object.fromEntries(this.siteVisits),
        allSiteTimes: Object.fromEntries(this.siteTotalTime)
      };
    }
  
    // Get usage summary for all sites today
    getDailyUsageSummary() {
      const summary = {
        totalSites: this.siteVisits.size,
        totalVisits: Array.from(this.siteVisits.values()).reduce((sum, visits) => sum + visits, 0),
        totalMinutes: Math.round(Array.from(this.siteTotalTime.values()).reduce((sum, time) => sum + time, 0) / 60000),
        topSites: [],
        distractionTime: 0,
        focusTime: 0
      };
  
      // Calculate top sites by time
      const siteTimeArray = Array.from(this.siteTotalTime.entries())
        .map(([hostname, timeMs]) => ({
          hostname,
          minutes: Math.round(timeMs / 60000),
          visits: this.siteVisits.get(hostname) || 0
        }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 5);
  
      summary.topSites = siteTimeArray;
  
      // Categorize time as distraction vs focus
      siteTimeArray.forEach(site => {
        const distractionSites = ['youtube', 'twitter', 'tiktok', 'instagram', 'reddit', 'netflix', 'facebook'];
        const focusSites = ['github', 'stackoverflow', 'docs.google', 'notion', 'figma'];
        
        if (distractionSites.some(d => site.hostname.includes(d))) {
          summary.distractionTime += site.minutes;
        } else if (focusSites.some(f => site.hostname.includes(f))) {
          summary.focusTime += site.minutes;
        }
      });
  
      return summary;
    }

    setupContextInvalidationListener() {
      document.addEventListener('extensionContextInvalidated', () => {
        this.extensionContextValid = false;
        this.cleanup();
      });
    }
  }
  
  // Initialize usage pattern tracker
  const usageTracker = new UsagePatternTracker();
  
  // Make available globally for debugging
  window.usageTracker = usageTracker;
  
  console.log('🔍 USAGE PATTERN TRACKER LOADED');