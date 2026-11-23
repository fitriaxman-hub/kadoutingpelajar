const C = window.APP_CONFIG;

const $ = id => document.getElementById(id);
const form = $("form"), btn = $("btn"), statusEl = $("status");

// ---------- Auto uppercase / format ----------
["nama", "bilik", "reg"].forEach(id =>
  $(id).addEventListener("input", e => (e.target.value = e.target.value.toUpperCase()))
);

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
