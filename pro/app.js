const materials = [
  { id: 1, title: 'Algorithms & Complexity Notes', subject: 'Data Structures', department: 'Computer Science', year: '2nd Year', type: 'PDF', uploadedBy: 'Maya Patel', date: 'Sep 04, 2026', downloads: 128, color: 'blue', description: 'A focused guide to asymptotic analysis, sorting, searching, and graph algorithms.' },
  { id: 2, title: 'SQL Query Patterns', subject: 'Database Management Systems', department: 'Computer Science', year: '2nd Year', type: 'DOCX', uploadedBy: 'Aiden Brooks', date: 'Sep 02, 2026', downloads: 96, color: 'teal', description: 'Practical examples for joins, aggregation, subqueries, and database normalization.' },
  { id: 3, title: 'Network Layers Cheat Sheet', subject: 'Computer Networks', department: 'Information Technology', year: '3rd Year', type: 'PDF', uploadedBy: 'Noah Williams', date: 'Aug 28, 2026', downloads: 84, color: 'orange', description: 'A compact visual reference for OSI, TCP/IP, routing, and common protocols.' },
  { id: 4, title: 'Python for Data Analysis', subject: 'Python', department: 'Computer Science', year: '1st Year', type: 'PDF', uploadedBy: 'Iris Chen', date: 'Aug 26, 2026', downloads: 151, color: 'purple', description: 'Exercises and patterns for working with Python collections, pandas, and visualizations.' },
  { id: 5, title: 'Operating Systems Review', subject: 'Operating Systems', department: 'Computer Engineering', year: '3rd Year', type: 'PPTX', uploadedBy: 'Leo Martin', date: 'Aug 20, 2026', downloads: 67, color: 'red', description: 'Revision slides covering processes, scheduling, memory, and file systems.' },
  { id: 6, title: 'Responsive Web Design Lab', subject: 'Web Development', department: 'Computer Science', year: '2nd Year', type: 'ZIP', uploadedBy: 'Sofia Rivera', date: 'Aug 18, 2026', downloads: 73, color: 'green', description: 'A hands-on lab pack for accessible layouts, responsive CSS, and modern UI patterns.' },
  { id: 7, title: 'Machine Learning Foundations', subject: 'Machine Learning', department: 'AI & DS', year: '4th Year', type: 'PDF', uploadedBy: 'Ethan Cole', date: 'Aug 12, 2026', downloads: 112, color: 'blue', description: 'Linear models, evaluation metrics, and the intuition behind supervised learning.' },
  { id: 8, title: 'Java OOP Patterns', subject: 'Java', department: 'Computer Engineering', year: '2nd Year', type: 'PDF', uploadedBy: 'Nora Singh', date: 'Aug 09, 2026', downloads: 54, color: 'orange', description: 'Clear examples of encapsulation, inheritance, interfaces, and common design patterns.' }
];

const SERVER_MODE = window.location.protocol !== 'file:';
let serverMaterials = null;
const apiFetch = (url, options = {}) => fetch(`/api${url}`, { credentials: 'same-origin', ...options });

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const readStorage = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
};
const escapeHTML = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const getCustomSubjects = () => readStorage('edubridge-custom-subjects', []);
const setCustomSubjects = (items) => localStorage.setItem('edubridge-custom-subjects', JSON.stringify(items));
const getCustomDepartments = () => readStorage('edubridge-custom-departments', []);
const setCustomDepartments = (items) => localStorage.setItem('edubridge-custom-departments', JSON.stringify(items));
const getUploadedMaterials = () => readStorage('edubridge-uploaded-materials', []);
const setUploadedMaterials = (items) => localStorage.setItem('edubridge-uploaded-materials', JSON.stringify(items));
const getUsers = () => readStorage('edubridge-users', []);
const setUsers = (users) => localStorage.setItem('edubridge-users', JSON.stringify(users));
const getCurrentUser = () => readStorage('edubridge-current-user', null);
const setCurrentUser = (user) => localStorage.setItem('edubridge-current-user', JSON.stringify(user));
const clearCurrentUser = () => localStorage.removeItem('edubridge-current-user');
const userStorageKey = (key) => `${key}-${getCurrentUser()?.id || 'guest'}`;
const getBookmarks = () => readStorage(userStorageKey('edubridge-bookmarks'), []);
const setBookmarks = (items) => localStorage.setItem(userStorageKey('edubridge-bookmarks'), JSON.stringify(items));
const getAllMaterials = () => serverMaterials || [...materials, ...getUploadedMaterials()];
const findMaterial = (id) => getAllMaterials().find((material) => String(material.id) === String(id));

const publicPages = new Set(['index.html', 'about.html', 'contact.html', 'login.html', 'register.html']);
const pageName = () => window.location.pathname.split('/').pop().toLowerCase() || 'index.html';
const isProtectedPage = () => !publicPages.has(pageName());
const isValidUser = (user) => Boolean(user?.id && user?.email && user?.name && getUsers().some((account) => account.id === user.id && account.email === user.email));
const hashPassword = async (password) => {
  if (window.crypto?.subtle) {
    const bytes = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return window.btoa(unescape(encodeURIComponent(password)));
};

function showToast(message, type = 'success') {
  const container = $('#toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${escapeHTML(message)}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>`;
  container.appendChild(toast);
  toast.querySelector('button').addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 3500);
}

function initShared() {
  $$('.password-toggle').forEach((button) => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.target);
    input.type = input.type === 'password' ? 'text' : 'password';
    button.innerHTML = input.type === 'password' ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
  }));
  $$('.bookmark-btn').forEach((button) => {
    const id = Number(button.dataset.id);
    const saved = getBookmarks().includes(id);
    button.classList.toggle('saved', saved);
    button.setAttribute('aria-pressed', saved);
    button.addEventListener('click', () => toggleBookmark(id, button));
  });
  $$('.demo-action').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.message || 'Action completed.')));
  $$('.download-action').forEach((button) => button.addEventListener('click', () => downloadMaterial(button.dataset.materialId)));
  $$('.logout-link').forEach((link) => link.addEventListener('click', async (event) => { event.preventDefault(); if (SERVER_MODE) await apiFetch('/auth/logout', { method: 'POST' }); clearCurrentUser(); window.location.href = 'index.html'; }));
  $$('.needs-validation').filter((form) => !form.querySelector('#currentPassword')).forEach((form) => form.addEventListener('submit', handleValidation));
}

