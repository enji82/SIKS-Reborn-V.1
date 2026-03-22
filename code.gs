/* ======================================================================
   CODE.GS - KONFIGURASI GLOBAL & SISTEM UTAMA
   Berisi: ID Database, ID Folder, Login, & Routing Halaman
   ====================================================================== */

// 1. DATABASE CONFIG (Digunakan oleh semua file .gs lainnya)
const SPREADSHEET_IDS = {
  DATABASE_USER: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SHEET_USER_NAME: "Data User",
  SK_DATA: "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4", // ID Database SK
  
  // ID Lainnya (Biarkan saja jika nanti dipakai modul lain)
  DROPDOWN_DATA: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA", 
  PAUD_DATA: "1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs",
  SD_DATA: "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s",
  LAPBUL_GABUNGAN: "1aKEIkhKApmONrCg-QQbMhXyeGDJBjCZrhR-fvXZFtJU",
  PTK_PAUD_DB: "1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU",
  PTK_SD_DB: "1HlyLv3Ai3_vKFJu3EKznqI9v8g0tfqiNg0UbIojNMQ0",
  DATA_SEKOLAH: "1qeOYVfqFQdoTpysy55UIdKwAJv3VHo4df3g6u6m72Bs",   
  FORM_OPTIONS_DB: "1prqqKQBYzkCNFmuzblNAZE41ag9rZTCiY2a0WvZCTvU",
  SIABA_DB: "1sfbvyIZurU04gictep8hI-NnvicGs0wrDqANssVXt6o",
  SIABA_TA_PA: "1tQsQY1-Ny1ie66GOZPTLtvZ7BiYCgFdNrX-AVGCtaHA",
  SIABA_SALAH_DB: "1TZGrMiTuyvh2Xbo44RhJuWlQnOC5LzClsgIoNKtRFkY",
  SIABA_DINAS_DB: "1I_2yUFGXnBJTCSW6oaT3D482YCs8TIRkKgQVBbvpa1M",
  SIABA_CUTI_DB: "1DhBjmLHFMuJqWM6yJHsm-1EKvHzG8U4zK2GuU-dIgn8",
  SIABA_REKAP_HELPER: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SIABA_SKP_SOURCE: "1ReJt2qoDE2f_8LeR8DXJbROB9EAHK8qP2kYp-ZZ3V9w", 
  SIABA_SKP_DB: "1T-AQ0jYJ_jXYEPxzu_KZauOlRTTforVtFEZ_1UrWHwk",
  SIABA_PNS_DB: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SIABA_PAK_DB: "1mAXwf7cHaOqIj2uf51Fup5tyyBzijTeIxVS8uO1E4dM",
};

// 2. FOLDER CONFIG (Digunakan oleh semua file .gs lainnya)
const FOLDER_CONFIG = {
  MAIN_SK: "1GwIow8B4O1OWoq3nhpzDbMO53LXJJUKs", // Folder Utama SK
  TRASH_SK: "1OB2Mxa_zvpYl7Vru9NEddYmBlU5SfYHL", // Folder Sampah SK
  
  // Folder Lainnya
  LAPBUL_KB: "18CxRT-eledBGRtHW1lFd2AZ8Bub6q5ra",
  LAPBUL_TK: "1WUNz_BSFmcwRVlrG67D2afm9oJ-bVI9H",
  LAPBUL_SD: "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El",
  SIABA_LUPA: "10kwGuGfwO5uFreEt7zBJZUaDx1fUSXo9",
  SIABA_DINAS: "1uPeOU7F_mgjZVyOLSsj-3LXGdq9rmmWl",
  SIABA_CUTI_DOCS: "1fAmqJXpmGIfEHoUeVm4LjnWvnwVwOfNM",
  SIABA_REKAP_ARCHIVE: "1MoGuseJNrOIMnkZNoqkKcK282jZpUkAm",
  SIABA_SKP_DOCS: "1DGYC8AtJFCpCZ0ou2ae9-5fc2-bWl20G",
  SIABA_PAK_DOCS: "1cvn-pOufs-OIbFQfqhmxc3fcmFuox4Sc",
};

