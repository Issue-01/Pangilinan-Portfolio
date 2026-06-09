// Academic Portfolio - app.js
let uploads = JSON.parse(localStorage.getItem('uploads') || '[]');

// ─── EXPORT to records.json ───────────────────────────────────────────────────
function exportRecords() {
  const json = JSON.stringify(uploads, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'records.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── IMPORT from records.json ─────────────────────────────────────────────────
function importRecords(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) return alert('Invalid records.json file.');
      uploads = data;
      localStorage.setItem('uploads', JSON.stringify(uploads));
      window.updateDashboard();
      alert(`✅ Loaded ${uploads.length} records successfully!`);
    } catch {
      alert('Failed to read records.json — file may be corrupted.');
    }
  };
  reader.readAsText(file);
}

// Auto-load records.json on page start if localStorage is empty
async function tryAutoLoad() {
  if (uploads.length > 0) return; // already have data
  try {
    const response = await fetch('records.json?t=' + Date.now());
    if (!response.ok) return;
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      uploads = data;
      localStorage.setItem('uploads', JSON.stringify(uploads));
      window.updateDashboard();
      console.log('Auto-loaded', uploads.length, 'records from records.json');
    }
  } catch {
    // No records.json yet, that's fine
  }
}

// ─── IMAGE COMPRESSION ────────────────────────────────────────────────────────
function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
      else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.5));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ─── FILE CHANGE → preview ────────────────────────────────────────────────────
document.addEventListener('change', e => {
  if (e.target.type === 'file') {
    const file = e.target.files[0];
    const wrapper = e.target.closest('.file-upload-wrapper');
    if (!wrapper) return;
    const nameEl = wrapper.querySelector('.file-name');
    if (nameEl) nameEl.textContent = file ? file.name : 'No file chosen';
    wrapper.querySelectorAll('img.live-preview').forEach(el => el.remove());
    if (file && file.type.startsWith('image/')) {
      const preview = document.createElement('img');
      preview.className = 'live-preview';
      preview.style.cssText = 'display:block;max-height:160px;max-width:100%;border-radius:8px;margin-top:10px;border:1px solid #e2e8f0;';
      wrapper.appendChild(preview);
      const reader = new FileReader();
      reader.onload = ev => preview.src = ev.target.result;
      reader.readAsDataURL(file);
    }
  }
});

// ─── SUBMIT HANDLER ───────────────────────────────────────────────────────────
window.handleFormSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);

  const title = data.get('quizTitle') || data.get('labTitle') || data.get('examTitle') || data.get('taskName') || data.get('title') || '';
  if (!title.trim()) return alert('Please enter a title.');

  const score = parseInt(data.get('quizScore') || data.get('labScore') || data.get('examScore') || data.get('taskScore') || data.get('score') || 0);
  const maxScore = parseInt(data.get('quizMax') || data.get('labMax') || data.get('examMax') || data.get('taskMax') || data.get('max') || 100);
  if (score < 0 || score > maxScore) return alert('Invalid score.');

  const upload = {
    id: Date.now(),
    type: form.dataset.type || 'assessment',
    title, score, maxScore,
    date: new Date().toLocaleDateString(),
    filename: '',
    imagePreview: ''
  };

  upload.percentage = ((upload.score / upload.maxScore) * 100).toFixed(1) + '%';
  upload.grade = parseFloat(upload.percentage) >= 90 ? 'Excellent'
    : parseFloat(upload.percentage) >= 80 ? 'Good'
    : parseFloat(upload.percentage) >= 70 ? 'Average'
    : 'Needs Improvement';

  const allFileInputs = Array.from(form.querySelectorAll('input[type=file]'));
  const proofInput = allFileInputs.find(i =>
    i.name.toLowerCase().includes('proof') || i.name.toLowerCase().includes('image')
  ) || allFileInputs[0];

  const btn = form.querySelector('button[type="submit"]');
  const originalHTML = btn.innerHTML;
  btn.innerHTML = '⏳ Saving...';
  btn.disabled = true;

  function finishSave() {
    uploads.unshift(upload);
    try {
      localStorage.setItem('uploads', JSON.stringify(uploads));
    } catch(err) {
      while (uploads.length > 1) {
        uploads.pop();
        try { localStorage.setItem('uploads', JSON.stringify(uploads)); break; }
        catch(e) { continue; }
      }
    }

    // Auto-export records.json after every save
    exportRecords();

    btn.innerHTML = '✅ Saved!';
    setTimeout(() => {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
      form.reset();
      form.querySelectorAll('.file-name').forEach(el => el.textContent = 'No file chosen');
      form.querySelectorAll('img.live-preview').forEach(el => el.remove());
      window.updateDashboard();
    }, 2000);
  }

  if (proofInput && proofInput.files[0]) {
    compressImage(proofInput.files[0], function(compressed) {
      upload.imagePreview = compressed;
      upload.filename = proofInput.files[0].name;
      finishSave();
    });
  } else {
    finishSave();
  }
};

