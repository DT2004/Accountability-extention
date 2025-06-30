/* Enhanced popup.js with Daily Tasks Management */
document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const nameInput = document.getElementById('user-name');
  const goalInput = document.getElementById('user-goal');
  const newTaskInput = document.getElementById('new-task-input');
  const addTaskBtn = document.getElementById('add-task-btn');
  const tasksList = document.getElementById('tasks-list');
  const currentTaskSelect = document.getElementById('current-task-select');
  const saveButton = document.getElementById('save-btn');
  const resetButton = document.getElementById('reset-btn');
  const statusMessage = document.getElementById('status-message');

  // State
  let dailyTasks = [];
  let taskIdCounter = 1;

  // Initialize
  loadUserSettings();
  setupEventListeners();

  // Event Listeners
  function setupEventListeners() {
    addTaskBtn.addEventListener('click', addNewTask);
    newTaskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addNewTask();
    });
    newTaskInput.addEventListener('input', updateAddButton);
    saveButton.addEventListener('click', saveUserSettings);
    resetButton.addEventListener('click', resetAllSettings);
  }

  // Load existing settings
  async function loadUserSettings() {
    try {
      const { settings } = await chrome.storage.local.get('settings');
      if (settings) {
        nameInput.value = settings.userName || '';
        goalInput.value = settings.userGoal || '';
        
        // Set motivation style
        const motivationStyle = settings.motivationStyle || 'encouraging';
        document.querySelector(`input[name="motivation-style"][value="${motivationStyle}"]`).checked = true;

        // Load daily tasks
        dailyTasks = settings.dailyTasks || [];
        renderTasksList();
        updateCurrentTaskSelect();

        // Set current task
        if (settings.currentTaskId) {
          currentTaskSelect.value = settings.currentTaskId;
        }
      }
    } catch (error) {
      console.log('Error loading settings:', error);
      showStatus('Error loading settings', 'error');
    }
  }

  // Add new task
  function addNewTask() {
    const taskText = newTaskInput.value.trim();
    
    if (!taskText) {
      showStatus('Please enter a task', 'error');
      return;
    }

    if (taskText.length > 100) {
      showStatus('Task text too long (max 100 characters)', 'error');
      return;
    }

    if (dailyTasks.length >= 10) {
      showStatus('Maximum 10 tasks allowed', 'error');
      return;
    }

    const newTask = {
      id: `task_${taskIdCounter++}`,
      text: taskText,
      completed: false,
      createdAt: new Date().toISOString(),
      priority: 'medium'
    };

    dailyTasks.push(newTask);
    newTaskInput.value = '';
    
    renderTasksList();
    updateCurrentTaskSelect();
    updateAddButton();
    
    showStatus(`Task "${taskText}" added!`, 'success');
  }

  // Render tasks list
  function renderTasksList() {
    tasksList.innerHTML = '';
    
    if (dailyTasks.length === 0) {
      tasksList.innerHTML = `
        <div class="empty-tasks">
          <p style="color: var(--label-color); text-align: center; font-style: italic; margin: 20px 0;">
            No tasks yet. Add your first task to get started!
          </p>
        </div>
      `;
      return;
    }

    dailyTasks.forEach((task, index) => {
      const taskElement = document.createElement('div');
      taskElement.className = 'task-item';
      taskElement.innerHTML = `
        <div class="task-text">${escapeHtml(task.text)}</div>
        <div class="task-actions">
          <button class="task-btn toggle" onclick="toggleTaskCompletion('${task.id}')" title="${task.completed ? 'Mark incomplete' : 'Mark complete'}">
            ${task.completed ? '✅' : '⭕'}
          </button>
          <button class="task-btn delete" onclick="deleteTask('${task.id}')" title="Delete task">
            🗑️
          </button>
        </div>
      `;
      
      if (task.completed) {
        taskElement.style.opacity = '0.6';
        taskElement.querySelector('.task-text').style.textDecoration = 'line-through';
      }
      
      tasksList.appendChild(taskElement);
    });
  }

  // Update current task select dropdown
  function updateCurrentTaskSelect() {
    // Clear existing options except the first one
    currentTaskSelect.innerHTML = '<option value="">Select current task...</option>';
    
    // Add active (incomplete) tasks
    const activeTasks = dailyTasks.filter(task => !task.completed);
    
    if (activeTasks.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No active tasks';
      option.disabled = true;
      currentTaskSelect.appendChild(option);
      return;
    }

    activeTasks.forEach(task => {
      const option = document.createElement('option');
      option.value = task.id;
      option.textContent = task.text.length > 50 ? task.text.substring(0, 50) + '...' : task.text;
      currentTaskSelect.appendChild(option);
    });
  }

  // Update add button state
  function updateAddButton() {
    const taskText = newTaskInput.value.trim();
    addTaskBtn.disabled = !taskText || taskText.length > 100 || dailyTasks.length >= 10;
  }

  // Toggle task completion
  window.toggleTaskCompletion = function(taskId) {
    const task = dailyTasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      if (task.completed) {
        task.completedAt = new Date().toISOString();
        // If this was the current task, clear it
        if (currentTaskSelect.value === taskId) {
          currentTaskSelect.value = '';
        }
      } else {
        delete task.completedAt;
      }
      
      renderTasksList();
      updateCurrentTaskSelect();
      
      showStatus(
        task.completed ? 'Task completed! 🎉' : 'Task marked incomplete',
        task.completed ? 'success' : 'info'
      );
    }
  };

  // Delete task
  window.deleteTask = function(taskId) {
    const taskIndex = dailyTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      const deletedTask = dailyTasks[taskIndex];
      dailyTasks.splice(taskIndex, 1);
      
      // If this was the current task, clear it
      if (currentTaskSelect.value === taskId) {
        currentTaskSelect.value = '';
      }
      
      renderTasksList();
      updateCurrentTaskSelect();
      updateAddButton();
      
      showStatus(`Task "${deletedTask.text}" deleted`, 'info');
    }
  };

  // Save all settings
  async function saveUserSettings() {
    const userName = nameInput.value.trim();
    const userGoal = goalInput.value.trim();
    const motivationStyle = document.querySelector('input[name="motivation-style"]:checked').value;
    const currentTaskId = currentTaskSelect.value;

    // Validation
    if (!userName) {
      showStatus('Please enter your name', 'error');
      nameInput.focus();
      return;
    }

    if (!userGoal) {
      showStatus('Please enter your main goal', 'error');
      goalInput.focus();
      return;
    }

    if (dailyTasks.length === 0) {
      showStatus('Please add at least one daily task', 'error');
      newTaskInput.focus();
      return;
    }

    try {
      const { settings: currentSettings } = await chrome.storage.local.get('settings');
      const newSettings = {
        ...currentSettings,
        userName,
        userGoal,
        motivationStyle,
        dailyTasks,
        currentTaskId,
        enabled: true,
        lastUpdated: new Date().toISOString()
      };
      
      await chrome.storage.local.set({ settings: newSettings });
      
      showStatus('Settings saved! Your AI coach is now active.', 'success');
      
      // Close popup after successful save
      setTimeout(() => {
        window.close();
      }, 1500);
      
    } catch (error) {
      console.log('Error saving settings:', error);
      showStatus('Error saving settings. Please try again.', 'error');
    }
  }

  // Reset all settings
  async function resetAllSettings() {
    if (confirm('Are you sure you want to reset all settings? This cannot be undone.')) {
      try {
        await chrome.storage.local.clear();
        
        // Reset UI
        nameInput.value = '';
        goalInput.value = '';
        document.querySelector('input[name="motivation-style"][value="encouraging"]').checked = true;
        dailyTasks = [];
        taskIdCounter = 1;
        newTaskInput.value = '';
        currentTaskSelect.value = '';
        
        renderTasksList();
        updateCurrentTaskSelect();
        updateAddButton();
        
        showStatus('All settings reset!', 'info');
        
      } catch (error) {
        console.log('Error resetting settings:', error);
        showStatus('Error resetting settings', 'error');
      }
    }
  }

  // Show status message
  function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = type;
    
    // Color coding
    const colors = {
      success: 'var(--success-color)',
      error: 'var(--danger-color)', 
      info: 'var(--primary-color)'
    };
    
    statusMessage.style.color = colors[type] || colors.info;
    
    // Clear after delay
    if (type !== 'error') {
      setTimeout(() => {
        statusMessage.textContent = '';
      }, type === 'success' ? 3000 : 2000);
    }
  }

  // Utility function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get current settings for debugging
  window.getCurrentSettings = async function() {
    const { settings } = await chrome.storage.local.get('settings');
    console.log('Current settings:', settings);
    return settings;
  };
});