function downloadMaterial(id) {
  const material = findMaterial(id);
  if (!material) return;
  if (SERVER_MODE) { window.location.href = `/api/materials/${encodeURIComponent(id)}/download`; return; }
  const content = `${material.title}\n\nSubject: ${material.subject}\nDepartment: ${material.department}\nYear: ${material.year}\nUploaded by: ${material.uploadedBy}\n\n${material.description}`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
  link.download = `${material.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')}.txt`;
  link.click();
  URL.revokeObjectURL(link.href);
  const uploaded = getUploadedMaterials();
  const stored = uploaded.find((item) => String(item.id) === String(id));
  if (stored) { stored.downloads = (stored.downloads || 0) + 1; setUploadedMaterials(uploaded); }
  showToast(`Downloaded ${material.title}.`);
}

async function initAuth() {
  if (SERVER_MODE) {
    const response = await apiFetch('/auth/me');
    const payload = await response.json();
    if (payload.user) setCurrentUser(payload.user); else clearCurrentUser();
    if (isProtectedPage() && !payload.user) {
      const next = `${pageName()}${window.location.search}`;
      window.location.href = `login.html?next=${encodeURIComponent(next)}`;
      return false;
    }
    if (pageName() === 'admin.html' && payload.user?.role !== 'admin') { window.location.href = 'dashboard.html'; return false; }
    if ((pageName() === 'login.html' || pageName() === 'register.html') && payload.user) { window.location.href = 'dashboard.html'; return false; }
    return true;
  }
  const currentUser = getCurrentUser();
  if (isProtectedPage() && !isValidUser(currentUser)) {
    const next = `${window.location.pathname.split('/').pop()}${window.location.search}`;
    clearCurrentUser();
    window.location.href = `login.html?next=${encodeURIComponent(next)}`;
    return false;
  }
  if ((pageName() === 'login.html' || pageName() === 'register.html') && isValidUser(currentUser)) {
    window.location.href = 'dashboard.html';
    return false;
  }
  if (pageName() === 'admin.html' && currentUser?.role !== 'admin') { window.location.href = 'dashboard.html'; return false; }
  return true;
}

async function initServerData() {
  if (!SERVER_MODE) return;
  const materialResponse = await apiFetch('/materials');
  if (materialResponse.ok) serverMaterials = (await materialResponse.json()).materials;
  if (getCurrentUser()) {
    const bookmarkResponse = await apiFetch('/bookmarks');
    if (bookmarkResponse.ok) setBookmarks((await bookmarkResponse.json()).materials.map((material) => material.id));
  }
}

async function initServerOptions() {
  if (!SERVER_MODE) return;
  const response = await apiFetch('/options');
  if (!response.ok) return;
  const options = await response.json();
  ['#subjectFilter', '#subject'].forEach((selector) => {
    const control = $(selector);
    options.subjects.forEach((subject) => { if (control && ![...control.options].some((option) => option.value === subject.name)) control.add(new Option(subject.name, subject.name)); });
  });
  ['#departmentFilter', '#uploadDepartment', '#department'].forEach((selector) => {
    const control = $(selector);
    options.departments.forEach((department) => { if (control && ![...control.options].some((option) => option.value === department.name)) control.add(new Option(department.name, department.name)); });
  });
}

function completeAuth(user, form, message) {
  setCurrentUser({ id: user.id, name: user.name, email: user.email, department: user.department, year: user.year, role: user.role || 'user' });
  showToast(message);
  window.setTimeout(() => {
    const next = new URLSearchParams(window.location.search).get('next');
    window.location.href = next ? next : 'dashboard.html';
  }, 500);
}

async function handleLogin(form) {
  const email = $('#email')?.value.trim().toLowerCase();
  const password = $('#password')?.value || '';
  if (SERVER_MODE) {
    const response = await apiFetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const payload = await response.json();
    if (!response.ok) { showToast(payload.error || 'Incorrect email or password.', 'danger'); return; }
    completeAuth(payload.user, form, `Welcome back, ${payload.user.name}.`);
    return;
  }
  const users = getUsers();
  const user = users.find((item) => item.email === email);
  const passwordHash = await hashPassword(password);
  const validPassword = user && (user.passwordHash === passwordHash || user.password === password);
  if (user?.password && validPassword) {
    user.passwordHash = passwordHash;
    delete user.password;
    setUsers(users);
  }
  if (!user || !validPassword) { showToast('Incorrect email or password.', 'danger'); return; }
  completeAuth(user, form, `Welcome back, ${user.name}.`);
}

