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

// 3. Message Selection Logic
async function getRandomMessage(category) {
    const { messages } = await getStorageData(['messages']);
    if (!messages || !messages[category] || messages[category].length === 0) {
        return { emoji: '🤔', text: 'No messages found for this category.' };
    }
    const categoryMessages = messages[category];
    const randomIndex = Math.floor(Math.random() * categoryMessages.length);
    return categoryMessages[randomIndex];
    // TODO: Avoid repeating the same message within a 2-hour window.
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
    const message = await getRandomMessage(category);

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
      // Check if tab still exists
      try {
        const tab = await chrome.tabs.get(tabId);
        if (tab) {
            chrome.tabs.sendMessage(tabId, {
                type: 'SHOW_BUBBLE',
                category: bubbleData.category,
                message: bubbleData.message
            }).catch(e => console.error("Could not send message to content script:", e));
        }
      } catch (error) {
        console.log(`Tab ${tabId} no longer exists, skipping bubble.`);
      }
      
      // Clean up the stored message data
      chrome.storage.local.remove([alarm.name]);
    }
  }
}); 