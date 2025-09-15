require('dotenv').config();
const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === Konfigurasi dari .env ===
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
let GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY || '';
if (GOOGLE_PRIVATE_KEY.includes('\\n')) {
  GOOGLE_PRIVATE_KEY = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
}

// === Helper: Auth ke Google Sheets ===
async function getAuthenticatedDoc() {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY
  });
  await doc.loadInfo();
  return doc;
}

// === Inisialisasi sheet (buat tab jika belum ada) ===
async function initializeSheets() {
  const doc = await getAuthenticatedDoc();
  const sheetTitles = ['Transaksi', 'Anggaran', 'Utang_Piutang', 'Tabungan_Investasi'];
  const headersMap = {
    'Transaksi': ['Tanggal','Jenis','Kategori','Jumlah','Keterangan'],
    'Anggaran': ['Bulan','Kategori','Target','Terpakai','Sisa'],
    'Utang_Piutang': ['Tanggal','Jenis','Nama','Jumlah','Status','Jatuh_Tempo'],
    'Tabungan_Investasi': ['Tanggal','Jenis','Nama','Jumlah','Target','Return']
  };

  for (const title of sheetTitles) {
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
      console.log(`Membuat sheet: ${title}`);
      sheet = await doc.addSheet({ title, headerValues: headersMap[title] });
    }
  }
}

// === ENDPOINTS ===

// --- Transaksi ---
app.get('/api/transaksi', async (req, res) => {
  try {
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Transaksi'];
    const rows = await sheet.getRows();
    const data = rows.map(r => ({
      tanggal: r.Tanggal,
      jenis: r.Jenis,
      kategori: r.Kategori,
      jumlah: r.Jumlah,
      keterangan: r.Keterangan
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transaksi', async (req, res) => {
  try {
    const { tanggal, jenis, kategori, jumlah, keterangan } = req.body;
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Transaksi'];
    await sheet.addRow({ Tanggal: tanggal, Jenis: jenis, Kategori: kategori, Jumlah: jumlah, Keterangan: keterangan });
    res.json({ message: 'Transaksi berhasil disimpan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Anggaran ---
app.get('/api/anggaran', async (req, res) => {
  try {
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Anggaran'];
    const rows = await sheet.getRows();
    const data = rows.map(r => ({
      bulan: r.Bulan,
      kategori: r.Kategori,
      target: r.Target,
      terpakai: r.Terpakai,
      sisa: r.Sisa
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/anggaran', async (req, res) => {
  try {
    const { bulan, kategori, target } = req.body;
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Anggaran'];
    await sheet.addRow({ Bulan: bulan, Kategori: kategori, Target: target, Terpakai: 0, Sisa: target });
    res.json({ message: 'Anggaran berhasil disimpan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Utang / Piutang ---
app.get('/api/utang-piutang', async (req, res) => {
  try {
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Utang_Piutang'];
    const rows = await sheet.getRows();
    const data = rows.map(r => ({
      tanggal: r.Tanggal,
      jenis: r.Jenis,
      nama: r.Nama,
      jumlah: r.Jumlah,
      status: r.Status,
      jatuhTempo: r.Jatuh_Tempo
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/utang-piutang', async (req, res) => {
  try {
    const { tanggal, jenis, nama, jumlah, jatuhTempo } = req.body;
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Utang_Piutang'];
    await sheet.addRow({ Tanggal: tanggal, Jenis: jenis, Nama: nama, Jumlah: jumlah, Status: 'Belum Lunas', Jatuh_Tempo: jatuhTempo || '' });
    res.json({ message: 'Data utang/piutang berhasil disimpan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Tabungan / Investasi ---
app.get('/api/tabungan-investasi', async (req, res) => {
  try {
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Tabungan_Investasi'];
    const rows = await sheet.getRows();
    const data = rows.map(r => ({
      tanggal: r.Tanggal,
      jenis: r.Jenis,
      nama: r.Nama,
      jumlah: r.Jumlah,
      target: r.Target,
      return: r.Return
    }));
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tabungan-investasi', async (req, res) => {
  try {
    const { tanggal, jenis, nama, jumlah, target } = req.body;
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Tabungan_Investasi'];
    await sheet.addRow({ Tanggal: tanggal, Jenis: jenis, Nama: nama, Jumlah: jumlah, Target: target || 0, Return: 0 });
    res.json({ message: 'Data tabungan/investasi berhasil disimpan' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// === Serve frontend ===
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Jalankan server
initializeSheets().then(() => {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error saat inisialisasi:', err.message);
});
