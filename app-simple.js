// Simple non-defer app JS - Instant preview/save
window.uploads = JSON.parse(localStorage.getItem('uploads')) || [];

window.setupFilePreview = function(id) {
  const input = document.getElementById(id);
  if (!input) {
    console.error('Input not found:', id);
    return;
  }
  const wrapper = input.closest('.file-upload-wrapper');
  if (!wrapper) {
    console.error('Wrapper not found for', id);
    return;
  }
  const fileName = wrapper.querySelector('.file-name');
  let preview = document.getElementById(id + 'Preview');
  if (!preview) {
    preview = document.createElement('img');
    preview.id = id + 'Preview';
    wrapper.appendChild(preview);
  }
  preview.style.cssText = 'max-height:200px;max-width:300px;border-radius:8px;margin-top:10px;display:none;border:1px solid #ccc;';
  
  input.onchange = e => {
    const file = e.target.files[0];
    if (file) {
      fileName.textContent = file.name;
      const reader = new FileReader();
      reader.onload = ev => {
        preview.src = ev.target.result;
        preview.style.display = 'block';
        input._fileData = ev.target.result;
        console.log('✅ Preview loaded:', file.name);
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
      fileName.textContent = 'No file';
    }
  };
  console.log('✅ Setup complete:', id);
};

window.handleFormSubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const data = new FormData(form);
  const upload = {
    id: Date.now(),
    type: form.dataset.type || 'test',
    title: data.get('quizTitle') || data.get('labTitle') || data.get('examTitle') || data.get('taskName') || 'Untitled',
    score: parseInt(data.get('quizScore') || data.get('labScore') || data.get('examScore') || data.get('taskScore') || 0),
    maxScore: parseInt(data.get('quizMax') || data.get('labMax') || data.get('examMax') || data.get('taskMax') || 100),
    filename: '',
    imagePreview: ''
  };
  
  // Find proof image
  const proofId = ['proofImage', 'taskImage', 'labProof', 'examProof'].find(id => document.getElementById(id));
  if (proofId) {
    const input = document.getElementById(proofId);
    upload.filename = input._fileData ? input.files[0].name : 'No image';
    upload.imagePreview = input._fileData || '';
  }
  
  upload.percentage = ((upload.score / upload.maxScore) * 100).toFixed(1) + '%';
  
  window.uploads.unshift(upload);
  // Force dashboard refresh globally
  if (window.updateAll) window.updateAll();
  if (window.updateDashboardStats) window.updateDashboardStats();
localStorage.setItem('uploads', JSON.stringify(window.uploads));
  window.dispatchEvent(new CustomEvent('storageUpdate'));
  console.log('SAVED:', upload);
  
  const btn = form.querySelector('button[type=submit]');
  const orig = btn.innerHTML;
  btn.innerHTML = '✅ SAVED!';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = orig;
    btn.disabled = false;
    form.reset();
  }, 2000);
};

console.log('Simple app loaded');