async function handleRegistration(form) {
  const name = $('#fullName').value.trim();
  const email = $('#regEmail').value.trim().toLowerCase();
  const password = $('#regPassword').value;
  const confirmation = $('#confirmPassword').value;
  if (password !== confirmation) { $('#confirmPassword').setCustomValidity('Passwords do not match.'); form.classList.add('was-validated'); showToast('Passwords do not match.', 'danger'); return; }
  $('#confirmPassword').setCustomValidity('');
  if (SERVER_MODE) {
    const response = await apiFetch('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password, department: $('#department').value, year: $('#year').value }) });
    const payload = await response.json();
    if (!response.ok) { showToast(payload.error || 'Unable to create account.', 'danger'); return; }
    completeAuth(payload.user, form, 'Account created. Welcome to EduBridge.');
    return;
  }
  const users = getUsers();
  if (users.some((user) => user.email === email)) { showToast('An account with this email already exists.', 'danger'); return; }
  const user = { id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name, email, passwordHash: await hashPassword(password), department: $('#department').value, year: $('#year').value };
  users.push(user);
  setUsers(users);
  completeAuth(user, form, 'Account created. Welcome to EduBridge.');
}

async function toggleBookmark(id, button) {
  if (!getCurrentUser()) { showToast('Log in to save bookmarks.', 'warning'); return; }
  if (SERVER_MODE) {
    const saved = button.classList.contains('saved');
    const response = await apiFetch(`/bookmarks/${encodeURIComponent(id)}`, { method: saved ? 'DELETE' : 'POST' });
    if (!response.ok) { showToast('Unable to update bookmark.', 'danger'); return; }
    button.classList.toggle('saved', !saved); button.setAttribute('aria-pressed', !saved); button.innerHTML = !saved ? '<i class="fa-solid fa-bookmark"></i>' : '<i class="fa-regular fa-bookmark"></i>';
    showToast(!saved ? 'Saved to your bookmarks.' : 'Removed from your bookmarks.', 'dark');
    return;
  }
  const bookmarks = getBookmarks();
  const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
  setBookmarks(next);
  button.classList.toggle('saved', next.includes(id));
  button.setAttribute('aria-pressed', next.includes(id));
  button.innerHTML = next.includes(id) ? '<i class="fa-solid fa-bookmark"></i>' : '<i class="fa-regular fa-bookmark"></i>';
  showToast(next.includes(id) ? 'Saved to your bookmarks.' : 'Removed from bookmarks.', 'dark');
}

function handleValidation(event) {
  const form = event.currentTarget;
  if (!form.checkValidity()) { event.preventDefault(); event.stopPropagation(); }
  form.classList.add('was-validated');
  if (form.checkValidity() && form.dataset.demo !== undefined) {
    event.preventDefault();
    if (document.title.startsWith('Log in')) { handleLogin(form); return; }
    if (document.title.startsWith('Register')) { handleRegistration(form); return; }
    const selectedSubject = $('#subject');
    const customSubject = $('#otherSubject');
    if (selectedSubject?.value === 'Other' && customSubject?.value.trim()) rememberCustomSubject(customSubject.value.trim());
    const selectedDepartment = $('#uploadDepartment') || $('#department');
    const customDepartment = $('#otherDepartment');
    if (selectedDepartment?.value === 'Other' && customDepartment?.value.trim()) rememberCustomDepartment(customDepartment.value.trim());
    if (document.body.classList.contains('login-page')) {
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.classList.add('login-submitting');
      submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Signing you in...';
      window.setTimeout(() => {
        form.classList.add('login-success');
        showToast(form.dataset.success || 'Your request was submitted.');
        form.reset();
        form.classList.remove('was-validated');
        submitButton.disabled = false;
        submitButton.classList.remove('login-submitting');
        submitButton.innerHTML = 'Log in <i class="fa-solid fa-arrow-right ms-2"></i>';
        window.setTimeout(() => form.classList.remove('login-success'), 650);
      }, 700);
      return;
    }
    showToast(form.dataset.success || 'Your request was submitted.'); form.reset(); form.classList.remove('was-validated');
  }
}

function rememberCustomSubject(subjectName) {
  const subjects = getCustomSubjects();
  if (!subjects.some((subject) => subject.toLowerCase() === subjectName.toLowerCase())) {
    subjects.push(subjectName);
    setCustomSubjects(subjects);
  }
  addSubjectOption(subjectName);
}

function addSubjectOption(subjectName) {
  ['#subjectFilter', '#subject'].forEach((selector) => {
    const control = $(selector);
    if (!control || [...control.options].some((option) => option.value === subjectName)) return;
    const otherOption = [...control.options].find((option) => option.value === 'Other');
    control.insertBefore(new Option(subjectName, subjectName), otherOption || null);
  });
}

function getAssistantReply(message) {
  const prompt = message.toLowerCase();
  if (prompt.includes('algorithm') || prompt.includes('data structure')) return 'Try this order: review Big-O notation, compare arrays with linked lists, then practice one sorting and one graph problem. I found “Algorithms & Complexity Notes” in the study library for a focused refresher.';
  if (prompt.includes('python')) return 'For Python revision, start with collections and functions, then move into pandas only after the basics feel comfortable. The “Python for Data Analysis” guide is a good next resource.';
  if (prompt.includes('database') || prompt.includes('sql')) return 'A useful SQL practice loop is: write the query, check the join relationship, then validate the result with a small example. Pay special attention to GROUP BY and NULL values.';
  if (prompt.includes('network')) return 'For networking, map each protocol to its layer and purpose first. Then use the “Network Layers Cheat Sheet” to test yourself without looking at the answers.';
  if (prompt.includes('study plan') || prompt.includes('schedule')) return 'A simple plan: choose one concept, study for 25 minutes, solve two practice questions, and write a three-line summary. Repeat this for two focused blocks today.';
  if (prompt.includes('notebooklm')) return 'NotebookLM is useful for studying from your own sources. Open it, add your class notes or PDFs, then ask questions grounded in those materials.';
  return 'I can help you break down a topic, find a relevant material, or make a short study plan. Try asking about algorithms, Python, SQL, networking, or revision scheduling.';
}

function addAssistantMessage(text, role = 'assistant') {
  const messages = $('#assistantMessages');
  if (!messages) return;
  const message = document.createElement('div');
  message.className = `assistant-message ${role}`;
  message.textContent = text;
  messages.appendChild(message);
  messages.scrollTop = messages.scrollHeight;
}

function initAssistant() {
  if ($('#assistantLauncher')) return;
  document.body.insertAdjacentHTML('beforeend', `<button id="assistantLauncher" class="assistant-launcher" type="button" aria-label="Open EduBridge AI study assistant" aria-expanded="false"><i class="fa-solid fa-sparkles"></i><span>Ask AI</span></button><section id="assistantPanel" class="assistant-panel" aria-label="EduBridge AI study assistant" aria-hidden="true"><div class="assistant-header"><div class="d-flex align-items-center gap-2"><div class="assistant-avatar"><i class="fa-solid fa-sparkles"></i></div><div><h2 class="h6 mb-0">StudyMate AI</h2><small>EduBridge study assistant</small></div></div><button id="assistantClose" class="assistant-close" type="button" aria-label="Close AI assistant"><i class="fa-solid fa-xmark"></i></button></div><div id="assistantMessages" class="assistant-messages"><div class="assistant-message assistant">Hi Alex, I can help you find a material, explain a topic, or make a quick study plan.</div></div><div class="assistant-prompts"><button type="button" data-prompt="Make me a study plan for today">Study plan</button><button type="button" data-prompt="Help me revise algorithms">Revise algorithms</button><button type="button" data-prompt="Find a Python resource">Python help</button><a class="assistant-notebook" href="https://notebooklm.google.com/" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-book-open" aria-hidden="true"></i> NotebookLM</a></div><form id="assistantForm" class="assistant-form"><label class="visually-hidden" for="assistantInput">Ask StudyMate AI</label><input id="assistantInput" type="text" autocomplete="off" placeholder="Ask a study question..."><button type="submit" aria-label="Send message"><i class="fa-solid fa-arrow-up"></i></button></form><div class="assistant-note">Frontend demo · Connect an AI API to enable live answers.</div></section>`);
  const launcher = $('#assistantLauncher'), panel = $('#assistantPanel'), input = $('#assistantInput'), form = $('#assistantForm');
  const toggle = (open) => { panel.classList.toggle('open', open); panel.setAttribute('aria-hidden', !open); launcher.setAttribute('aria-expanded', open); if (open) input.focus(); };
  launcher.addEventListener('click', () => toggle(!panel.classList.contains('open')));
  $('#assistantClose').addEventListener('click', () => toggle(false));
  $$('.assistant-prompts button').forEach((button) => button.addEventListener('click', () => { input.value = button.dataset.prompt; form.requestSubmit(); }));
  form.addEventListener('submit', (event) => { event.preventDefault(); const message = input.value.trim(); if (!message) return; addAssistantMessage(message, 'user'); input.value = ''; window.setTimeout(() => addAssistantMessage(getAssistantReply(message)), 350); });
}

function materialCard(material, compact = false) {
  const saved = getBookmarks().includes(material.id);
  const title = escapeHTML(material.title);
  const subject = escapeHTML(material.subject);
  const description = escapeHTML(material.description);
  const uploadedBy = escapeHTML(material.uploadedBy);
  const type = escapeHTML(material.type);
  return `<article class="material-card surface d-flex flex-column ${compact ? 'p-3' : ''}">
    <div class="d-flex justify-content-between align-items-start gap-2 mb-3"><div class="file-icon"><i class="fa-regular fa-file-lines"></i></div><button class="bookmark-btn icon-btn ${saved ? 'saved' : ''}" data-id="${material.id}" aria-label="${saved ? 'Remove bookmark' : 'Bookmark'}" aria-pressed="${saved}"><i class="${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i></button></div>
    <div class="small fw-bold text-primary mb-2">${subject}</div><h3 class="h6 mb-2">${title}</h3><p class="small text-muted mb-3 flex-grow-1">${description}</p>
    <div class="d-flex justify-content-between small text-muted mb-3"><span><i class="fa-regular fa-user me-1"></i>${uploadedBy}</span><span>${type}</span></div>
    <div class="d-flex gap-2"><a class="btn btn-sm btn-primary flex-grow-1" href="detail.html?id=${encodeURIComponent(material.id)}">View</a><button class="btn btn-sm btn-light download-action" data-material-id="${material.id}" aria-label="Download ${title}"><i class="fa-solid fa-download"></i></button></div>
  </article>`;
}

function renderMaterials(list, target = '#materialGrid') {
  const grid = $(target); if (!grid) return;
  grid.innerHTML = list.length ? list.map((item) => materialCard(item)).join('') : '<div class="col-12"><div class="empty-state surface"><i class="fa-solid fa-folder-open fa-2x text-muted mb-3"></i><h3 class="h5">No materials found</h3><p class="text-muted">Try adjusting your search or filters.</p></div></div>';
  initShared();
}

function initMaterialFilters() {
  const grid = $('#materialGrid'); if (!grid) return;
  if (!$('#typeFilter')) {
    const sortControl = $('#sortMaterials');
    const typeWrapper = document.createElement('div');
    typeWrapper.className = 'col-sm-6 col-lg-2';
    typeWrapper.innerHTML = '<select id="typeFilter" class="form-select" aria-label="Filter by material type"><option value="">All types</option><option>PDF</option><option>DOCX</option><option>PPTX</option><option>ZIP</option></select>';
    sortControl?.parentElement.before(typeWrapper);
  }
  const search = $('#materialSearch'), subject = $('#subjectFilter'), department = $('#departmentFilter'), year = $('#yearFilter'), type = $('#typeFilter'), sort = $('#sortMaterials');
  const apply = () => { let list = getAllMaterials().filter((item) => `${item.title} ${item.subject} ${item.uploadedBy}`.toLowerCase().includes(search.value.toLowerCase()) && (!subject.value || item.subject === subject.value) && (!department.value || item.department === department.value) && (!year.value || item.year === year.value) && (!type.value || item.type === type.value)); if (sort.value === 'popular') list.sort((a,b) => b.downloads - a.downloads); if (sort.value === 'recent') list.sort((a,b) => b.id - a.id); renderMaterials(list); $('#resultCount').textContent = `${list.length} materials`; };
  [search, subject, department, year, type, sort].forEach((control) => control?.addEventListener('input', apply)); apply();
}

function initUpload() {
  const input = $('#fileInput'), zone = $('#dropZone'), name = $('#selectedFile'); if (!input || !zone) return;
  input.required = true;
  const update = (file) => { if (!file) return; if (file.size > 10 * 1024 * 1024) { showToast('Please choose a file under 10 MB.', 'danger'); return; } name.textContent = file.name; zone.classList.add('border-primary'); };
  input.addEventListener('change', () => update(input.files[0]));
  ['dragenter','dragover'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.remove('dragover'); }));
  zone.addEventListener('drop', (e) => update(e.dataTransfer.files[0]));
  const form = zone.closest('form');
  if (SERVER_MODE) {
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.checkValidity() || !input.files[0]) { form.classList.add('was-validated'); showToast('Complete the form and choose a file.', 'danger'); return; }
      const data = new FormData();
      data.append('title', $('#title').value.trim());
      data.append('subject', $('#subject').value === 'Other' ? $('#otherSubject').value.trim() : $('#subject').value);
      data.append('department', $('#uploadDepartment').value === 'Other' ? $('#otherDepartment').value.trim() : $('#uploadDepartment').value);
      data.append('year', $('#uploadYear').value);
      data.append('description', $('#description').value.trim());
      data.append('file', input.files[0]);
      const response = await apiFetch('/materials', { method: 'POST', body: data });
      const payload = await response.json();
      if (!response.ok) { showToast(payload.error || 'Upload failed.', 'danger'); return; }
      showToast('Material uploaded successfully.');
      window.setTimeout(() => { window.location.href = 'my-materials.html'; }, 500);
    }, true);
    return;
  }
  form?.addEventListener('submit', () => {
    if (!form.checkValidity()) return;
    const subject = $('#subject')?.value;
    const customSubject = $('#otherSubject')?.value.trim();
    const department = $('#uploadDepartment')?.value;
    const customDepartment = $('#otherDepartment')?.value.trim();
    const uploadedMaterial = {
      id: Date.now(),
      title: $('#title').value.trim(),
      subject: subject === 'Other' ? customSubject : subject,
      department: department === 'Other' ? customDepartment : department,
      year: $('#uploadYear').value,
      type: input.files[0]?.name.split('.').pop().toUpperCase() || 'PDF',
      uploadedBy: getCurrentUser()?.name || 'Alex Sharma',
      date: 'Today',
      downloads: 0,
      description: $('#description').value.trim()
    };
    const uploaded = getUploadedMaterials();
    uploaded.unshift(uploadedMaterial);
    setUploadedMaterials(uploaded);
  }, true);
}

