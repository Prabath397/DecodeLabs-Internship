(() => {
  'use strict';

  const storageKeys = { tasks: 'taskflow.tasks.v1', initialized: 'taskflow.initialized.v1', theme: 'taskflow.theme.v1' };
  const priorities = { high: 3, medium: 2, low: 1 };
  const desktopNavigation = window.matchMedia('(min-width: 960px)');
  const state = { tasks: [], deleteId: null, lastFocus: null };
  const elements = {
    sidebar: document.querySelector('#sidebar'), menuToggle: document.querySelector('#menu-toggle'),
    taskModal: document.querySelector('#task-modal'), deleteModal: document.querySelector('#delete-modal'),
    taskForm: document.querySelector('#task-form'), taskId: document.querySelector('#task-id'), title: document.querySelector('#task-title'),
    description: document.querySelector('#task-description'), category: document.querySelector('#task-category'), priority: document.querySelector('#task-priority'), deadline: document.querySelector('#task-deadline'),
    taskList: document.querySelector('#task-list'), upcomingList: document.querySelector('#upcoming-list'), search: document.querySelector('#search-input'),
    statusFilter: document.querySelector('#status-filter'), priorityFilter: document.querySelector('#priority-filter'), sort: document.querySelector('#sort-select'),
    titleError: document.querySelector('#title-error'), deadlineError: document.querySelector('#deadline-error'), toastRegion: document.querySelector('#toast-region'),
    currentDate: document.querySelector('#current-date'), greeting: document.querySelector('#greeting'), progressBar: document.querySelector('#progress-bar'),
    progressPercent: document.querySelector('#progress-percent'), progressCopy: document.querySelector('#progress-copy')
  };

  function toLocalISO(date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
  function getToday() { return toLocalISO(new Date()); }
  function parseDate(value) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); }
  function isValidDate(value) { const date = parseDate(value); return Number.isFinite(date.getTime()) && toLocalISO(date) === value; }
  function formatDate(value, options = { month: 'short', day: 'numeric' }) { return parseDate(value).toLocaleDateString('en-US', options); }
  function createTaskId() { return window.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
  function isValidTask(task) { return task && typeof task.id === 'string' && typeof task.title === 'string' && typeof task.description === 'string' && ['Assignments','Projects','Exams','Personal','Other'].includes(task.category) && ['high','medium','low'].includes(task.priority) && /^\d{4}-\d{2}-\d{2}$/.test(task.deadline) && isValidDate(task.deadline) && typeof task.completed === 'boolean' && Number.isFinite(task.createdAt); }
  function sampleTasks() {
    const today = new Date();
    const dateAt = days => { const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days); return toLocalISO(date); };
    return [
      { id: createTaskId(), title: 'Complete statistics problem set', description: 'Review probability distributions before submitting.', category: 'Assignments', priority: 'high', deadline: dateAt(1), completed: false, createdAt: Date.now() - 86400000 },
      { id: createTaskId(), title: 'Prepare project research outline', description: 'Collect three academic sources for the literature review.', category: 'Projects', priority: 'medium', deadline: dateAt(3), completed: false, createdAt: Date.now() - 172800000 },
      { id: createTaskId(), title: 'Revise lecture notes', description: 'Organize key ideas from this week.', category: 'Exams', priority: 'low', deadline: dateAt(-1), completed: false, createdAt: Date.now() - 259200000 },
      { id: createTaskId(), title: 'Update study planner', description: '', category: 'Personal', priority: 'low', deadline: dateAt(5), completed: true, createdAt: Date.now() - 345600000 }
    ];
  }
  function readTasks() {
    try {
      const raw = localStorage.getItem(storageKeys.tasks);
      const initialized = localStorage.getItem(storageKeys.initialized);
      if (!initialized) { const tasks = sampleTasks(); localStorage.setItem(storageKeys.tasks, JSON.stringify(tasks)); localStorage.setItem(storageKeys.initialized, 'true'); return tasks; }
      if (!raw) return [];
      const tasks = JSON.parse(raw);
      if (!Array.isArray(tasks)) { localStorage.setItem(storageKeys.tasks, '[]'); return []; }
      const validTasks = tasks.filter(isValidTask);
      if (validTasks.length !== tasks.length) localStorage.setItem(storageKeys.tasks, JSON.stringify(validTasks));
      return validTasks;
    } catch { showToast('Saved tasks could not be loaded. Starting with an empty list.', 'error'); return []; }
  }
  function saveTasks() { try { localStorage.setItem(storageKeys.tasks, JSON.stringify(state.tasks)); } catch { showToast('Your changes could not be saved in this browser.', 'error'); } }
  function setTheme(theme) { document.documentElement.dataset.theme = theme; const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'; document.querySelectorAll('#theme-toggle, #theme-toggle-desktop').forEach(button => button.setAttribute('aria-label', label)); try { localStorage.setItem(storageKeys.theme, theme); } catch { } }
  function initializeTheme() { let theme = 'light'; try { theme = localStorage.getItem(storageKeys.theme) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch { } setTheme(theme); }
  function isOverdue(task) { return !task.completed && task.deadline < getToday(); }
  function showToast(message, type = 'success') { const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; elements.toastRegion.append(toast); setTimeout(() => toast.remove(), 3500); }
  function updateDateAndGreeting() { const now = new Date(); elements.currentDate.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); const hour = now.getHours(); elements.greeting.textContent = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; }
  function createElement(tag, className, text) { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; }
  function dueText(task) { if (task.completed) return `Completed · ${formatDate(task.deadline)}`; if (isOverdue(task)) return `Overdue · ${formatDate(task.deadline)}`; if (task.deadline === getToday()) return 'Due today'; const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); if (task.deadline === toLocalISO(tomorrow)) return 'Due tomorrow'; return `Due ${formatDate(task.deadline)}`; }
  function badge(text, className) { return createElement('span', `badge ${className || ''}`, text); }
  function getFilteredTasks() {
    const query = elements.search.value.trim().toLocaleLowerCase();
    const status = elements.statusFilter.value; const priority = elements.priorityFilter.value;
    const filtered = state.tasks.filter(task => {
      const matchesQuery = !query || task.title.toLocaleLowerCase().includes(query) || task.description.toLocaleLowerCase().includes(query);
      const matchesStatus = status === 'all' || (status === 'overdue' ? isOverdue(task) : status === 'completed' ? task.completed : !task.completed && !isOverdue(task));
      return matchesQuery && matchesStatus && (priority === 'all' || task.priority === priority);
    });
    return filtered.sort((a, b) => elements.sort.value === 'deadline' ? a.deadline.localeCompare(b.deadline) : elements.sort.value === 'priority' ? priorities[b.priority] - priorities[a.priority] || b.createdAt - a.createdAt : b.createdAt - a.createdAt);
  }
  function renderTaskList() {
    elements.taskList.replaceChildren(); const tasks = getFilteredTasks();
    if (!tasks.length) { const empty = createElement('div', 'empty-state'); empty.append(createElement('strong', '', state.tasks.length ? 'No matching tasks' : 'No tasks yet'), createElement('span', '', state.tasks.length ? 'Try adjusting your search or filters.' : 'Add a task to start planning your week.')); elements.taskList.append(empty); return; }
    tasks.forEach(task => {
      const article = createElement('article', `task-card${task.completed ? ' completed' : ''}${isOverdue(task) ? ' overdue' : ''}`);
      const check = createElement('input', 'task-check'); check.type = 'checkbox'; check.checked = task.completed; check.setAttribute('aria-label', task.completed ? `Reopen ${task.title}` : `Mark ${task.title} as complete`); check.dataset.action = 'toggle'; check.dataset.id = task.id;
      const main = createElement('div', 'task-main'); const titleLine = createElement('div', 'task-title-line'); titleLine.append(createElement('h3', 'task-title', task.title));
      const actions = createElement('div', 'task-actions'); [['edit','Edit'],['delete','Delete']].forEach(([action,label]) => { const button = createElement('button', 'small-action', label); button.type = 'button'; button.dataset.action = action; button.dataset.id = task.id; button.setAttribute('aria-label', `${label} ${task.title}`); actions.append(button); }); titleLine.append(actions); main.append(titleLine);
      if (task.description) main.append(createElement('p', 'task-desc', task.description));
      const meta = createElement('div', 'task-meta'); const category = badge(task.category, `category-${task.category}`); const dot = createElement('span', 'category-dot'); category.prepend(dot); meta.append(category, badge(`${task.priority[0].toUpperCase()}${task.priority.slice(1)} priority`, `priority-${task.priority}`), badge(dueText(task), `due${isOverdue(task) ? ' overdue' : ''}`)); main.append(meta); article.append(check, main); elements.taskList.append(article);
    });
  }
  function renderUpcoming() { elements.upcomingList.replaceChildren(); const tasks = state.tasks.filter(task => !task.completed && task.deadline >= getToday()).sort((a,b) => a.deadline.localeCompare(b.deadline)).slice(0,3); if (!tasks.length) { const empty = createElement('div', 'empty-state'); empty.append(createElement('strong', '', 'No upcoming deadlines'), createElement('span', '', 'Your open tasks will appear here.')); elements.upcomingList.append(empty); return; } tasks.forEach(task => { const card = createElement('article','deadline-card'); const date = parseDate(task.deadline); const dateBox = createElement('div','date-box'); dateBox.append(createElement('b','',String(date.getDate())),createElement('span','',date.toLocaleDateString('en-US',{month:'short'}))); const info = createElement('div','deadline-info'); info.append(createElement('h3','',task.title)); const line = createElement('p',`category-${task.category}`); const dot = createElement('span','category-dot'); line.append(dot,document.createTextNode(`${task.category} · ${dueText(task)}`)); info.append(line); card.append(dateBox,info); elements.upcomingList.append(card); }); }
  function renderStats() { const total = state.tasks.length; const completed = state.tasks.filter(task => task.completed).length; const overdue = state.tasks.filter(isOverdue).length; const pending = total - completed; const stats = [['total',total,total === 1 ? '1 task total' : `${total} tasks total`],['completed',completed,completed ? `${completed} finished` : 'Keep it going'],['pending',pending,pending ? `${pending} to focus on` : 'Nothing pending'],['overdue',overdue,overdue ? 'Needs attention' : 'You are up to date']]; stats.forEach(([key,count,caption]) => { document.querySelector(`#${key}-count`).textContent = count; document.querySelector(`#${key}-caption`).textContent = caption; }); const percent = total ? Math.round(completed / total * 100) : 0; elements.progressBar.style.width = `${percent}%`; elements.progressBar.parentElement.setAttribute('aria-valuenow',percent); elements.progressPercent.textContent = `${percent}%`; elements.progressCopy.textContent = total ? `${completed} of ${total} tasks completed. ${pending ? 'Keep building your momentum.' : 'Everything is complete.'}` : 'Add your first task to begin tracking progress.'; }
  function render() { renderStats(); renderUpcoming(); renderTaskList(); }
  function openModal(modal, opener) { state.lastFocus = opener || document.activeElement; modal.hidden = false; document.body.style.overflow = 'hidden'; const focusTarget = modal.querySelector('input, button, select, textarea'); requestAnimationFrame(() => focusTarget?.focus()); }
  function closeModal(modal) { modal.hidden = true; if (elements.taskModal.hidden && elements.deleteModal.hidden) document.body.style.overflow = ''; state.lastFocus?.focus?.(); }
  function openTaskModal(task = null, opener) { elements.taskForm.reset(); elements.titleError.textContent = ''; elements.deadlineError.textContent = ''; elements.taskId.value = task?.id || ''; document.querySelector('#task-modal-title').textContent = task ? 'Edit task' : 'Add a new task'; document.querySelector('#task-submit').textContent = task ? 'Save changes' : 'Save task'; if (task) { elements.title.value = task.title; elements.description.value = task.description; elements.category.value = task.category; elements.priority.value = task.priority; elements.deadline.value = task.deadline; } else elements.deadline.value = getToday(); openModal(elements.taskModal, opener); }
  function validateForm() { const title = elements.title.value.trim(); const deadline = elements.deadline.value; elements.titleError.textContent = title ? '' : 'Enter a task title.'; elements.deadlineError.textContent = isValidDate(deadline) ? '' : 'Choose a valid deadline.'; return Boolean(title && isValidDate(deadline)); }
  function submitTask(event) { event.preventDefault(); if (!validateForm()) { (elements.titleError.textContent ? elements.title : elements.deadline).focus(); return; } const existingId = elements.taskId.value; const data = { title: elements.title.value.trim(), description: elements.description.value.trim(), category: elements.category.value, priority: elements.priority.value, deadline: elements.deadline.value }; if (existingId) { const index = state.tasks.findIndex(task => task.id === existingId); if (index >= 0) state.tasks[index] = { ...state.tasks[index], ...data }; showToast('Task updated.'); } else { state.tasks.unshift({ id: createTaskId(), ...data, completed: false, createdAt: Date.now() }); showToast('Task added.'); } saveTasks(); render(); closeModal(elements.taskModal); }
  function handleTaskAction(event) { const control = event.target.closest('[data-action]'); if (!control) return; if ((control.dataset.action === 'toggle' && event.type !== 'change') || (control.dataset.action !== 'toggle' && event.type !== 'click')) return; const task = state.tasks.find(item => item.id === control.dataset.id); if (!task) return; if (control.dataset.action === 'toggle') { task.completed = control.checked; saveTasks(); render(); showToast(task.completed ? 'Task completed.' : 'Task reopened.'); } else if (control.dataset.action === 'edit') openTaskModal(task, control); else if (control.dataset.action === 'delete') { state.deleteId = task.id; document.querySelector('#delete-message').textContent = `Delete “${task.title}”? This action cannot be undone.`; openModal(elements.deleteModal, control); } }
  function confirmDelete() { if (!state.deleteId) return; state.tasks = state.tasks.filter(task => task.id !== state.deleteId); state.deleteId = null; saveTasks(); render(); closeModal(elements.deleteModal); showToast('Task deleted.'); }
  function trapFocus(event) { const modal = !elements.taskModal.hidden ? elements.taskModal : !elements.deleteModal.hidden ? elements.deleteModal : null; if (!modal || event.key !== 'Tab') return; const items = [...modal.querySelectorAll('button,[href],input,select,textarea:not([disabled])')].filter(item => !item.hidden); const first = items[0], last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
  function syncNavigation() { if (desktopNavigation.matches) elements.sidebar.classList.remove('open'); const isOpen = desktopNavigation.matches || elements.sidebar.classList.contains('open'); const mobileOpen = !desktopNavigation.matches && isOpen; elements.sidebar.inert = !isOpen; elements.sidebar.setAttribute('aria-hidden', String(!isOpen)); elements.menuToggle.setAttribute('aria-expanded', String(mobileOpen)); elements.menuToggle.setAttribute('aria-label', mobileOpen ? 'Close navigation' : 'Open navigation'); }
  function closeNavigation() { elements.sidebar.classList.remove('open'); syncNavigation(); }
  function bindEvents() {
    document.querySelectorAll('[data-open-task-modal]').forEach(button => button.addEventListener('click', () => openTaskModal(null, button)));
    elements.menuToggle.addEventListener('click', () => { elements.sidebar.classList.toggle('open'); syncNavigation(); });
    document.addEventListener('click', event => { if (elements.sidebar.classList.contains('open') && !elements.sidebar.contains(event.target) && !elements.menuToggle.contains(event.target)) closeNavigation(); });
    document.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => { if (!desktopNavigation.matches) closeNavigation(); }));
    desktopNavigation.addEventListener('change', syncNavigation);
    document.querySelectorAll('#theme-toggle, #theme-toggle-desktop').forEach(button => button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')));
    elements.taskForm.addEventListener('submit', submitTask); elements.taskList.addEventListener('click', handleTaskAction); elements.taskList.addEventListener('change', handleTaskAction); [elements.search,elements.statusFilter,elements.priorityFilter,elements.sort].forEach(input => input.addEventListener(input === elements.search ? 'input' : 'change', renderTaskList));
    document.querySelectorAll('.close-modal').forEach(button => button.addEventListener('click', () => closeModal(elements.taskModal))); document.querySelectorAll('.close-delete').forEach(button => button.addEventListener('click', () => closeModal(elements.deleteModal))); document.querySelector('#confirm-delete').addEventListener('click',confirmDelete);
    [elements.taskModal,elements.deleteModal].forEach(modal => modal.addEventListener('click', event => { if (event.target === modal) closeModal(modal); }));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { if (!elements.taskModal.hidden) closeModal(elements.taskModal); else if (!elements.deleteModal.hidden) closeModal(elements.deleteModal); else if (elements.sidebar.classList.contains('open')) { closeNavigation(); elements.menuToggle.focus(); } } trapFocus(event); });
  }
  initializeTheme(); state.tasks = readTasks(); updateDateAndGreeting(); bindEvents(); syncNavigation(); render();
})();
