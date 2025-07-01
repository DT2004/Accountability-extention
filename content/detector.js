// Enhanced content/detector.js - Content Intelligence Agent
console.log('🚀 ENHANCED DETECTOR LOADED - Accountability Bubble Extension');
console.log('📍 Current URL:', window.location.href);
console.log('🏠 Hostname:', window.location.hostname);

class ContentDetector {
    constructor() {
      this.hostname = window.location.hostname;
      this.platform = this.detectPlatform();
      this.lastContext = null;
      this.observer = null;
      this.detectionTimeout = null;
      this.extensionContextValid = true;
      this.init();
    }
  
    init() {
      console.log(`Content detector initialized for ${this.platform}`);
      
      // Send basic message that service worker expects
      this.sendBasicMessage();
      
      // Test communication with background script
      this.testCommunication();
      
      // Initial context detection
      this.detectAndSendContext();
      
      // Set up mutation observer for dynamic content
      this.setupMutationObserver();
      
      // Re-detect context on URL changes (for SPAs)
      this.setupURLChangeListener();
      
      // Set up context invalidation listener
      this.setupContextInvalidationListener();
    }
  
    detectPlatform() {
      if (this.hostname.includes('youtube.com')) return 'youtube';
      if (this.hostname.includes('twitter.com') || this.hostname.includes('x.com')) return 'twitter';
      if (this.hostname.includes('linkedin.com')) return 'linkedin';
      if (this.hostname.includes('github.com')) return 'github';
      if (this.hostname.includes('stackoverflow.com')) return 'stackoverflow';
      if (this.hostname.includes('chatgpt.com') || this.hostname.includes('claude.ai') || this.hostname.includes('bard.google.com')) return 'ai_chat';
      return 'unknown';
    }
  
    async detectAndSendContext() {
      let context = null;
      
      try {
        switch (this.platform) {
          case 'youtube':
            context = this.detectYouTubeContext();
            break;
          case 'twitter':
            context = this.detectTwitterContext();
            break;
          case 'linkedin':
            context = this.detectLinkedInContext();
            break;
          case 'ai_chat':
            context = this.detectAIChatContext();
            break;
          case 'github':
            context = this.detectGitHubContext();
            break;
          case 'stackoverflow':
            context = this.detectStackOverflowContext();
            break;
          default:
            context = this.detectGenericContext();
        }
  
        // Only send if context changed or is new
        if (context && this.hasContextChanged(context)) {
          this.lastContext = context;
          this.sendContextToBackground(context);
        }
      } catch (error) {
        console.log('Error detecting context:', error);
      }
    }
  
    detectYouTubeContext() {
      const url = window.location.href;
      
      // Check if we're watching a video
      if (url.includes('/watch?v=')) {
        const videoTitle = this.getYouTubeVideoTitle();
        const channelName = this.getYouTubeChannelName();
        const videoId = new URLSearchParams(window.location.search).get('v');
        
        if (videoTitle) {
          const activity = this.classifyYouTubeVideo(videoTitle, channelName);
          return {
            platform: 'youtube',
            activity: activity,
            data: {
              video_title: videoTitle,
              channel_name: channelName || 'Unknown Channel',
              video_id: videoId,
              url: url
            }
          };
        }
      }
      
      // Check if we're browsing the home feed
      if (url === 'https://www.youtube.com/' || url.includes('/feed/')) {
        return {
          platform: 'youtube',
          activity: 'feed_browsing',
          data: {
            page_type: 'home_feed',
            url: url
          }
        };
      }
      
      return null;
    }
  
    getYouTubeVideoTitle() {
      // Multiple selectors for different YouTube layouts
      const selectors = [
        'h1.ytd-video-primary-info-renderer',
        'h1.style-scope.ytd-video-primary-info-renderer',
        '.ytd-video-primary-info-renderer h1',
        '[data-e2e="video-title"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent?.trim();
        }
      }
      