function initBookmarks() {
  const grid = $('#bookmarkGrid'), search = $('#bookmarkSearch');
  if (!grid) return;
  const render = () => {
    const query = search?.value.toLowerCase() || '';
    const saved = getAllMaterials().filter((material) => getBookmarks().includes(material.id) && `${material.title} ${material.subject} ${material.uploadedBy}`.toLowerCase().includes(query));
    grid.innerHTML = saved.length
      ? saved.map((material) => `<div class="col-md-6 col-xl-4">${materialCard(material)}</div>`).join('')
      : '<div class="col-12"><div class="empty-state surface"><i class="fa-solid fa-bookmark fa-2x text-muted mb-3"></i><h2 class="h5">No saved materials</h2><p class="text-muted mb-0">Bookmark a material to see it here.</p></div></div>';
    initShared();
    $$('.bookmark-btn', grid).forEach((button) => button.addEventListener('click', render));
  };
  search?.addEventListener('input', render);
  render();
}

function initMyMaterials() {
  const body = $('#myMaterialsBody'), search = $('#myMaterialSearch'), status = $('#materialStatus');
  if (!body) return;
  const currentUser = getCurrentUser();
  const render = () => {
    const query = search?.value.toLowerCase() || '';
    const selectedStatus = status?.value || 'All statuses';
    const uploadedSource = SERVER_MODE ? getAllMaterials().filter((material) => material.owner) : getUploadedMaterials().filter((material) => material.uploadedBy === currentUser?.name);
    const uploaded = uploadedSource.filter((material) => {
      const matchesSearch = `${material.title} ${material.subject}`.toLowerCase().includes(query);
      const materialStatus = material.status || 'Published';
      return matchesSearch && (selectedStatus === 'All statuses' || materialStatus === selectedStatus);
    });
    body.innerHTML = uploaded.length ? uploaded.map((material) => {
      const title = escapeHTML(material.title);
      const subject = escapeHTML(material.subject);
      const date = escapeHTML(material.date);
      const materialStatus = escapeHTML(material.status || 'Published');
      return `<tr><td class="ps-4"><div class="d-flex gap-3 align-items-center"><div class="file-icon"><i class="fa-regular fa-file-lines" aria-hidden="true"></i></div><div><div class="fw-bold small">${title}</div><small class="text-muted">${subject} · ${date}</small></div></div></td><td><span class="badge text-bg-${materialStatus === 'Published' ? 'success' : 'warning'}">${materialStatus}</span></td><td>${material.views || 0}</td><td>${material.downloads || 0}</td><td class="text-end pe-4"><a href="detail.html?id=${encodeURIComponent(material.id)}" class="btn btn-sm btn-light" aria-label="View ${title}"><i class="fa-regular fa-eye" aria-hidden="true"></i></a></td></tr>`;
    }).join('') : '<tr><td colspan="5" class="text-center text-muted py-5">You have not uploaded any materials yet.</td></tr>';
  };
  [search, status].forEach((control) => control?.addEventListener('input', render));
  render();
}

