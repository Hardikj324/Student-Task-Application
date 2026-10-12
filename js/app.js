/**
 * StudySync — Refined Student Task Manager v2
 * Full application logic: CRUD, filtering, sorting, stats, themes
 */
(function () {
  'use strict';

  /* ─────────────────────────────────────────
     CONSTANTS & SAMPLE DATA
  ──────────────────────────────────────────*/
  const STORAGE_KEY = 'studysync_v2_tasks';
  const THEME_KEY   = 'studysync_v2_theme';

  function dateStr(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  const SAMPLE_TASKS = [
    {
      id: 'demo-1',
      title: 'Operating Systems Lab 4 — Banker\'s Algorithm',
      subject: 'Computer Science',
      description: 'Implement deadlock avoidance using Banker\'s Algorithm in C++. Generate execution logs for each test scenario.',
      dueDate: dateStr(0),
      priority: 'high',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-2',
      title: 'Linear Algebra — Problem Set 5',
      subject: 'Mathematics',
      description: 'Questions 12–24 on Eigenvalues, Eigenvectors, and Diagonalization.',
      dueDate: dateStr(1),
      priority: 'high',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-3',
      title: 'DBMS Term Project — ER Diagram',
      subject: 'Computer Science',
      description: 'Design a normalized 3NF schema and write CRUD queries in PostgreSQL.',
      dueDate: dateStr(4),
      priority: 'medium',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-4',
      title: 'Physics — Wave Optics Assignment',
      subject: 'Physics',
      description: "Review Young's double-slit experiment derivation and summarize key observations.",
      dueDate: dateStr(-1),
      priority: 'medium',
      status: 'pending',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-5',
      title: 'Technical Communication — Seminar Slides',
      subject: 'Literature',
      description: 'Prepare a 5-slide deck summarising the capstone project progress.',
      dueDate: dateStr(3),
      priority: 'low',
      status: 'completed',
      createdAt: new Date().toISOString()
    }
  ];

  /* ─────────────────────────────────────────
     STATE
  ──────────────────────────────────────────*/
  let tasks = [];
  let filter = {
    status: 'all',
    priority: 'all',
    query: '',
    sort: 'dueDateAsc'
  };
  let pendingDeleteId = null;
  let sidebarOpen = false;

  /* ─────────────────────────────────────────
     DOM CACHE  (safe — all ids exist in HTML)
  ──────────────────────────────────────────*/
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const dom = {
    // Topbar
    headerDate:     $('headerCurrentDate'),
    themeBtn:       $('themeToggleBtn'),
    openAddBtn:     $('openAddModalBtn'),
    heroAddBtn:     $('heroAddBtn'),
    emptyAddBtn:    $('emptyStateAddBtn'),
    sidebarToggle:  $('sidebarToggleBtn'),
    searchInput:    $('searchInput'),
    clearSearch:    $('clearSearchBtn'),

    // Sidebar nav
    sidebar:        document.querySelector('.sidebar'),
    navItems:       $$('.nav-item[data-status]'),
    priorityNavs:   $$('.priority-nav'),
    sidebarCountAll:    $('sidebarCountAll'),
    sidebarCountPending:$('sidebarCountPending'),
    sidebarCountCompleted:$('sidebarCountCompleted'),
    sidebarCountHigh:   $('sidebarCountHigh'),
    sidebarCountMedium: $('sidebarCountMedium'),
    sidebarCountLow:    $('sidebarCountLow'),

    // Sidebar actions
    clearCompletedBtn: $('clearCompletedBtn'),
    resetSamplesBtn:   $('resetSampleDataBtn'),

    // Stats orbs
    statTotal:     $('statTotalCount'),
    statPending:   $('statPendingCount'),
    statCompleted: $('statCompletedCount'),
    statUrgent:    $('statUrgentCount'),
    progressFill:  $('progressBarFill'),
    progressPct:   $('progressPercentageText'),
    quickStat:     $('quickStatText'),
    greeting:      $('greetingTitle'),

    // Filter bar
    ftabs:          $$('.ftab'),
    // Priority custom dropdown
    priorityDropdown: $('priorityDropdown'),
    priorityTrigger:  $('priorityTrigger'),
    priorityMenu:     $('priorityMenu'),
    priorityLabel:    $('priorityLabel'),
    // Sort custom dropdown
    sortDropdown:   $('sortDropdown'),
    sortTrigger:    $('sortTrigger'),
    sortMenu:       $('sortMenu'),
    sortLabel:      $('sortLabel'),
    countAll:       $('countAll'),
    countPending:   $('countPending'),
    countCompleted: $('countCompleted'),

    // Task list
    viewTitle:     $('currentViewTitle'),
    visibleBadge:  $('tasksVisibleBadge'),
    tasksContainer:$('tasksContainer'),
    emptyState:    $('emptyStateContainer'),
    emptyTitle:    $('emptyStateTitle'),
    emptyMsg:      $('emptyStateMessage'),

    // Add/edit modal
    taskModal:     $('taskModal'),
    modalTitle:    $('modalTitle'),
    modalBadge:    $('modalIconBadge'),
    closeModalBtn: $('closeModalBtn'),
    cancelModalBtn:$('cancelModalBtn'),
    taskForm:      $('taskForm'),
    taskIdInput:   $('taskIdInput'),
    titleInput:    $('taskTitleInput'),
    subjectInput:  $('taskSubjectInput'),
    priorityInput: $('taskPriorityInput'),
    dueDateInput:  $('taskDueDateInput'),
    statusInput:   $('taskStatusInput'),
    descInput:     $('taskDescriptionInput'),
    charCount:     $('charCount'),

    // Delete modal
    deleteModal:     $('deleteConfirmModal'),
    cancelDeleteBtn: $('cancelDeleteBtn'),
    confirmDeleteBtn:$('confirmDeleteBtn'),
    deleteMsg:       $('deleteConfirmMessage'),

    // Toast
    toastShelf: $('toastContainer')
  };

  /* ─────────────────────────────────────────
     INIT
  ──────────────────────────────────────────*/
  function init() {
    applyTheme(localStorage.getItem(THEME_KEY) || detectPreferredTheme());
    setHeaderDate();
    setGreeting();
    loadTasks();
    bindEvents();
    render();
  }

  function detectPreferredTheme() {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function setHeaderDate() {
    const opts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    dom.headerDate.textContent = new Date().toLocaleDateString(undefined, opts);
  }

  function setGreeting() {
    const h = new Date().getHours();
    const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    dom.greeting.textContent = `${g}, Student! 🎓`;
  }

  /* ─────────────────────────────────────────
     THEME
  ──────────────────────────────────────────*/
  function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }

  function toggleTheme() {
    const cur = document.body.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    toast(`Switched to ${next} mode`, 'info');
  }

  /* ─────────────────────────────────────────
     STORAGE
  ──────────────────────────────────────────*/
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      tasks = stored ? JSON.parse(stored) : [...SAMPLE_TASKS];
      if (!stored) save();
    } catch {
      tasks = [...SAMPLE_TASKS];
    }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch {}
  }

  /* ─────────────────────────────────────────
     EVENTS
  ──────────────────────────────────────────*/
  function bindEvents() {
    // Theme
    dom.themeBtn.addEventListener('click', toggleTheme);

    // Open add modal
    dom.openAddBtn.addEventListener('click', () => openModal());
    dom.heroAddBtn.addEventListener('click', () => openModal());
    dom.emptyAddBtn.addEventListener('click', () => openModal());

    // Sidebar toggle (mobile)
    dom.sidebarToggle.addEventListener('click', toggleSidebar);

    // Search
    dom.searchInput.addEventListener('input', e => {
      filter.query = e.target.value.trim().toLowerCase();
      dom.clearSearch.classList.toggle('hidden', !filter.query);
      render();
    });
    dom.clearSearch.addEventListener('click', () => {
      dom.searchInput.value = '';
      filter.query = '';
      dom.clearSearch.classList.add('hidden');
      dom.searchInput.focus();
      render();
    });

    // Sidebar status nav
    dom.navItems.forEach(btn => {
      btn.addEventListener('click', () => {
        dom.navItems.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filter.status = btn.dataset.status;
        filter.priority = 'all';
        // Reset priority dropdown label and active state
        dom.priorityLabel.textContent = 'All Priorities';
        dom.priorityMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.toggle('active', i.dataset.value === 'all'));
        // Sync filter tabs
        dom.ftabs.forEach(t => {
          t.classList.toggle('active', t.dataset.status === btn.dataset.status);
        });
        render();
        if (window.innerWidth <= 860) closeSidebar();
      });
    });

    // Sidebar priority nav
    dom.priorityNavs.forEach(btn => {
      btn.addEventListener('click', () => {
        filter.priority = btn.dataset.priority;
        // Sync custom priority dropdown label + active item
        const matchItem = dom.priorityMenu.querySelector(`[data-value="${btn.dataset.priority}"]`);
        if (matchItem) {
          dom.priorityLabel.textContent = matchItem.textContent.trim();
          dom.priorityMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.toggle('active', i === matchItem));
        }
        render();
        if (window.innerWidth <= 860) closeSidebar();
      });
    });

    // Filter tabs
    dom.ftabs.forEach(tab => {
      tab.addEventListener('click', () => {
        dom.ftabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        filter.status = tab.dataset.status;
        // Sync sidebar
        dom.navItems.forEach(n => n.classList.toggle('active', n.dataset.status === tab.dataset.status));
        render();
      });
    });

    // Priority custom dropdown
    dom.priorityTrigger.addEventListener('click', e => { e.stopPropagation(); toggleDropdown(dom.priorityDropdown, dom.sortDropdown); });
    dom.priorityMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        filter.priority = item.dataset.value;
        dom.priorityLabel.textContent = item.textContent.trim();
        dom.priorityMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        closeDropdown(dom.priorityDropdown);
        render();
      });
    });

    // Sort custom dropdown
    dom.sortTrigger.addEventListener('click', e => { e.stopPropagation(); toggleDropdown(dom.sortDropdown, dom.priorityDropdown); });
    dom.sortMenu.querySelectorAll('.dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        filter.sort = item.dataset.value;
        dom.sortLabel.textContent = item.textContent.trim();
        dom.sortMenu.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        closeDropdown(dom.sortDropdown);
        render();
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      closeDropdown(dom.priorityDropdown);
      closeDropdown(dom.sortDropdown);
    });

    // Modal close
    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.cancelModalBtn.addEventListener('click', closeModal);
    dom.taskModal.addEventListener('click', e => { if (e.target === dom.taskModal) closeModal(); });

    // Form
    dom.taskForm.addEventListener('submit', handleSubmit);
    dom.descInput.addEventListener('input', () => { dom.charCount.textContent = dom.descInput.value.length; });

    // Delete modal
    dom.cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    dom.confirmDeleteBtn.addEventListener('click', confirmDelete);
    dom.deleteModal.addEventListener('click', e => { if (e.target === dom.deleteModal) closeDeleteModal(); });

    // Sidebar utility actions
    dom.clearCompletedBtn.addEventListener('click', clearCompleted);
    dom.resetSamplesBtn.addEventListener('click', resetSamples);

    // ESC key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (!dom.taskModal.classList.contains('hidden')) closeModal();
        if (!dom.deleteModal.classList.contains('hidden')) closeDeleteModal();
        if (sidebarOpen) closeSidebar();
      }
    });
  }

  /* ─────────────────────────────────────────
     SIDEBAR TOGGLE (mobile)
  ──────────────────────────────────────────*/
  function toggleSidebar() {
    sidebarOpen ? closeSidebar() : openSidebar();
  }

  /* ─────────────────────────────────────────
     CUSTOM DROPDOWN HELPERS
  ──────────────────────────────────────────*/
  function toggleDropdown(dropdown, ...others) {
    const isOpen = dropdown.classList.contains('open');
    others.forEach(d => closeDropdown(d));
    if (isOpen) {
      closeDropdown(dropdown);
    } else {
      dropdown.classList.add('open');
      dropdown.querySelector('.dropdown-trigger').setAttribute('aria-expanded', 'true');
    }
  }

  function closeDropdown(dropdown) {
    dropdown.classList.remove('open');
    dropdown.querySelector('.dropdown-trigger').setAttribute('aria-expanded', 'false');
  }

  function openSidebar() {
    dom.sidebar.classList.add('open');
    sidebarOpen = true;

    // Add backdrop
    const bd = document.createElement('div');
    bd.className = 'sidebar-backdrop';
    bd.id = 'sidebarBackdrop';
    bd.addEventListener('click', closeSidebar);
    document.body.appendChild(bd);
  }

  function closeSidebar() {
    dom.sidebar.classList.remove('open');
    sidebarOpen = false;
    const bd = document.getElementById('sidebarBackdrop');
    if (bd) bd.remove();
  }

  /* ─────────────────────────────────────────
     DATE HELPERS
  ──────────────────────────────────────────*/
  function dueDateInfo(str) {
    if (!str) return { label: 'No date', cls: '' };
    const today = new Date(); today.setHours(0,0,0,0);
    const [y, m, d] = str.split('-').map(Number);
    const due = new Date(y, m-1, d);
    const diff = Math.round((due - today) / 86400000);

    const fmt = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    if (diff < 0)  return { label: `Overdue (${Math.abs(diff)}d ago)`, cls: 'overdue', isOverdue: true };
    if (diff === 0) return { label: 'Due Today', cls: 'today', isToday: true };
    if (diff === 1) return { label: `Tomorrow — ${fmt}`, cls: 'today', isSoon: true };
    if (diff <= 3)  return { label: `In ${diff}d — ${fmt}`, cls: '', isSoon: true };
    return { label: fmt, cls: '' };
  }

  /* ─────────────────────────────────────────
     STATS & SIDEBAR COUNTS
  ──────────────────────────────────────────*/
  function updateStats() {
    const total   = tasks.length;
    const done    = tasks.filter(t => t.status === 'completed').length;
    const pending = total - done;
    const urgent  = tasks.filter(t => {
      if (t.status === 'completed') return false;
      const info = dueDateInfo(t.dueDate);
      return t.priority === 'high' || info.isOverdue || info.isToday;
    }).length;
    const high   = tasks.filter(t => t.priority === 'high').length;
    const medium = tasks.filter(t => t.priority === 'medium').length;
    const low    = tasks.filter(t => t.priority === 'low').length;

    // Orbs
    dom.statTotal.textContent    = total;
    dom.statPending.textContent  = pending;
    dom.statCompleted.textContent= done;
    dom.statUrgent.textContent   = urgent;

    // Progress
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    dom.progressFill.style.width = `${pct}%`;
    dom.progressPct.textContent  = `${pct}%`;

    // Quick stat line
    dom.quickStat.textContent = `${pending} task${pending !== 1 ? 's' : ''} pending · ${urgent} urgent`;

    // Tab counts
    dom.countAll.textContent       = total;
    dom.countPending.textContent   = pending;
    dom.countCompleted.textContent = done;

    // Sidebar counts
    dom.sidebarCountAll.textContent       = total;
    dom.sidebarCountPending.textContent   = pending;
    dom.sidebarCountCompleted.textContent = done;
    dom.sidebarCountHigh.textContent   = high;
    dom.sidebarCountMedium.textContent = medium;
    dom.sidebarCountLow.textContent    = low;
  }

  /* ─────────────────────────────────────────
     FILTER + SORT
  ──────────────────────────────────────────*/
  const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 };

  function getVisible() {
    return tasks
      .filter(t => {
        if (filter.status !== 'all' && t.status !== filter.status) return false;
        if (filter.priority !== 'all' && t.priority !== filter.priority) return false;
        if (filter.query) {
          const q = filter.query;
          if (
            !t.title.toLowerCase().includes(q) &&
            !(t.subject || '').toLowerCase().includes(q) &&
            !(t.description || '').toLowerCase().includes(q)
          ) return false;
        }
        return true;
      })
      .sort((a, b) => {
        switch (filter.sort) {
          case 'dueDateAsc':  return (a.dueDate||'').localeCompare(b.dueDate||'');
          case 'dueDateDesc': return (b.dueDate||'').localeCompare(a.dueDate||'');
          case 'priority':    return PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
          case 'newest':      return new Date(b.createdAt||0) - new Date(a.createdAt||0);
          case 'alphabetical':return a.title.localeCompare(b.title);
          default: return 0;
        }
      });
  }

  /* ─────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────*/
  function render() {
    updateStats();
    const visible = getVisible();

    // Section title
    let title = 'All Tasks';
    if (filter.status === 'pending')   title = 'Pending Tasks';
    if (filter.status === 'completed') title = 'Completed Tasks';
    if (filter.priority !== 'all')     title += ` · ${capitalize(filter.priority)} Priority`;
    if (filter.query) title = `Results for "${filter.query}"`;
    dom.viewTitle.textContent = title;
    dom.visibleBadge.textContent = `${visible.length} of ${tasks.length} tasks`;

    dom.tasksContainer.innerHTML = '';

    if (visible.length === 0) {
      dom.emptyState.classList.remove('hidden');
      if (filter.query || filter.status !== 'all' || filter.priority !== 'all') {
        dom.emptyTitle.textContent = 'No matching tasks';
        dom.emptyMsg.textContent = 'Try a different search or filter.';
      } else {
        dom.emptyTitle.textContent = 'No tasks yet';
        dom.emptyMsg.textContent = 'Click "New Task" to add your first assignment.';
      }
      return;
    }

    dom.emptyState.classList.add('hidden');
    visible.forEach(t => dom.tasksContainer.appendChild(buildCard(t)));
  }

  function buildCard(task) {
    const card = document.createElement('article');
    card.className = `task-card${task.status === 'completed' ? ' completed' : ''}`;
    card.dataset.id = task.id;
    card.dataset.priority = task.priority;

    const checked = task.status === 'completed';
    const info = dueDateInfo(task.dueDate);
    const pLabel = { high: 'High', medium: 'Medium', low: 'Low' }[task.priority];
    const pIcon  = { high: 'fa-fire-flame-curved', medium: 'fa-bolt', low: 'fa-leaf' }[task.priority];
    const subject = esc(task.subject || 'General');
    const title   = esc(task.title);
    const desc    = esc(task.description || '');

    card.innerHTML = `
      <div class="card-top">
        <div class="card-top-left">
          <label class="custom-checkbox" title="${checked ? 'Mark pending' : 'Mark done'}">
            <input type="checkbox" ${checked ? 'checked' : ''} aria-label="Toggle task">
            <span class="checkbox-mark"><i class="fa-solid fa-check"></i></span>
          </label>
          <h4 class="card-title">${title}</h4>
        </div>
        <div class="card-actions">
          <button class="card-btn edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="card-btn del"  title="Delete"><i class="fa-solid fa-trash-can"></i></button>
        </div>
      </div>

      <div class="card-meta">
        <span class="badge badge-subject"><i class="fa-solid fa-book"></i> ${subject}</span>
        <span class="badge badge-priority-${task.priority}">
          <i class="fa-solid ${pIcon}"></i> ${pLabel}
        </span>
        <span class="badge badge-date ${info.cls}">
          <i class="fa-regular fa-clock"></i> ${info.label}
        </span>
      </div>

      ${desc ? `<p class="card-desc">${desc}</p>` : ''}
    `;

    // Events
    card.querySelector('input[type="checkbox"]').addEventListener('change', () => toggleTask(task.id));
    card.querySelector('.edit').addEventListener('click', () => openModal(task.id));
    card.querySelector('.del').addEventListener('click', () => promptDelete(task.id, task.title));

    return card;
  }

  /* ─────────────────────────────────────────
     TASK ACTIONS
  ──────────────────────────────────────────*/
  function toggleTask(id) {
    const t = tasks.find(x => x.id === id);
    if (!t) return;
    t.status = t.status === 'completed' ? 'pending' : 'completed';
    save(); render();
    toast(t.status === 'completed' ? `✅ "${t.title}" completed!` : `⏳ "${t.title}" set to pending`, 'success');
  }

  function promptDelete(id, title) {
    pendingDeleteId = id;
    dom.deleteMsg.textContent = `Delete "${title}"? This cannot be undone.`;
    dom.deleteModal.classList.remove('hidden');
  }

  function closeDeleteModal() {
    pendingDeleteId = null;
    dom.deleteModal.classList.add('hidden');
  }

  function confirmDelete() {
    if (!pendingDeleteId) return;
    const idx = tasks.findIndex(t => t.id === pendingDeleteId);
    if (idx !== -1) {
      const name = tasks[idx].title;
      tasks.splice(idx, 1);
      save(); render();
      toast(`Deleted "${name}"`, 'warning');
    }
    closeDeleteModal();
  }

  function clearCompleted() {
    const n = tasks.filter(t => t.status === 'completed').length;
    if (!n) { toast('No completed tasks to clear.', 'info'); return; }
    if (!confirm(`Remove all ${n} completed task(s)?`)) return;
    tasks = tasks.filter(t => t.status !== 'completed');
    save(); render();
    toast(`Cleared ${n} completed task(s).`, 'success');
  }

  function resetSamples() {
    if (!confirm('Replace all tasks with sample data?')) return;
    tasks = SAMPLE_TASKS.map(t => ({ ...t, dueDate: recalcDate(t.id) }));
    save(); render();
    toast('Sample tasks loaded!', 'info');
  }

  function recalcDate(id) {
    const offsets = { 'demo-1': 0, 'demo-2': 1, 'demo-3': 4, 'demo-4': -1, 'demo-5': 3 };
    return dateStr(offsets[id] ?? 2);
  }

  /* ─────────────────────────────────────────
     ADD / EDIT MODAL
  ──────────────────────────────────────────*/
  function openModal(id = null) {
    clearValidation();
    if (id) {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      dom.modalTitle.textContent = 'Edit Task';
      dom.modalBadge.innerHTML = '<i class="fa-solid fa-pen"></i>';
      dom.taskIdInput.value = t.id;
      dom.titleInput.value  = t.title;
      dom.subjectInput.value = t.subject || '';
      dom.priorityInput.value = t.priority;
      dom.dueDateInput.value  = t.dueDate;
      dom.statusInput.value   = t.status;
      dom.descInput.value     = t.description || '';
      dom.charCount.textContent = (t.description || '').length;
    } else {
      dom.modalTitle.textContent = 'New Task';
      dom.modalBadge.innerHTML = '<i class="fa-solid fa-plus"></i>';
      dom.taskForm.reset();
      dom.taskIdInput.value = '';
      dom.dueDateInput.value = dateStr(1);
      dom.priorityInput.value = 'medium';
      dom.statusInput.value   = 'pending';
      dom.charCount.textContent = '0';
    }
    dom.taskModal.classList.remove('hidden');
    setTimeout(() => dom.titleInput.focus(), 80);
  }

  function closeModal() {
    dom.taskModal.classList.add('hidden');
    dom.taskForm.reset();
    clearValidation();
  }

  function clearValidation() {
    dom.titleInput.classList.remove('invalid');
    dom.dueDateInput.classList.remove('invalid');
  }

  function handleSubmit(e) {
    e.preventDefault();
    clearValidation();

    const title    = dom.titleInput.value.trim();
    const dueDate  = dom.dueDateInput.value;
    const subject  = dom.subjectInput.value.trim() || 'General';
    const priority = dom.priorityInput.value;
    const status   = dom.statusInput.value;
    const desc     = dom.descInput.value.trim();
    const editId   = dom.taskIdInput.value;

    let err = false;
    if (!title)   { dom.titleInput.classList.add('invalid');   err = true; }
    if (!dueDate) { dom.dueDateInput.classList.add('invalid'); err = true; }
    if (err) return;

    if (editId) {
      const t = tasks.find(x => x.id === editId);
      if (t) {
        Object.assign(t, { title, subject, dueDate, priority, status, description: desc, updatedAt: new Date().toISOString() });
        toast(`Updated "${title}"`, 'success');
      }
    } else {
      tasks.unshift({ id: `task-${Date.now()}`, title, subject, dueDate, priority, status, description: desc, createdAt: new Date().toISOString() });
      toast(`Added "${title}"`, 'success');
    }

    save(); render(); closeModal();
  }

  /* ─────────────────────────────────────────
     TOAST
  ──────────────────────────────────────────*/
  function toast(msg, type = 'info') {
    const icons = { success: 'fa-circle-check', info: 'fa-circle-info', warning: 'fa-triangle-exclamation', danger: 'fa-circle-exclamation' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info} toast-icon"></i><span>${esc(msg)}</span>`;
    dom.toastShelf.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  /* ─────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────*/
  function esc(s) {
    return String(s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ─────────────────────────────────────────
     BOOT
  ──────────────────────────────────────────*/
  document.addEventListener('DOMContentLoaded', init);
})();