      // Fallback to title tag
      const titleMatch = document.title.match(/^(.+) - YouTube$/);
      return titleMatch ? titleMatch[1] : null;
    }
  
    getYouTubeChannelName() {
      const selectors = [
        '.ytd-channel-name a',
        '.ytd-video-owner-renderer .ytd-channel-name a',
        '[data-e2e="channel-name"]'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent?.trim();
        }
      }
      
      return null;
    }
  
    classifyYouTubeVideo(title, channelName) {
      const educationalKeywords = [
        'tutorial', 'how to', 'learn', 'course', 'lesson', 'guide', 'explained',
        'coding', 'programming', 'development', 'design', 'business', 'skill',
        'masterclass', 'training', 'education', 'study', 'review', 'analysis'
      ];
      
      const entertainmentKeywords = [
        'funny', 'meme', 'reaction', 'prank', 'gaming', 'vlog', 'challenge',
        'tiktok', 'shorts', 'compilation', 'fail', 'music video', 'trailer'
      ];
      
      const titleLower = title.toLowerCase();
      const channelLower = (channelName || '').toLowerCase();
      
      // Check educational indicators
      const hasEducationalKeywords = educationalKeywords.some(keyword => 
        titleLower.includes(keyword) || channelLower.includes(keyword)
      );
      
      // Check entertainment indicators
      const hasEntertainmentKeywords = entertainmentKeywords.some(keyword => 
        titleLower.includes(keyword) || channelLower.includes(keyword)
      );
      
      // Educational channels (common ones)
      const educationalChannels = [
        'khan academy', 'crash course', 'ted', 'freecodecamp', 'traversy media',
        'programming with mosh', 'the net ninja', 'academind', 'web dev simplified'
      ];
      
      const isEducationalChannel = educationalChannels.some(channel => 
        channelLower.includes(channel)
      );
      
      if (hasEducationalKeywords || isEducationalChannel) {
        return 'educational_video';
      } else if (hasEntertainmentKeywords) {
        return 'entertainment_video';
      } else {
        return 'unknown_video'; // Will fall back to general templates
      }
    }
  
    detectTwitterContext() {
      const url = window.location.href;
      
      // Check if we're viewing a specific tweet
      if (url.includes('/status/')) {
        const tweetAuthor = this.getTwitterAuthor();
        const tweetText = this.getTwitterText();
        
        if (tweetAuthor) {
          return {
            platform: 'twitter',
            activity: 'specific_tweet',
            data: {
              tweet_author: tweetAuthor,
              tweet_text: tweetText || '',
              url: url
            }
          };
        }
      }
      
      // Default to social scrolling
      return {
        platform: 'twitter',
        activity: 'social_scrolling',
        data: {
          page_type: 'feed',
          url: url
        }
      };
    }
  
    getTwitterAuthor() {
      const selectors = [
        '[data-testid="User-Name"] span',
        '.css-1dbjc4n.r-1awozwy.r-18u37iz.r-1wbh5a2 span',
        'article [dir="ltr"] span'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text && text.startsWith('@')) {
            return text;
          }
        }
      }
      
      return null;
    }
  
    getTwitterText() {
      const selectors = [
        '[data-testid="tweetText"]',
        '.css-1dbjc4n.r-1s2bzr4 span'
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent?.trim();
        }
      }
      
      return null;
    }
  
    detectLinkedInContext() {
      const url = window.location.href;
      
      if (url.includes('/learning/')) {
        return {
          platform: 'linkedin',
          activity: 'learning',
          data: {
            page_type: 'linkedin_learning',
            url: url
          }
        };
      }
      
      if (url.includes('/jobs/')) {
        return {
          platform: 'linkedin',
          activity: 'job_search',
          data: {
            page_type: 'job_search',
            url: url
          }
        };
      }
      
      if (url.includes('/feed/')) {
        return {
          platform: 'linkedin',
          activity: 'feed_scrolling',
          data: {
            page_type: 'professional_feed',
            url: url
          }
        };
      }
      
      return {
        platform: 'linkedin',
        activity: 'professional_browsing',
        data: {
          page_type: 'general',
          url: url
        }
      };
    }
  
    detectAIChatContext() {
      const url = window.location.href;
      
      // Try to determine if it's work-related or casual
      const isWorkRelated = this.isAIChatWorkRelated();
      
      return {
        platform: 'ai_chat',
        activity: isWorkRelated ? 'work_related' : 'casual_chat',
        data: {
          chat_platform: this.hostname,
          url: url
        }
      };
    }
  
    isAIChatWorkRelated() {
      // Look for work-related keywords in the page
      const workKeywords = [
        'code', 'programming', 'business', 'project', 'analysis',
        'strategy', 'development', 'professional', 'work', 'career'
      ];
      
      const pageText = document.body.textContent?.toLowerCase() || '';
      return workKeywords.some(keyword => pageText.includes(keyword));
    }
  
    detectGitHubContext() {
      const url = window.location.href;
      
      if (url.includes('/issues')) {
        return {
          platform: 'github',
          activity: 'issue_tracking',
          data: { page_type: 'issues', url }
        };
      }
      
      if (url.includes('/pull')) {
        return {
          platform: 'github',
          activity: 'code_review',
          data: { page_type: 'pull_request', url }
        };
      }
      
      return {
        platform: 'github',
        activity: 'development',
        data: { page_type: 'repository', url }
      };
    }
  
    detectStackOverflowContext() {
      const url = window.location.href;
      
      if (url.includes('/questions/')) {
        return {
          platform: 'stackoverflow',
          activity: 'problem_solving',
          data: { page_type: 'question', url }
        };
      }
      
      return {
        platform: 'stackoverflow',
        activity: 'learning',
        data: { page_type: 'browsing', url }
      };
    }
  
    detectGenericContext() {
      return {
        platform: 'unknown',
        activity: 'browsing',
        data: {
          hostname: this.hostname,
          url: window.location.href
        }
      };
    }
  
    hasContextChanged(newContext) {
      if (!this.lastContext) return true;
      
      return (
        this.lastContext.platform !== newContext.platform ||
        this.lastContext.activity !== newContext.activity ||
        JSON.stringify(this.lastContext.data) !== JSON.stringify(newContext.data)
      );
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
  
    sendContextToBackground(context) {
      console.log('Sending context to background:', context);
      
      this.sendMessageToBackground({
        type: 'CONTEXT_DETECTED',
        context: context,
        timestamp: Date.now()
      });
    }
  
    // Also send the basic message that the service worker expects
    sendBasicMessage() {
      this.sendMessageToBackground({
        type: 'CONTENT_SCRIPT_LOADED',
        host: window.location.hostname
      });
    }
  
    setupMutationObserver() {
      // Watch for DOM changes (important for SPAs like YouTube, Twitter)
      this.observer = new MutationObserver((mutations) => {
        let shouldRedetect = false;
        
        mutations.forEach((mutation) => {
          // Check if significant content changed
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldRedetect = true;
          }
        });
        
        if (shouldRedetect) {
          // Debounce re-detection
          clearTimeout(this.detectionTimeout);
          this.detectionTimeout = setTimeout(() => {
            this.detectAndSendContext();
          }, 1000);
        }
      });
      
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  
    setupURLChangeListener() {
      // Listen for URL changes (for SPAs)
      let lastUrl = window.location.href;
      
      setInterval(() => {
        const currentUrl = window.location.href;
        if (currentUrl !== lastUrl) {
          lastUrl = currentUrl;
          console.log('URL changed, re-detecting context');
          setTimeout(() => {
            this.detectAndSendContext();
          }, 2000); // Wait for content to load
        }
      }, 1000);
    }
  
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
      }
      clearTimeout(this.detectionTimeout);
    }
  
    // Cleanup method for when extension context becomes invalid
    cleanup() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.detectionTimeout) {
        clearTimeout(this.detectionTimeout);
        this.detectionTimeout = null;
      }
      console.log('Content detector cleaned up due to extension context invalidation');
    }
  
    // Send analysis results to background script
    async sendPageContext() {
      try {
        const context = await this.analyzePageContent();
        
        this.sendMessageToBackground({
          type: 'SMART_CONTENT_DETECTED',
          context: context,
          timestamp: Date.now()
        });
        
        console.log('Smart content analysis:', context);
      } catch (error) {
        console.log('Error in smart content analysis:', error);
        
        // Fallback to basic detection
        this.sendMessageToBackground({
          type: 'CONTENT_SCRIPT_LOADED',
          host: window.location.hostname
        });
      }
    }
  
    // Test communication with background script
    testCommunication() {
      console.log('🧪 Testing communication with background script...');
      this.sendMessageToBackground({
        type: 'TEST_COMMUNICATION',
        message: 'Content script is working!',
        timestamp: Date.now()
      }).then(response => {
        console.log('✅ Background script responded:', response);
      }).catch(error => {
        console.log('❌ Communication failed:', error);
      });
    }
  
    setupContextInvalidationListener() {
      document.addEventListener('extensionContextInvalidated', () => {
        this.extensionContextValid = false;
        this.cleanup();
      });
    }
  }
  
  // Initialize content detector
  const contentDetector = new ContentDetector();
  
  // Send initial message to background to indicate content script loaded
  contentDetector.sendMessageToBackground({ 
    type: 'CONTENT_SCRIPT_LOADED', 
    host: window.location.hostname 
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    contentDetector.destroy();
  });