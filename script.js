'use strict';

/* ================= ابزارهای تاریخ شمسی ================= */
const fl = Math.floor;
const $ = s => document.querySelector(s);
const pd = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
const pad = n => String(n).padStart(2, '0');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function g2j(gy, gm, gd) {
  const m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], y2 = gm > 2 ? gy + 1 : gy;
  let d = 355666 + 365 * gy + fl((y2 + 3) / 4) - fl((y2 + 99) / 100) + fl((y2 + 399) / 400) + gd + m[gm - 1];
  let jy = -1595 + 33 * fl(d / 12053); d %= 12053;
  jy += 4 * fl(d / 1461); d %= 1461;
  if (d > 365) { jy += fl((d - 1) / 365); d = (d - 1) % 365; }
  return [jy, d < 186 ? 1 + fl(d / 31) : 7 + fl((d - 186) / 30), 1 + (d < 186 ? d % 31 : (d - 186) % 30)];
}
function j2g(jy, jm, jd) {
  jy += 1595;
  let d = -355668 + 365 * jy + fl(jy / 33) * 8 + fl((jy % 33 + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * fl(d / 146097); d %= 146097;
  if (d > 36524) { d--; gy += 100 * fl(d / 36524); d %= 36524; if (d >= 365) d++; }
  gy += 4 * fl(d / 1461); d %= 1461;
  if (d > 365) { gy += fl((d - 1) / 365); d = (d - 1) % 365; }
  let gd = d + 1;
  const a = [0, 31, (gy % 4 == 0 && gy % 100 != 0) || gy % 400 == 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0; while (gm < 13 && gd > a[gm]) gd -= a[gm++];
  return [gy, gm, gd];
}
const dayNum = (y, m, d) => { const [a, b, c] = j2g(y, m, d); return Math.round(Date.UTC(a, b - 1, c) / 864e5); };
const monthLen = (y, m) => m <= 6 ? 31 : m <= 11 ? 30 : dayNum(y + 1, 1, 1) - dayNum(y, 12, 1);
/* ستون روز در هفته: شنبه = 0 ... جمعه = 6 */
const colOf = (y, m, d) => (new Date(dayNum(y, m, d) * 864e5).getUTCDay() + 1) % 7;
const key = (y, m, d) => `${y}/${pad(m)}/${pad(d)}`;
const parseKey = k => k.split('/').map(Number);
const todayJ = () => { const t = new Date(); return g2j(t.getFullYear(), t.getMonth() + 1, t.getDate()); };

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WD = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
const PROVINCES = ['آذربایجان شرقی', 'آذربایجان غربی', 'اردبیل', 'اصفهان', 'البرز', 'ایلام', 'بوشهر', 'تهران', 'چهارمحال و بختیاری', 'خراسان جنوبی', 'خراسان رضوی', 'خراسان شمالی', 'خوزستان', 'زنجان', 'سمنان', 'سیستان و بلوچستان', 'فارس', 'قزوین', 'قم', 'کردستان', 'کرمان', 'کرمانشاه', 'کهگیلویه و بویراحمد', 'گلستان', 'گیلان', 'لرستان', 'مازندران', 'مرکزی', 'هرمزگان', 'همدان', 'یزد'];
const dateLabel = k => { const [y, m, d] = parseKey(k); return `${WD[colOf(y, m, d)]} ${pd(k)}`; };

/* ================= ذخیره‌سازی ================= */
const KEY = 'taskcal_v1';
let tasks = [];
try { tasks = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { tasks = []; }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch (e) { alert('ذخیره‌سازی در مرورگر ممکن نیست؛ از «پشتیبان‌گیری» استفاده کنید.'); } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ================= وضعیت صفحه ================= */
const [TY, TM, TD] = todayJ();
let view = [TY, TM];
let editing = null;            // شناسه کاری که در حال ویرایش است (null = کار جدید)
let pv = [TY, TM];             // ماه نمایش‌داده‌شده در انتخاب‌گر تاریخ

const byDate = (exceptId = null) => {
  const map = {};
  for (const t of tasks) if (t.id !== exceptId) (map[t.date] = map[t.date] || []).push(t);
  return map;
};
const level = c => c === 0 ? 0 : c <= 5 ? 1 : c <= 10 ? 2 : c <= 15 ? 3 : 4;
const statusClass = s => /پاسخ/.test(s) ? 's-na' : /کاتالوگ/.test(s) ? 's-cat' : /قطع|بدون/.test(s) ? 's-cut' : /پیگیری/.test(s) ? 's-fu' : '';
const cmp = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.name.localeCompare(b.name, 'fa');
const chipHtml = t => `<button class="chip ${statusClass(t.status)} ${t.done ? 'done' : ''}" data-id="${t.id}" title="${esc(t.name)}"><i></i><span>${esc(t.name)}</span></button>`;

/* ================= رسم ماه ================= */
function render() {
  const [y, m] = view, len = monthLen(y, m), off = colOf(y, m, 1), map = byDate();
  $('#monthTitle').textContent = `${MONTHS[m - 1]} ${pd(y)}`;
  let html = '', total = 0, done = 0;
  for (let i = 0; i < off; i++) html += '<div class="day empty"></div>';
  for (let d = 1; d <= len; d++) {
    const k = key(y, m, d), list = (map[k] || []).slice().sort(cmp), c = list.length;
    total += c; done += list.filter(t => t.done).length;
    const fri = (off + d - 1) % 7 === 6, isT = y === TY && m === TM && d === TD;
    html += `<div class="day l${level(c)} ${fri ? 'fri' : ''} ${isT ? 'today' : ''}" data-date="${k}">
      <div class="dh"><span class="dn">${pd(d)}</span>
        <span class="cnt ${c ? '' : 'zero'}" data-more="${k}" title="نمایش همه کارهای این روز">${pd(c)} کار</span>
        <button class="add" data-add="${k}" title="افزودن کار به این روز">+</button></div>
      <div class="chips">${list.slice(0, 3).map(chipHtml).join('')}${c > 3 ? `<button class="more" data-more="${k}">+${pd(c - 3)} کار دیگر</button>` : ''}</div>
    </div>`;
  }
  $('#grid').innerHTML = html;
  $('#grid').style.gridTemplateRows = `repeat(${Math.ceil((off + len) / 7)}, minmax(0, 1fr))`;
  $('#monthStat').textContent = `${pd(total)} کار در این ماه · ${pd(done)} انجام‌شده`;
}

function shiftMonth(delta) {
  let [y, m] = view; m += delta;
  if (m > 12) { m = 1; y++; } else if (m < 1) { m = 12; y--; }
  view = [y, m]; render();
}

/* ================= پنجره شناور ================= */
function showOverlay() { $('#ov').hidden = false; }
function closeDlg() { $('#ov').hidden = true; $('#picker').hidden = true; }

function setDate(k) {
  const b = $('#fDate');
  b.dataset.value = k || '';
  b.textContent = k ? dateLabel(k) : 'انتخاب تاریخ';
}

function openEditor(id, date) {
  editing = id;
  const t = id ? tasks.find(x => x.id === id) : null;
  $('#dlgTitle').textContent = t ? 'ویرایش کار' : 'کار جدید';
  const f = { Name: 'name', Type: 'type', Status: 'status', Province: 'province', City: 'city', Phone: 'phone', Phone2: 'phone2', Contact: 'contact', Role: 'role', Mobile: 'mobile', Dept: 'dept', Addr: 'addr', Notes: 'notes', Time: 'time' };
  for (const [el, k] of Object.entries(f)) {
    const node = $('#f' + el);
    node.value = t ? (t[k] ?? '') : (k === 'type' ? 'بیمارستان' : k === 'status' ? 'آماده تماس' : '');
  }
  $('#fDone').checked = !!(t && t.done);
  setDate(t ? t.date : (date || key(TY, TM, TD)));
  $('#btnDelete').hidden = !t;
  $('#dayList')?.remove();
  $('.form').hidden = false; $('.dlg-foot').hidden = false;
  $('#picker').hidden = true;
  showOverlay();
  if (!t) $('#fName').focus();
}

function openDayList(k) {
  const list = tasks.filter(t => t.date === k).sort(cmp);
  $('#dlgTitle').textContent = `کارهای ${dateLabel(k)} (${pd(list.length)} کار)`;
  $('.form').hidden = true; $('.dlg-foot').hidden = true;
  $('#dayList')?.remove();
  const box = document.createElement('div');
  box.id = 'dayList'; box.className = 'daylist';
  box.innerHTML = (list.map(chipHtml).join('') || '<div class="stat">برای این روز کاری ثبت نشده.</div>') +
    `<button class="primary" data-add="${k}" style="align-self:flex-start;margin-top:8px">+ کار جدید برای این روز</button>`;
  $('#dlg').appendChild(box);
  showOverlay();
}

function saveTask() {
  const name = $('#fName').value.trim(), date = $('#fDate').dataset.value;
  if (!name) { $('#fName').focus(); $('#fName').style.outline = '2px solid var(--rd)'; return; }
  if (!date) { $('#picker').hidden = false; renderPicker(); return; }
  $('#fName').style.outline = '';
  const data = {
    name, type: $('#fType').value, status: $('#fStatus').value, province: $('#fProvince').value.trim(), city: $('#fCity').value.trim(),
    phone: $('#fPhone').value.trim(), phone2: $('#fPhone2').value.trim(), contact: $('#fContact').value.trim(), role: $('#fRole').value.trim(),
    mobile: $('#fMobile').value.trim(), dept: $('#fDept').value.trim(), addr: $('#fAddr').value.trim(), notes: $('#fNotes').value.trim(),
    date, time: $('#fTime').value, done: $('#fDone').checked
  };
  if (editing) Object.assign(tasks.find(x => x.id === editing), data);
  else tasks.push({ id: uid(), ...data });
  persist(); closeDlg();
  const [y, m] = parseKey(date); view = [y, m];   // ماهِ کار ذخیره‌شده را نشان بده
  render();
}

function deleteTask() {
  if (!editing || !confirm('این کار حذف شود؟')) return;
  tasks = tasks.filter(x => x.id !== editing);
  persist(); closeDlg(); render();
}

/* ================= انتخاب تاریخ با عدد کارهای هر روز ================= */
function renderPicker() {
  const [y, m] = pv, len = monthLen(y, m), off = colOf(y, m, 1);
  const map = byDate(editing), sel = $('#fDate').dataset.value;
  $('#pkTitle').textContent = `${MONTHS[m - 1]} ${pd(y)}`;
  let html = '';
  for (let i = 0; i < off; i++) html += '<div class="pk-day empty"></div>';
  for (let d = 1; d <= len; d++) {
    const k = key(y, m, d), c = (map[k] || []).length, fri = (off + d - 1) % 7 === 6;
    html += `<button type="button" class="pk-day l${level(c)} ${fri ? 'fri' : ''} ${y === TY && m === TM && d === TD ? 'today' : ''} ${k === sel ? 'sel' : ''}" data-pick="${k}">
      <span>${pd(d)}</span><small class="${c ? '' : 'z'}">${pd(c)}</small></button>`;
  }
  $('#pkGrid').innerHTML = html;
}
function shiftPicker(delta) {
  let [y, m] = pv; m += delta;
  if (m > 12) { m = 1; y++; } else if (m < 1) { m = 12; y--; }
  pv = [y, m]; renderPicker();
}

/* ================= پشتیبان‌گیری ================= */
function backup() {
  const blob = new Blob([JSON.stringify(tasks, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `taskcal-backup-${key(TY, TM, TD).replace(/\//g, '-')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function restore(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const data = JSON.parse(rd.result);
      if (!Array.isArray(data) || data.some(t => !t || !t.id || !t.name || !t.date)) throw new Error('bad');
      if (!confirm(`${pd(data.length)} کار از فایل خوانده شد. جایگزین کارهای فعلی شود؟`)) return;
      tasks = data; persist(); render();
    } catch (e) { alert('فایل پشتیبان معتبر نیست.'); }
  };
  rd.readAsText(file);
}

/* ================= رویدادها ================= */
$('#weekdays').innerHTML = WD.map((w, i) => `<div class="${i === 6 ? 'fri' : ''}">${w}</div>`).join('');
$('#pkWd').innerHTML = WD.map(w => `<div>${w.slice(0, 1)}</div>`).join('');
$('#provinces').innerHTML = PROVINCES.map(p => `<option>${p}</option>`).join('');

$('#btnNext').onclick = () => shiftMonth(1);
$('#btnPrev').onclick = () => shiftMonth(-1);
$('#btnToday').onclick = () => { view = [TY, TM]; render(); };
$('#btnBackup').onclick = backup;
$('#fileRestore').onchange = e => { if (e.target.files[0]) restore(e.target.files[0]); e.target.value = ''; };

$('#grid').addEventListener('click', e => {
  const add = e.target.closest('[data-add]'), chip = e.target.closest('.chip'), more = e.target.closest('[data-more]');
  if (add) openEditor(null, add.dataset.add);
  else if (chip) openEditor(chip.dataset.id);
  else if (more && more.classList.contains('zero') === false) openDayList(more.dataset.more);
});
$('#dlg').addEventListener('click', e => {
  const chip = e.target.closest('#dayList .chip'), add = e.target.closest('#dayList [data-add]');
  if (chip) openEditor(chip.dataset.id);
  else if (add) openEditor(null, add.dataset.add);
});

$('#btnSave').onclick = saveTask;
$('#btnDelete').onclick = deleteTask;
$('#btnCancel').onclick = closeDlg;
$('#btnClose').onclick = closeDlg;
$('#ov').addEventListener('mousedown', e => { if (e.target === $('#ov')) closeDlg(); });

$('#fDate').onclick = () => {
  const p = $('#picker');
  if (p.hidden) { const v = $('#fDate').dataset.value; pv = v ? parseKey(v).slice(0, 2) : [TY, TM]; renderPicker(); }
  p.hidden = !p.hidden;
  if (!p.hidden) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};
$('#pkNext').onclick = () => shiftPicker(1);
$('#pkPrev').onclick = () => shiftPicker(-1);
$('#pkGrid').addEventListener('click', e => {
  const b = e.target.closest('[data-pick]');
  if (b) { setDate(b.dataset.pick); $('#picker').hidden = true; }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { if (!$('#picker').hidden) $('#picker').hidden = true; else closeDlg(); return; }
  if ($('#ov').hidden && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    if (e.key === 'ArrowLeft') shiftMonth(1);       // در صفحه‌ی راست‌به‌چپ، چپ = ماه بعد
    if (e.key === 'ArrowRight') shiftMonth(-1);
  }
});

render();