// ==========================================
// 2. CORE WEB APP (DoGet & Routing)
// ==========================================
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
      .setTitle('SIKS - REBORN')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

// Routing Halaman (KEMBALI KE NAMA ASLI 'getHalaman')
function getHalaman(namaFile) {
  try {
    const prefix = "page_";
    const realName = namaFile.startsWith(prefix) ? namaFile : prefix + namaFile;
    return HtmlService.createTemplateFromFile(realName).evaluate().getContent();
  } catch (err) {
    return '<div class="alert alert-danger p-3">Halaman <b>' + namaFile + '</b> belum dibuat atau nama file salah.</div>';
  }
}

// Alias untuk loadPage (jaga-jaga jika ada script lain yang memanggil)
function loadPage(namaFile) { return getHalaman(namaFile); }

// ==========================================
// 3. AUTH SYSTEM (MANUAL LOGIN)
// ==========================================

// A. PROSES CEK PASSWORD (SAAT TOMBOL LOGIN DITEKAN)
function processLogin(formObj) {
  try {
    var inputUser = "";
    var inputPass = "";
    
    if (typeof formObj === 'object' && formObj.username) {
      inputUser = String(formObj.username).trim();
      inputPass = String(formObj.password).trim();
    } else {
      inputUser = String(arguments[0]).trim();
      inputPass = String(arguments[1]).trim();
    }

    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER); 
    var sheet = ss.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME);
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Kolom A=Username, B=Password, C=Nama Lengkap, D=Role, E=Foto
      if (String(row[0]).trim().toLowerCase() == inputUser.toLowerCase() && String(row[1]).trim() == inputPass) {
        
        var realName = row[2]; // Nama dari Excel
        
        // JIKA NAMA KOSONG DI EXCEL, PAKAI USERNAME AGAR TIDAK ERROR
        if (!realName || realName === "") realName = row[0];

        var userObj = {
          username: row[0],
          nama_lengkap: realName, // KUNCI UTAMA
          nama: realName,         // KUNCI CADANGAN (Legacy Support)
          role: row[3],     
          photo: row[4] || "", 
          unit: row[4] || "",     // Asumsi Unit ada di kolom E juga/sesuaikan
          isLoggedIn: true
        };
        
        return { 
          status: 'success', 
          message: 'Login Berhasil',
          userData: userObj 
        };
      }
    }
    return { status: 'error', message: 'Username atau Password Salah.' };
  } catch (e) {
    return { status: 'error', message: 'Error Server: ' + e.toString() };
  }
}

// FUNGSI INI SUDAH TIDAK DIPERLUKAN LAGI (BISA DIHAPUS ATAU BIARKAN KOSONG)
// Karena pengecekan user sekarang dilakukan di sisi client (browser)
function getCurrentUser() {
  return null; 
}

function processLogout() {
  // Tidak ada yang perlu dihapus di server
  return { status: 'success' };
}


