// This script is part of the content script bundle.
// Its presence ensures the other scripts (bubble.js, tracker.js)
// and styles (bubble.css) are injected into the page.
// The primary logic is now handled in the background service worker.

console.log('Detector script loaded.');

// The responsibility for detecting the site category is primarily in the background script.
// The content script's role is mainly to interact with the page (e.g., show the bubble).
// Sending a message to the background script to let it know a new page is loaded.
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_LOADED', host: window.location.hostname }); 