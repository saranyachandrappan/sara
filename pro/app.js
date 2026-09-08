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

const $ = (selector, context = document) => context.querySelector(selector);
const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
const getBookmarks = () => JSON.parse(localStorage.getItem('edubridge-bookmarks') || '[]');
const setBookmarks = (items) => localStorage.setItem('edubridge-bookmarks', JSON.stringify(items));
const getCustomSubjects = () => JSON.parse(localStorage.getItem('edubridge-custom-subjects') || '[]');
const setCustomSubjects = (items) => localStorage.setItem('edubridge-custom-subjects', JSON.stringify(items));
const getCustomDepartments = () => JSON.parse(localStorage.getItem('edubridge-custom-departments') || '[]');
const setCustomDepartments = (items) => localStorage.setItem('edubridge-custom-departments', JSON.stringify(items));
const getUploadedMaterials = () => JSON.parse(localStorage.getItem('edubridge-uploaded-materials') || '[]');
const setUploadedMaterials = (items) => localStorage.setItem('edubridge-uploaded-materials', JSON.stringify(items));
const getAllMaterials = () => [...materials, ...getUploadedMaterials()];
const findMaterial = (id) => materials.find((material) => material.id === Number(id));

function showToast(message, type = 'success') {
  const container = $('#toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<div class="d-flex"><div class="toast-body">${message}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button></div>`;
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
  $$('.needs-validation').forEach((form) => form.addEventListener('submit', handleValidation));
}

function toggleBookmark(id, button) {
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
  return `<article class="material-card surface d-flex flex-column ${compact ? 'p-3' : ''}">
    <div class="d-flex justify-content-between align-items-start gap-2 mb-3"><div class="file-icon"><i class="fa-regular fa-file-lines"></i></div><button class="bookmark-btn icon-btn ${saved ? 'saved' : ''}" data-id="${material.id}" aria-label="${saved ? 'Remove bookmark' : 'Bookmark'}" aria-pressed="${saved}"><i class="${saved ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i></button></div>
    <div class="small fw-bold text-primary mb-2">${material.subject}</div><h3 class="h6 mb-2">${material.title}</h3><p class="small text-muted mb-3 flex-grow-1">${material.description}</p>
    <div class="d-flex justify-content-between small text-muted mb-3"><span><i class="fa-regular fa-user me-1"></i>${material.uploadedBy}</span><span>${material.type}</span></div>
    <div class="d-flex gap-2"><a class="btn btn-sm btn-primary flex-grow-1" href="detail.html?id=${material.id}">View</a><button class="btn btn-sm btn-light demo-action" data-message="Download started for ${material.title}."><i class="fa-solid fa-download"></i></button></div>
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
  const update = (file) => { if (!file) return; if (file.size > 10 * 1024 * 1024) { showToast('Please choose a file under 10 MB.', 'danger'); return; } name.textContent = file.name; zone.classList.add('border-primary'); };
  input.addEventListener('change', () => update(input.files[0]));
  ['dragenter','dragover'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.add('dragover'); }));
  ['dragleave','drop'].forEach((event) => zone.addEventListener(event, (e) => { e.preventDefault(); zone.classList.remove('dragover'); }));
  zone.addEventListener('drop', (e) => update(e.dataTransfer.files[0]));
  const form = zone.closest('form');
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
      uploadedBy: 'Alex Sharma',
      date: 'Today',
      downloads: 0,
      description: $('#description').value.trim()
    };
    const uploaded = getUploadedMaterials();
    uploaded.unshift(uploadedMaterial);
    setUploadedMaterials(uploaded);
  }, true);
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

document.addEventListener('DOMContentLoaded', () => { if (document.title.startsWith('Log in')) document.body.classList.add('login-page'); initOtherSubjectOption(); initDepartmentOptions(); initShared(); initMaterialFilters(); initUpload(); initAssistant(); });