function initDetail() {
  if (!$('#detailTitle')) return;
  const id = new URLSearchParams(window.location.search).get('id');
  const material = findMaterial(id);
  if (!material) {
    $('#detailTitle').textContent = 'Material not found';
    $('#detailDescription').textContent = 'This material may have been removed or the link is invalid.';
    $('#detailActions')?.classList.add('d-none');
    return;
  }
  $('#detailSubject').textContent = material.subject;
  $('#detailTitle').textContent = material.title;
  $('#detailMeta').textContent = `Uploaded by ${material.uploadedBy} · ${material.date}`;
  $('#detailDescription').textContent = material.description;
  $('#detailType').textContent = material.type;
  $('#detailCourse').textContent = material.subject;
  $('#detailDownloads').textContent = material.downloads;
  $('#detailDepartment').textContent = material.department;
  const download = $('#detailDownload');
  if (download) { download.dataset.materialId = material.id; download.classList.add('download-action'); download.classList.remove('demo-action'); }
  const bookmark = $('#detailBookmark');
  if (bookmark) {
    bookmark.dataset.id = material.id;
    bookmark.setAttribute('aria-label', `Bookmark ${material.title}`);
  }
  document.title = `${material.title} | EduBridge`;
}

function initProfile() {
  if (!$('#profileName')) return;
  const user = getCurrentUser();
  const account = getUsers().find((item) => item.id === user?.id);
  if (!user) return;
  $('#profileName').value = user.name;
  $('#profileEmail').value = user.email;
  $('#profileDepartment').value = user.department;
  $('#profileYear').value = user.year;
  const saveButton = document.querySelector('[data-message="Profile changes saved."]');
  saveButton?.addEventListener('click', async () => {
    const updated = { ...user, name: $('#profileName').value.trim(), email: $('#profileEmail').value.trim().toLowerCase(), department: $('#profileDepartment').value.trim(), year: $('#profileYear').value.trim() };
    if (SERVER_MODE) {
      const response = await apiFetch('/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      const payload = await response.json();
      if (!response.ok) { showToast(payload.error || 'Profile update failed.', 'danger'); return; }
      setCurrentUser(payload.user); showToast('Profile changes saved.'); return;
    }
    const users = getUsers().map((item) => item.id === user.id ? { ...item, ...updated } : item);
    setUsers(users); setCurrentUser(updated); showToast('Profile changes saved.');
  });
  const passwordForm = $('#currentPassword')?.closest('form');
  passwordForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const currentPassword = $('#currentPassword').value;
    const newPassword = $('#newPassword').value;
    const confirmation = $('#confirmNewPassword').value;
    if (SERVER_MODE) {
      const response = await apiFetch('/profile/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword, confirmPassword: confirmation }) });
      const payload = response.status === 204 ? null : await response.json();
      if (!response.ok) { showToast(payload?.error || 'Password update failed.', 'danger'); return; }
      passwordForm.reset(); showToast('Password updated successfully.'); return;
    }
    if (await hashPassword(currentPassword) !== account?.passwordHash) { showToast('Current password is incorrect.', 'danger'); return; }
    if (newPassword.length < 6 || newPassword !== confirmation) { showToast('Use at least 6 characters and confirm the new password.', 'danger'); return; }
    const newPasswordHash = await hashPassword(newPassword);
    setUsers(getUsers().map((item) => item.id === user.id ? { ...item, passwordHash: newPasswordHash } : item));
    passwordForm.reset();
    showToast('Password updated successfully.');
  });
}

