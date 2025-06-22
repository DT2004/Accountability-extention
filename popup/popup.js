// Logic for the popup settings panel will go here.
// This includes saving settings to chrome.storage,
// handling custom site additions, and displaying stats.

// Using the same storage functions as the background script for consistency.
async function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result);
    });
  });
}

async function setStorageData(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve();
    });
  });
}

// UI Elements
const enableCheckbox = document.getElementById('enable-extension');
const freqSelect = document.getElementById('message-frequency');
const focusModeCheckbox = document.getElementById('focus-mode');
const aiMessagesCheckbox = document.getElementById('ai-messages');
const customSiteDomainInput = document.getElementById('custom-site-domain');
const customSiteCategorySelect = document.getElementById('custom-site-category');
const addSiteBtn = document.getElementById('add-site-btn');
const customSitesListDiv = document.getElementById('custom-sites-list');

// Load settings from storage and populate the popup UI
async function loadSettings() {
  const { settings, customCategories } = await getStorageData(['settings', 'customCategories']);

  if (settings) {
    enableCheckbox.checked = settings.enabled;
    freqSelect.value = settings.frequency;
    aiMessagesCheckbox.checked = settings.aiMessages;
    // focusMode will be implemented later
  }

  renderCustomSites(customCategories || {});
}

// Save a specific setting to storage
async function saveSetting(key, value) {
  const { settings } = await getStorageData(['settings']);
  const newSettings = { ...settings, [key]: value };
  await setStorageData({ settings: newSettings });
  console.log('Settings saved:', newSettings);
}

// Render the list of custom sites
function renderCustomSites(customCategories) {
  customSitesListDiv.innerHTML = '';
  for (const domain in customCategories) {
    const siteDiv = document.createElement('div');
    siteDiv.className = 'custom-site-item';
    siteDiv.innerHTML = `
      <span>${domain} (${customCategories[domain]})</span>
      <button data-domain="${domain}" class="remove-btn">Remove</button>
    `;
    customSitesListDiv.appendChild(siteDiv);
  }
  // Add event listeners to the new remove buttons
  document.querySelectorAll('.remove-btn').forEach(button => {
    button.addEventListener('click', handleRemoveSite);
  });
}

// Add a new custom site
async function handleAddSite() {
  const domain = customSiteDomainInput.value.trim();
  const category = customSiteCategorySelect.value;

  if (!domain) {
    alert('Please enter a domain.');
    return;
  }

  const { customCategories } = await getStorageData(['customCategories']);
  const newCustomCategories = { ...customCategories, [domain]: category };
  
  await setStorageData({ customCategories: newCustomCategories });
  renderCustomSites(newCustomCategories);
  
  customSiteDomainInput.value = ''; // Clear input
}

// Remove a custom site
async function handleRemoveSite(event) {
    const domainToRemove = event.target.dataset.domain;
    const { customCategories } = await getStorageData(['customCategories']);
    delete customCategories[domainToRemove];
    await setStorageData({ customCategories });
    renderCustomSites(customCategories);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', loadSettings);
enableCheckbox.addEventListener('change', (e) => saveSetting('enabled', e.target.checked));
freqSelect.addEventListener('change', (e) => saveSetting('frequency', parseInt(e.target.value)));
aiMessagesCheckbox.addEventListener('change', (e) => saveSetting('aiMessages', e.target.checked));
addSiteBtn.addEventListener('click', handleAddSite); 