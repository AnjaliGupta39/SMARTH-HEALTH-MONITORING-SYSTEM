// Simple Smart Health Monitoring Frontend (no backend)
// Data persisted in localStorage for demo purposes.

const STORAGE_KEY = "smart_health_data_v1";

const defaultData = {
  nurses: [
    {id: 'n1', name: 'Nurse A', phone: '9876543210'}
  ],
  patients: [
    {id:'p1', name:'Rahul Sharma', room:'101', age:45, vitals:{hr:78, bp:'120/80', spo2:97}, notes:[]},
    {id:'p2', name:'Meera Patel', room:'102', age:62, vitals:{hr:95, bp:'150/95', spo2:90}, notes:[]}
  ],
  checks: []
};

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(defaultData));
}

function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

let DATA = loadData();

// UI hooks
const totalPatientsEl = document.getElementById('totalPatients');
const totalNursesEl = document.getElementById('totalNurses');
const criticalAlertsEl = document.getElementById('criticalAlerts');
const todayChecksEl = document.getElementById('todayChecks');
const recentChecksEl = document.getElementById('recentChecks');
const patientsGrid = document.getElementById('patientsGrid');
const nursesList = document.getElementById('nursesList');

// Navigation
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-btn').forEach(n=>n.classList.remove('active'));
    btn.classList.add('active');
    const view = btn.dataset.view;
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    document.getElementById('view-' + view).classList.add('active');
  });
});

// Modal helpers
const modal = document.getElementById('modal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');
closeModal.addEventListener('click', ()=> closeModalFn());

function openModal(html){ modalContent.innerHTML = html; modal.classList.remove('hidden'); }
function closeModalFn(){ modal.classList.add('hidden'); modalContent.innerHTML = ''; }

// Render functions
function renderDashboard(){
  totalPatientsEl.textContent = DATA.patients.length;
  totalNursesEl.textContent = DATA.nurses.length;
  const critical = DATA.patients.filter(p=> p.vitals && (p.vitals.spo2 < 92 || parseInt(p.vitals.hr) > 120 || (p.vitals.bp && parseInt(p.vitals.bp.split('/')[0])>140))).length;
  criticalAlertsEl.textContent = critical;
  todayChecksEl.textContent = DATA.checks.filter(c=> new Date(c.time).toDateString() === new Date().toDateString()).length;

  recentChecksEl.innerHTML = '';
  DATA.checks.slice().reverse().slice(0,6).forEach(c=>{
    const el = document.createElement('div');
    el.className = 'small';
    el.textContent = `${new Date(c.time).toLocaleString()}: ${c.nurse} checked ${c.patient} — ${c.note || 'OK'}`;
    recentChecksEl.appendChild(el);
  });
}

function renderPatients(filter=''){
  patientsGrid.innerHTML = '';
  DATA.patients.filter(p=> (p.name + ' ' + p.room).toLowerCase().includes(filter.toLowerCase())).forEach(p=>{
    const card = document.createElement('div');
    card.className = 'patient';
    const isCritical = p.vitals && (p.vitals.spo2 < 92 || parseInt(p.vitals.hr) > 120 || (p.vitals.bp && parseInt(p.vitals.bp.split('/')[0])>140));
    card.innerHTML = `
      ${isCritical ? '<div class="badge">CRITICAL</div>' : ''}
      <div class="meta"><strong>${p.name}</strong><span class="room">Room ${p.room}</span></div>
      <div class="small">Age: ${p.age}</div>
      <div class="vitals" style="margin-top:8px;">
        <div class="vital">HR: ${p.vitals.hr} bpm</div>
        <div class="vital">BP: ${p.vitals.bp}</div>
        <div class="vital">SpO₂: ${p.vitals.spo2}%</div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" onclick="openCheckModal('${p.id}')">Add Check</button>
        <button class="btn btn-secondary" onclick="viewPatient('${p.id}')">View</button>
      </div>
    `;
    patientsGrid.appendChild(card);
  });
}

function renderNurses(){
  nursesList.innerHTML = '';
  DATA.nurses.forEach(n=>{
    const card = document.createElement('div');
    card.className = 'nurse';
    card.innerHTML = `<strong>${n.name}</strong><div class="small">Phone: ${n.phone}</div>`;
    nursesList.appendChild(card);
  });
}

