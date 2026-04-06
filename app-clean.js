// Clean Academic Portfolio JS - Fixed uploads showing on dashboard
let uploads = JSON.parse(localStorage.getItem('uploads')) || [];

// Make global immediately for inline onclick compatibility
window.setupFilePreview = function(inputId) {
  const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
  if (!input) return console.warn('Input not found:', inputId);
  
  const wrapper = input.closest('.file-upload-wrapper');
  if (!wrapper) return;
  
  const previewId = input.id + 'Preview';
  let preview = document.getElementById(previewId);
  if (!preview) {
    preview = document.createElement('img');
    preview.id = previewId;
    preview.style.cssText = 'display:none;max-height:200px;max-width:300px;border-radius:8px;margin-top:10px;border:1px solid #e2e8f0;';
    wrapper.appendChild(preview);
  }
  
  const fileNameEl = wrapper.querySelector('.file-name');
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Store file info globally for later save
      input._fileInfo = {name: file.name, size: file.size};
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        if (fileNameEl) fileNameEl.textContent = file.name;
        console.log('Preview ready:', file.name);
      };
      reader.readAsDataURL(file);
    }
  };
};

// Global form handler
window.handleFormSubmit = function(e) {
  if (e) e.preventDefault();
  console.log('handleFormSubmit called');
  
  const form = e ? e.target : document.querySelector('form[data-type]');
  if (!form) return console.error('No form found');
  
  const data = new FormData(form);
  const proofFieldNames = ['proofImage', 'taskImage', 'examProof', 'labProof'];
  const imageField = Array.from(proofFieldNames).find(name => data.get(name));
  const input = imageField ? document.getElementById(imageField.replace(/([A-Z])/g, m => m.toLowerCase())) : null;
  
  const upload = {
    id: Date.now(),
    type: form.dataset.type || 'assessment',
    title: data.get('quizTitle') || data.get('labTitle') || data.get('examTitle') || data.get('taskName') || data.get('title') || '',
    score: parseInt(data.get('quizScore') || data.get('labScore') || data.get('examScore') || data.get('taskScore') || 0),
    maxScore: parseInt(data.get('quizMax') || data.get('labMax') || data.get('examMax') || data.get('taskMax') || 100),
    date: new Date().toLocaleDateString(),
    filename: input?._fileInfo ? input._fileInfo.name : 'No file',
    filesize: input?._fileInfo ? `${(input._fileInfo.size/1024).toFixed(1)}KB` : ''
  };
  
  if (!upload.title.trim()) return alert('Title required');
  if (upload.score > upload.maxScore || upload.score < 0) return alert('Invalid score');
  
  // Add score/grade
  upload.percentage = ((upload.score / upload.maxScore) * 100).toFixed(1) + '%';
  upload.grade = parseFloat(upload.percentage) >= 90 ? 'Excellent' : parseFloat(upload.percentage) >= 80 ? 'Good' : parseFloat(upload.percentage) >= 70 ? 'Average' : 'Needs Improvement';
  
  uploads.unshift(upload);
  localStorage.setItem('uploads', JSON.stringify(uploads));
  console.log('✅ SAVED to localStorage:', upload);
  
  // Save image async AFTER metadata
  if (input && input.files[0]) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      upload.imagePreview = ev.target.result;
      // Update in place
      const idx = uploads.findIndex(u => u.id === upload.id);
      if (idx > -1) {
        uploads[idx] = upload;
        localStorage.setItem('uploads', JSON.stringify(uploads));
        console.log('✅ Image saved');
      }
    };
    reader.readAsDataURL(input.files[0]);
  }
  
  showSuccess(form);
  // Trigger dashboard update globally
  if (window.updateDashboardStats) window.updateDashboardStats();
};

function showSuccess(form) {
  const btn = form.querySelector('button[type=submit]');
  const orig = btn.innerHTML;
  btn.innerHTML = '✅ File Saved!';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.disabled = false;
    form.reset();
    // Clear file inputs
    form.querySelectorAll('input[type=file]').forEach(input => {
      input.value = '';
      const preview = document.getElementById(input.id + 'Preview');
      if (preview) preview.style.display = 'none';
      const nameEl = input.closest('.file-upload-wrapper').querySelector('.file-name');
      if (nameEl) nameEl.textContent = 'No file chosen';
    });
  }, 2500);
}

function saveData() {
  localStorage.setItem('uploads', JSON.stringify(uploads));
}

function loadUploads(gridSelector, type = null) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;
  
  const items = type ? uploads.filter(u => u.type === type) : uploads;
  grid.innerHTML = items.map(u => `
    <div class="task-card">
      <img src="${u.imagePreview || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI4MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UGxhY2Vob2xkZXI8L3RleHQ+PC9zdmc+'}" alt="${u.title}" class="task-image" loading="lazy">
      <h4>${u.title}</h4>
      ${u.filename ? `<small style="color:var(--text-muted);font-size:0.8rem;">${u.filename}</small>` : ''}
      <div class="task-score">
        <div class="score-bar">
          <div class="score-fill ${u.grade === 'Excellent' ? 'excellent' : u.grade === 'Good' ? 'good' : u.grade === 'Average' ? 'average' : 'low'}" style="width:${u.percentage}"></div>
        </div>
        <span>${u.score}/${u.maxScore} (${u.grade})</span>
      </div>
    </div>
  `).join('') || '';
}

