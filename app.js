/* HAKIMAIL — LocalStorage edition */

// Λίστα χρηστών/τμημάτων
const DEPARTMENTS = [
  "admin","ΠΥΡΣΕΙΑΣ","ΔΙΟΙΚΗΤΗΣ","ΥΠΟΔΙΟΙΚΗΤΗΣ","1Ο ΓΡΑΦΕΙΟ",
  "ΣΤΡΑΤΟΛΟΓΙΑ","2Ο ΓΡΑΦΕΙΟ","3Ο ΓΡΑΦΕΙΟ","4Ο ΓΡΑΦΕΙΟ",
  "ΓΡΑΦΕΙΟ ΚΙΝΗΣΕΩΣ","ΓΕΝΙΚΗΣ ΔΙΑΧΕΙΡΙΣΗΣ ΥΛΙΚΟΥ",
  "1ΟΣ ΛΟΧΟΣ","2ΟΣ ΛΟΧΟΣ","3ΟΣ ΛΟΧΟΣ",
  "ΛΟΧΟΣ ΥΠΟΣΤΗΡΙΞΕΩΣ","ΛΟΧΟΣ ΔΙΟΙΚΗΣΕΩΣ","ΜΙΣΘΟΤΡΟΦΟΔΟΣΙΑ"
];

// DOM refs
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const historyPage = document.getElementById('history-page');
const loginDept = document.getElementById('login-dept');
const loginPass = document.getElementById('login-pass');
const btnLogin = document.getElementById('btn-login');
const who = document.getElementById('who');
const btnLogout = document.getElementById('btn-logout');

const fileInput = document.getElementById('file-input');
const uploadForm = document.getElementById('upload-form');
const msgInput = document.getElementById('msg');
const toSelect = document.getElementById('to-select');
const inboxList = document.getElementById('inbox-list');
const outboxList = document.getElementById('outbox-list');
const btnSaveAll = document.getElementById('btn-save-all');
const uploadStatus = document.getElementById('upload-status');

const modal = document.getElementById('modal');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');

const adminArea = document.getElementById('admin-area');
const btnOpenHistory = document.getElementById('btn-open-history');
const actionsFilter = document.getElementById('actions-filter');
const actionsList = document.getElementById('actions-list');
const btnBack = document.getElementById('btn-back');

const btnSaveSingle = document.getElementById('btn-save-single');

let currentUser = null;

// ---------- Initialization ----------
function init(){
  populateLogin();
}
function populateLogin(){
  loginDept.innerHTML = DEPARTMENTS.map(d => `<option value="${d}">${d}</option>`).join('');
}
function populateRecipients(){
  toSelect.innerHTML = DEPARTMENTS.filter(d => d !== currentUser).map(d => `<option>${d}</option>`).join('');
}

// Helpers LocalStorage
function loadLS(key){
  return JSON.parse(localStorage.getItem(key) || "[]");
}
function saveLS(key, arr){
  localStorage.setItem(key, JSON.stringify(arr));
}

// ---------- Login / Logout ----------
btnLogin.onclick = () => {
  const dep = loginDept.value;
  const pass = loginPass.value.trim();

  // Κανόνας κωδικών: admin/admin123, όλοι οι άλλοι/1234
  if ((dep === 'admin' && pass !== 'admin123') || (dep !== 'admin' && pass !== '1234')) {
    alert('Λάθος κωδικός');
    return;
  }

  currentUser = dep;
  loginScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  who.textContent = `Συνδεθήκατε ως: ${dep}`;
  populateRecipients();
  loadDocuments();

  if (currentUser === 'admin') adminArea.classList.remove('hidden'); 
  else adminArea.classList.add('hidden');
};

btnLogout.onclick = () => {
  currentUser = null;
  dashboard.classList.add('hidden');
  historyPage.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginPass.value = '';
};

// ---------- Upload ----------
uploadForm.onsubmit = (e) => {
  e.preventDefault();
  if (!fileInput.files.length) { uploadStatus.textContent = 'Επίλεξε αρχείο'; return; }
  const f = fileInput.files[0];
  uploadStatus.textContent = 'Αποθήκευση...';

  const reader = new FileReader();
  reader.onload = (ev) => {
    const docs = loadLS("Documents");
    const doc = {
      name: f.name,
      type: f.type || 'application/octet-stream',
      from: currentUser,
      to: toSelect.value,
      note: msgInput.value || '',
      date: new Date().toLocaleString(),
      data: ev.target.result // base64
    };
    docs.push(doc);
    saveLS("Documents", docs);
    uploadStatus.textContent = 'Αποστολή επιτυχής';
    pushAction({ type: 'send', from: currentUser, to: toSelect.value, name: f.name });
    fileInput.value = ''; msgInput.value = '';
    loadDocuments();
  };
  reader.readAsDataURL(f);
};

// ---------- Load inbox/outbox ----------
function loadDocuments(){
  if(!currentUser) return;
  const docs = loadLS("Documents");
  const inbox = docs.filter(d => d.to === currentUser).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const outbox = docs.filter(d => d.from === currentUser).sort((a,b)=>new Date(b.date)-new Date(a.date));

  inboxList.innerHTML = inbox.map(renderItem).join('') || '<div class="meta">Κενό</div>';
  outboxList.innerHTML = outbox.map(renderItem).join('') || '<div class="meta">Κενό</div>';
}