function initUserIdentity() {
  const user = getCurrentUser();
  if (!user) return;
  const initials = user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  if (user.role === 'admin' && $('.sidebar') && !$('.admin-link')) $('.sidebar').insertAdjacentHTML('afterbegin', '<a class="sidebar-link admin-link active" href="admin.html"><i class="fa-solid fa-shield-halved"></i><span>Admin center</span></a>');
  const dashboardHeading = document.querySelector('.app-topbar h1');
  if (document.title.startsWith('Dashboard') && dashboardHeading) dashboardHeading.firstChild.textContent = `Good morning, ${user.name}`;
  const dashboardAvatar = $('#dashboardTopProfile');
  if (dashboardAvatar) { dashboardAvatar.textContent = initials; dashboardAvatar.setAttribute('aria-label', `Open ${user.name} profile`); }
  $$('.app-main .avatar').forEach((avatar) => { if (avatar.textContent.trim() === 'AS') avatar.textContent = initials; });
  $$('div, small').forEach((element) => {
    if (element.children.length === 0 && element.textContent.trim() === 'Alex Sharma') element.textContent = user.name;
    if (element.children.length === 0 && element.textContent.trim() === 'Computer Science · Year 2') element.textContent = `${user.department} · Year ${user.year.charAt(0)}`;
  });
  if ($('#profileName')) {
    const profileCardName = $('#profileName').closest('.col-lg-8')?.previousElementSibling?.querySelector('h2');
    const profileCardEmail = profileCardName?.nextElementSibling;
    if (profileCardName) profileCardName.textContent = user.name;
    if (profileCardEmail) profileCardEmail.textContent = user.email;
  }
}

