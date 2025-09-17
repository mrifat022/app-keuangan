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

// === Inisialisasi sheet ===
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
      jumlah: Number(r.Jumlah) || 0,
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
      target: Number(r.Target) || 0,
      terpakai: Number(r.Terpakai) || 0,
      sisa: Number(r.Sisa) || 0
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
      jumlah: Number(r.Jumlah) || 0,
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
      jumlah: Number(r.Jumlah) || 0,
      target: Number(r.Target) || 0,
      return: Number(r.Return) || 0
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

// --- Dashboard ---
app.get('/api/dashboard', async (req, res) => {
  try {
    const doc = await getAuthenticatedDoc();
    
    // Transaksi
    const transaksiRows = await doc.sheetsByTitle['Transaksi'].getRows();
    let pemasukan = 0, pengeluaran = 0;
    transaksiRows.forEach(r => {
      if (r.Jenis === 'Pemasukan') pemasukan += Number(r.Jumlah) || 0;
      if (r.Jenis === 'Pengeluaran') pengeluaran += Number(r.Jumlah) || 0;
    });

    // Utang Piutang
    const utangRows = await doc.sheetsByTitle['Utang_Piutang'].getRows();
    let totalUtang = 0, totalPiutang = 0;
    utangRows.forEach(r => {
      if (r.Jenis === 'Utang' && r.Status !== 'Lunas') totalUtang += Number(r.Jumlah) || 0;
      if (r.Jenis === 'Piutang' && r.Status !== 'Lunas') totalPiutang += Number(r.Jumlah) || 0;
    });

    // Tabungan & Investasi
    const tabunganRows = await doc.sheetsByTitle['Tabungan_Investasi'].getRows();
    let totalTabungan = 0, totalInvestasi = 0;
    tabunganRows.forEach(r => {
      if (r.Jenis === 'Tabungan') totalTabungan += Number(r.Jumlah) || 0;
      if (r.Jenis === 'Investasi') totalInvestasi += Number(r.Jumlah) || 0;
    });

    res.json({
      pemasukan, pengeluaran,
      saldo: pemasukan - pengeluaran,
      utang: totalUtang,
      piutang: totalPiutang,
      tabungan: totalTabungan,
      investasi: totalInvestasi
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Laporan Bulanan ---
app.get('/api/laporan/bulanan/:tahun/:bulan', async (req, res) => {
  try {
    const { tahun, bulan } = req.params;
    const doc = await getAuthenticatedDoc();
    const sheet = doc.sheetsByTitle['Transaksi'];
    const rows = await sheet.getRows();

    const transaksi = rows.filter(r => {
      if (!r.Tanggal) return false;
      const d = new Date(r.Tanggal);
      return d.getFullYear() === Number(tahun) && (d.getMonth() + 1) === Number(bulan);
    });

    let pemasukan = 0, pengeluaran = 0;
    const kategoriPengeluaran = {};
    transaksi.forEach(r => {
      const jumlah = Number(r.Jumlah) || 0;
      if (r.Jenis === 'Pemasukan') pemasukan += jumlah;
      if (r.Jenis === 'Pengeluaran') {
        pengeluaran += jumlah;
        kategoriPengeluaran[r.Kategori] = (kategoriPengeluaran[r.Kategori] || 0) + jumlah;
      }
    });

    res.json({
      bulan: `${tahun}-${bulan}`,
      pemasukan,
      pengeluaran,
      saldo: pemasukan - pengeluaran,
      rincianPengeluaran: kategoriPengeluaran
    });
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
