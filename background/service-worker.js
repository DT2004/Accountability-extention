// Enhanced background/service-worker.js - Smart Context-Aware Service Worker

import { initializeStorage, getStorageData, setStorageData } from './storage.js';

// Global state for managing contexts and messages
let activeContexts = new Map(); // tabId -> context
let smartMessages = null;
let cachedMessages = new Map();

// 1. Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Accountability Bubble extension installed/updated.');
  await initializeStorage();
  await loadSmartMessages();
  console.log('Smart message system initialized.');
});

// 2. Load smart messages from JSON
async function loadSmartMessages() {
  try {
    const { smartMessages: stored } = await getStorageData(['smartMessages']);
    
    if (stored) {
      smartMessages = stored;
      console.log('Smart messages loaded from storage');
    } else {
      // Fallback: load from file
      const smartMessagesURL = chrome.runtime.getURL('data/smart-messages.json');
      const response = await fetch(smartMessagesURL);
      smartMessages = await response.json();
      await setStorageData({ smartMessages });
      console.log('Smart messages loaded from file and cached');
    }
  } catch (error) {
    console.log('Error loading smart messages:', error);
    smartMessages = { contextual_messages: {}, fallback_messages: {} };
  }
}

// 3. Enhanced site categorization with context
async function getSiteCategory(hostname, context = null) {
  const { sites, customCategories } = await getStorageData(['sites', 'customCategories']);
  
  // Check custom categories first
  if (customCategories && customCategories[hostname]) {
    return customCategories[hostname];
  }

  // Use context to make smarter categorization decisions
  if (context) {
    switch (context.platform) {
      case 'youtube':
        return context.activity === 'educational_video' ? 'focused' : 'distracted';
      case 'github':
      case 'stackoverflow':
        return 'focused';
      case 'twitter':
        return 'distracted';
      case 'linkedin':
        return context.activity === 'learning' || context.activity === 'job_search' ? 'focused' : 'neutral';
      case 'ai_chat':
        return context.activity === 'work_related' ? 'focused' : 'distracted';
    }
  }

  // Fallback to traditional categorization
  if (sites) {
    for (const category in sites) {
      if (sites[category].some(domain => hostname.includes(domain))) {
        return category;
      }
    }
  }

  return 'neutral';
}

// 4. Smart contextual message generation
async function getSmartMessage(context, category) {
  const { settings } = await getStorageData(['settings']);
  const { userName, userGoal, motivationStyle } = settings || {};

  // If user hasn't completed setup, return setup message
  if (!userName || !userGoal) {
    return { 
      text: "Welcome! Click the extension icon to set up your AI coach.",
      isSetupMessage: true 
    };
  }

  let selectedMessage = null;

  try {
    // Try to get contextual message first
    if (context && smartMessages?.contextual_messages) {
      selectedMessage = getContextualMessage(context, category, motivationStyle);
    }

    // Fallback to general smart messages
    if (!selectedMessage && smartMessages?.fallback_messages) {
      selectedMessage = getFallbackMessage(category, motivationStyle);
    }

    // Final fallback to basic templates
    if (!selectedMessage) {
      selectedMessage = getBasicMessage(category, motivationStyle, userName, userGoal);
    }

    // Perform template substitution
    if (selectedMessage) {
      selectedMessage.text = performTemplateSubstitution(
        selectedMessage.text, 
        userName, 
        userGoal, 
        context
      );
    }

  } catch (error) {
    console.log('Error generating smart message:', error);
    selectedMessage = getBasicMessage(category, motivationStyle, userName, userGoal);
  }

  return selectedMessage || { text: `Stay focused on ${userGoal}, ${userName}!` };
}

