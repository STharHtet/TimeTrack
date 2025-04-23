document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const timerDisplay = document.getElementById("timer");
  const startBtn = document.getElementById("start-btn");
  const stopBtn = document.getElementById("stop-btn");
  const taskCategory = document.getElementById("task-category");
  const taskDescription = document.getElementById("task-description");
  const calendarEl = document.getElementById("calendar");
  const currentMonthEl = document.getElementById("current-month");
  const prevMonthBtn = document.getElementById("prev-month");
  const nextMonthBtn = document.getElementById("next-month");
  const tasksTodayEl = document.getElementById("tasks-today");
  const taskListTitle = document.getElementById("task-list-title");
  const totalTimeEl = document.getElementById("total-time");
  const editModal = document.getElementById("edit-modal");
  const closeModalBtn = document.querySelector(".close-modal");
  const saveEditBtn = document.getElementById("save-edit");
  const deleteTaskBtn = document.getElementById("delete-task");
  const editCategory = document.getElementById("edit-category");
  const editDescription = document.getElementById("edit-description");
  const editDuration = document.getElementById("edit-duration");

  // Default categories
  const DEFAULT_CATEGORIES = [
    { value: "work", label: "💼 Work" },
    { value: "study", label: "📚 Study" },
    { value: "exercise", label: "🏋️ Exercise" },
    { value: "personal", label: "✨ Personal Project" },
    { value: "other", label: "🔹 Other" },
  ];

  // Theme elements
  const themeToggle = document.getElementById("theme-toggle");
  const themeIcon = themeToggle.querySelector("i");

  const currentTheme =
    localStorage.getItem("theme") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  // Apply the current theme
  document.documentElement.setAttribute("data-theme", currentTheme);
  updateThemeIcon(currentTheme);

  // Theme toggle event
  themeToggle.addEventListener("click", () => {
    const newTheme =
      document.documentElement.getAttribute("data-theme") === "dark"
        ? "light"
        : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    themeIcon.className = theme === "dark" ? "fas fa-sun" : "fas fa-moon";
  }

  // App State
  let timer = null;
  let seconds = 0;
  let isRunning = false;
  let currentTask = null;
  let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  let currentDate = new Date();
  let viewingDate = new Date();
  let selectedTaskId = null;

  // Idle elements  /////////////////////////
  let idleTime = 0;
  const idleThreshold = 300; // 5 minutes in seconds
  let idleInterval;
  let lastActivityTime = Date.now();

  // Idle function
  function startIdleDetection() {
    // Reset idle time when starting a task
    idleTime = 0;
    lastActivityTime = Date.now();

    // Check for idle every second
    idleInterval = setInterval(() => {
      const currentTime = Date.now();
      const secondsInactive = Math.floor(
        (currentTime - lastActivityTime) / 1000
      );

      if (secondsInactive >= idleThreshold && isRunning) {
        handleIdleTimeout();
      }
    }, 1000);
  }

  function resetIdleTime() {
    lastActivityTime = Date.now();
  }

  function handleIdleTimeout() {
    if (isRunning) {
      showAlert("You've been idle for 5 minutes. Timer paused.", "warning");
      stopTimer();
    }
    clearInterval(idleInterval);
  }

  // Add these event listeners (put with your other event listeners)
  document.addEventListener("mousemove", resetIdleTime);
  document.addEventListener("keydown", resetIdleTime);
  document.addEventListener("click", resetIdleTime);
  window.addEventListener("scroll", resetIdleTime);
  ///////////////////////

  // File Processing //
  document
    .getElementById("import-config-btn")
    .addEventListener("click", importTaskConfig);

  async function importTaskConfig() {
    const fileInput = document.getElementById("task-config-upload");
    const file = fileInput.files[0];

    if (!file) {
      showAlert("Please select a file first", "warning");
      return;
    }

    try {
      const data = await readExcelFile(file);
      processTaskConfig(data);
      showAlert("Task configuration imported successfully!", "success");
    } catch (error) {
      console.error("Error importing config:", error);
      showAlert("Failed to import configuration", "danger");
    }
  }

  function readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  // function processTaskConfig(data) {
  //   // Clear existing options except the first one
  //   const categorySelect = document.getElementById("task-category");
  //   while (categorySelect.options.length > 1) {
  //     categorySelect.remove(1);
  //   }

  //   // Create a map to store unique categories and their descriptions
  //   const categoriesMap = new Map();

  //   data.forEach((row) => {
  //     const category = row.Category || row.category || row["Task Category"];
  //     const description =
  //       row.Description || row.description || row["Task Description"];

  //     if (category && !categoriesMap.has(category)) {
  //       categoriesMap.set(category, []);
  //     }

  //     if (category && description) {
  //       categoriesMap.get(category).push(description);
  //     }
  //   });

  //   // Add categories to dropdown
  //   categoriesMap.forEach((descriptions, category) => {
  //     const option = new Option(
  //       category,
  //       category.toLowerCase().replace(/\s+/g, "-")
  //     );
  //     categorySelect.add(option);
  //   });

  //   // Store the configuration for later use
  //   localStorage.setItem(
  //     "taskConfig",
  //     JSON.stringify(Array.from(categoriesMap.entries()))
  //   );
  // }

  let taskConfig = {
    categories: [],
    descriptions: {},
  };

  // Modified processTaskConfig function
  function processTaskConfig(data) {
    taskConfig = {
      categories: [],
      descriptions: {},
    };

    // Process Excel data
    data.forEach((row) => {
      const category = row.Category || row.category || row["Task Category"];
      const description =
        row.Description || row.description || row["Task Description"];

      if (category) {
        // Add to categories if not exists
        if (!taskConfig.categories.includes(category)) {
          taskConfig.categories.push(category);
          taskConfig.descriptions[category] = [];
        }

        // Add to descriptions if not exists
        if (
          description &&
          !taskConfig.descriptions[category].includes(description)
        ) {
          taskConfig.descriptions[category].push(description);
        }
      }
    });

    // Save to localStorage
    localStorage.setItem("taskConfig", JSON.stringify(taskConfig));

    // Update UI
    updateCategoryDropdown();
  }

  // New function to update category dropdown
  function updateCategoryDropdown() {
    const categorySelect = document.getElementById("task-category");
    const descriptionSelect = document.getElementById("task-description");

    // Clear existing options
    while (categorySelect.options.length > 1) categorySelect.remove(1);
    descriptionSelect.innerHTML =
      '<option value="">Select category first</option>';
    descriptionSelect.disabled = true;

    // Add categories
    taskConfig.categories.forEach((category) => {
      const option = new Option(category, category);
      categorySelect.add(option);
    });
  }

  // Load saved config on page load
  function loadTaskConfig() {
    const savedConfig = localStorage.getItem("taskConfig");
    if (savedConfig) {
      taskConfig = JSON.parse(savedConfig);
    } else {
      // Load defaults
      taskConfig = {
        categories: DEFAULT_CATEGORIES.map((c) => c.label),
        descriptions: DEFAULT_CATEGORIES.reduce((acc, curr) => {
          acc[curr.label] = [`Default ${curr.label} task`];
          return acc;
        }, {}),
      };
    }
    updateCategoryDropdown();
  }
  
  // function loadTaskConfig() {
  //   const savedConfig = localStorage.getItem("taskConfig");
  //   const categorySelect = document.getElementById("task-category");

  //   // Clear existing options except the first one
  //   while (categorySelect.options.length > 1) {
  //     categorySelect.remove(1);
  //   }

  //   if (savedConfig) {
  //     // Load custom config
  //     const categoriesMap = new Map(JSON.parse(savedConfig));
  //     categoriesMap.forEach((_, category) => {
  //       const option = new Option(
  //         category,
  //         category.toLowerCase().replace(/\s+/g, "-")
  //       );
  //       categorySelect.add(option);
  //     });
  //   } else {
  //     // Load default config
  //     DEFAULT_CATEGORIES.forEach((category) => {
  //       const option = new Option(category.label, category.value);
  //       categorySelect.add(option);
  //     });
  //   }
  // }

  // Call this when your app initializes
  loadTaskConfig();

  // Reset Function //
  document
    .getElementById("reset-config-btn")
    .addEventListener("click", resetTaskCategories);

  // function resetTaskCategories() {
  //   if (
  //     confirm(
  //       "Are you sure you want to reset to default categories? This will remove any custom categories you've imported."
  //     )
  //   ) {
  //     // Clear any stored configuration
  //     localStorage.removeItem("taskConfig");

  //     // Reset the dropdown
  //     const categorySelect = document.getElementById("task-category");

  //     // Remove all options except the first one
  //     while (categorySelect.options.length > 1) {
  //       categorySelect.remove(1);
  //     }

  //     // Add default categories
  //     DEFAULT_CATEGORIES.forEach((category) => {
  //       const option = new Option(category.label, category.value);
  //       categorySelect.add(option);
  //     });

  //     showAlert("Categories reset to default", "success");
  //   }
  // }

  function resetTaskCategories() {
    if (confirm("Reset to default categories?")) {
      localStorage.removeItem("taskConfig");
      taskConfig = {
        categories: DEFAULT_CATEGORIES.map((c) => c.label),
        descriptions: DEFAULT_CATEGORIES.reduce((acc, curr) => {
          acc[curr.label] = [`Default ${curr.label} task`];
          return acc;
        }, {}),
      };
      updateCategoryDropdown();
      showAlert("Categories reset to default", "success");
    }
  }
  //////////////////////////////////////////////////////

  // Initialize the app
  initCalendar();
  updateTaskList();
  renderTasksOnCalendar();

  // Timer functions
  function startTimer() {
    if (!taskCategory.value) {
      showAlert("Please select a task category", "warning");
      return;
    }

    if (!taskDescription.value.trim()) {
      showAlert("Please enter a task description", "warning");
      return;
    }

    if (!isRunning) {
      // currentTask = {
      //   id: Date.now(),
      //   category: taskCategory.value,
      //   description: taskDescription.value.trim(),
      //   startTime: new Date(),
      //   endTime: null,
      //   duration: 0,
      //   date: new Date().toISOString().split("T")[0],
      // };
      currentTask = {
        id: Date.now(),
        category: taskCategory.value,
        description: taskDescription.value.trim(),
        startTime: new Date(), // Store full date object
        endTime: null,
        duration: 0,
        date: new Date().toISOString().split("T")[0],
        startTimeString: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        endTimeString: null,
      };

      isRunning = true;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      taskCategory.disabled = true;
      taskDescription.disabled = true;

      timer = setInterval(() => {
        seconds++;
        updateTimerDisplay();
      }, 1000);

      showAlert("Timer started!", "success");
    }

    startIdleDetection(); // Add this line /////////////////
  }

  function stopTimer() {
    if (isRunning) {
      clearInterval(timer);
      isRunning = false;
      startBtn.disabled = false;
      stopBtn.disabled = true;
      taskCategory.disabled = false;
      taskDescription.disabled = false;

      // Complete the current task
      currentTask.endTime = new Date();
      currentTask.endTimeString = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      currentTask.duration = seconds;
      // currentTask.endTime = new Date();
      // currentTask.duration = seconds;

      // Save the task
      tasks.push(currentTask);
      saveTasks();

      // Reset timer
      seconds = 0;
      updateTimerDisplay();

      // Update UI
      updateTaskList();
      renderTasksOnCalendar();

      // Clear input
      taskDescription.value = "";

      showAlert("Task saved!", "success");
    }

    clearInterval(idleInterval); // Add this line
  }

  function updateTimerDisplay() {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    timerDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  // Calendar functions
  function initCalendar() {
    // Create calendar header
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    daysOfWeek.forEach((day) => {
      const dayHeader = document.createElement("div");
      dayHeader.className = "calendar-header";
      dayHeader.textContent = day;
      calendarEl.appendChild(dayHeader);
    });

    updateCalendar();
  }

  function updateCalendar() {
    // Update month display
    currentMonthEl.textContent = viewingDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    // Clear calendar days (keep headers)
    while (calendarEl.children.length > 7) {
      calendarEl.removeChild(calendarEl.lastChild);
    }

    // Get first day of month and total days in month
    const firstDay = new Date(
      viewingDate.getFullYear(),
      viewingDate.getMonth(),
      1
    );
    const lastDay = new Date(
      viewingDate.getFullYear(),
      viewingDate.getMonth() + 1,
      0
    );
    const totalDays = lastDay.getDate();
    const startingDay = firstDay.getDay();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-day empty";
      calendarEl.appendChild(emptyDay);
    }

    // Add days of the month
    const today = new Date();
    const isCurrentMonth =
      viewingDate.getMonth() === today.getMonth() &&
      viewingDate.getFullYear() === today.getFullYear();

    for (let i = 1; i <= totalDays; i++) {
      const dayEl = document.createElement("div");
      dayEl.className = "calendar-day";
      dayEl.textContent = i;

      const dateStr = `${viewingDate.getFullYear()}-${String(
        viewingDate.getMonth() + 1
      ).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      dayEl.dataset.date = dateStr;

      // Check if this day has tasks
      const hasTasks = tasks.some((task) => task.date === dateStr);
      if (hasTasks) {
        dayEl.classList.add("has-tasks");
      }

      // Highlight today
      if (isCurrentMonth && i === today.getDate()) {
        dayEl.classList.add("today");
      }

      // Add click event to show tasks for the day
      dayEl.addEventListener("click", function () {
        showTasksForDay(dateStr);
      });

      calendarEl.appendChild(dayEl);
    }
  }

  function renderTasksOnCalendar() {
    const dayElements = document.querySelectorAll(".calendar-day:not(.empty)");

    dayElements.forEach((dayEl) => {
      const dateStr = dayEl.dataset.date;
      const hasTasks = tasks.some((task) => task.date === dateStr);

      if (hasTasks) {
        dayEl.classList.add("has-tasks");
      } else {
        dayEl.classList.remove("has-tasks");
      }
    });
  }

  function showTasksForDay(dateStr) {
    const dayTasks = tasks.filter((task) => task.date === dateStr);

    // Format the date for display
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const title =
      date.toDateString() === today.toDateString()
        ? "Today's Tasks"
        : `Tasks for ${date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}`;

    taskListTitle.textContent = title;
    tasksTodayEl.innerHTML = "";

    if (dayTasks.length === 0) {
      tasksTodayEl.innerHTML =
        '<p class="no-tasks">No tasks recorded for this day.</p>';
      totalTimeEl.textContent = "Total: 0h 0m";
      return;
    }

    let totalMinutes = 0;

    dayTasks.forEach((task) => {
      totalMinutes += Math.floor(task.duration / 60);
      renderTaskItem(task);
    });

    // Update total time
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    totalTimeEl.textContent = `Total: ${hours}h ${mins}m`;
  }

  // function renderTaskItem(task) {
  //   const taskItem = document.createElement("li");
  //   taskItem.className = "task-item";
  //   taskItem.dataset.id = task.id;

  //   const hours = Math.floor(task.duration / 3600);
  //   const minutes = Math.floor((task.duration % 3600) / 60);
  //   const secs = task.duration % 60;

  //   // Get emoji for category
  //   const categoryEmoji =
  //     {
  //       work: "💼",
  //       study: "📚",
  //       exercise: "🏋️",
  //       personal: "✨",
  //       other: "🔹",
  //     }[task.category] || "🔹";

  //   taskItem.innerHTML = `
  //           <div class="task-category">${categoryEmoji} ${
  //     task.category.charAt(0).toUpperCase() + task.category.slice(1)
  //   }</div>
  //           <div class="task-description">${task.description}</div>
  //           <div class="task-duration">
  //               <i class="far fa-clock"></i>
  //               ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(
  //     2,
  //     "0"
  //   )}m ${String(secs).padStart(2, "0")}s
  //           </div>
  //           <div class="task-actions">
  //               <button class="edit-task" title="Edit task"><i class="far fa-edit"></i></button>
  //               <button class="delete-task" title="Delete task"><i class="far fa-trash-alt"></i></button>
  //           </div>
  //       `;

  function renderTaskItem(task) {
    const taskItem = document.createElement("li");
    taskItem.className = "task-item";
    taskItem.dataset.id = task.id;

    const hours = Math.floor(task.duration / 3600);
    const minutes = Math.floor((task.duration % 3600) / 60);
    const secs = task.duration % 60;

    taskItem.innerHTML = `
        <div class="task-time-range">
            <span class="time-from">${task.startTimeString}</span>
            <span class="time-separator">→</span>
            <span class="time-to">${task.endTimeString}</span>
        </div>
        <div class="task-category">${getCategoryEmoji(task.category)} ${
      task.category.charAt(0).toUpperCase() + task.category.slice(1)
    }</div>
        <div class="task-description">${task.description}</div>
        <div class="task-duration">
            <i class="far fa-clock"></i> 
            ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(
      2,
      "0"
    )}m ${String(secs).padStart(2, "0")}s
        </div>
        <div class="task-actions">
            <button class="edit-task" title="Edit task"><i class="far fa-edit"></i></button>
            <button class="delete-task" title="Delete task"><i class="far fa-trash-alt"></i></button>
        </div>
    `;

    tasksTodayEl.appendChild(taskItem);

    // Add event listeners to action buttons
    taskItem
      .querySelector(".edit-task")
      .addEventListener("click", () => openEditModal(task.id));
    taskItem
      .querySelector(".delete-task")
      .addEventListener("click", () => confirmDeleteTask(task.id));
  }

  function getCategoryEmoji(category) {
    const emojis = {
      work: "💼",
      study: "📚",
      exercise: "🏋️",
      personal: "✨",
      other: "🔹",
    };
    return emojis[category] || "🔹";
  }

  function updateTaskList() {
    const today = new Date().toISOString().split("T")[0];
    showTasksForDay(today);
  }

  // Task editing functions
  function openEditModal(taskId) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    selectedTaskId = taskId;
    editCategory.value = task.category;
    editDescription.value = task.description;
    editDuration.value = Math.floor(task.duration / 60) || 1;

    // Convert Date to HH:MM format for the input
    const endTime = task.endTime ? new Date(task.endTime) : new Date();
    document.getElementById("edit-start-time").textContent =
      task.startTimeString;
    document.getElementById("edit-end-time").value =
      formatTimeForInput(endTime);

    editModal.style.display = "flex";

    // Add these lines to show the time range in the modal:
    // document.getElementById("edit-start-time").textContent =
    //   task.startTimeString;
    // document.getElementById("edit-end-time").textContent = task.endTimeString;

    // editModal.style.display = "flex";
  }

  function formatTimeForInput(date) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function closeEditModal() {
    editModal.style.display = "none";
    selectedTaskId = null;
  }

  function saveEditedTask() {
    if (!selectedTaskId) return;

    const taskIndex = tasks.findIndex((t) => t.id === selectedTaskId);
    if (taskIndex === -1) return;

    // 1. Get all edited values
    const editedCategory = editCategory.value;
    const editedDescription = editDescription.value.trim();
    const editedDurationMinutes = parseInt(editDuration.value) || 1;
    const editedDuration = editedDurationMinutes * 60; // Convert to seconds

    // 2. Get the original start time
    const originalStartTime = new Date(tasks[taskIndex].startTime);

    // 3. Calculate new end time (two methods)
    let newEndTime;
    const manualEndTimeValue = document.getElementById("edit-end-time").value;

    if (manualEndTimeValue) {
      // Method 1: Use the manually entered time
      const [hours, minutes] = manualEndTimeValue.split(":").map(Number);
      newEndTime = new Date(originalStartTime);
      newEndTime.setHours(hours, minutes, 0, 0);

      // Recalculate duration based on manual time entry
      const newDurationSeconds = Math.floor(
        (newEndTime - originalStartTime) / 1000
      );
      if (newDurationSeconds <= 0) {
        showAlert("End time must be after start time", "error");
        return; // Prevent saving invalid time
      }
    } else {
      // Method 2: Calculate from duration
      newEndTime = new Date(
        originalStartTime.getTime() + editedDuration * 1000
      );
    }

    // 4. Format the time strings
    const options = { hour: "2-digit", minute: "2-digit" };
    const endTimeString = newEndTime.toLocaleTimeString([], options);

    // 5. Update the task
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      category: editedCategory,
      description: editedDescription,
      duration: editedDuration,
      endTime: newEndTime,
      endTimeString: endTimeString,
    };

    // 6. Save and update UI
    saveTasks();
    updateTaskList();
    renderTasksOnCalendar();
    closeEditModal();

    showAlert("Task updated successfully!", "success");
  }

  function confirmDeleteTask(taskId) {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTask(taskId);
    }
  }

  function deleteTask(taskId) {
    tasks = tasks.filter((t) => t.id !== taskId);
    saveTasks();
    updateTaskList();
    renderTasksOnCalendar();

    showAlert("Task deleted successfully!", "success");
  }

  // Data persistence
  function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }

  // Helper functions
  function showAlert(message, type) {
    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <span class="alert-message">${message}</span>
        <button class="alert-close">&times;</button>
    `;

    // Add to the beginning of body
    document.body.prepend(alert);

    // Make it appear with animation
    setTimeout(() => {
      alert.classList.add("show");
    }, 10);

    // Close button functionality
    const closeBtn = alert.querySelector(".alert-close");
    closeBtn.addEventListener("click", () => {
      closeAlert(alert);
    });

    // Auto-close after 5 seconds
    const autoClose = setTimeout(() => {
      closeAlert(alert);
    }, 5000);

    // Close function
    function closeAlert(alertElement) {
      clearTimeout(autoClose);
      alertElement.classList.remove("show");
      alertElement.classList.add("hide");
      setTimeout(() => {
        alertElement.remove();
      }, 300);
    }
  }

  // Event listeners
  startBtn.addEventListener("click", startTimer);
  stopBtn.addEventListener("click", stopTimer);

  prevMonthBtn.addEventListener("click", function () {
    viewingDate.setMonth(viewingDate.getMonth() - 1);
    updateCalendar();
    renderTasksOnCalendar();
  });

  nextMonthBtn.addEventListener("click", function () {
    viewingDate.setMonth(viewingDate.getMonth() + 1);
    updateCalendar();
    renderTasksOnCalendar();
  });

  closeModalBtn.addEventListener("click", closeEditModal);
  saveEditBtn.addEventListener("click", saveEditedTask);
  deleteTaskBtn.addEventListener("click", () => {
    if (selectedTaskId) {
      confirmDeleteTask(selectedTaskId);
      closeEditModal();
    }
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === editModal) {
      closeEditModal();
    }
  });

  // Show today's tasks by default
  showTasksForDay(new Date().toISOString().split("T")[0]);

  /////////////////////////////////
  // Add event listener for category change
  document
    .getElementById("task-category")
    .addEventListener("change", function () {
      const category = this.value;
      const descriptionSelect = document.getElementById("task-description");

      // Clear existing options
      descriptionSelect.innerHTML = "";
      descriptionSelect.disabled = !category;

      if (category) {
        // Add default option
        descriptionSelect.add(new Option("Select description", ""));

        // Add descriptions for selected category
        taskConfig.descriptions[category]?.forEach((desc) => {
          descriptionSelect.add(new Option(desc, desc));
        });
      }
    });
    //////////////////////////

  editDuration.addEventListener("input", function () {
    if (!selectedTaskId) return;

    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;

    const startTime = new Date(task.startTime);
    const minutesToAdd = parseInt(this.value) || 0;
    const newEndTime = new Date(startTime.getTime() + minutesToAdd * 60000);

    document.getElementById("edit-end-time").value =
      formatTimeForInput(newEndTime);
  });

  document
    .getElementById("edit-end-time")
    .addEventListener("change", function () {
      if (!selectedTaskId) return;

      const task = tasks.find((t) => t.id === selectedTaskId);
      if (!task) return;

      const startTime = new Date(task.startTime);
      const [hours, minutes] = this.value.split(":");
      const newEndTime = new Date(startTime);
      newEndTime.setHours(parseInt(hours));
      newEndTime.setMinutes(parseInt(minutes));

      const newDuration = Math.floor((newEndTime - startTime) / 60000); // in minutes
      editDuration.value = newDuration;
    });
});
