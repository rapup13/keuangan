/* ===== PENGATURAN: tempel URL Web App dari Apps Script di sini ===== */
const API_URL = 'https://script.google.com/macros/s/AKfycbwTUBuA5ejNSaCoUo1NwrhkdARh440h4WR1BC-9SuNwLrEYevZk70emMsz9cYiQDm35Uw/exec';

const $ = s => document.querySelector(s);
const S = { token: localStorage.getItem('tk'), tx: JSON.parse(localStorage.getItem('tx') || '[]'), tab: 'home', period: 'month', from: '', to: '', loading: false, h: { q: '', cat: '', jenis: '', from: '', to: '' } };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const PAL = ['#4f7cff', '#8b5cf6', '#14c3a8', '#f59e0b', '#ef5b7b', '#94a3b8'];
const DEF = { keluar: ['Makan & Minum', 'Transportasi', 'Belanja', 'Tagihan', 'Hiburan', 'Kesehatan', 'Pendidikan', 'Lainnya'], masuk: ['Gaji', 'Bonus', 'Usaha', 'Hadiah', 'Lainnya'] };
const IC = { home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', chart: 'M4 20V10M10 20V4M16 20v-7M2 20h20', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', plus: 'M12 5v14M5 12h14', out: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9', sync: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5' };
const ic = n => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${IC[n]}"/></svg>`;

/* ---------- util ---------- */
const rp = n => (n < 0 ? '-' : '') + 'Rp ' + Math.abs(Math.round(n)).toLocaleString('id-ID');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const iso = d => d.toISOString().slice(0, 10);
const parse = s => new Date(s + 'T00:00:00Z');
const addD = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const days = (a, b) => Math.round((parse(b) - parse(a)) / 864e5) + 1;
const today = () => iso(new Date(Date.now() + 7 * 36e5)); // WIB
const fmtD = s => `${+s.slice(8)} ${MON[+s.slice(5, 7) - 1]} ${s.slice(0, 4)}`;
const dl = s => s === today() ? 'Hari ini' : s === addD(today(), -1) ? 'Kemarin' : fmtD(s);
const byDate = (a, b) => b.tanggal.localeCompare(a.tanggal);
const inR = (x, r) => x.tanggal >= r[0] && x.tanggal <= r[1];
const sum = (a, j) => a.filter(x => x.jenis === j).reduce((s, x) => s + x.nominal, 0);
function toast(m, err) { const t = $('#toast'); t.textContent = m; t.className = 'show' + (err ? ' err' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = '', 2800); }

/* ---------- API ---------- */
async function api(action, p = {}) {
  let res;
  try { res = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action, token: S.token, ...p }) }); }
  catch (e) { throw new Error('Tidak ada koneksi internet'); }
  const j = await res.json();
  if (!j.ok) { if (j.error === 'AUTH') { logout('Sesi berakhir, masukkan PIN lagi'); } throw new Error(j.error === 'AUTH' ? 'Sesi berakhir' : j.error); }
  return j;
}
async function load() {
  S.loading = true; render();
  try { S.tx = (await api('list')).data; localStorage.setItem('tx', JSON.stringify(S.tx)); load.t = Date.now(); }
  catch (e) { if (S.token) toast('Gagal memuat: ' + e.message, 1); }
  S.loading = false; render();
}
const keep = () => localStorage.setItem('tx', JSON.stringify(S.tx));

/* ---------- periode ---------- */
function rng() {
  const t = today();
  if (S.period === 'day') return [t, t];
  if (S.period === 'week') return [addD(t, -((parse(t).getUTCDay() + 6) % 7)), t];
  if (S.period === 'month') return [t.slice(0, 8) + '01', t];
  let a = S.from || t, b = S.to || t; return a > b ? [b, a] : [a, b];
}
function prevRange(f, t) {
  if (S.period === 'week') return [addD(f, -7), addD(t, -7)];
  if (S.period === 'month') {
    const d = parse(f); d.setUTCMonth(d.getUTCMonth() - 1);
    const pf = iso(d), dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    return [pf, pf.slice(0, 8) + String(Math.min(+t.slice(8), dim)).padStart(2, '0')];
  }
  const L = days(f, t); return [addD(f, -L), addD(f, -1)];
}
function periodBar() {
  const P = [['day', 'Hari ini'], ['week', 'Minggu ini'], ['month', 'Bulan ini'], ['custom', 'Custom']];
  return `<div class="chips scroll">${P.map(([k, l]) => `<button class="chip ${S.period === k ? 'on' : ''}" data-a="period" data-v="${k}">${l}</button>`).join('')}</div>` +
    (S.period === 'custom' ? `<div class="row2"><input type="date" data-m="pfrom" value="${S.from}"><input type="date" data-m="pto" value="${S.to}"></div>` : '');
}