// 5. Get contextual message based on platform and activity
function getContextualMessage(context, category, motivationStyle) {
  const { platform, activity, data } = context;
  
  // Navigate through the contextual message structure
  const platformMessages = smartMessages.contextual_messages[platform];
  if (!platformMessages) return null;

  const activityMessages = platformMessages[activity];
  if (!activityMessages) return null;

  const categoryMessages = activityMessages[category];
  if (!categoryMessages) return null;

  const styleMessages = categoryMessages[motivationStyle];
  if (!styleMessages || !Array.isArray(styleMessages) || styleMessages.length === 0) return null;

  // Select random message from available options
  const randomIndex = Math.floor(Math.random() * styleMessages.length);
  return { text: styleMessages[randomIndex] };
}

// 6. Get fallback message when contextual fails
function getFallbackMessage(category, motivationStyle) {
  const fallbackMessages = smartMessages.fallback_messages?.[category]?.[motivationStyle];
  
  if (!fallbackMessages || !Array.isArray(fallbackMessages) || fallbackMessages.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * fallbackMessages.length);
  return { text: fallbackMessages[randomIndex] };
}

// 7. Basic message templates (final fallback)
function getBasicMessage(category, motivationStyle, userName, userGoal) {
  const basicTemplates = {
    focused: {
      direct: [
        `Good. Keep working on ${userGoal}, ${userName}.`,
        `This is exactly what you need to be doing for ${userGoal}.`,
        `Locked in. Don't stop now, ${userName}.`
      ],
      encouraging: [
        `You're crushing it, ${userName}! This is how ${userGoal} gets built.`,
        `Amazing focus on ${userGoal}! Keep this momentum going.`,
        `You're in the zone, ${userName}! This is what success looks like.`
      ]
    },
    distracted: {
      direct: [
        `This isn't helping ${userGoal}, ${userName}. Redirect that energy.`,
        `Stop the distraction and get back to building ${userGoal}.`,
        `Your future self is counting on ${userGoal} progress right now.`
      ],
      encouraging: [
        `Quick break, ${userName}? That's okay! But ${userGoal} is waiting for you.`,
        `I get it, breaks happen. Ready to get back to ${userGoal}?`,
        `Your goal ${userGoal} misses your attention, ${userName}!`
      ]
    },
    neutral: {
      direct: [
        `Handle this quickly and get back to ${userGoal}, ${userName}.`,
        `Time-box this task and return to what matters: ${userGoal}.`,
        `15 minutes max, then back to ${userGoal} focus.`
      ],
      encouraging: [
        `Quick task time! Handle this and return to ${userGoal}, ${userName}.`,
        `Necessary work done efficiently = more time for ${userGoal}!`,
        `Clear this smoothly and get back to building ${userGoal}.`
      ]
    }
  };

  const templates = basicTemplates[category]?.[motivationStyle] || basicTemplates.neutral.encouraging;
  const randomIndex = Math.floor(Math.random() * templates.length);
  return { text: templates[randomIndex] };
}

// 8. Template substitution with context variables
function performTemplateSubstitution(template, userName, userGoal, context) {
  let result = template;

  // Basic user substitution
  result = result.replace(/{user_name}/g, userName);
  result = result.replace(/{user_goal}/g, userGoal);

  // Context-specific substitution
  if (context && context.data) {
    const { data } = context;
    
    // Replace available context variables
    Object.keys(data).forEach(key => {
      const placeholder = `{${key}}`;
      if (result.includes(placeholder) && data[key]) {
        result = result.replace(new RegExp(placeholder, 'g'), data[key]);
      }
    });
  }

  return result;
}

// 9. Enhanced context handling
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('Background received message:', request.type);

  if (request.type === 'CONTEXT_DETECTED') {
    const { context } = request;
    const tabId = sender.tab?.id;
    
    if (tabId) {
      // Store context for this tab
      activeContexts.set(tabId, context);
      console.log(`Context stored for tab ${tabId}:`, context);
      
      // Process the context and maybe show bubble
      await handleContextUpdate(tabId, context);
    }
    
    sendResponse({ status: 'Context received and processed' });
  }
  
  if (request.type === 'CONTENT_SCRIPT_LOADED') {
    console.log(`Content script loaded for: ${request.host}`);
    sendResponse({ status: 'Background acknowledged content script' });
  }
});