async function initAdmin() {
  if (pageName() !== 'admin.html' || !SERVER_MODE) return;
  const subjectList = $('#subjectList');
  const materialList = $('#adminMaterialList');
  const departmentList = $('#departmentList');
  const userList = $('#adminUserList');
  const renderSubjects = async () => {
    const response = await apiFetch('/admin/subjects');
    if (!response.ok) return;
    const subjects = (await response.json()).subjects;
    subjectList.innerHTML = subjects.map((subject) => `<div class="d-flex align-items-center justify-content-between gap-2 border rounded p-2"><span>${escapeHTML(subject.name)}</span><span class="d-flex gap-1"><button class="btn btn-sm btn-light subject-edit" data-id="${subject.id}" data-name="${escapeHTML(subject.name)}" aria-label="Edit ${escapeHTML(subject.name)}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light text-danger subject-delete" data-id="${subject.id}" aria-label="Delete ${escapeHTML(subject.name)}"><i class="fa-solid fa-trash"></i></button></span></div>`).join('');
    $$('.subject-edit', subjectList).forEach((button) => button.addEventListener('click', async () => { const name = window.prompt('Subject name', button.dataset.name); if (!name?.trim()) return; const result = await apiFetch(`/admin/subjects/${button.dataset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) }); if (!result.ok) { showToast((await result.json()).error || 'Unable to update subject.', 'danger'); return; } renderSubjects(); showToast('Subject updated.'); }));
    $$('.subject-delete', subjectList).forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Delete this subject?')) return; const result = await apiFetch(`/admin/subjects/${button.dataset.id}`, { method: 'DELETE' }); if (!result.ok) { showToast('Unable to delete subject.', 'danger'); return; } renderSubjects(); showToast('Subject deleted.'); }));
  };
  const renderDepartments = async () => {
    const response = await apiFetch('/admin/departments');
    if (!response.ok) return;
    const departments = (await response.json()).departments;
    departmentList.innerHTML = departments.map((department) => `<div class="d-flex align-items-center justify-content-between gap-2 border rounded p-2"><span>${escapeHTML(department.name)}</span><span class="d-flex gap-1"><button class="btn btn-sm btn-light department-edit" data-id="${department.id}" data-name="${escapeHTML(department.name)}" aria-label="Edit ${escapeHTML(department.name)}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light text-danger department-delete" data-id="${department.id}" aria-label="Delete ${escapeHTML(department.name)}"><i class="fa-solid fa-trash"></i></button></span></div>`).join('');
    $$('.department-edit', departmentList).forEach((button) => button.addEventListener('click', async () => { const name = window.prompt('Department name', button.dataset.name); if (!name?.trim()) return; const result = await apiFetch(`/admin/departments/${button.dataset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) }); if (!result.ok) { showToast('Unable to update department.', 'danger'); return; } renderDepartments(); showToast('Department updated.'); }));
    $$('.department-delete', departmentList).forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Delete this department?')) return; const result = await apiFetch(`/admin/departments/${button.dataset.id}`, { method: 'DELETE' }); if (!result.ok) { showToast('Unable to delete department.', 'danger'); return; } renderDepartments(); showToast('Department deleted.'); }));
  };
  const renderUsers = async () => {
    const response = await apiFetch('/admin/users');
    if (!response.ok) return;
    const users = (await response.json()).users;
    $('#adminUserCount').textContent = `${users.length} accounts`;
    userList.innerHTML = users.map((user) => `<div class="d-flex align-items-center justify-content-between gap-3 border rounded p-2"><div class="min-w-0"><div class="fw-bold text-truncate">${escapeHTML(user.name)} <span class="badge ${user.role === 'admin' ? 'text-bg-primary' : 'text-bg-light'}">${escapeHTML(user.role)}</span></div><small class="text-muted">${escapeHTML(user.email)} · ${escapeHTML(user.department)} · ${escapeHTML(user.year)}</small></div><span class="d-flex gap-1 flex-shrink-0"><button class="btn btn-sm btn-light user-edit" data-id="${user.id}" aria-label="Edit ${escapeHTML(user.name)}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light text-danger user-delete" data-id="${user.id}" aria-label="Delete ${escapeHTML(user.name)}"><i class="fa-solid fa-trash"></i></button></span></div>`).join('');
    $$('.user-edit', userList).forEach((button) => button.addEventListener('click', async () => { const user = users.find((item) => item.id === button.dataset.id); const name = window.prompt('User name', user.name); if (!name?.trim()) return; const role = window.prompt('Role: user or admin', user.role); if (!['user', 'admin'].includes(role)) return; const result = await apiFetch(`/admin/users/${user.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim(), email: user.email, department: user.department, year: user.year, role }) }); if (!result.ok) { showToast((await result.json()).error || 'Unable to update user.', 'danger'); return; } renderUsers(); showToast('User updated.'); }));
    $$('.user-delete', userList).forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Delete this user and their account?')) return; const result = await apiFetch(`/admin/users/${button.dataset.id}`, { method: 'DELETE' }); if (!result.ok) { showToast((await result.json()).error || 'Unable to delete user.', 'danger'); return; } renderUsers(); showToast('User deleted.'); }));
  };
  const renderMaterials = async () => {
    const response = await apiFetch('/admin/materials');
    if (!response.ok) return;
    const materials = (await response.json()).materials;
    $('#adminMaterialCount').textContent = `${materials.length} materials`;
    materialList.innerHTML = materials.map((material) => `<div class="d-flex align-items-center justify-content-between gap-3 border rounded p-2"><div class="min-w-0"><div class="fw-bold text-truncate">${escapeHTML(material.title)}</div><small class="text-muted">${escapeHTML(material.subject)} · ${escapeHTML(material.uploaded_by_name)}</small></div><span class="d-flex gap-1 flex-shrink-0"><button class="btn btn-sm btn-light material-edit" data-id="${material.id}" aria-label="Edit ${escapeHTML(material.title)}"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light text-danger material-delete" data-id="${material.id}" aria-label="Delete ${escapeHTML(material.title)}"><i class="fa-solid fa-trash"></i></button></span></div>`).join('');
    $$('.material-edit', materialList).forEach((button) => button.addEventListener('click', async () => { const material = materials.find((item) => item.id === Number(button.dataset.id)); const title = window.prompt('Material title', material.title); if (!title?.trim()) return; const description = window.prompt('Description', material.description); if (!description?.trim()) return; const result = await apiFetch(`/admin/materials/${material.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title.trim(), subject: material.subject, department: material.department, year: material.year, description: description.trim() }) }); if (!result.ok) { showToast('Unable to update material.', 'danger'); return; } renderMaterials(); showToast('Material updated.'); }));
    $$('.material-delete', materialList).forEach((button) => button.addEventListener('click', async () => { if (!window.confirm('Delete this material and its file?')) return; const result = await apiFetch(`/admin/materials/${button.dataset.id}`, { method: 'DELETE' }); if (!result.ok) { showToast('Unable to delete material.', 'danger'); return; } renderMaterials(); showToast('Material deleted.'); }));
  };
  $('#subjectForm')?.addEventListener('submit', async (event) => { event.preventDefault(); const name = $('#newSubject').value.trim(); const response = await apiFetch('/admin/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); const payload = response.status === 201 ? null : await response.json(); if (!response.ok) { showToast(payload?.error || 'Unable to add subject.', 'danger'); return; } $('#newSubject').value = ''; renderSubjects(); showToast('Subject added.'); });
  $('#departmentForm')?.addEventListener('submit', async (event) => { event.preventDefault(); const name = $('#newDepartment').value.trim(); const response = await apiFetch('/admin/departments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }); const payload = response.status === 201 ? null : await response.json(); if (!response.ok) { showToast(payload?.error || 'Unable to add department.', 'danger'); return; } $('#newDepartment').value = ''; renderDepartments(); showToast('Department added.'); });
  renderSubjects(); renderDepartments(); renderMaterials(); renderUsers();
}

function initOtherSubjectOption() {
  ['#subjectFilter', '#subject'].forEach((selector) => {
    const control = $(selector);
    if (!control || [...control.options].some((option) => option.value === 'Other')) return;
    control.add(new Option('Other', 'Other'));
  });
  const subject = $('#subject');
  getCustomSubjects().forEach(addSubjectOption);
  if (!subject || $('#otherSubjectField')) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'otherSubjectField';
  wrapper.className = 'mt-3 d-none';
  wrapper.innerHTML = '<label class="form-label" for="otherSubject">Add your subject</label><input class="form-control" id="otherSubject" placeholder="e.g. Human Computer Interaction"><div class="invalid-feedback">Please enter your subject name.</div>';
  subject.closest('.col-md-6')?.appendChild(wrapper);
  const customInput = $('#otherSubject');
  const updateCustomSubject = () => {
    const isOther = subject.value === 'Other';
    wrapper.classList.toggle('d-none', !isOther);
    customInput.required = isOther;
    if (!isOther) customInput.value = '';
  };
  subject.addEventListener('change', updateCustomSubject);
  subject.form?.addEventListener('submit', () => {
    if (subject.value === 'Other' && customInput.value.trim() && subject.form.checkValidity()) rememberCustomSubject(customInput.value.trim());
  });
}

function initDepartmentOptions() {
  const departments = ['Electrical Engineering', 'Electrical and Electronics Engineering', 'Electronics and Communication Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Biomedical Engineering', 'AI & DS', 'Other'];
  ['#departmentFilter', '#uploadDepartment', '#department'].forEach((selector) => {
    const control = $(selector);
    if (!control) return;
    const legacyOption = [...control.options].find((option) => option.value === 'Data Science' || option.textContent.trim() === 'Data Science');
    if (legacyOption) { legacyOption.value = 'AI & DS'; legacyOption.textContent = 'AI & DS'; }
    departments.forEach((department) => {
      if (![...control.options].some((option) => option.value === department)) control.add(new Option(department, department));
    });
  });
  getCustomDepartments().forEach(addDepartmentOption);
  ['#uploadDepartment', '#department'].forEach((selector) => {
    const control = $(selector);
    if (!control || $('#otherDepartmentField')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'otherDepartmentField';
    wrapper.className = 'mt-3 d-none';
    wrapper.innerHTML = '<label class="form-label" for="otherDepartment">Add your department</label><input class="form-control" id="otherDepartment" placeholder="e.g. Architecture"><div class="invalid-feedback">Please enter your department name.</div>';
    control.closest('.col-md-6')?.appendChild(wrapper);
    const customInput = $('#otherDepartment');
    const updateCustomDepartment = () => {
      const isOther = control.value === 'Other';
      wrapper.classList.toggle('d-none', !isOther);
      customInput.required = isOther;
      if (!isOther) customInput.value = '';
    };
    control.addEventListener('change', updateCustomDepartment);
    control.form?.addEventListener('submit', () => {
      if (control.value === 'Other' && customInput.value.trim() && control.form.checkValidity()) rememberCustomDepartment(customInput.value.trim());
    });
  });
}

function addDepartmentOption(departmentName) {
  ['#departmentFilter', '#uploadDepartment', '#department'].forEach((selector) => {
    const control = $(selector);
    if (!control || [...control.options].some((option) => option.value === departmentName)) return;
    const otherOption = [...control.options].find((option) => option.value === 'Other');
    control.insertBefore(new Option(departmentName, departmentName), otherOption || null);
  });
}

function rememberCustomDepartment(departmentName) {
  const departments = getCustomDepartments();
  if (!departments.some((department) => department.toLowerCase() === departmentName.toLowerCase())) {
    departments.push(departmentName);
    setCustomDepartments(departments);
  }
  addDepartmentOption(departmentName);
}

document.addEventListener('DOMContentLoaded', async () => { if (!(await initAuth())) return; await initServerData(); await initServerOptions(); if (document.title.startsWith('Log in')) document.body.classList.add('login-page'); initOtherSubjectOption(); initDepartmentOptions(); initDetail(); initShared(); initMaterialFilters(); initUpload(); initBookmarks(); initMyMaterials(); initProfile(); initUserIdentity(); await initAdmin(); initAssistant(); });
