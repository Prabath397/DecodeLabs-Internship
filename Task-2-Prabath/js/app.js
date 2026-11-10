const elements = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]));
let currentTasks = [];
let submitting = false;
let searchTimer;
let refreshSequence = 0;

function showNotice(message, type = 'error') {
  elements.notice.textContent = message;
  elements.notice.className = `notice ${type}`;
  elements.notice.hidden = false;
  clearTimeout(showNotice.timer);
  showNotice.timer = setTimeout(() => { elements.notice.hidden = true; }, 5000);
}

function errorMessage(error) {
  return error.details?.length ? error.details.map((detail) => `${detail.field}: ${detail.message}`).join(' · ') : error.message;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value;
  return div.innerHTML;
}

function renderTasks(tasks) {
  elements.taskCount.textContent = `${tasks.length} shown`;
  elements.taskList.innerHTML = tasks.length ? tasks.map((task) => `
    <article class="task ${task.status === 'Completed' ? 'completed' : ''}">
      <div class="task-main"><div class="task-title"><h3>${escapeHtml(task.title)}</h3><span class="badge ${task.priority.toLowerCase()}">${task.priority}</span></div>
      ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}<div class="meta"><span>${task.category}</span><span>${task.dueDate ? `Due ${task.dueDate}` : 'No due date'}</span><span>${task.status}</span></div></div>
      <div class="task-actions"><button data-action="toggle" data-id="${task.id}" class="secondary">${task.status === 'Completed' ? 'Reopen' : 'Complete'}</button><button data-action="edit" data-id="${task.id}" class="secondary">Edit</button><button data-action="delete" data-id="${task.id}" class="danger">Delete</button></div>
    </article>`).join('') : '<div class="state">No tasks match this view.</div>';
}

async function refresh() {
  const sequence = ++refreshSequence;
  elements.loading.hidden = false;
  try {
    const query = Object.fromEntries(new FormData(elements.filters));
    const [tasksResponse, statsResponse] = await Promise.all([window.taskApi.listTasks(query), window.taskApi.getStats()]);
    if (sequence !== refreshSequence) return;
    currentTasks = tasksResponse.data;
    renderTasks(currentTasks);
    const stats = statsResponse.data;
    elements.totalTasks.textContent = stats.totalTasks;
    elements.pendingTasks.textContent = stats.pendingTasks;
    elements.completedTasks.textContent = stats.completedTasks;
    elements.overdueTasks.textContent = stats.overdueTasks;
    elements.completionPercentage.textContent = `${stats.completionPercentage}%`;
  } catch (error) {
    if (sequence !== refreshSequence) return;
    showNotice(errorMessage(error));
    elements.taskList.innerHTML = '<div class="state error-text">Tasks could not be loaded.</div>';
  } finally {
    if (sequence === refreshSequence) elements.loading.hidden = true;
  }
}

function resetForm() {
  elements.taskForm.reset();
  elements.taskId.value = '';
  elements.formTitle.textContent = 'Add task';
  elements.submitButton.textContent = 'Create task';
  elements.cancelEdit.hidden = true;
}

elements.taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting) return;
  submitting = true;
  elements.submitButton.disabled = true;
  const task = { title: elements.title.value, description: elements.description.value, category: elements.category.value, priority: elements.priority.value, dueDate: elements.dueDate.value || null };
  try {
    if (elements.taskId.value) await window.taskApi.updateTask(elements.taskId.value, task);
    else await window.taskApi.createTask(task);
    showNotice(elements.taskId.value ? 'Task updated.' : 'Task created.', 'success');
    resetForm();
    await refresh();
  } catch (error) {
    showNotice(errorMessage(error));
  } finally {
    submitting = false;
    elements.submitButton.disabled = false;
  }
});

elements.taskList.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const task = currentTasks.find((item) => item.id === button.dataset.id);
  if (!task) return;
  try {
    button.disabled = true;
    if (button.dataset.action === 'toggle') await window.taskApi.updateStatus(task.id, task.status === 'Completed' ? 'Pending' : 'Completed');
    if (button.dataset.action === 'delete') {
      if (!confirm(`Delete “${task.title}”?`)) return;
      await window.taskApi.deleteTask(task.id);
    }
    if (button.dataset.action === 'edit') {
      elements.taskId.value = task.id; elements.title.value = task.title; elements.description.value = task.description; elements.category.value = task.category; elements.priority.value = task.priority; elements.dueDate.value = task.dueDate || '';
      elements.formTitle.textContent = 'Edit task'; elements.submitButton.textContent = 'Save changes'; elements.cancelEdit.hidden = false; elements.title.focus(); return;
    }
    await refresh();
  } catch (error) { showNotice(errorMessage(error)); } finally { button.disabled = false; }
});

elements.filters.addEventListener('change', refresh);
elements.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(refresh, 300); });
elements.cancelEdit.addEventListener('click', resetForm);
elements.themeButton.addEventListener('click', () => { document.body.classList.toggle('dark'); storageSet('taskflow-theme', document.body.classList.contains('dark') ? 'dark' : 'light'); });
if (storageGet('taskflow-theme') === 'dark') document.body.classList.add('dark');

function legacyTasks() {
  if (storageGet('taskflow-imported') === 'true') return [];
  for (const key of ['taskflowTasks', 'tasks']) {
    try { const value = JSON.parse(storageGet(key)); if (Array.isArray(value) && value.length) return value; } catch {}
  }
  return [];
}

const importable = legacyTasks();
if (importable.length) elements.importPanel.hidden = false;
elements.dismissImport.addEventListener('click', () => { elements.importPanel.hidden = true; });
elements.importButton.addEventListener('click', async () => {
  elements.importButton.disabled = true;
  let imported = 0;
  let skipped = 0;
  try {
    const existingResponse = await window.taskApi.listTasks();
    const fingerprints = new Set(existingResponse.data.map(taskFingerprint));
    for (const task of importable) {
      const normalized = normalizeLegacyTask(task);
      if (normalized.title.length < 3 || fingerprints.has(taskFingerprint(normalized))) {
        skipped += 1;
        continue;
      }
      const response = await window.taskApi.createTask(normalized);
      fingerprints.add(taskFingerprint(response.data));
      imported += 1;
    }
    storageSet('taskflow-imported', 'true');
    elements.importPanel.hidden = true;
    showNotice(`${imported} task${imported === 1 ? '' : 's'} imported${skipped ? `; ${skipped} duplicate or invalid task${skipped === 1 ? '' : 's'} skipped` : ''}.`, 'success');
    await refresh();
  } catch (error) { showNotice(`Imported ${imported} tasks before an error: ${errorMessage(error)}`); elements.importButton.disabled = false; }
});

function normalizeLegacyTask(task) {
  return {
    title: String(task.title || '').trim(),
    description: String(task.description || '').trim(),
    category: ['Assignments', 'Projects', 'Exams', 'Personal', 'Other'].includes(task.category) ? task.category : 'Other',
    priority: ['Low', 'Medium', 'High'].includes(task.priority) ? task.priority : 'Medium',
    status: task.status === 'Completed' || task.completed === true ? 'Completed' : 'Pending',
    dueDate: validLegacyDate(task.dueDate) ? task.dueDate : null
  };
}

function taskFingerprint(task) {
  return JSON.stringify([task.title, task.description || '', task.category, task.priority, task.status, task.dueDate || null]);
}

function validLegacyDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

refresh();
