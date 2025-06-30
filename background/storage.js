// Enhanced storage.js - Smart Message Storage and Management
console.log('Enhanced Storage script loaded.');

export async function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result);
    });
  });
}

export async function setStorageData(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve();
    });
  });
}

export const defaultSettings = {
  enabled: true,
  frequency: 600000, // 10 minutes in ms
  aiMessages: false,
  doNotDisturbHours: [22, 7], // 10pm to 7am
  smartMessages: true, // Enable smart contextual messages
  userName: null,
  userGoal: null,
  motivationStyle: 'encouraging'
};

export const defaultStats = {
  daily: {
    focusTime: 0,
    distractionTime: 0,
    siteVisits: {},
    contextualMessagesShown: 0,
    smartDetections: 0
  },
  weekly: {},
  behavioral_patterns: {
    peak_focus_hours: [],
    common_distractions: {},
    productivity_by_day: {}
  }
};

export async function initializeStorage() {
  console.log('Initializing storage with smart message support...');
  
  // Load default sites and messages from JSON files into storage if not already present
  const { sites, messages, smartMessages } = await getStorageData(['sites', 'messages', 'smartMessages']);
  
  // Initialize basic site categorization
  if (!sites) {
    const sitesURL = chrome.runtime.getURL('data/sites.json');
    try {
      const response = await fetch(sitesURL);
      const sitesData = await response.json();
      await setStorageData({ sites: sitesData });
      console.log('Default sites loaded into storage.');
    } catch (error) {
      console.log('Error loading sites.json:', error);
    }
  }

  // Initialize legacy messages (fallback)
  if (!messages) {
    const messagesURL = chrome.runtime.getURL('data/messages.json');
    try {
      const response = await fetch(messagesURL);
      const messagesData = await response.json();
      await setStorageData({ messages: messagesData });
      console.log('Default messages loaded into storage.');
    } catch (error) {
      console.log('Error loading messages.json:', error);
    }
  }

  // Initialize smart contextual messages
  if (!smartMessages) {
    const smartMessagesURL = chrome.runtime.getURL('data/smart-messages.json');
    try {
      const response = await fetch(smartMessagesURL);
      const smartMessagesData = await response.json();
      await setStorageData({ smartMessages: smartMessagesData });
      console.log('Smart message templates loaded into storage.');
    } catch (error) {
      console.log('Error loading smart-messages.json:', error);
      console.log('Smart messages will use fallback templates.');
    }
  }
  
  // Initialize settings, stats, and custom categories if not already present
  const { settings, stats, customCategories } = await getStorageData(['settings', 'stats', 'customCategories']);
  
  if (!settings) {
    await setStorageData({ settings: defaultSettings });
    console.log('Default settings loaded into storage.');
  }

  if (!stats) {
    await setStorageData({ stats: defaultStats });
    console.log('Default stats loaded into storage.');
  }

  if (!customCategories) {
    await setStorageData({ customCategories: {} });
    console.log('Custom categories initialized.');
  }

  console.log('Storage initialization complete.');
}

// Smart message cache management
export async function cacheContextualMessage(contextHash, message, category, platform, activity) {
  try {
    const cacheKey = `messageCache:${contextHash}`;
    const cacheData = {
      message,
      category,
      platform,
      activity,
      timestamp: Date.now(),
      usageCount: 1
    };
    
    await setStorageData({ [cacheKey]: cacheData });
    console.log('Message cached:', contextHash);
  } catch (error) {
    console.log('Error caching message:', error);
  }
}

export async function getCachedMessage(contextHash) {
  try {
    const cacheKey = `messageCache:${contextHash}`;
    const { [cacheKey]: cachedData } = await getStorageData([cacheKey]);
    
    if (cachedData) {
      // Update usage count
      cachedData.usageCount++;
      await setStorageData({ [cacheKey]: cachedData });
      return cachedData.message;
    }
    
    return null;
  } catch (error) {
    console.log('Error retrieving cached message:', error);
    return null;
  }
}

// Behavioral pattern tracking
export async function trackBehavioralPattern(hostname, activity, category, duration) {
  try {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    
    const patternKey = `pattern:${hostname}:${activity}:${currentHour}:${currentDay}`;
    const { [patternKey]: existingPattern } = await getStorageData([patternKey]);
    
    const patternData = {
      hostname,
      activity,
      category,
      hour: currentHour,
      day: currentDay,
      frequency: (existingPattern?.frequency || 0) + 1,
      totalDuration: (existingPattern?.totalDuration || 0) + duration,
      lastSeen: Date.now()
    };
    
    await setStorageData({ [patternKey]: patternData });
    console.log('Behavioral pattern tracked:', patternData);
  } catch (error) {
    console.log('Error tracking behavioral pattern:', error);
  }
}

