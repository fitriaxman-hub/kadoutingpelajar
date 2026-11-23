const C = window.APP_CONFIG;

const $ = id => document.getElementById(id);
const form = $("form"), btn = $("btn"), statusEl = $("status");

// ---------- Auto uppercase / format ----------
["nama", "bilik", "reg"].forEach(id =>
  $(id).addEventListener("input", e => (e.target.value = e.target.value.toUpperCase()))
);

// ---------- Gambar pelajar ----------
// Dipotong ikut nisbah kotak gambar pada kad (174 x 222) dan dimampatkan
const FOTO_W = 522, FOTO_H = 666;
let fotoData = "";

$("foto").addEventListener("change", async e => {
  const file = e.target.files[0];
  fotoData = "";
  $("preview").style.backgroundImage = "";
  $("preview").classList.remove("ada");
  if (!file) return;

  const errEl = document.querySelector('.err[data-for="foto"]');
  errEl.textContent = "";
  if (!file.type.startsWith("image/")) { errEl.textContent = "Fail mesti gambar (JPG atau PNG)."; return; }
  if (file.size > 15 * 1024 * 1024) { errEl.textContent = "Gambar terlalu besar (maksimum 15MB)."; return; }

  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((ok, no) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = no;
      i.src = url;
    });
    const cv = document.createElement("canvas");
    cv.width = FOTO_W; cv.height = FOTO_H;
    const ctx = cv.getContext("2d");
    const scale = Math.max(FOTO_W / img.width, FOTO_H / img.height);   // cover
    const w = img.width * scale, h = img.height * scale;
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, FOTO_W, FOTO_H);
    ctx.drawImage(img, (FOTO_W - w) / 2, (FOTO_H - h) / 2, w, h);
    URL.revokeObjectURL(url);

    fotoData = cv.toDataURL("image/jpeg", 0.9);
    $("preview").style.backgroundImage = `url(${fotoData})`;
    $("preview").classList.add("ada");
  } catch {
    errEl.textContent = "Gambar tidak dapat dibaca. Cuba gambar lain.";
  }
});

// ---------- Pengesahan ----------
const rules = {
  nama:  v => v.trim().length >= 3 || "Sila isi nama penuh.",
  bilik: v => /^[A-Z]\d{3}\s?\([A-Z]\)$/.test(v.trim()) || "Format salah. Contoh: D401 (A)",
  ic:    v => v.trim() === "-" || /^\d{6}-\d{2}-\d{4}$/.test(v.trim()) || "Format salah. Contoh: 080604-06-0215, atau letak (-)",
  reg:   v => /^[A-Z0-9]{8,16}$/.test(v.trim()) || "Format salah. Contoh: 03DTP26F2001"
};

function validate() {
  let ok = true;
  for (const key in rules) {
    const res = rules[key]($(key).value);
    const msg = res === true ? "" : res;
    document.querySelector(`.err[data-for="${key}"]`).textContent = msg;
    $(key).classList.toggle("bad", !!msg);
    if (msg) ok = false;
  }
  const fe = document.querySelector('.err[data-for="foto"]');
  if (!fotoData) { fe.textContent = fe.textContent || "Sila pilih gambar anda."; ok = false; }
  return ok;
}

// ---------- Muat teks dalam satu baris ----------
function fit(el, maxWidth, startPx, minPx = 11) {
  let size = startPx;
  el.style.fontSize = size + "px";
  while (el.scrollWidth > maxWidth && size > minPx) {
    size -= 0.5;
    el.style.fontSize = size + "px";
  }
}

// ---------- Jana PNG ----------
async function renderCard(d) {
  $("c-nama").textContent = d.nama;
  $("c-bilik").textContent = d.bilik;
  $("c-ic").textContent = d.ic;
  $("c-reg").textContent = d.reg;

  $("c-foto").style.backgroundImage = `url(${fotoData})`;
  fit($("c-nama"), 370, 17);
  fit($("c-bilik"), 215, 23, 14);

  await document.fonts.ready;
  const canvas = await html2canvas($("card"), {
    scale: 3,                // ~1323 x 2064 px, tajam untuk cetak
    backgroundColor: null,
    useCORS: true
  });
  return canvas.toDataURL("image/png").split(",")[1];   // base64 tanpa header
}

// ---------- Hantar ke Google Drive ----------
form.addEventListener("submit", async e => {
  e.preventDefault();
  statusEl.className = "";
  statusEl.textContent = "";
  if (!validate()) return;

  const d = {
    nama: $("nama").value.trim(),
    bilik: $("bilik").value.trim(),
    ic: $("ic").value.trim(),
    reg: $("reg").value.trim()
  };

  btn.disabled = true;
  statusEl.textContent = "Sedang menghantar...";

  try {
    const png = await renderCard(d);

    // text/plain = "simple request", tiada masalah CORS dengan Apps Script
    const res = await fetch(C.SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...d, png, kod: C.KOD_AKSES })
    });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || "Gagal");

    form.reset();
    fotoData = "";
    $("preview").style.backgroundImage = "";
    $("preview").classList.remove("ada");
    statusEl.className = "ok";
    statusEl.textContent = "Berjaya dihantar. Kad akan dicetak oleh pihak asrama.";
  } catch (err) {
    console.error(err);
    statusEl.className = "fail";
    statusEl.textContent = "Gagal menghantar. Sila cuba lagi atau hubungi warden.";
  } finally {
    btn.disabled = false;
  }
});
