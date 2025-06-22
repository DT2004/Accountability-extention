// Handle extension lifecycle
// Manage data storage
// Schedule periodic checks
// Handle cross-tab communication

import { initializeStorage, getStorageData, setStorageData } from './storage.js';

// 1. Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Accountability Bubble extension installed/updated.');
  await initializeStorage();
  console.log('Storage initialization complete.');
});

// 2. Site Categorization Logic
async function getSiteCategory(hostname) {
  const { sites, customCategories } = await getStorageData(['sites', 'customCategories']);
  
  // Check custom categories first, as they have precedence
  if (customCategories && customCategories[hostname]) {
    return customCategories[hostname];
  }

  // Check default categories
  if (sites) {
    for (const category in sites) {
      if (sites[category].some(domain => hostname.includes(domain))) {
        return category;
      }
    }
  }

  // Default to neutral for any uncategorized site
  return 'neutral';
}

// 3. Intelligent Message Generation
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

// 4. Main handler for page loads and tab switches
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
    chrome.alarms.create(alarmName, { delayInMinutes: 10 / 60 });
    // Store the message to be shown when the alarm fires.
    await setStorageData({ [alarmName]: { category, message } });
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

// Listen for alarms to fire
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('showBubble:')) {
    const { [alarm.name]: bubbleData } = await getStorageData([alarm.name]);

    if (bubbleData) {
      const tabId = parseInt(alarm.name.split(':')[1]);
      // Check if tab still exists and content script is ready
      try {
        await chrome.tabs.sendMessage(tabId, {
            type: 'SHOW_BUBBLE',
            category: bubbleData.category,
            message: bubbleData.message
        });
      } catch (error) {
        // This is expected if the content script is not loaded yet, or the tab was closed.
        console.log(`Could not send message to tab ${tabId}. It might be closed or a system page.`);
      }
      
      // Clean up the stored message data
      chrome.storage.local.remove([alarm.name]);
    }
  }
}); 