// ==========================================
// 4. VISITOR COUNTER & SETTING
// ==========================================
function getVisitorStats() {
  var props = PropertiesService.getScriptProperties();
  var today = new Date().toLocaleDateString("id-ID"); 
  
  // Statistik Hits
  var totalHits = Number(props.getProperty('TOTAL_HITS')) || 0;
  var lastDate = props.getProperty('LAST_DATE_HIT');
  var todayHits = Number(props.getProperty('TODAY_HITS')) || 0;
  
  // Ambil Data Online Terupdate
  var onlineCount = Number(props.getProperty('ONLINE_COUNT')) || 0;

  if (lastDate !== today) {
    todayHits = 0;
    props.setProperty('LAST_DATE_HIT', today);
  }

  totalHits++;
  todayHits++;
  props.setProperty('TOTAL_HITS', totalHits.toString());
  props.setProperty('TODAY_HITS', todayHits.toString());

  // Running Text & User Count
  var totalUsers = 0;
  var infoText = "Selamat Datang di SIKS-REBORN";

  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
    // Hitung User
    var sheetUser = ss.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME);
    if(sheetUser) totalUsers = sheetUser.getLastRow() - 1;
    // Ambil Running Text
    var sheetSetting = ss.getSheetByName("SETTING");
    if (sheetSetting) infoText = sheetSetting.getRange("B1").getValue();
  } catch (e) {
    infoText = "Maintenance Mode";
  }

  return { 
    total: totalHits, 
    today: todayHits, 
    users: totalUsers, 
    online: onlineCount, // <--- Data Baru dikirim ke sini
    info: infoText 
  };
}

function saveRunningText(textBaru) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
    var sheet = ss.getSheetByName("SETTING");
    if (!sheet) {
      sheet = ss.insertSheet("SETTING");
      sheet.getRange("A1").setValue("RUNNING_TEXT");
    }
    sheet.getRange("B1").setValue(textBaru);
    return { status: 'success', message: 'Berhasil disimpan!' };
  } catch (e) {
    return { status: 'error', message: 'Gagal: ' + e.message };
  }
}

// Untuk memuat halaman Setting di Sidebar
function loadPageSetting() {
  return HtmlService.createTemplateFromFile('page_setting').evaluate().getContent();
}

/* ======================================================================
   MODUL: MONITORING AKTIVITAS (TURBO SPLIT)
   ====================================================================== */

// JALUR 1: STATISTIK & GRAFIK (Cepat)
function getMonitoring_Charts() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
    var sheetLog = ss.getSheetByName("LOG_ACCESS");
    if (!sheetLog) return { error: "Sheet LOG_ACCESS tidak ditemukan" };

    // Ambil Data: Kolom A (Timestamp) & F (Jenis Hari)
    // Kita tidak butuh nama user disini, jadi lebih ringan
    var lastRow = sheetLog.getLastRow();
    if (lastRow < 2) return { empty: true };
    
    // Ambil A sampai F
    var data = sheetLog.getRange(2, 1, lastRow - 1, 6).getValues();

    var stats = {
      total: data.length, kerja: 0, libur: 0,
      daily: {}, weekly: {}, monthly: {}
    };

    var months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rawTime = row[0]; // Timestamp
      var jenis = String(row[5] || "").toLowerCase(); // Jenis Hari

      // 1. Hitung Kerja vs Libur
      if (jenis.includes("libur") || jenis.includes("minggu") || jenis.includes("sabtu")) {
        stats.libur++;
      } else {
        stats.kerja++;
      }

      // 2. Olah Tanggal
      var d = new Date(rawTime);
      if (isNaN(d.getTime())) continue; // Skip jika tanggal error

      // Harian (yyyy-mm-dd)
      var tglKey = Utilities.formatDate(d, "Asia/Jakarta", "yyyy-MM-dd");
      stats.daily[tglKey] = (stats.daily[tglKey] || 0) + 1;

      // Bulanan (Nama Bulan)
      var blnKey = months[d.getMonth()] + " " + d.getFullYear();
      stats.monthly[blnKey] = (stats.monthly[blnKey] || 0) + 1;

      // Mingguan (Week Number)
      var weekNum = Utilities.formatDate(d, "Asia/Jakarta", "w");
      var weekKey = "Minggu " + weekNum;
      stats.weekly[weekKey] = (stats.weekly[weekKey] || 0) + 1;
    }

    return JSON.stringify(stats);

  } catch (e) { return JSON.stringify({ error: e.toString() }); }
}

