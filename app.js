/* HAKIMAIL — Backendless edition
   IMPORTANT:
   - Μη βάζεις τα πραγματικά keys σε δημόσια θέση.
   - Αντέγραψε τα δικά σου Backendless keys εδώ πριν τρέξεις:
     const APP_ID = "YOUR_APP_ID";
     const API_KEY = "YOUR_API_KEY";
*/

const APP_ID = "28F12710-5C58-4F5C-BFE4-B6A5D3F6D798";      // <--- Βάλε το δικό σου App ID τοπικά εδώ
const API_KEY = "54E674AC-0FD7-4BB3-A4A9-CE84653D5926";    // <--- Βάλε το δικό σου API Key (JS) τοπικά εδώ

// Initialize Backendless SDK
Backendless.initApp(APP_ID, API_KEY);

// Τμήματα
const DEPARTMENTS = [
  "ΠΥΡΣΕΙΑΣ","ΔΙΟΙΚΗΤΗΣ","ΥΠΟΔΙΟΙΚΗΤΗΣ","1Ο ΓΡΑΦΕΙΟ",
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
  // no local init for backendless tables - they will be created on save
}
function populateLogin(){
  loginDept.innerHTML = DEPARTMENTS.map(d => `<option>${d}</option>`).join('');
}
function populateRecipients(){
  toSelect.innerHTML = DEPARTMENTS.filter(d => d !== currentUser).map(d => `<option>${d}</option>`).join('');
}

// ---------- Login / Logout ----------
btnLogin.onclick = () => {
  const dep = loginDept.value;
  const pass = loginPass.value.trim();
  // Demo auth: ΠΥΡΣΕΙΑΣ/admin123, others/1234
  if ((dep === 'ΠΥΡΣΕΙΑΣ' && pass !== 'admin123') || (dep !== 'ΠΥΡΣΕΙΑΣ' && pass !== '1234')) {
    alert('Λάθος κωδικός');
    return;
  }
  currentUser = dep;
  loginScreen.classList.add('hidden');
  dashboard.classList.remove('hidden');
  who.textContent = `Συνδεθήκατε ως: ${dep}`;
  populateRecipients();
  loadDocuments();
  if (currentUser === 'ΠΥΡΣΕΙΑΣ') adminArea.classList.remove('hidden'); else adminArea.classList.add('hidden');
};

btnLogout.onclick = () => {
  currentUser = null;
  dashboard.classList.add('hidden');
  historyPage.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginPass.value = '';
};

// ---------- Upload (Backendless Files + Documents table) ----------
uploadForm.onsubmit = (e) => {
  e.preventDefault();
  if (!fileInput.files.length) { uploadStatus.textContent = 'Επίλεξε αρχείο'; return; }
  const f = fileInput.files[0];
  uploadStatus.textContent = 'Ανέβασμα...';

  Backendless.Files.upload(f, '/HAKIMAIL/')
    .then(res => {
      const doc = {
        name: f.name,
        type: f.type || 'application/octet-stream',
        from: currentUser,
        to: toSelect.value,
        note: msgInput.value || '',
        date: new Date().toLocaleString(),
        fileURL: res.fileURL
      };
      return Backendless.Data.of('Documents').save(doc);
    })
    .then(saved => {
      uploadStatus.textContent = 'Αποστολή επιτυχής';
      pushAction({ type: 'send', from: currentUser, to: toSelect.value, name: saved.name });
      fileInput.value = ''; msgInput.value = '';
      loadDocuments();
    })
    .catch(err => {
      console.error(err);
      uploadStatus.textContent = 'Σφάλμα κατά το ανέβασμα';
    });
};

// ---------- Load inbox/outbox from Backendless ----------
function loadDocuments(){
  if(!currentUser) return;
  // inbox
  Backendless.Data.of('Documents').find({ where: `to='${currentUser}'`, sortBy: 'date DESC' })
    .then(list => {
      inboxList.innerHTML = list.map(renderItem).join('') || '<div class="meta">Κενό</div>';
    })
    .catch(err => { console.error(err); inboxList.innerHTML = '<div class="meta">Σφάλμα</div>'; });

  // outbox
  Backendless.Data.of('Documents').find({ where: `from='${currentUser}'`, sortBy: 'date DESC' })
    .then(list => {
      outboxList.innerHTML = list.map(renderItem).join('') || '<div class="meta">Κενό</div>';
    })
    .catch(err => { console.error(err); outboxList.innerHTML = '<div class="meta">Σφάλμα</div>'; });
}