/* ---------- tampilan ---------- */
const empty = (m = 'Belum ada transaksi') => `<div class="empty"><div>${ic('list')}</div><b>${m}</b><small>Ketuk tombol Tambah untuk mencatat transaksi.</small></div>`;
const skel = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
const item = x => `<button class="it" data-a="edit" data-v="${esc(x.id)}"><span class="dot ${x.jenis}">${esc((x.kategori[0] || '?').toUpperCase())}</span><span class="mid"><b>${esc(x.kategori)}</b><small>${esc(x.catatan || (x.jenis === 'masuk' ? 'Pemasukan' : 'Pengeluaran'))}</small></span><b class="${x.jenis}">${x.jenis === 'masuk' ? '+' : '-'}${rp(x.nominal)}</b></button>`;
function list(a) { let h = '', last = ''; a.forEach(x => { if (x.tanggal !== last) { last = x.tanggal; h += `<div class="dh">${dl(x.tanggal)}</div>`; } h += item(x); }); return h; }

function insights(cur, r, k) {
  const ex = cur.filter(x => x.jenis === 'keluar');
  if (!ex.length) return '<div class="card c muted">Belum ada pengeluaran di periode ini.</div>';
  const by = {}; ex.forEach(x => by[x.kategori] = (by[x.kategori] || 0) + x.nominal);
  const [top, tv] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
  const pr = prevRange(r[0], r[1]), pk = sum(S.tx.filter(x => inR(x, pr)), 'keluar');
  let cmp = 'Belum ada data pembanding';
  if (pk > 0) { const d = (k - pk) / pk * 100; cmp = d <= 0 ? `Lebih hemat ${Math.abs(d).toFixed(0)}%` : `Naik ${d.toFixed(0)}%`; }
  return `<div class="card"><div class="ins"><span>Pengeluaran terbesar</span><b>${esc(top)}<br><small>${rp(tv)} · ${(tv / k * 100).toFixed(0)}%</small></b></div>
  <div class="ins"><span>Rata-rata per hari</span><b>${rp(k / days(r[0], r[1]))}</b></div>
  <div class="ins"><span>Dibanding periode lalu</span><b>${cmp}<br><small>${pk > 0 ? 'sebelumnya ' + rp(pk) : ''}</small></b></div></div>`;
}
function vHome() {
  if (S.loading && !S.tx.length) return skel;
  const r = rng(), cur = S.tx.filter(x => inR(x, r)), m = sum(cur, 'masuk'), k = sum(cur, 'keluar'), rec = [...S.tx].sort(byDate).slice(0, 5);
  return `${periodBar()}<div class="hero"><small>Saldo bersih</small><h1>${rp(m - k)}</h1><div class="hr"><div class="gl"><small>Pemasukan</small><b>${rp(m)}</b></div><div class="gl"><small>Pengeluaran</small><b>${rp(k)}</b></div></div></div>
  ${insights(cur, r, k)}<h3>Transaksi terbaru</h3>${rec.length ? list(rec) : empty()}`;
}
function donut(ex, k) {
  const by = {}; ex.forEach(x => by[x.kategori] = (by[x.kategori] || 0) + x.nominal);
  let e = Object.entries(by).sort((a, b) => b[1] - a[1]);
  if (e.length > 6) e = [...e.slice(0, 5), ['Lain-lain', e.slice(5).reduce((s, x) => s + x[1], 0)]];
  let acc = 0; const st = e.map(([, v], i) => { const a = acc / k * 100; acc += v; return `${PAL[i]} ${a}% ${acc / k * 100}%`; }).join(',');
  return `<div class="donut" style="background:conic-gradient(${st})"><div><small>Total</small><b>${rp(k)}</b></div></div><ul class="leg">${e.map(([n, v], i) => `<li><i style="background:${PAL[i]}"></i><span>${esc(n)}</span><b>${rp(v)}</b><em>${(v / k * 100).toFixed(0)}%</em></li>`).join('')}</ul>`;
}
function trend(cur, r) {
  const daily = days(r[0], r[1]) <= 31, keys = [];
  if (daily) for (let d = r[0]; d <= r[1]; d = addD(d, 1)) keys.push(d);
  else { let d = r[0].slice(0, 7); while (d <= r[1].slice(0, 7)) { keys.push(d); const [y, m] = d.split('-').map(Number); d = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`; } }
  const g = {}; keys.forEach(k => g[k] = { masuk: 0, keluar: 0 });
  cur.forEach(x => g[daily ? x.tanggal : x.tanggal.slice(0, 7)][x.jenis] += x.nominal);
  const mx = Math.max(1, ...keys.flatMap(k => [g[k].masuk, g[k].keluar]));
  return `<div class="lg2"><small><span></span>Pemasukan</small><small><span></span>Pengeluaran</small></div><div class="bars">${keys.map(k => `<div class="col"><div class="pair"><i class="bm" style="height:${g[k].masuk / mx * 100}%"></i><i class="bk" style="height:${g[k].keluar / mx * 100}%"></i></div><small>${daily ? +k.slice(8) : MON[+k.slice(5) - 1]}</small></div>`).join('')}</div>`;
}
function vChart() {
  if (S.loading && !S.tx.length) return skel;
  const r = rng(), cur = S.tx.filter(x => inR(x, r)), m = sum(cur, 'masuk'), k = sum(cur, 'keluar'), mx = Math.max(m, k, 1);
  if (!cur.length) return periodBar() + empty('Belum ada data di periode ini');
  return `${periodBar()}
  <h3>Pemasukan vs pengeluaran</h3><div class="card"><div class="cmp"><small>Pemasukan · ${rp(m)}</small><div style="width:${m / mx * 100}%;background:var(--t)"></div></div><div class="cmp"><small>Pengeluaran · ${rp(k)}</small><div style="width:${k / mx * 100}%;background:var(--r)"></div></div></div>
  <h3>Pengeluaran per kategori</h3><div class="card">${k ? donut(cur.filter(x => x.jenis === 'keluar'), k) : '<p class="muted c">Belum ada pengeluaran</p>'}</div>
  <h3>Tren ${days(r[0], r[1]) <= 31 ? 'harian' : 'bulanan'}</h3><div class="card">${trend(cur, r)}</div>`;
}
function hl() {
  const h = S.h, q = h.q.toLowerCase();
  const a = S.tx.filter(x => (!h.cat || x.kategori === h.cat) && (!h.jenis || x.jenis === h.jenis) && (!h.from || x.tanggal >= h.from) && (!h.to || x.tanggal <= h.to) && (!q || (x.kategori + ' ' + x.catatan).toLowerCase().includes(q))).sort(byDate);
  return a.length ? list(a.slice(0, 200)) + (a.length > 200 ? '<p class="muted c">Menampilkan 200 terbaru. Persempit filter untuk melihat lainnya.</p>' : '') : empty('Tidak ada transaksi yang cocok');
}
function vList() {
  if (S.loading && !S.tx.length) return skel;
  const cs = [...new Set(S.tx.map(x => x.kategori))].sort(), h = S.h;
  return `<div class="chips" style="display:block"><input data-m="q" type="search" placeholder="Cari kategori atau catatan" value="${esc(h.q)}">
  <div class="row2"><select data-m="cat"><option value="">Semua kategori</option>${cs.map(c => `<option ${h.cat === c ? 'selected' : ''} value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
  <select data-m="jenis"><option value="">Semua jenis</option><option value="masuk" ${h.jenis === 'masuk' ? 'selected' : ''}>Pemasukan</option><option value="keluar" ${h.jenis === 'keluar' ? 'selected' : ''}>Pengeluaran</option></select></div>
  <div class="row2"><input type="date" data-m="hfrom" value="${h.from}"><input type="date" data-m="hto" value="${h.to}"></div></div><div id="hl">${hl()}</div>`;
}
function render() {
  if (!S.token) return showLogin();
  $('#login').hidden = true; $('#app').hidden = false;
  $('#view').innerHTML = `<div class="v">${{ home: vHome, chart: vChart, list: vList }[S.tab]()}</div>`;
  document.querySelectorAll('nav [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === S.tab));
}

/* ---------- form tambah / edit ---------- */
let F = null;
function cats(j) { const c = {}; S.tx.filter(x => x.jenis === j).forEach(x => c[x.kategori] = (c[x.kategori] || 0) + 1); DEF[j].forEach(k => c[k] = c[k] || 0); return Object.keys(c).sort((a, b) => c[b] - c[a]); }
function drawForm() {
  const sh = $('#sheet'); sh.className = (sh.className.includes('open') ? 'open ' : '') + F.jenis;
  sh.innerHTML = `<div class="grab"></div>
  <div class="seg"><button class="${F.jenis === 'keluar' ? 'on' : ''}" data-a="jenis" data-v="keluar">Pengeluaran</button><button class="${F.jenis === 'masuk' ? 'on' : ''}" data-a="jenis" data-v="masuk">Pemasukan</button></div>
  <label class="nom"><span>Rp</span><input id="f-nom" inputmode="numeric" autocomplete="off" placeholder="0" value="${F.nominal ? (+F.nominal).toLocaleString('id-ID') : ''}"></label>
  <div class="chips">${cats(F.jenis).map(c => `<button class="chip ${F.kategori === c ? 'on' : ''}" data-a="cat" data-v="${esc(c)}">${esc(c)}</button>`).join('')}${F.kategori && !cats(F.jenis).includes(F.kategori) ? `<button class="chip on">${esc(F.kategori)}</button>` : ''}<button class="chip" data-a="newcat">+ Kategori baru</button></div>
  ${F.newcat ? `<input id="f-newcat" placeholder="Nama kategori baru" maxlength="40" value="${esc(F.kategori)}">` : ''}
  <input type="date" id="f-tgl" value="${F.tanggal}"><input id="f-note" placeholder="Catatan (opsional)" maxlength="200" value="${esc(F.catatan)}">
  <button class="btn" id="f-save" data-a="save">${F.id ? 'Simpan perubahan' : 'Simpan transaksi'}</button>
  ${F.id ? '<button class="btn ghost" data-a="del">Hapus transaksi</button>' : ''}`;
}
function openForm(t) {
  F = t ? { ...t, nominal: String(t.nominal) } : { jenis: 'keluar', nominal: '', kategori: '', tanggal: today(), catatan: '' };
  drawForm(); $('#sheet').classList.add('open'); $('#ov').classList.add('open');
  setTimeout(() => { if (!t) $('#f-nom')?.focus(); }, 320);
}
function closeForm() { $('#sheet').classList.remove('open'); $('#ov').classList.remove('open'); }
async function save() {
  const n = +F.nominal;
  if (!n || n <= 0) return toast('Isi nominal lebih dari 0', 1);
  if (!F.kategori.trim()) return toast('Pilih atau tambah kategori', 1);
  if (!F.tanggal) return toast('Tanggal wajib diisi', 1);
  const b = $('#f-save'); b.disabled = true; b.textContent = 'Menyimpan…';
  try {
    const r = await api(F.id ? 'update' : 'add', { t: { id: F.id, jenis: F.jenis, nominal: n, kategori: F.kategori.trim(), tanggal: F.tanggal, catatan: F.catatan } });
    S.tx = S.tx.filter(x => x.id !== r.data.id); S.tx.push(r.data); keep();
    closeForm(); render(); toast(F.id ? 'Perubahan tersimpan' : 'Transaksi tersimpan ke Google Sheets');
  } catch (e) { toast('Gagal menyimpan: ' + e.message, 1); b.disabled = false; b.textContent = 'Coba simpan lagi'; }
}
function confirmDel() {
  const d = $('#dlg'); d.hidden = false;
  d.innerHTML = `<div><b style="font-size:18px">Hapus transaksi ini?</b><p>${esc(F.kategori)} · ${rp(+F.nominal)}<br>Barisnya juga akan terhapus dari Google Sheets.</p><div class="row2"><button class="btn ghost" style="color:var(--ink)" data-a="dno">Batal</button><button class="btn" style="background:var(--r)" data-a="dyes">Ya, hapus</button></div></div>`;
}
async function doDel() {
  $('#dlg').hidden = true;
  try { await api('delete', { id: F.id }); S.tx = S.tx.filter(x => x.id !== F.id); keep(); closeForm(); render(); toast('Transaksi dihapus'); }
  catch (e) { toast('Gagal menghapus: ' + e.message, 1); }
}

/* ---------- login PIN ---------- */
let pin = '';
const dots = () => $('#dots').innerHTML = [...Array(6)].map((_, i) => `<i class="${i < pin.length ? 'f' : ''}"></i>`).join('');
function showLogin(msg) { $('#app').hidden = true; $('#login').hidden = false; if (msg) $('#lmsg').textContent = msg; dots(); }
function logout(msg) { S.token = null; localStorage.removeItem('tk'); localStorage.removeItem('tx'); S.tx = []; pin = ''; closeForm(); showLogin(msg); }
async function key(v) {
  if (v === 'b') pin = pin.slice(0, -1); else if (pin.length < 6) pin += v;
  dots();
  if (pin.length < 6) return;
  $('#lmsg').textContent = 'Memeriksa…';
  try { const r = await api('login', { pin }); S.token = r.token; localStorage.setItem('tk', r.token); pin = ''; $('#lmsg').textContent = 'Catatan keuanganmu terkunci'; render(); load(); }
  catch (e) { $('#lmsg').textContent = e.message; pin = ''; dots(); $('#dots').classList.add('shake'); setTimeout(() => $('#dots').classList.remove('shake'), 400); }
}

/* ---------- event ---------- */
const A = {
  tab: v => { S.tab = v; render(); scrollTo(0, 0); },
  period: v => { S.period = v; if (v === 'custom' && !S.from) { S.from = today().slice(0, 8) + '01'; S.to = today(); } render(); },
  add: () => openForm(), close: closeForm, sync: () => { toast('Memuat ulang…'); load(); },
  logout: () => logout(), key,
  edit: id => { const t = S.tx.find(x => x.id === id); if (t) openForm(t); },
  jenis: v => { F.jenis = v; F.kategori = ''; drawForm(); },
  cat: v => { F.kategori = v; F.newcat = false; drawForm(); },
  newcat: () => { F.newcat = true; drawForm(); $('#f-newcat').focus(); },
  save, del: confirmDel, dno: () => $('#dlg').hidden = true, dyes: doDel
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) A[b.dataset.a]?.(b.dataset.v); });
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'f-nom') { F.nominal = t.value.replace(/\D/g, '').slice(0, 13); t.value = F.nominal ? (+F.nominal).toLocaleString('id-ID') : ''; }
  else if (t.id === 'f-newcat') F.kategori = t.value;
  else if (t.id === 'f-note') F.catatan = t.value;
  else if (t.dataset.m === 'q') { S.h.q = t.value; $('#hl').innerHTML = hl(); }
});
document.addEventListener('change', e => {
  const t = e.target, m = t.dataset.m;
  if (t.id === 'f-tgl') F.tanggal = t.value;
  else if (m === 'pfrom' || m === 'pto') { S[m === 'pfrom' ? 'from' : 'to'] = t.value; render(); }
  else if (m) { S.h[{ cat: 'cat', jenis: 'jenis', hfrom: 'from', hto: 'to' }[m]] = t.value; $('#hl').innerHTML = hl(); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.token && Date.now() - (load.t || 0) > 60000) load(); });

/* ---------- mulai ---------- */
$('#pad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-a="key" data-v="${n}">${n}</button>`).join('') + `<span></span><button data-a="key" data-v="0">0</button><button data-a="key" data-v="b">⌫</button>`;
document.querySelector('[data-a=sync]').innerHTML = ic('sync');
document.querySelector('[data-a=logout]').innerHTML = ic('out');
$('.fab').innerHTML = ic('plus') + 'Tambah';
document.querySelectorAll('nav button').forEach(b => b.innerHTML = ic(b.dataset.v) + { home: 'Beranda', chart: 'Grafik', list: 'Riwayat' }[b.dataset.v]);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
render(); if (S.token) load();