// Actions
function openCheckModal(patientId){
  const patient = DATA.patients.find(p=>p.id===patientId);
  const nurseOptions = DATA.nurses.map(n=>`<option value="${n.name}">${n.name}</option>`).join('');
  openModal(`
    <h3>Add Patient Check — ${patient.name}</h3>
    <form id="checkForm">
      <div class="row">
        <div><label>Checked by</label><select name="nurse">${nurseOptions}</select></div>
        <div><label>Heart Rate (bpm)</label><input name="hr" value="${patient.vitals.hr}" /></div>
        <div><label>BP</label><input name="bp" value="${patient.vitals.bp}" /></div>
        <div><label>SpO2</label><input name="spo2" value="${patient.vitals.spo2}" /></div>
        <div class="full"><label>Note</label><input name="note" placeholder="Optional note" /></div>
      </div>
      <div style="margin-top:12px;text-align:right">
        <button type="button" class="btn btn-secondary" onclick="closeModalFn()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Check</button>
      </div>
    </form>
  `);

  document.getElementById('checkForm').addEventListener('submit', function(e){
    e.preventDefault();
    const form = new FormData(e.target);
    const nurse = form.get('nurse');
    const hr = form.get('hr');
    const bp = form.get('bp');
    const spo2 = form.get('spo2');
    const note = form.get('note');

    // update patient vitals
    const p = DATA.patients.find(x=>x.id===patientId);
    p.vitals = {hr: parseInt(hr)||p.vitals.hr, bp: bp||p.vitals.bp, spo2: parseInt(spo2)||p.vitals.spo2};
    // add check record
    DATA.checks.push({patient: p.name, nurse, time: new Date().toISOString(), note});
    saveData(DATA);
    closeModalFn();
    refreshAll();
  });
}

function viewPatient(id){
  const p = DATA.patients.find(x=>x.id===id);
  openModal(`<h3>${p.name} — Room ${p.room}</h3>
    <div class="small">Age: ${p.age}</div>
    <div style="margin-top:8px;">
      <strong>Vitals</strong>
      <div class="vitals" style="margin-top:8px;">
        <div class="vital">HR: ${p.vitals.hr} bpm</div>
        <div class="vital">BP: ${p.vitals.bp}</div>
        <div class="vital">SpO₂: ${p.vitals.spo2}%</div>
      </div>
    </div>
    <div style="margin-top:12px;">
      <strong>Notes</strong>
      <div>${p.notes.length? p.notes.map(n=>'<div class="small">- '+n+'</div>').join('') : '<div class="small">No notes</div>'}</div>
    </div>
  `);
}

// Add nurse / patient flows
document.getElementById('addNurseBtn').addEventListener('click', ()=>{
  openModal(`
    <h3>Register Nurse</h3>
    <form id="nurseForm">
      <div class="row">
        <div><label>Name</label><input name="name" required /></div>
        <div><label>Phone</label><input name="phone" required /></div>
      </div>
      <div style="margin-top:12px;text-align:right">
        <button type="button" class="btn btn-secondary" onclick="closeModalFn()">Cancel</button>
        <button type="submit" class="btn btn-primary">Register</button>
      </div>
    </form>
  `);
  document.getElementById('nurseForm').addEventListener('submit', function(e){
    e.preventDefault();
    const fm = new FormData(e.target);
    const name = fm.get('name'); const phone = fm.get('phone');
    DATA.nurses.push({id: 'n' + Date.now(), name, phone});
    saveData(DATA); closeModalFn(); refreshAll();
  });
});

document.getElementById('addPatientBtn').addEventListener('click', ()=>{
  openModal(`
    <h3>Add Patient</h3>
    <form id="patientForm">
      <div class="row">
        <div><label>Name</label><input name="name" required /></div>
        <div><label>Room</label><input name="room" required /></div>
        <div><label>Age</label><input name="age" type="number" required /></div>
        <div><label>HR</label><input name="hr" value="80" /></div>
        <div class="full"><label>BP</label><input name="bp" value="120/80" /></div>
        <div class="full"><label>SpO2</label><input name="spo2" value="98" /></div>
      </div>
      <div style="margin-top:12px;text-align:right">
        <button type="button" class="btn btn-secondary" onclick="closeModalFn()">Cancel</button>
        <button type="submit" class="btn btn-primary">Add Patient</button>
      </div>
    </form>
  `);
  document.getElementById('patientForm').addEventListener('submit', function(e){
    e.preventDefault();
    const fm = new FormData(e.target);
    const name = fm.get('name'); const room = fm.get('room'); const age = parseInt(fm.get('age'));
    const hr = parseInt(fm.get('hr'))||80; const bp = fm.get('bp')||'120/80'; const spo2 = parseInt(fm.get('spo2'))||98;
    DATA.patients.push({id:'p'+Date.now(), name, room, age, vitals:{hr, bp, spo2}, notes:[]});
    saveData(DATA); closeModalFn(); refreshAll();
  });
});

// Filters and search
document.getElementById('patientFilter').addEventListener('input', (e)=> renderPatients(e.target.value));
document.getElementById('globalSearch').addEventListener('input', (e)=>{
  const q = e.target.value.toLowerCase();
  // switch to patients view if searching patients
  document.querySelectorAll('.nav-btn').forEach(n=>n.classList.remove('active'));
  document.querySelector('[data-view="patients"]').classList.add('active');
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-patients').classList.add('active');
  renderPatients(q);
});

function refreshAll(){ renderDashboard(); renderPatients(); renderNurses(); }
refreshAll();

// Simple export function (console-only)
window.exportData = ()=> console.log(DATA);