// JALUR 2: ANALISA USER (Ranking & Pasif)
function getMonitoring_Users() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
    
    // 1. Ambil Log User (Kolom D = Nama User)
    var sheetLog = ss.getSheetByName("LOG_ACCESS");
    var userActivityMap = {}; // Menghitung frekuensi login
    
    if (sheetLog && sheetLog.getLastRow() > 1) {
      // Ambil hanya kolom D (Index 4)
      var dataLog = sheetLog.getRange(2, 4, sheetLog.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < dataLog.length; i++) {
        var uName = String(dataLog[i][0]).trim();
        if (uName) {
          userActivityMap[uName] = (userActivityMap[uName] || 0) + 1;
        }
      }
    }

    // 2. Hitung Top 10
    var ranking = [];
    for (var key in userActivityMap) {
      ranking.push({ name: key, count: userActivityMap[key] });
    }
    // Sort Descending
    ranking.sort(function(a, b) { return b.count - a.count; });
    var top10 = ranking.slice(0, 10);

    // 3. Cari User Pasif (Bandingkan dengan Database User)
    var userPasif = [];
    var sheetUser = ss.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME); // Pastikan variable global ini benar
    if (sheetUser && sheetUser.getLastRow() > 1) {
      // Asumsi Nama User ada di Kolom C (Index 3) di sheet USER_DATA
      // Sesuaikan index kolom ini dengan database user Anda!
      var dataUser = sheetUser.getRange(2, 3, sheetUser.getLastRow() - 1, 1).getValues();
      
      for (var j = 0; j < dataUser.length; j++) {
        var dbName = String(dataUser[j][0]).trim();
        if (dbName && !userActivityMap[dbName]) {
           userPasif.push(dbName);
        }
      }
    }

    return JSON.stringify({
      topUsers: top10,
      passiveUsers: userPasif
    });

  } catch (e) { return JSON.stringify({ error: e.toString() }); }
}

/* ======================================================================
   MODUL: LOGGER PENGUNJUNG (REQUIRED FOR HOME & MONITORING)
   ====================================================================== */

function logUserVisit(userData) {
  if (!userData) return;
  
  // 1. UPDATE STATUS ONLINE
  updateOnlineStatus(userData.username || userData.nama); // Pakai Username untuk ID Unik

  // 2. SIMPAN LOG
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
    var sheet = ss.getSheetByName("LOG_ACCESS");
    
    if (!sheet) {
        sheet = ss.insertSheet("LOG_ACCESS");
        sheet.appendRow(["Timestamp", "Tanggal", "Bulan", "Nama User", "Role", "Jenis Hari"]);
    }
    
    var now = new Date();
    var timestamp = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var tgalOnly  = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    var blnOnly   = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM");
    
    // LOGIC HARI LIBUR... (Sama seperti sebelumnya)
    var dayIndex = now.getDay();
    var jenisHari = (dayIndex === 0 || dayIndex === 6) ? "Hari Libur" : "Hari Efektif";
    
    // PRIORITAS NAMA: Cek nama_lengkap dulu, baru nama, baru username
    var namaLog = userData.nama_lengkap || userData.nama || userData.username || "Unknown";

    sheet.appendRow([
        timestamp, 
        tgalOnly, 
        blnOnly, 
        namaLog, // <--- INI SUDAH DIPERBAIKI
        userData.role, 
        jenisHari
    ]);
    
  } catch (e) { console.log("Log Error: " + e.message); }
}

/* ======================================================================
   MODUL: LOGGER PENGUNJUNG & ONLINE TRACKER (WAJIB ADA)
   ====================================================================== */