// ─── DELETE HANDLER ───────────────────────────────────────────────────────────
window.deleteUpload = function(id) {
  if (!confirm('Delete this upload?')) return;
  uploads = uploads.filter(u => u.id !== id);
  localStorage.setItem('uploads', JSON.stringify(uploads));
  exportRecords(); // keep records.json in sync
  window.updateDashboard();
};

// ─── DASHBOARD UPDATE ─────────────────────────────────────────────────────────
window.updateDashboard = function() {
  uploads = JSON.parse(localStorage.getItem('uploads') || '[]');

  const totalScore = uploads.reduce((s, u) => s + u.score, 0);
  const totalMax = uploads.reduce((s, u) => s + u.maxScore, 0);

  const totalEl = document.querySelector('.total-score');
  const avgEl = document.querySelector('.avg-grade');
  const countEl = document.querySelector('.total-uploads');

  if (totalEl) totalEl.textContent = totalMax ? `${totalScore}/${totalMax}` : '0/0';
  if (avgEl) avgEl.textContent = totalMax ? (totalScore / totalMax * 100).toFixed(1) + '%' : '0%';
  if (countEl) countEl.textContent = uploads.length;

  ['quiz', 'lab', 'exam'].forEach(type => {
    const count = uploads.filter(u => u.type === type).length;
    const span = document.querySelector(`[data-type="${type}"] .count`);
    if (span) span.textContent = count;

    const grid = document.querySelector(`[data-type="${type}"] ~ .grades-grid`);
    if (!grid) return;

    const items = uploads.filter(u => u.type === type);
    if (items.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:20px;">No uploads yet</div>';
      return;
    }

    grid.innerHTML = items.map(u => `
      <div class="task-card" style="position:relative;">
        <button onclick="window.deleteUpload(${u.id})" style="position:absolute;top:8px;right:8px;background:#ef4444;color:white;border:none;border-radius:50%;width:26px;height:26px;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:10;">✕</button>
        ${u.imagePreview ? `<img src="${u.imagePreview}" class="task-image" onclick="window.viewImage('${u.imagePreview}', '${u.title}')" style="cursor:zoom-in;">` : ''}
        <h4>${u.title}</h4>
        <small style="color:var(--text-muted)">${u.date || ''}</small>
        <div class="task-score">
          <span>${u.score}/${u.maxScore}</span>
        </div>
      </div>
    `).join('');
  });
};

// ─── IMAGE LIGHTBOX ───────────────────────────────────────────────────────────
window.viewImage = function(src, title) {
  // Remove existing lightbox if any
  document.getElementById('lightbox-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'lightbox-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.85);z-index:9999;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    padding:20px;cursor:zoom-out;
  `;

  overlay.innerHTML = `
    <button onclick="document.getElementById('lightbox-overlay').remove()" style="
      position:absolute;top:16px;right:20px;background:white;color:#111;
      border:none;border-radius:50%;width:36px;height:36px;font-size:20px;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      font-weight:bold;z-index:10000;">✕</button>
    <p style="color:white;font-size:1rem;font-weight:600;margin-bottom:14px;text-align:center;">${title}</p>
    <img src="${src}" style="max-width:90vw;max-height:80vh;border-radius:10px;object-fit:contain;box-shadow:0 8px 40px rgba(0,0,0,0.6);">
  `;

  // Close on backdrop click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
};

// ─── IMPORT BUTTON (shown on dashboard) ──────────────────────────────────────
window.triggerImport = function() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => importRecords(e.target.files[0]);
  input.click();
};

window.addEventListener('storage', e => {
  if (e.key === 'uploads') window.updateDashboard();
});

document.addEventListener('DOMContentLoaded', async () => {
  await tryAutoLoad();
  window.updateDashboard();

  // ── Dropdown click (works on every page) ──
  const dropdownToggle = document.querySelector('.dropdown-toggle');
  const dropdown = document.querySelector('.dropdown');
  if (dropdownToggle && dropdown) {
    dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    document.addEventListener('click', () => dropdown.classList.remove('open'));
  }

  // ── Mobile hamburger ──
  const ham = document.querySelector('.hamburger');
  const nav = document.querySelector('.nav-menu');
  if (ham && nav) {
    ham.onclick = () => {
      nav.classList.toggle('mobile-open');
      ham.classList.toggle('active');
    };
  }
  window.onresize = () => {
    if (window.innerWidth > 768 && nav) nav.classList.remove('mobile-open');
  };
});