// 10. Handle context updates and decide when to show bubble
async function handleContextUpdate(tabId, context) {
  const { settings } = await getStorageData(['settings']);
  
  if (!settings || !settings.enabled) {
    console.log('Extension disabled, not processing context');
    return;
  }

  const hostname = new URL(context.data.url).hostname;
  const category = await getSiteCategory(hostname, context);
  
  console.log(`Context processed: ${context.platform}/${context.activity} -> ${category}`);
  
  // Generate smart message
  const message = await getSmartMessage(context, category);
  
  // Create alarm to show bubble after delay
  const alarmName = `smartBubble:${tabId}:${Date.now()}`;
  
  // Different delays based on activity type
  let delaySeconds = 10; // default
  
  if (context.activity === 'feed_browsing' || context.activity === 'social_scrolling') {
    delaySeconds = 5; // Show faster for time-wasting activities
  } else if (context.activity === 'educational_video' || context.activity === 'work_related') {
    delaySeconds = 15; // Give more time for productive activities
  }
  
  chrome.alarms.create(alarmName, { delayInMinutes: delaySeconds / 60 });
  
  // Store the message and context to be shown when alarm fires
  await setStorageData({ 
    [alarmName]: { 
      category, 
      message, 
      context,
      tabId 
    } 
  });
  
  console.log(`Smart bubble scheduled for tab ${tabId} in ${delaySeconds} seconds`);
}

// 11. Enhanced alarm handling for smart bubbles
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('smartBubble:')) {
    const { [alarm.name]: bubbleData } = await getStorageData([alarm.name]);

    if (bubbleData) {
      const { tabId, category, message, context } = bubbleData;
      
      try {
        // Verify tab still exists and context is still relevant
        const tab = await chrome.tabs.get(tabId);
        const currentContext = activeContexts.get(tabId);
        
        if (tab && tab.url && tab.url.startsWith('http')) {
          // Check if context is still relevant (user might have navigated away)
          const isContextStillRelevant = currentContext && 
            currentContext.platform === context.platform &&
            currentContext.activity === context.activity;
          
          if (isContextStillRelevant || !currentContext) {
            await chrome.tabs.sendMessage(tabId, {
              type: 'SHOW_BUBBLE',
              category: category,
              message: message,
              context: context
            });
            
            console.log(`Smart bubble shown for ${context.platform}/${context.activity}`);
          } else {
            console.log(`Context changed, skipping bubble for tab ${tabId}`);
          }
        }
      } catch (error) {
        console.log(`Could not show smart bubble for tab ${tabId}:`, error.message);
      }
      
      // Clean up stored data
      chrome.storage.local.remove([alarm.name]);
    }
  }
  
  // Handle legacy bubble alarms
  if (alarm.name.startsWith('showBubble:')) {
    const { [alarm.name]: bubbleData } = await getStorageData([alarm.name]);

    if (bubbleData) {
      const tabId = parseInt(alarm.name.split(':')[1]);
      
      // First check if the tab still exists
      try {
        const tab = await chrome.tabs.get(tabId);
        
        // Only try to send message if tab exists and is a valid web page
        if (tab && tab.url && tab.url.startsWith('http')) {
          await chrome.tabs.sendMessage(tabId, {
              type: 'SHOW_BUBBLE',
              category: bubbleData.category,
              message: bubbleData.message
          });
        } else {
          console.log(`Tab ${tabId} is not a valid web page, skipping bubble.`);
        }
      } catch (error) {
        // Only log if it's not a "tab not found" error (which is expected)
        if (!error.message.includes('Could not establish connection')) {
          console.log(`Could not send message to tab ${tabId}. It might be closed or a system page.`);
        }
      }
      
      // Clean up the stored message data
      chrome.storage.local.remove([alarm.name]);
    }
  }
});