// Context session management
export async function startContextSession(hostname, platform, activity, context) {
  try {
    const sessionId = `session:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const sessionData = {
      hostname,
      platform,
      activity,
      context,
      startTime: Date.now(),
      endTime: null,
      duration: null,
      productivityScore: null,
      interventionShown: false
    };
    
    await setStorageData({ [sessionId]: sessionData });
    return sessionId;
  } catch (error) {
    console.log('Error starting context session:', error);
    return null;
  }
}

export async function endContextSession(sessionId, productivityScore = null, interventionShown = false) {
  try {
    const { [sessionId]: sessionData } = await getStorageData([sessionId]);
    
    if (sessionData) {
      const endTime = Date.now();
      const duration = endTime - sessionData.startTime;
      
      sessionData.endTime = endTime;
      sessionData.duration = duration;
      sessionData.productivityScore = productivityScore;
      sessionData.interventionShown = interventionShown;
      
      await setStorageData({ [sessionId]: sessionData });
      
      // Track behavioral pattern
      await trackBehavioralPattern(
        sessionData.hostname, 
        sessionData.activity, 
        sessionData.context?.category, 
        duration
      );
      
      console.log('Context session ended:', sessionData);
      return sessionData;
    }
  } catch (error) {
    console.log('Error ending context session:', error);
  }
  
  return null;
}

// Daily stats management
export async function updateDailyStats(category, timeSpent, contextualMessage = false) {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const statsKey = `dailyStats:${today}`;
    const { [statsKey]: dailyStats } = await getStorageData([statsKey]);
    
    const currentStats = dailyStats || {
      date: today,
      focusTime: 0,
      distractionTime: 0,
      neutralTime: 0,
      totalSessions: 0,
      contextualMessagesShown: 0,
      smartDetections: 0,
      productivityScore: 0
    };
    
    // Update time spent
    if (category === 'focused') {
      currentStats.focusTime += timeSpent;
    } else if (category === 'distracted') {
      currentStats.distractionTime += timeSpent;
    } else {
      currentStats.neutralTime += timeSpent;
    }
    
    currentStats.totalSessions++;
    
    if (contextualMessage) {
      currentStats.contextualMessagesShown++;
    }
    
    // Calculate productivity score (0-100)
    const totalTime = currentStats.focusTime + currentStats.distractionTime + currentStats.neutralTime;
    if (totalTime > 0) {
      currentStats.productivityScore = Math.round((currentStats.focusTime / totalTime) * 100);
    }
    
    await setStorageData({ [statsKey]: currentStats });
    console.log('Daily stats updated:', currentStats);
  } catch (error) {
    console.log('Error updating daily stats:', error);
  }
}

// Message effectiveness tracking
export async function trackMessageEffectiveness(messageId, userAction, timesToDismiss) {
  try {
    const effectivenessKey = `effectiveness:${messageId}`;
    const { [effectivenessKey]: effectiveness } = await getStorageData([effectivenessKey]);
    
    const currentData = effectiveness || {
      messageId,
      timesShown: 0,
      timesActedUpon: 0,
      averageTimeToResponse: 0,
      totalDismissals: 0
    };
    
    currentData.timesShown++;
    currentData.totalDismissals += timesToDismiss;
    
    if (userAction === 'acted_upon') {
      currentData.timesActedUpon++;
    }
    
    // Calculate effectiveness score
    currentData.effectivenessScore = currentData.timesShown > 0 
      ? (currentData.timesActedUpon / currentData.timesShown) 
      : 0;
    
    await setStorageData({ [effectivenessKey]: currentData });
    console.log('Message effectiveness tracked:', currentData);
  } catch (error) {
    console.log('Error tracking message effectiveness:', error);
  }
}

// Cleanup old data (run periodically)
export async function cleanupOldData() {
  try {
    const allData = await chrome.storage.local.get();
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const keysToRemove = [];
    
    for (const [key, value] of Object.entries(allData)) {
      // Clean up old sessions
      if (key.startsWith('session:') && value.endTime && value.endTime < oneWeekAgo) {
        keysToRemove.push(key);
      }
      
      // Clean up old cached messages
      if (key.startsWith('messageCache:') && value.timestamp < oneWeekAgo) {
        keysToRemove.push(key);
      }
      
      // Clean up old behavioral patterns
      if (key.startsWith('pattern:') && value.lastSeen < oneWeekAgo) {
        keysToRemove.push(key);
      }
    }
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log(`Cleaned up ${keysToRemove.length} old data entries`);
    }
  } catch (error) {
    console.log('Error cleaning up old data:', error);
  }
}

// Export user data (for backup/analysis)
export async function exportUserData() {
  try {
    const allData = await chrome.storage.local.get();
    const exportData = {
      exportDate: new Date().toISOString(),
      settings: allData.settings,
      customCategories: allData.customCategories,
      dailyStats: {},
      behavioralPatterns: {},
      messageEffectiveness: {}
    };
    
    // Group data by type
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('dailyStats:')) {
        exportData.dailyStats[key] = value;
      } else if (key.startsWith('pattern:')) {
        exportData.behavioralPatterns[key] = value;
      } else if (key.startsWith('effectiveness:')) {
        exportData.messageEffectiveness[key] = value;
      }
    }
    
    return exportData;
  } catch (error) {
    console.log('Error exporting user data:', error);
    return null;
  }
}