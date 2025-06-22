/* quick-setup.js */
document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const nameInput = document.getElementById('user-name');
  const goalInput = document.getElementById('user-goal');
  const saveButton = document.getElementById('save-btn');
  const statusMessage = document.getElementById('status-message');

  // Load existing settings
  const loadUserSettings = async () => {
    const { settings } = await chrome.storage.local.get('settings');
    if (settings) {
      nameInput.value = settings.userName || '';
      goalInput.value = settings.userGoal || '';
      // Set the radio button for motivation style
      const motivationStyle = settings.motivationStyle || 'encouraging';
      document.querySelector(`input[name="motivation-style"][value="${motivationStyle}"]`).checked = true;
    }
  };

  // Save settings to storage
  const saveUserSettings = async () => {
    const userName = nameInput.value.trim();
    const userGoal = goalInput.value.trim();
    const motivationStyle = document.querySelector('input[name="motivation-style"]:checked').value;

    if (!userName || !userGoal) {
      statusMessage.textContent = 'Please fill out all fields.';
      statusMessage.style.color = '#ef4444';
      return;
    }

    const { settings: currentSettings } = await chrome.storage.local.get('settings');
    const newSettings = {
      ...currentSettings,
      userName,
      userGoal,
      motivationStyle,
      enabled: true, // Always enable after setup
    };
    
    await chrome.storage.local.set({ settings: newSettings });
    
    statusMessage.textContent = 'Settings saved!';
    statusMessage.style.color = '#22c55e';
    setTimeout(() => {
      statusMessage.textContent = '';
      window.close(); // Close popup after successful save
    }, 1500);
  };

  // Add event listeners
  saveButton.addEventListener('click', saveUserSettings);
  loadUserSettings();
});