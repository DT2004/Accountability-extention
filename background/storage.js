// This script will contain functions to interact with chrome.storage.
// It will handle getting and setting all data for the extension,
// such as user settings, stats, and custom categories.

console.log('Storage script loaded.');

// Example functions:
// async function getSettings() { ... }
// async function saveSettings(settings) { ... }
// async function getStats() { ... }
// async function logVisit(site) { ... }

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
};

export const defaultStats = {
  daily: {
    focusTime: 0,
    distractionTime: 0,
    siteVisits: {}
  },
  weekly: {}
};

export async function initializeStorage() {
  // Load default sites and messages from JSON files into storage if not already present
  const { sites, messages } = await getStorageData(['sites', 'messages']);
  
  if (!sites) {
    const sitesURL = chrome.runtime.getURL('data/sites.json');
    const response = await fetch(sitesURL);
    const sitesData = await response.json();
    await setStorageData({ sites: sitesData });
    console.log('Default sites loaded into storage.');
  }

  if (!messages) {
    const messagesURL = chrome.runtime.getURL('data/messages.json');
    const response = await fetch(messagesURL);
    const messagesData = await response.json();
    await setStorageData({ messages: messagesData });
    console.log('Default messages loaded into storage.');
  }
  
  // Initialize settings, stats, and custom categories if not already present
  const { settings, stats, customCategories } = await getStorageData(['settings', 'stats', 'customCategories']);
  
  if (!settings) {
    await setStorageData({ settings: defaultSettings });
    console.log('Default settings loaded into storage.');
  }

  if (!stats) {
    await setStorageData({ stats: defaultStats });
  }

  if (!customCategories) {
    await setStorageData({ customCategories: {} });
  }
} 