// ---------- Render item (adds View + Save buttons) ----------
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
      <button class="view-btn" data-url="${d.fileURL}" data-type="${d.type}">Προβολή</button>
      <button class="save-btn" data-url="${d.fileURL}" data-name="${escapeHtml(d.name)}">Αποθήκευση</button>
    </div>
  </div>`;
}

// ---------- Global click handler for dynamic buttons ----------
document.addEventListener('click', e => {
  if (e.target.matches('.view-btn')) {
    openDoc(e.target.dataset.url, e.target.dataset.type);
  } else if (e.target.matches('.save-btn')) {
    saveFile(e.target.dataset.url, e.target.dataset.name);
  } else if (e.target.id === 'btn-save-single') {
    // save local selected file (from file input)
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

// ---------- Open modal to preview ----------
function openDoc(url, type){
  modal.classList.remove('hidden');
  if (type && type.startsWith('image/')) {
    modalContent.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:6px">`;
  } else if (type === 'application/pdf') {
    modalContent.innerHTML = `<iframe src="${url}" style="width:100%;height:70vh;border:0"></iframe>`;
  } else {
    modalContent.innerHTML = `<div class="meta">Το αρχείο δεν προβάλλεται εντός. <br><a href="${url}" target="_blank" rel="noopener">Άνοιγμα σε νέα καρτέλα</a></div>`;
  }
  pushAction({ type: 'view', from: currentUser, to: currentUser, name: url });
}
modalClose.onclick = () => modal.classList.add('hidden');

// ---------- Save single file (fetch blob and save) ----------
function saveFile(url, name){
  fetch(url)
    .then(r => r.blob())
    .then(b => {
      saveAs(b, name);
      pushAction({ type: 'download', from: currentUser, to: currentUser, name });
    })
    .catch(err => {
      console.error(err);
      alert('Σφάλμα κατά τη λήψη.');
    });
}

// ---------- Actions (history) ----------
function pushAction(a){
  const action = { ...a, date: new Date().toLocaleString() };
  Backendless.Data.of('Actions').save(action).catch(console.error);
}

// ---------- History page (admin only) ----------
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
  Backendless.Data.of('Actions').find({ sortBy: 'date DESC' })
    .then(arr => {
      actionsFilter.innerHTML = '<option value="">Όλα</option>' + DEPARTMENTS.map(d=>`<option>${d}</option>`).join('');
      renderHistoryList(arr);

      actionsFilter.onchange = () => {
        const f = actionsFilter.value;
        const filtered = f ? arr.filter(a => a.from === f || a.to === f) : arr;
        renderHistoryList(filtered);
      };

      // create clear button once
      if (!document.getElementById('btn-clear-history')) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'btn-clear-history';
        clearBtn.textContent = 'Καθάρισε Ιστορικό';
        clearBtn.style.marginTop = '10px';
        actionsFilter.parentElement.insertAdjacentElement('afterend', clearBtn);
        clearBtn.onclick = () => {
          if (currentUser !== 'ΠΥΡΣΕΙΑΣ') { alert('Μόνο ο ΠΥΡΣΕΙΑΣ μπορεί να καθαρίσει το ιστορικό'); return; }
          if (!confirm('Θες να διαγράψεις όλο το ιστορικό;')) return;
          // bulk delete via where clause: delete all
          Backendless.Data.of('Actions').bulkDelete("objectId != null")
            .then(() => renderHistoryList([]))
            .catch(err => { console.error(err); alert('Σφάλμα στη διαγραφή'); });
        };
      }
    })
    .catch(err => { console.error(err); actionsList.innerHTML = '<div class="meta">Σφάλμα</div>'; });
}

function renderHistoryList(list){
  actionsList.innerHTML = list.length ? list.map(a => `<div class="item"><strong>${escapeHtml(a.name || '(όνομα)')}</strong><div class="meta">${escapeHtml(a.type)} · ${escapeHtml(a.from || '')} → ${escapeHtml(a.to || '')} · ${escapeHtml(a.date || '')}</div></div>`).join('') : '<div class="meta">Καμία ενέργεια</div>';
}

// ---------- Save All (ZIP) ----------
btnSaveAll.onclick = async () => {
  try {
    const docs = await Backendless.Data.of('Documents').find();
    if (!docs.length) { alert('Δεν υπάρχουν αρχεία'); return; }
    const zip = new JSZip();
    const folder = zip.folder('HAKIMAIL');
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      const res = await fetch(d.fileURL);
      const blob = await res.blob();
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
function escapeHtml(s){ return (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function sanitizeFilename(s){ return s.replace(/[^a-zA-Z0-9_\-.\u00C0-\u024F ]/g,'_'); }

// ---------- Start ----------
init();