function updateDashboardStats() {
  uploads = JSON.parse(localStorage.getItem('uploads') || '[]');
  const totalScore = uploads.reduce((s, u) => s + u.score, 0);
  const totalMax = uploads.reduce((s, u) => s + u.maxScore, 0);
  const avg = totalMax ? ((totalScore / totalMax) * 100).toFixed(1) + '%' : '0%';
  
  document.querySelector('.total-score')?.textContent = `${totalScore}/${totalMax}`;
  document.querySelector('.avg-grade')?.textContent = avg;
  document.querySelector('.total-uploads')?.textContent = uploads.length;
  
  document.querySelectorAll('[data-type]').forEach(h => {
    const type = h.dataset.type;
    const span = h.querySelector('.count');
    if (span) span.textContent = uploads.filter(u => u.type === type).length;
  });
  
  // Reload all sections
  loadUploads('.about-section:nth-child(2) .grades-grid', 'quiz');
  loadUploads('.about-section:nth-child(4) .grades-grid', 'lab');
  loadUploads('.about-section:nth-child(6) .grades-grid', 'exam');
}

window.updateDashboardStats = updateDashboardStats;
window.loadUploads = loadUploads;

// Init immediately (before DOMContentLoaded for onclick)
(function init() {
  console.log('app-clean.js loaded');
  // Bind existing forms immediately
  document.querySelectorAll('form').forEach(f => {
    if (!f.onsubmit) f.onsubmit = window.handleFormSubmit;
  });
  
  // Setup existing file inputs
  document.querySelectorAll('input[type=file]').forEach(i => {
    window.setupFilePreview(i.id);
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, re-binding');
  document.querySelectorAll('form').forEach(f => f.onsubmit = window.handleFormSubmit);
  document.querySelectorAll('input[type=file]').forEach(i => window.setupFilePreview(i.id));
  
  if (document.querySelector('.grades-grid')) {
    window.updateDashboardStats();
  }
  
  // Mobile nav (unchanged)
  const ham = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-menu');
  if (ham && nav) {
    ham.onclick = () => {
      nav.classList.toggle('mobile-open');
      ham.classList.toggle('active');
    };
  }
  
  window.onresize = () => window.innerWidth > 768 && nav?.classList.remove('mobile-open');
});

function showSuccess(form) {
  const btn = form.querySelector('button[type=submit]');
  const orig = btn.innerHTML;
  btn.innerHTML = '✅ Saved!';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.disabled = false;
    form.reset();
  }, 2000);
}

function setupFilePreview(inputId) {
  const input = typeof inputId === 'string' ? document.getElementById(inputId) : inputId;
  if (!input) return;
  
  const wrapper = input.closest('.file-upload-wrapper');
  if (!wrapper) return;
  
  const previewId = input.id + 'Preview';
  let preview = document.getElementById(previewId);
  if (!preview) {
    preview = document.createElement('img');
    preview.id = previewId;
    preview.style.cssText = 'display:none;max-height:200px;max-width:300px;border-radius:8px;margin-top:10px;border:1px solid #e2e8f0;';
    wrapper.appendChild(preview);
  }
  
  const fileNameEl = wrapper.querySelector('.file-name');
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
      if (fileNameEl) fileNameEl.textContent = file.name;
    } else {
      preview.style.display = 'none';
      if (fileNameEl) fileNameEl.textContent = 'No file chosen';
    }
  };
}

function loadUploads(gridSelector, type = null) {
  const grid = document.querySelector(gridSelector);
  if (!grid) return;
  
  const items = type ? uploads.filter(u => u.type === type) : uploads;
  grid.innerHTML = items.map(u => `
    <div class="task-card">
      <img src="${u.imagePreview || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjFmNWY5Ii8+PHRleHQgeD0iNTAlIiB5PSI4MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UGxhY2Vob2xkZXI8L3RleHQ+PC9zdmc+'}" alt="${u.title}" class="task-image">
      <h4>${u.title}</h4>
      <div class="task-score">
        <div class="score-bar">
          <div class="score-fill ${u.grade === 'Excellent' ? 'excellent' : u.grade === 'Good' ? 'good' : u.grade === 'Average' ? 'average' : 'low'}" style="width:${u.percentage}"></div>
        </div>
        <span>${u.score}/${u.maxScore} (${u.grade})</span>
      </div>
    </div>
  `).join('') || '';
}

function updateDashboardStats() {
  const totalScore = uploads.reduce((s, u) => s + u.score, 0);
  const totalMax = uploads.reduce((s, u) => s + u.maxScore, 0);
  const avg = totalMax ? ((totalScore / totalMax) * 100).toFixed(1) + '%' : '0%';
  
  document.querySelector('.total-score')?.setText(`${totalScore}/${totalMax}`);
  document.querySelector('.avg-grade')?.textContent = avg;
  document.querySelector('.total-uploads')?.textContent = uploads.length;
  
  document.querySelectorAll('[data-type]').forEach(h => {
    const type = h.dataset.type;
    const span = h.querySelector('.count');
    if (span) span.textContent = uploads.filter(u => u.type === type).length;
  });
  
  // Reload sections
  loadUploads('.about-section:nth-child(2) .grades-grid', 'quiz');
  loadUploads('.about-section:nth-child(4) .grades-grid', 'lab');
  loadUploads('.about-section:nth-child(6) .grades-grid', 'exam');
}

window.updateDashboardStats = updateDashboardStats;
window.handleFormSubmit = handleFormSubmit;
window.loadUploads = loadUploads;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach(f => f.onsubmit = handleFormSubmit);
  document.querySelectorAll('input[type=file]').forEach(i => setupFilePreview(i.id));
  
  if (document.querySelector('.grades-grid')) {
    updateDashboardStats();
  }
  
  // Mobile nav
  const ham = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-menu');
  if (ham && nav) ham.onclick = () => {
    nav.classList.toggle('mobile-open');
    ham.classList.toggle('active');
  };
  
  window.onresize = () => window.innerWidth > 768 && nav?.classList.remove('mobile-open');
});
