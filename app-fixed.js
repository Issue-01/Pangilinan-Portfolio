// Clean Academic Portfolio JS
let uploads = JSON.parse(localStorage.getItem('uploads')) || [];

function saveData() {
  localStorage.setItem('uploads', JSON.stringify(uploads));
}

function addScoreInfo(upload) {
  upload.percentage = ((upload.score / upload.maxScore) * 100).toFixed(1) + '%';
  if (parseFloat(upload.percentage) >= 90) upload.grade = 'Excellent';
  else if (parseFloat(upload.percentage) >= 80) upload.grade = 'Good';
  else if (parseFloat(upload.percentage) >= 70) upload.grade = 'Average';
  else upload.grade = 'Needs Improvement';
  return upload;
}


function handleFormSubmit(e) {
  e.preventDefault();
  console.log('Submit clicked');
  console.log('uploads before:', JSON.parse(localStorage.getItem('uploads') || '[]').length);

  
  const form = e.target;
  const formData = new FormData(form);
  
  // Comprehensive field mapping
  const getField = (names) => {
    for (let name of names) {
      const val = formData.get(name);
      if (val !== null && val !== '') return val;
    }
    return '';
  };
  
  const upload = {
    id: Date.now(),
    type: form.dataset.type || 'assessment',
    title: getField(['title', 'quizTitle', 'labTitle', 'examTitle', 'taskName']),
    score: parseInt(getField(['score', 'quizScore', 'labScore', 'examScore', 'taskScore']) || 0),
    maxScore: parseInt(getField(['max', 'quizMax', 'labMax', 'examMax', 'taskMax']) || 100),
    date: new Date().toLocaleDateString(),
    imagePreview: ''
  };
  
  console.log('Upload data:', upload);
  
  if (!upload.title) return alert('Title required');
  if (upload.score > upload.maxScore || upload.score < 0) return alert('Invalid score');
  
  addScoreInfo(upload);
  uploads.unshift(upload);

  saveData();
  console.log('uploads after:', JSON.parse(localStorage.getItem('uploads') || '[]').length);

  
  showSuccess(form);
  updateDashboardStats(); // Update globally
}

function showSuccess(form) {
  const btn = form.querySelector('button[type="submit"]');
  const text = btn.innerHTML;
  btn.innerHTML = '✅ Saved!';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = text;
    btn.disabled = false;
    form.reset();
  }, 2000);
}

function setupFilePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  const wrapper = input.closest('.file-upload-wrapper');
  let preview = document.getElementById(previewId);
  if (!preview) {
    preview = document.createElement('img');
    preview.id = previewId;
    preview.className = 'file-preview';
    preview.style.cssText = 'max-height:150px;max-width:100%;border-radius:8px;margin-top:8px;display:none;border:1px solid var(--border-color);';
    wrapper.appendChild(preview);
  }
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        wrapper.querySelector('.file-name').textContent = file.name;
      };
      reader.readAsDataURL(file);
    }
  };
}

function updateDashboardStats() {
  updateStats();
  updateCounts();
}

function updateStats() {
  const totalScore = uploads.reduce((sum, u) => sum + u.score, 0);
  const totalMax = uploads.reduce((sum, u) => sum + u.maxScore, 0);
  const avg = totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) + '%' : '0%';
  
  const totalEl = document.querySelector('.total-score');
  const avgEl = document.querySelector('.avg-grade');
  const countEl = document.querySelector('.total-uploads');
  
  if (totalEl) totalEl.textContent = `${totalScore}/${totalMax}`;
  if (avgEl) avgEl.textContent = avg;
  if (countEl) countEl.textContent = uploads.length;
}

function updateCounts() {
  const counts = { quiz: 0, lab: 0, exam: 0 };
  uploads.forEach(u => counts[u.type]++);
  
  document.querySelectorAll('[data-type]').forEach(el => {
    const type = el.dataset.type;
    const span = el.querySelector('.count');
    if (span) span.textContent = counts[type] || 0;
  });
}

function deleteUpload(id) {
  if (!confirm('Delete this upload?')) return;
  uploads = uploads.filter(u => u.id !== id);
  saveData();
  updateDashboardStats();
  loadSection('.about-section:nth-child(2) .grades-grid', 'quiz');
  loadSection('.about-section:nth-child(4) .grades-grid', 'lab');
  loadSection('.about-section:nth-child(6) .grades-grid', 'exam');
}

window.deleteUpload = deleteUpload; // Global for onclick

function loadSection(selector, type) {
  const grid = document.querySelector(selector);
  if (!grid) return;
  
  const items = uploads.filter(u => u.type === type);
if (items.length === 0) {
    grid.innerHTML = '';
  } else {

    grid.innerHTML = items.map(u => `
      <div class="task-card" data-id="${u.id}">
        <button class="delete-btn" onclick="deleteUpload(${u.id})">✕</button>
        <img src="${u.imagePreview || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI5NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgdG9tPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='}" class="task-image">
        <h4>${u.title}</h4>
        <div class="task-score">
          <div class="score-bar">
            <div class="score-fill ${u.grade === 'Excellent' ? 'excellent' : u.grade === 'Good' ? 'good' : u.grade === 'Average' ? 'average' : 'low'}" style="width:${u.percentage}"></div>
          </div>
          <span>${u.score}/${u.maxScore} ${u.grade}</span>
        </div>
      </div>
    `).join('');
  }
}


document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-menu');
  if (hamburger && nav) {
    hamburger.onclick = () => {
      nav.classList.toggle('mobile-open');
      hamburger.classList.toggle('active');
    };
  }
  
  window.onresize = () => window.innerWidth > 768 && nav?.classList.remove('mobile-open');
  
  // Bind forms
  document.querySelectorAll('form').forEach(form => {
    form.dataset.type ||= 'assessment';
    form.onsubmit = handleFormSubmit;
  });
  
  // File previews
  document.querySelectorAll('input[type="file"]').forEach(input => {
    const id = input.id;
    if (id) setupFilePreview(id, id + 'Preview');
  });
  
  // Dashboard load
  if (document.querySelector('.grades-grid')) {
    updateDashboardStats();
    loadSection('.about-section:nth-child(2) .grades-grid', 'quiz');
    loadSection('.about-section:nth-child(4) .grades-grid', 'lab');
    // No exam section
  }
});