// 12. Clean up contexts when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  activeContexts.delete(tabId);
  console.log(`Cleaned up context for closed tab ${tabId}`);
});

// 13. Handle tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    // URL changed, clear old context
    activeContexts.delete(tabId);
    console.log(`URL changed for tab ${tabId}, context cleared`);
  }
});

// 14. Initialize smart messages on startup
(async () => {
  if (!smartMessages) {
    await loadSmartMessages();
  }
})();

// 4. Main handler for page loads and tab switches (legacy support)
async function handleTabUpdate(tabId, url) {
    if (!url || !url.startsWith('http')) {
        return; // Ignore internal chrome://, file://, etc. URLs
    }

    const { settings } = await getStorageData(['settings']);
    if (!settings || !settings.enabled) {
        console.log('Extension is disabled, not showing bubble.');
        return;
    }

    const hostname = new URL(url).hostname;
    const category = await getSiteCategory(hostname);
    
    // We can decide to not show the bubble for neutral sites if we want
    // but for now, we'll show it for all categories.
    const message = await getAIMessage(category);

    // Per the spec, show the bubble 10 seconds after arrival
    // We use an alarm to handle this, as service workers can become inactive.
    const alarmName = `showBubble:${tabId}:${Date.now()}`; // Unique alarm name
    chrome.alarms.create(alarmName, { delayInMinutes: 10 / 60 / 60 }); // 10 seconds (10/60/60 = 10/3600 = ~0.0028 minutes)
    // Store the message to be shown when the alarm fires.
    await setStorageData({ [alarmName]: { category, message } });
}

// 5. Legacy message generation
async function getAIMessage(category) {
  const { settings } = await getStorageData(['settings']);
  const { userName, userGoal, motivationStyle } = settings || {};

  // If user hasn't completed setup, return a generic message
  if (!userName || !userGoal) {
    return { text: "Welcome! Click the extension icon to set up your AI coach." };
  }

  // Define smart templates
  const templates = {
    distracted: {
      direct: [
        `Is this helping you ${userGoal}, ${userName}?`,
        `${userName}, that ${userGoal} isn't going to build itself.`,
        `You know this is a distraction, ${userName}. Focus up.`,
      ],
      encouraging: [
        `Hey ${userName}, let's get back to the main goal: ${userGoal}!`,
        `A quick break is okay, ${userName}, but your goal is waiting!`,
        `You can do it, ${userName}! Let's make some progress on ${userGoal}.`,
      ],
    },
    focused: {
      direct: [
        `Yes, ${userName}. This is exactly what you need to be doing for ${userGoal}.`,
        `Keep this momentum, ${userName}. This is how you win.`,
        `Locked in. Good work, ${userName}.`,
      ],
      encouraging: [
        `You're in the zone, ${userName}! This is what success looks like.`,
        `Amazing work, ${userName}! You're crushing your goal: ${userGoal}.`,
        `This is fantastic focus, ${userName}! Keep it up!`,
      ],
    },
    neutral: {
      direct: [`Handle this and get back to ${userGoal}, ${userName}.`],
      encouraging: [`Quickly clear this task so you can focus on ${userGoal}, ${userName}!`],
    }
  };

  // Select the appropriate template list
  const templateList = templates[category]?.[motivationStyle] || templates.neutral.encouraging;
  const randomTemplate = templateList[Math.floor(Math.random() * templateList.length)];

  // For now, we'll use templates. Later, we can add a real AI check here.
  // if (self.ai && self.ai.assistant) { ... }
  
  return { text: randomTemplate };
}

// Listen for tab updates (e.g., new URL)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // We only want to trigger on the final page load, and for the active tab
  if (changeInfo.status === 'complete' && tab.active) {
    handleTabUpdate(tabId, tab.url);
  }
});

// Listen for tab activation changes (e.g., switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.status === 'complete' && tab.url) {
        handleTabUpdate(tab.id, tab.url);
    }
});