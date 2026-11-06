'use strict';
// PCC Work Hours Tracker: locally stored personal time records.
const KEY = 'pcc-work-hours-v1';
const CAMPUSES = ['Cascade', 'Rock Creek', 'Southeast', 'Sylvania', 'Virtual Work'];
const $ = id => document.getElementById(id);
let records = loadRecords();
let editingId = null;

function loadRecords() {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function persist() { localStorage.setItem(KEY, JSON.stringify(records)); }
function esc(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function minutesFromTime(time) { const m = /^(\d{2}):(\d{2})$/.exec(time || ''); if (!m) return NaN; const h = Number(m[1]), min = Number(m[2]); return h < 24 && min < 60 ? h * 60 + min : NaN; }
function hoursFromInputs() {
  const method = document.querySelector('input[name="method"]:checked').value;
  if (method === 'manual') { const text = $('manualHours').value.trim(); const hours = Number(text); return text && Number.isFinite(hours) && hours > 0 && hours <= 24 ? hours : NaN; }
  let start = minutesFromTime($('clockIn').value), end = minutesFromTime($('clockOut').value);
  const breakText = $('breakMinutes').value.trim(), unpaid = Number(breakText);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !breakText || !Number.isInteger(unpaid) || unpaid < 0) return NaN;
  if (end <= start) end += 1440; // Allows overnight shifts; equal times mean 24 hours.
  const paid = (end - start - unpaid) / 60;
  return paid > 0 && paid <= 24 ? paid : NaN;
}
function refreshPreview() { const hours = hoursFromInputs(); $('preview').textContent = Number.isFinite(hours) ? hours.toFixed(2) : '—'; }
function setMethod(method) {
  document.querySelector(`input[name="method"][value="${method}"]`).checked = true;
  $('clockFields').hidden = method !== 'clock'; $('manualFields').hidden = method !== 'manual'; refreshPreview();
}
function currentMonday() { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); }
function render() {
  const total = records.reduce((acc, r) => acc + r.hours, 0);
  $('totalHours').textContent = total.toFixed(2); $('shiftCount').textContent = records.length;
  const monday = currentMonday(); const next = new Date(`${monday}T12:00:00`); next.setDate(next.getDate() + 7);
  const nextDate = [next.getFullYear(),String(next.getMonth()+1).padStart(2,'0'),String(next.getDate()).padStart(2,'0')].join('-');
  $('weekHours').textContent = records.filter(r => r.date >= monday && r.date < nextDate).reduce((a,r) => a+r.hours,0).toFixed(2);
  $('campusTotals').innerHTML = CAMPUSES.map(c => `<div class="location-row"><span>${esc(c)}</span><strong>${records.filter(r=>r.campus===c).reduce((a,r)=>a+r.hours,0).toFixed(2)} hrs</strong></div>`).join('');
  $('recordCount').textContent = `${records.length} total`;
  const sorted = [...records].sort((a,b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  $('records').innerHTML = sorted.length ? sorted.map(r => `<div class="entry"><div class="entry-top"><div><div class="entry-title">${esc(r.date)} · ${esc(r.campus)}</div><div class="entry-sub">${r.hours.toFixed(2)} paid hours · ${r.method==='clock' ? `${esc(r.clockIn)}–${esc(r.clockOut)} · ${r.breakMinutes} min unpaid` : 'Manual hours entry'}</div></div></div>${r.notes ? `<p>${esc(r.notes)}</p>` : ''}<div class="actions"><button class="small secondary" data-action="edit" data-id="${esc(r.id)}">Edit</button><button class="small danger" data-action="delete" data-id="${esc(r.id)}">Delete</button></div></div>`).join('') : '<p class="empty">No shifts recorded yet.</p>';
}
function resetForm() { editingId=null; $('shiftForm').reset(); const today = new Date(); $('workDate').value = [today.getFullYear(), String(today.getMonth()+1).padStart(2,'0'), String(today.getDate()).padStart(2,'0')].join('-'); $('breakMinutes').value='0'; setMethod('clock'); $('formHeading').textContent='Record a shift'; $('saveBtn').textContent='Save shift'; $('cancelBtn').hidden=true; $('formMessage').textContent=''; }
function saveShift(event) {
  event.preventDefault(); const hours=hoursFromInputs(), method=document.querySelector('input[name="method"]:checked').value;
  const date=$('workDate').value, campus=$('campus').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !CAMPUSES.includes(campus) || !Number.isFinite(hours)) { $('formMessage').textContent='Please enter a valid date, location, and paid hours. Unpaid breaks must be shorter than the shift.'; return; }
  const shift={id:editingId || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),date,campus,method,hours,clockIn:method==='clock' ? $('clockIn').value : '',clockOut:method==='clock' ? $('clockOut').value : '',breakMinutes:method==='clock' ? Number($('breakMinutes').value) : 0,notes:$('notes').value.trim()};
  if (editingId) records=records.map(r=>r.id===editingId ? shift : r); else records.push(shift);
  try {persist();} catch { $('formMessage').textContent='Storage failed. Export a CSV backup and check device storage.'; return; }
  resetForm(); render(); $('formMessage').textContent='Shift saved on this device.';
}
function editShift(id) { const r=records.find(item=>item.id===id); if (!r) return; editingId=id; $('workDate').value=r.date; $('campus').value=r.campus; $('clockIn').value=r.clockIn||'09:00'; $('clockOut').value=r.clockOut||'17:00'; $('breakMinutes').value=String(r.breakMinutes||0); $('manualHours').value=String(r.hours); $('notes').value=r.notes; setMethod(r.method); $('formHeading').textContent='Edit shift'; $('saveBtn').textContent='Update shift'; $('cancelBtn').hidden=false; $('formMessage').textContent=''; window.scrollTo({top:0,behavior:'smooth'}); }
function csvCell(v) { const s=String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; }
const HEADERS=['id','date','campus','method','hours','clockIn','clockOut','breakMinutes','notes'];
function downloadCSV() { const rows=[HEADERS.join(','),...records.map(r=>HEADERS.map(k=>csvCell(r[k])).join(','))]; const blob=new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url;link.download=`pcc-work-hours-${new Date().toISOString().slice(0,10)}.csv`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1500); }
function parseCSV(input) { // RFC-style quoted fields, including commas and newlines.
  const result=[]; let row=[],value='',quoted=false;
  for(let i=0;i<input.length;i++){const c=input[i];if(quoted){if(c==='"'&&input[i+1]==='"'){value+='"';i++;}else if(c==='"'){quoted=false;}else{value+=c;}}else if(c==='"'){quoted=true;}else if(c===','){row.push(value);value='';}else if(c==='\n'){row.push(value.replace(/\r$/,''));result.push(row);row=[];value='';}else{value+=c;}}
  if(quoted)throw Error('Unclosed quoted field');if(value||row.length){row.push(value.replace(/\r$/,''));result.push(row);}return result;
}
async function importCSV(file) {
  try {const text=(await file.text()).replace(/^\uFEFF/,'');const rows=parseCSV(text);if(!rows.length)throw Error('Empty file');const headers=rows.shift();if(HEADERS.some(h=>!headers.includes(h)))throw Error('This is not a PCC Work Hours Tracker CSV backup');
    const incoming=[];for(const row of rows){if(row.length===1&&!row[0])continue;const raw=Object.fromEntries(headers.map((h,i)=>[h,row[i]??'']));const hours=Number(raw.hours),breakMinutes=Number(raw.breakMinutes);if(!raw.id||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date)||!CAMPUSES.includes(raw.campus)||!['clock','manual'].includes(raw.method)||!Number.isFinite(hours)||hours<=0||hours>24||!Number.isInteger(breakMinutes)||breakMinutes<0)throw Error('CSV contains an invalid shift');incoming.push({id:raw.id,date:raw.date,campus:raw.campus,method:raw.method,hours,clockIn:raw.clockIn,clockOut:raw.clockOut,breakMinutes,notes:raw.notes});}
    const ids=new Set(records.map(r=>r.id));const additions=incoming.filter(r=>!ids.has(r.id));if(!confirm(`Import ${additions.length} new shift(s)? ${incoming.length-additions.length} duplicate ID(s) will be skipped.`))return;records.push(...additions);persist();render();$('importMessage').textContent=`Imported ${additions.length} shifts; skipped ${incoming.length-additions.length} duplicates.`;
  }catch(e){$('importMessage').textContent=`Import failed: ${e.message}`;}
}
document.querySelectorAll('input[name="method"]').forEach(r=>r.addEventListener('change',()=>setMethod(r.value)));
['clockIn','clockOut','breakMinutes','manualHours'].forEach(id=>$(id).addEventListener('input',refreshPreview));
$('shiftForm').addEventListener('submit',saveShift);$('cancelBtn').addEventListener('click',resetForm);
$('records').addEventListener('click',e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const id=btn.dataset.id;if(btn.dataset.action==='edit')editShift(id);else if(confirm('Delete this shift? This cannot be undone unless you have a CSV backup.')){records=records.filter(r=>r.id!==id);persist();render();}});
$('csvExport').addEventListener('click',downloadCSV);$('csvImport').addEventListener('click',()=>$('fileInput').click());$('fileInput').addEventListener('change',async e=>{if(e.target.files[0])await importCSV(e.target.files[0]);e.target.value='';});
$('pdfExport').addEventListener('click',()=>window.print());
resetForm();render();
if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('./sw.js').catch(()=>{});