// 1. UPDATE STATUS ONLINE (Untuk menghitung User Online Realtime)
function updateOnlineStatus(username) {
  try {
    var props = PropertiesService.getScriptProperties();
    var now = new Date().getTime();
    var cutoff = now - (10 * 60 * 1000); // Batas aktif: 10 Menit terakhir
    
    // Ambil database user online dari memori script
    var json = props.getProperty('ONLINE_USERS_DB');
    var activeUsers = json ? JSON.parse(json) : {};
    
    // Masukkan user ini (Update waktu terakhir akses)
    if (username) activeUsers[username] = now;
    
    // Bersihkan user yang sudah offline (lebih dari 10 menit tidak aktif)
    var cleanList = {};
    var count = 0;
    for (var u in activeUsers) {
      if (activeUsers[u] > cutoff) {
        cleanList[u] = activeUsers[u];
        count++;
      }
    }
    
    // Simpan Kembali ke Properti Script
    props.setProperty('ONLINE_USERS_DB', JSON.stringify(cleanList));
    props.setProperty('ONLINE_COUNT', count.toString());
    
  } catch (e) {
    console.log("Online Tracker Error: " + e.message);
  }
}

// 2. LOG VISITOR KE SPREADSHEET (Untuk Data Historis & Grafik)
function logUserVisit(userData) {
  // Cegah error jika data user kosong
  if (!userData) return;
  
  // A. Update Status Online (Realtime)
  updateOnlineStatus(userData.username || userData.nama);

  // B. Simpan Log Permanen ke Spreadsheet
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
    var sheet = ss.getSheetByName("LOG_ACCESS");
    
    // Jika sheet belum ada, buat baru otomatis
    if (!sheet) {
        sheet = ss.insertSheet("LOG_ACCESS");
        sheet.appendRow(["Timestamp", "Tanggal", "Bulan", "Nama User", "Role", "Jenis Hari"]);
    }
    
    var now = new Date();
    var timestamp = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var tgalOnly  = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd");
    var blnOnly   = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM");
    
    // Cek Hari Libur (Sabtu/Minggu)
    var dayIndex = now.getDay();
    var jenisHari = "Hari Efektif";
    var ketHari = "Reguler";

    // 1. Cek Weekend
    if (dayIndex === 0 || dayIndex === 6) {
      jenisHari = "Hari Libur";
      ketHari = (dayIndex === 0) ? "Minggu" : "Sabtu";
    }

    // 2. Cek Kalender Libur (Jika Anda punya sheet DATA_LIBUR)
    var sheetLibur = ss.getSheetByName("DATA_LIBUR");
    if (sheetLibur && sheetLibur.getLastRow() > 1) {
      var dataLibur = sheetLibur.getRange(2, 1, sheetLibur.getLastRow()-1, 2).getValues();
      for (var i = 0; i < dataLibur.length; i++) {
        var tglLibur = Utilities.formatDate(new Date(dataLibur[i][0]), "Asia/Jakarta", "yyyy-MM-dd");
        if (tglLibur === tgalOnly) {
          jenisHari = "Hari Libur";
          ketHari = dataLibur[i][1];
          break;
        }
      }
    }

    // Simpan Baris Log
    sheet.appendRow([
        timestamp, 
        tgalOnly, 
        blnOnly, 
        userData.nama || userData.username, 
        userData.role, 
        jenisHari + " (" + ketHari + ")"
    ]);
    
  } catch (e) {
    console.log("Log Error: " + e.message);
  }
}

/* ======================================================================
   MODUL: SELF-HEALING USER DATA (FIX NAMA "USER WEB")
   ====================================================================== */

function getUserProfileByName(username) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER); // Pastikan ID ini benar
    var sheet = ss.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME); // Pastikan Nama Sheet benar
    var data = sheet.getDataRange().getValues();

    // Loop cari username (Kolom A / Index 0)
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === String(username).trim().toLowerCase()) {
        // Asumsi Struktur Kolom Database User:
        // A=Username, B=Password, C=Nama Lengkap, D=Role, E=Unit/Foto
        return {
          found: true,
          username: data[i][0],
          nama_lengkap: data[i][2], // Kolom C
          role: data[i][3],         // Kolom D
          unit: data[i][4]          // Kolom E
        };
      }
    }
    return { found: false };
  } catch (e) {
    return { found: false, error: e.toString() };
  }
}