// ---------- Render items ----------
function renderItem(d){
  const name = escapeHtml(d.name || '—');
  const meta = `${escapeHtml(d.from)} → ${escapeHtml(d.to)} · ${escapeHtml(d.date || '')}`;
  return `<div class="item">
    <div>
      <strong>${name}</strong>
      <div class="meta">${meta}</div>
      ${d.note ? `<div class="meta"><em>Σχόλιο:</em> ${escapeHtml(d.note)}</div>` : ''}
    </div>
    <div style="display:flex;gap:8px">
      <button class="view-btn" data-data="${d.data}" data-type="${d.type}">Προβολή</button>
      <button class="save-btn" data-data="${d.data}" data-name="${escapeHtml(d.name)}">Αποθήκευση</button>
    </div>
  </div>`;
}

// ---------- Click handlers ----------
document.addEventListener('click', e => {
  if (e.target.matches('.view-btn')) {
    openDoc(e.target.dataset.data, e.target.dataset.type);
  } else if (e.target.matches('.save-btn')) {
    saveFile(e.target.dataset.data, e.target.dataset.name);
  } else if (e.target.id === 'btn-save-single') {
    if (!fileInput.files.length) return alert('Επίλεξε αρχείο πρώτα.');
    const f = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (ev) => {
      const blob = dataURLtoBlob(ev.target.result);
      saveAs(blob, f.name);
      pushAction({ type: 'download_single', from: currentUser, to: currentUser, name: f.name });
    };
    reader.readAsDataURL(f);
  }
});

// ---------- Modal preview ----------
function openDoc(data, type){
  modal.classList.remove('hidden');
  if (type && type.startsWith('image/')) {
    modalContent.innerHTML = `<img src="${data}" style="max-width:100%;border-radius:6px">`;
  } else if (type === 'application/pdf') {
    modalContent.innerHTML = `<iframe src="${data}" style="width:100%;height:70vh;border:0"></iframe>`;
  } else {
    modalContent.innerHTML = `<div class="meta">Το αρχείο δεν προβάλλεται εντός. <br><a href="${data}" download>Κατέβασέ το</a></div>`;
  }
  pushAction({ type: 'view', from: currentUser, to: currentUser, name: '(preview)' });
}
modalClose.onclick = () => modal.classList.add('hidden');

// ---------- Save file ----------
function saveFile(data, name){
  const blob = dataURLtoBlob(data);
  saveAs(blob, name);
  pushAction({ type: 'download', from: currentUser, to: currentUser, name });
}

// ---------- Actions ----------
function pushAction(a){
  const actions = loadLS("Actions");
  const action = { ...a, date: new Date().toLocaleString() };
  actions.push(action);
  saveLS("Actions", actions);
}

// ---------- History (admin only) ----------
btnOpenHistory.onclick = () => {
  dashboard.classList.add('hidden');
  historyPage.classList.remove('hidden');
  fillHistory();
};
btnBack.onclick = () => {
  historyPage.classList.add('hidden');
  dashboard.classList.remove('hidden');
};

function fillHistory(){
  const arr = loadLS("Actions").sort((a,b)=>new Date(b.date)-new Date(a.date));
  actionsFilter.innerHTML = '<option value="">Όλα</option>' + DEPARTMENTS.map(d=>`<option>${d}</option>`).join('');
  renderHistoryList(arr);

  actionsFilter.onchange = () => {
    const f = actionsFilter.value;
    const filtered = f ? arr.filter(a => a.from === f || a.to === f) : arr;
    renderHistoryList(filtered);
  };

  if (!document.getElementById('btn-clear-history')) {
    const clearBtn = document.createElement('button');
    clearBtn.id = 'btn-clear-history';
    clearBtn.textContent = 'Καθάρισε Ιστορικό';
    clearBtn.style.marginTop = '10px';
    actionsFilter.parentElement.insertAdjacentElement('afterend', clearBtn);
    clearBtn.onclick = () => {
      if (currentUser !== 'admin') { alert('Μόνο ο admin μπορεί να καθαρίσει το ιστορικό'); return; }
      if (!confirm('Θες να διαγράψεις όλο το ιστορικό;')) return;
      saveLS("Actions", []);
      renderHistoryList([]);
    };
  }
}

function renderHistoryList(list){
  actionsList.innerHTML = list.length ? list.map(a => `<div class="item"><strong>${escapeHtml(a.name || '(όνομα)')}</strong><div class="meta">${escapeHtml(a.type)} · ${escapeHtml(a.from || '')} → ${escapeHtml(a.to || '')} · ${escapeHtml(a.date || '')}</div></div>`).join('') : '<div class="meta">Καμία ενέργεια</div>';
}

// ---------- Save All ----------
btnSaveAll.onclick = async () => {
  try {
    const docs = loadLS("Documents");
    if (!docs.length) { alert('Δεν υπάρχουν αρχεία'); return; }
    const zip = new JSZip();
    const folder = zip.folder('HAKIMAIL');
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const blob = dataURLtoBlob(d.data);
      folder.file(`${i+1}_${sanitizeFilename(d.name)}`, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `HAKIMAIL_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.zip`);
    pushAction({ type: 'save_all', from: currentUser, to: currentUser, name: 'ZIP' });
  } catch (err) {
    console.error(err);
    alert('Σφάλμα κατά τη δημιουργία zip');
  }
};

// ---------- Helpers ----------
function dataURLtoBlob(dataurl){
  const parts = dataurl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8 = new Uint8Array(n);
  while(n--) u8[n] = bstr.charCodeAt(n);
  return new Blob([u8], { type: mime });
}

function escapeHtml(s){ 
  return (s||'').toString().replace(/[&<>"']/g, c=>(
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
  ));
}

function sanitizeFilename(s){ 
  return s.replace(/[^a-zA-Z0-9_\-.\u00C0-\u024F ]/g,'_'); 
}

// ---------- Start ----------
init();