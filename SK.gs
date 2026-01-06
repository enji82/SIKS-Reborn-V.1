function getSkArsipFolderIds() {
  try {
    return {
      'MAIN_SK': FOLDER_CONFIG.MAIN_SK
    };
  } catch (e) {
    return handleError('getSkArsipFolderIds', e);
  }
}

function processManualForm(formData) {
  try {
    Logger.log("--- [DEBUG] MULAI UPLOAD SK ---");
    Logger.log("User Input yang diterima dari Form: " + formData.userInput);

    const targetSheetName = "Unggah_SK"; 
    const config = SPREADSHEET_CONFIG.SK_FORM_RESPONSES; 
    const ss = SpreadsheetApp.openById(config.id);
    const sheet = ss.getSheetByName(targetSheetName);

    if (!sheet) throw new Error(`Sheet "${targetSheetName}" tidak ditemukan.`);

    const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK);  
    const tahunAjaranFolderName = formData.tahunAjaran.replace(/\//g, '-');
    const tahunAjaranFolder = getOrCreateFolder(mainFolder, tahunAjaranFolderName);
    const semesterFolderName = formData.semester;
    const targetFolder = getOrCreateFolder(tahunAjaranFolder, semesterFolderName);

    const newFilename = `${formData.namaSD} - ${tahunAjaranFolderName} - ${formData.semester} - ${formData.kriteriaSK}.pdf`;
    
    const decodedData = Utilities.base64Decode(formData.fileData.data);
    const blob = Utilities.newBlob(decodedData, formData.fileData.mimeType, newFilename);
    const newFile = targetFolder.createFile(blob);
    const fileUrl = newFile.getUrl();
    
    // LOGIKA PENYIMPANAN
    const newRow = [ 
      new Date(),                   
      formData.namaSD,              
      formData.tahunAjaran,         
      formData.semester,            
      formData.nomorSK,             
      new Date(formData.tanggalSK), 
      formData.kriteriaSK,          
      fileUrl,                      
      formData.userInput,           // <--- Titik Kritis 1
      "Diproses"                    
    ];
    
    Logger.log("Data yang akan disimpan ke Sheet: " + JSON.stringify(newRow));
    sheet.appendRow(newRow);
    
    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 6).setNumberFormat("dd-MM-yyyy");

    Logger.log("--- [DEBUG] SELESAI UPLOAD ---");
    return "Dokumen SK berhasil diunggah dan status 'Diproses'.";
  } catch (e) {
    Logger.log("ERROR processManualForm: " + e.message);
    return handleError('processManualForm', e);
  }
}

function getSKRiwayatData() {
  try {
    // === KONFIGURASI ===
    // Pastikan SPREADSHEET_CONFIG sudah ada di file Config.gs atau Code.gs
    // Jika belum ada, ganti baris di bawah dengan ID manual: 
    // const sheetId = "ID_SPREADSHEET_ANDA_DISINI";
    
    const config = SPREADSHEET_CONFIG.SK_FORM_RESPONSES; 
    const targetSheetName = "Unggah_SK"; 
    
    const ss = SpreadsheetApp.openById(config.id);
    const sheet = ss.getSheetByName(targetSheetName);

    if (!sheet) {
      return { headers: [], rows: [] }; 
    }

    const allData = sheet.getDataRange().getValues();
    if (allData.length < 2) return { headers: [], rows: [] };

    // Mapping Header (Lowercase)
    const originalHeaders = allData[0].map(h => String(h).trim().toLowerCase());
    const headerMap = {};
    originalHeaders.forEach((h, index) => { headerMap[h] = index; });

    const dataRows = allData.slice(1);
    
    // Sort Data (Terbaru di atas)
    const timestampIndex = headerMap['tanggal unggah'];
    if (timestampIndex !== undefined) {
        dataRows.sort((a, b) => {
            const dateA = a[timestampIndex] instanceof Date ? a[timestampIndex].getTime() : 0;
            const dateB = b[timestampIndex] instanceof Date ? b[timestampIndex].getTime() : 0;
            return dateB - dateA; 
        });
    }

    // Ambil Data
    let structuredRows = dataRows.map(row => {
      const getVal = (key) => {
         const idx = headerMap[key];
         return (idx !== undefined) ? row[idx] : null;
      };

      const rowObj = {};
      rowObj['Nama SD']      = getVal('nama sd') || '-';
      rowObj['Tahun Ajaran'] = getVal('tahun ajaran') || '-';
      rowObj['Semester']     = getVal('semester') || '-';
      rowObj['Nomor SK']     = getVal('nomor sk') || '-';
      rowObj['Kriteria SK']  = getVal('kriteria sk') || '-';
      
      // Handle Link Dokumen
      const dokVal = getVal('link dokumen') || getVal('dokumen');
      rowObj['Dokumen'] = dokVal || '#';

      // Handle User Input
      const userVal = getVal('user input') || getVal('userinput');
      rowObj['User Input'] = userVal || '-';

      // Handle Status
      rowObj['Status'] = getVal('status') || 'Diproses';

      // Format Tanggal SK
      const tglSK = getVal('tanggal sk');
      rowObj['Tanggal SK'] = (tglSK instanceof Date) ? 
          Utilities.formatDate(tglSK, Session.getScriptTimeZone(), "dd/MM/yyyy") : (tglSK || '');

      return rowObj;
    });

    return { headers: [], rows: structuredRows };
  } catch (e) {
    throw new Error("Backend Error (getSKRiwayatData): " + e.message);
  }
}

function getSKStatusData() {
  try {
    const config = SPREADSHEET_CONFIG.SK_FORM_RESPONSES; 
    const targetSheetName = "Status_SK"; 
    
    const ss = SpreadsheetApp.openById(config.id);
    const sheet = ss.getSheetByName(targetSheetName);

    if (!sheet) return { headers: [], rows: [] }; 

    // Ambil Semua Data
    const data = sheet.getDataRange().getDisplayValues(); // getDisplayValues agar tanggal/angka sesuai tampilan sheet
    if (data.length < 2) return { headers: [], rows: [] };

    // BARIS 1: Header
    const headers = data[0]; // ["No", "Nama Sekolah", "2021 Ganjil", "2021 Genap", ...]

    // BARIS 2 dst: Isi Data
    const rows = data.slice(1);

    return { 
      headers: headers,
      rows: rows 
    };
    
  } catch (e) {
    throw new Error("Gagal mengambil data Status: " + e.message);
  }
}

function getArsipData(folderId) {
  try {
    // 1. AMBIL ID DARI CONFIG TERPUSAT (Code.gs)
    // Pastikan FOLDER_CONFIG.MAIN_SK sudah didefinisikan di Code.gs
    const rootId = FOLDER_CONFIG.MAIN_SK; 
    
    if (!rootId) {
      throw new Error("ID Folder belum diset di FOLDER_CONFIG.MAIN_SK (Code.gs)");
    }
    
    // Jika frontend tidak kirim ID (saat pertama buka), pakai Root ID dari Config
    const targetId = folderId || rootId; 
    
    const folder = DriveApp.getFolderById(targetId);
    if (!folder) throw new Error("Folder tidak ditemukan di Google Drive");

    let items = [];

    // 2. AMBIL FOLDER (Sub-folder)
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      let f = subFolders.next();
      items.push({
        id: f.getId(),
        name: f.getName(),
        type: 'folder',
        mimeType: 'application/vnd.google-apps.folder',
        date: f.getLastUpdated(),
        size: '-'
      });
    }

    // 3. AMBIL FILE
    const files = folder.getFiles();
    while (files.hasNext()) {
      let f = files.next();
      // Format ukuran file (KB/MB)
      let sizeBytes = f.getSize();
      let sizeStr = (sizeBytes / 1024).toFixed(1) + " KB";
      if (sizeBytes > 1024 * 1024) sizeStr = (sizeBytes / (1024 * 1024)).toFixed(1) + " MB";

      items.push({
        id: f.getId(),
        name: f.getName(),
        type: 'file',
        mimeType: f.getMimeType(),
        url: f.getUrl(), // Link untuk buka file
        date: f.getLastUpdated(),
        size: sizeStr
      });
    }

    // 4. SORTING: Folder di atas, File di bawah. Lalu urut abjad.
    items.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
    });

    // 5. BREADCRUMB (Jalur Navigasi)
    let parentId = null;
    // Cek apakah kita sedang berada di dalam sub-folder (bukan di root)
    if (targetId !== rootId) {
      const parents = folder.getParents();
      if (parents.hasNext()) parentId = parents.next().getId();
    }

    return {
      currentId: targetId,
      currentName: folder.getName(),
      parentId: parentId,
      isRoot: (targetId === rootId),
      items: items.map(i => ({
         ...i,
         date: Utilities.formatDate(i.date, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm")
      }))
    };

  } catch (e) {
    throw new Error("Gagal akses Drive: " + e.message);
  }
}

function getSKDataByRow(rowIndex) {
  try {
    const config = SPREADSHEET_CONFIG.SK_FORM_RESPONSES;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    
    // Ambil nilai mentah (RAW) untuk mendapatkan objek Date asli
    const rawValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
    // Ambil nilai tampilan (DISPLAY) untuk konsistensi string/angka
    const displayValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
    
    const rowData = {};
    headers.forEach((header, i) => {
      // KUNCI PERBAIKAN: Format Tanggal SK ke YYYY-MM-DD
      if (header === 'Tanggal SK' && rawValues[i] instanceof Date) {
        // Format yang wajib untuk HTML input type="date"
        rowData[header] = Utilities.formatDate(rawValues[i], "UTC", "yyyy-MM-dd");
      } else {
        // Gunakan display value untuk field lain (Nomor SK, dll.)
        rowData[header] = displayValues[i];
      }
    });
    return rowData;
  } catch (e) {
    return handleError("getSKDataByRow", e);
  }
}

function updateSKData(formData) {
  try {
    const config = SPREADSHEET_CONFIG.SK_FORM_RESPONSES;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
    
    const range = sheet.getRange(formData.rowIndex, 1, 1, headers.length);
    const existingRowValues = range.getDisplayValues()[0];
    const existingRowObject = {};
    headers.forEach((header, i) => { existingRowObject[header] = existingRowValues[i]; });

    const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK);
    const tahunAjaranFolderName = existingRowObject['Tahun Ajaran'].replace(/\//g, '-');
    const tahunAjaranFolder = getOrCreateFolder(mainFolder, tahunAjaranFolderName);
    
    let fileUrl = existingRowObject['Dokumen'];
    const fileUrlIndex = headers.indexOf('Dokumen');

    const newSemesterFolderName = formData['Semester'];
    const newTargetFolder = getOrCreateFolder(tahunAjaranFolder, newSemesterFolderName);
    const newFilename = `${existingRowObject['Nama SD']} - ${tahunAjaranFolderName} - ${newSemesterFolderName} - ${formData['Kriteria SK']}.pdf`;

    if (formData.fileData && formData.fileData.data) {
      if (fileUrlIndex > -1 && existingRowObject['Dokumen']) {
        try {
          const fileId = existingRowObject['Dokumen'].match(/[-\w]{25,}/);
          if (fileId) DriveApp.getFileById(fileId[0]).setTrashed(true);
        } catch (e) {
          Logger.log(`Gagal menghapus file lama saat upload baru: ${e.message}`);
        }
      }
      
      const decodedData = Utilities.base64Decode(formData.fileData.data);
      const blob = Utilities.newBlob(decodedData, formData.fileData.mimeType, newFilename);
      const newFile = newTargetFolder.createFile(blob);
      fileUrl = newFile.getUrl();

    } else if (fileUrlIndex > -1 && existingRowObject['Dokumen']) {
        const fileIdMatch = existingRowObject['Dokumen'].match(/[-\w]{25,}/);
        if (fileIdMatch) {
            const fileId = fileIdMatch[0];
            const file = DriveApp.getFileById(fileId);
            const currentFileName = file.getName();
            const currentParentFolder = file.getParents().next();

            if (currentFileName !== newFilename || currentParentFolder.getName() !== newSemesterFolderName) {
                file.moveTo(newTargetFolder);
                file.setName(newFilename);
                fileUrl = file.getUrl();
            }
        }
    }
    
    formData['Dokumen'] = fileUrl;
    formData['Update'] = new Date();

    const newRowValuesForSheet = headers.map(header => {
      return formData.hasOwnProperty(header) ? formData[header] : existingRowObject[header];
    });

    sheet.getRange(formData.rowIndex, 1, 1, headers.length).setValues([newRowValuesForSheet]);
    
    const tanggalSKIndex = headers.indexOf('Tanggal SK');
    if (tanggalSKIndex !== -1) {
      sheet.getRange(formData.rowIndex, tanggalSKIndex + 1).setNumberFormat("dd-MM-yyyy");
    }
    
    return "Data berhasil diperbarui!";
  } catch (e) {
    return handleError('updateSKData', e);
  }
}

function deleteSKData(rowIndex, deleteCode) {
  try {
    const todayCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(deleteCode).trim() !== todayCode) throw new Error("Kode Hapus salah.");

    const config = SPREADSHEET_CONFIG.SK_FORM_RESPONSES;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const fileUrlIndex = headers.findIndex(h => h.trim().toLowerCase() === 'dokumen');
    
    if (fileUrlIndex !== -1) {
        const fileUrl = sheet.getRange(rowIndex, fileUrlIndex + 1).getValue();
        if (fileUrl && typeof fileUrl === 'string') {
            const fileId = fileUrl.match(/[-\w]{25,}/);
            if (fileId) {
                try {
                    DriveApp.getFileById(fileId[0]).setTrashed(true);
                } catch (err) {
                    Logger.log(`Gagal menghapus file dengan ID ${fileId[0]}: ${err.message}`);
                }
            }
        }
    }
    
    sheet.deleteRow(rowIndex);
    return "Data dan file terkait berhasil dihapus.";
  } catch (e) {
    return handleError("deleteSKData", e);
  }
}

function getSKDashboardData() {
  try {
    var ssId = "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4"; 
    var ss;
    try { ss = SpreadsheetApp.openById(ssId); } catch(e) { return { error: "Gagal buka Spreadsheet." }; }

    var sheetUnggah = ss.getSheetByName("Unggah_SK");
    if (!sheetUnggah) return { error: "Sheet 'Unggah_SK' tidak ditemukan." };

    var dataUnggah = sheetUnggah.getDataRange().getDisplayValues();
    var rowsUnggah = dataUnggah.length > 1 ? dataUnggah.slice(1) : [];
    var headUnggah = dataUnggah[0] || [];

    // Mapping Index
    var idxTgl = headUnggah.indexOf("Timestamp"); 
    if(idxTgl < 0) idxTgl = headUnggah.indexOf("Waktu Input");
    if(idxTgl < 0) idxTgl = 0; 

    var idxStatus = headUnggah.indexOf("Status");
    
    // Index Data Lain
    var idxSD = headUnggah.indexOf("Nama Sekolah"); if(idxSD < 0) idxSD = headUnggah.indexOf("Nama SD");
    var idxThn = headUnggah.indexOf("Tahun Ajaran");
    var idxSem = headUnggah.indexOf("Semester");
    var idxKrit = headUnggah.indexOf("Kriteria SK");

    var stats = {
      total: rowsUnggah.length,
      statusCounts: { 'OK': 0, 'Ditolak': 0, 'Diproses': 0 },
      monthlyCounts: {},
      recent: []
    };

    // LOOPING DATA
    rowsUnggah.forEach(function(row) {
      
      // 1. PERBAIKAN LOGIKA STATUS (Case Insensitive & Trim)
      var rawStatus = (row[idxStatus] || '').toString().trim().toUpperCase(); // Ubah ke Huruf Besar semua
      
      if (rawStatus === 'OK' || rawStatus.includes('TERIMA')) {
        stats.statusCounts['OK']++;
      } 
      else if (rawStatus.includes('TOLAK') || rawStatus.includes('REVISI')) {
        stats.statusCounts['Ditolak']++;
      } 
      else {
        // Sisanya (Diproses, Kosong, dll)
        stats.statusCounts['Diproses']++;
      }

      // 2. Hitung Tren Bulanan
      var tglStr = row[idxTgl];
      if (tglStr) {
        var dateObj = parseDateRobust(tglStr); 
        if (dateObj) {
             var monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
             var monthLabel = monthNames[dateObj.getMonth()];
             if (!stats.monthlyCounts[monthLabel]) stats.monthlyCounts[monthLabel] = 0;
             stats.monthlyCounts[monthLabel]++;
        }
      }
    });

    // 3. Ambil 5 Aktivitas Terakhir
    var recentData = rowsUnggah.slice(-5).reverse();
    stats.recent = recentData.map(function(row) {
      var rawTgl = row[idxTgl] || '';
      var displayDate = rawTgl.split(' ')[0]; 

      return {
        'Tanggal': displayDate || '-',
        'NamaSD': (idxSD > -1) ? row[idxSD] : '-',
        'Tahun': (idxThn > -1) ? row[idxThn] : '-',
        'Semester': (idxSem > -1) ? row[idxSem] : '-',
        'Kriteria': (idxKrit > -1) ? row[idxKrit] : '-'
      };
    });

    return stats;

  } catch (e) {
    return { error: "Error Backend: " + e.message };
  }
}

function parseDateRobust(dateStr) {
  if (!dateStr) return null;
  var datePart = dateStr.split(' ')[0]; 
  var parts = datePart.split('/');
  if (parts.length === 3) {
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1; 
    var year = parseInt(parts[2], 10);
    var d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  var d2 = new Date(dateStr);
  if (!isNaN(d2.getTime())) return d2;
  return null; 
}

/* ================================================================== */
/* ==================== FUNGSI DATA SK (REVISI V3) ================== */
/* ================================================================== */

function getSKData() {
  try {
    var ssId = "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4"; 
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("Unggah_SK");
    
    var isAdmin = true; // Ganti logic ini dengan session check sesungguhnya nanti

    var data = sheet.getDataRange().getDisplayValues();
    if (data.length <= 1) return { rows: [], isAdmin: isAdmin };

    var headers = data[0];
    var rows = data.slice(1);
    
    // --- HELPER PENCARI KOLOM ---
    function findCol(candidates) {
      for (var i = 0; i < candidates.length; i++) {
        var target = candidates[i].toLowerCase();
        for (var j = 0; j < headers.length; j++) {
           if (headers[j].toString().toLowerCase().trim() === target) return j;
        }
      }
      return -1; 
    }

    // --- MAPPING INDEX KOLOM ---
    var idx = {
      noSK: findCol(["Nomor SK", "No SK"]),
      namaSD: findCol(["Nama Sekolah", "Nama SD", "Sekolah"]),
      tahun: findCol(["Tahun Ajaran", "Tahun"]),
      sem: findCol(["Semester"]),
      tglSK: findCol(["Tanggal SK", "Tgl SK"]),
      kriteria: findCol(["Kriteria SK", "Jenis SK"]),
      dok: findCol(["Link File", "Dokumen", "File SK"]),
      status: findCol(["Status"]),
      tglUpload: findCol(["Timestamp", "Waktu Input", "Tanggal Input", "Tanggal Unggah"]),
      userInput: findCol(["User Input", "Operator"]),
      update: findCol(["Update", "Terakhir Update", "Tanggal Edit"]),
      userUpdate: findCol(["User Update"]),
      verval: findCol(["Verval", "Tanggal Verifikasi"]),
      verifikator: findCol(["Verifikator", "Admin Verif"]),
      ket: findCol(["Keterangan", "Catatan"])
    };

    var result = rows.map(function(row, i) {
      var v = function(colIdx) { return (colIdx > -1 && row[colIdx]) ? row[colIdx] : '-'; };

      // 1. Ambil String Tanggal Mentah
      var rawTglUpload = v(idx.tglUpload);
      var rawUpdate = v(idx.update);
      var rawVerval = v(idx.verval);

      // 2. Bersihkan Tampilan (Display Only)
      var cleanTglUpload = (rawTglUpload !== '-') ? rawTglUpload.split(' ')[0] : '-';
      var cleanUpdate = (rawUpdate !== '-') ? rawUpdate.split(' ')[0] : '-';
      var cleanVerval = (rawVerval !== '-') ? rawVerval.split(' ')[0] : '-';

      // 3. Konversi ke Timestamp untuk Sorting (Logic Aktivitas Terakhir)
      var time1 = parseDateSort(rawTglUpload);
      var time2 = parseDateSort(rawUpdate);
      var time3 = parseDateSort(rawVerval);
      
      // Ambil waktu paling maksimal (terbaru) dari ketiga kolom tersebut
      var maxActivityTime = Math.max(time1, time2, time3);

      return {
        rowIndex: i + 1, // Penting: Jangan ubah logika ini (tetap urut index asli + 1)
        noSK: v(idx.noSK),
        namaSD: v(idx.namaSD),
        tahun: v(idx.tahun),
        sem: v(idx.sem),
        tglSK: v(idx.tglSK),
        kriteria: v(idx.kriteria),
        dok: v(idx.dok) === '-' ? '#' : v(idx.dok),
        status: (idx.status > -1 && row[idx.status]) ? row[idx.status] : 'Diproses',
        
        // Data Tampilan
        tglUpload: cleanTglUpload,
        userInput: v(idx.userInput),
        update: cleanUpdate,
        userUpdate: v(idx.userUpdate),
        verval: cleanVerval,
        verifikator: v(idx.verifikator),
        ket: v(idx.ket),
        
        // Key Tersembunyi untuk Sorting
        _sortKey: maxActivityTime
      };
    });

    // --- SORTING: LOGIKA 3 KOLOM (DESCENDING) ---
    // Mengurutkan berdasarkan aktivitas terakhir (siapa yang paling baru, dia di atas)
    result.sort(function(a, b) {
      return b._sortKey - a._sortKey;
    });

    return { rows: result, isAdmin: isAdmin }; 

  } catch (e) {
    return { error: "Error Backend: " + e.message };
  }
}

// --- HELPER PARSING TANGGAL UTK SORTING ---
// Mengubah string tanggal (dd/mm/yyyy) menjadi angka timestamp (ms)
function parseDateSort(dateStr) {
  if (!dateStr || dateStr === '-') return 0; // Jika kosong, anggap waktu 0 (paling lama)

  try {
    // 1. Coba split dd/mm/yyyy (Format Indonesia/Sheet umumnya)
    // Ambil bagian tanggal saja, buang jam
    var datePart = dateStr.toString().split(' ')[0]; 
    var parts = datePart.split('/');

    if (parts.length === 3) {
      // new Date(year, monthIndex, day)
      // Ingat: monthIndex di JS mulai dari 0 (Januari = 0)
      var d = new Date(parts[2], parts[1] - 1, parts[0]);
      return d.getTime();
    }

    // 2. Fallback: Coba parse standar (yyyy-mm-dd atau format default)
    var d2 = new Date(dateStr);
    return isNaN(d2.getTime()) ? 0 : d2.getTime();

  } catch (e) {
    return 0;
  }
}

// 2. PROSES EDIT SK (REVISI: OVERWRITE/GANTI FILE)
function processEditSK(form) {
  try {
    var ssId = "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4";
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("Unggah_SK");
    
    // --- KONFIGURASI FOLDER ---
    // Pastikan ID ini SAMA dengan ID Folder di halaman Unggah SK
    var folderId = "1OB2Mxa_zvpYl7Vru9NEddYmBlU5SfYHL"; 
    
    var rowIdx = parseInt(form.rowIndex) + 1; 
    
    // 1. LOGIKA STATUS (Tetap)
    var oldStatus = sheet.getRange(rowIdx, getColIdx(sheet, "Status")).getValue();
    var newStatus = oldStatus; 
    if (oldStatus == 'Revisi') newStatus = 'Diproses';
    else if (oldStatus == 'Ditolak') newStatus = 'Revisi'; 

    // 2. LOGIKA GANTI FILE (FILE BARU MASUK -> FILE LAMA HAPUS)
    if (form.fileData && form.fileData.data) {
       // A. AMBIL URL FILE LAMA DULU (Sebelum ditimpa)
       var colFileIdx = getColIdx(sheet, "Link File");
       var oldUrl = sheet.getRange(rowIdx, colFileIdx).getValue();
       
       // B. UPLOAD FILE BARU
       var blob = Utilities.newBlob(Utilities.base64Decode(form.fileData.data), form.fileData.mimeType, form.fileData.name);
       var folder = DriveApp.getFolderById(folderId);
       var newFile = folder.createFile(blob);
       newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       
       // C. UPDATE SHEET DENGAN URL BARU
       sheet.getRange(rowIdx, colFileIdx).setValue(newFile.getUrl());
       
       // D. HAPUS FILE LAMA (OVERWRITE LOGIC)
       if (oldUrl && oldUrl !== '#' && oldUrl !== '-') {
         try {
           var oldFileId = oldUrl.match(/[-\w]{25,}/);
           if (oldFileId) {
             DriveApp.getFileById(oldFileId[0]).setTrashed(true); // Pindah ke Trash
           }
         } catch(e) {
           // Abaikan jika file lama tidak ketemu/sudah terhapus, update tetap jalan
           Logger.log("Gagal menghapus file lama: " + e.message);
         }
       }
    }

    // 3. UPDATE DATA TEKS
    sheet.getRange(rowIdx, getColIdx(sheet, "Nomor SK")).setValue(form.nomorSK);
    
    // Format Tanggal (yyyy-mm-dd -> dd/MM/yyyy)
    if(form.tanggalSK) {
       var tglParts = form.tanggalSK.split('-'); 
       if(tglParts.length === 3) {
           var tglFormatted = tglParts[2] + '/' + tglParts[1] + '/' + tglParts[0]; 
           sheet.getRange(rowIdx, getColIdx(sheet, "Tanggal SK")).setValue(tglFormatted);
       }
    }

    sheet.getRange(rowIdx, getColIdx(sheet, "Status")).setValue(newStatus);
    
    // 4. TRACKING UPDATE
    sheet.getRange(rowIdx, getColIdx(sheet, "Update")).setValue(new Date());
    sheet.getRange(rowIdx, getColIdx(sheet, "User Update")).setValue(form.userUpdate);

    return "Data berhasil diperbarui.";

  } catch(e) { 
    return "Error: " + e.message; 
  }
}

// 3. PROSES HAPUS (SOFT DELETE)
function processDeleteSK(form) {
  try {
    var ssId = "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4";
    var ss = SpreadsheetApp.openById(ssId);
    var sheetSource = ss.getSheetByName("Unggah_SK");
    var sheetTrash = ss.getSheetByName("Trash_SK");
    
    // Folder Sampah
    var trashFolderId = "1OB2Mxa_zvpYl7Vru9NEddYmBlU5SfYHL";
    
    var rowIdx = parseInt(form.rowIndex) + 1;
    var rowData = sheetSource.getRange(rowIdx, 1, 1, sheetSource.getLastColumn()).getValues()[0];
    
    // 1. Pindahkan File
    var docUrl = rowData[getColIdx(sheetSource, "Link File") - 1] || ""; // -1 karena array 0-based
    if (docUrl) {
      try {
        var fileId = docUrl.match(/[-\w]{25,}/);
        if (fileId) {
          var file = DriveApp.getFileById(fileId[0]);
          var trashFolder = DriveApp.getFolderById(trashFolderId);
          file.moveTo(trashFolder);
        }
      } catch(e) { /* Abaikan jika file tidak ketemu */ }
    }

    // 2. Siapkan Data Trash (Tambah Info Hapus di Keterangan)
    var deleteInfo = "Dihapus oleh " + form.userDelete + " pada " + new Date() + " karena " + form.alasan;
    var colKetIdx = getColIdx(sheetSource, "Keterangan") - 1;
    rowData[colKetIdx] = deleteInfo; // Timpa/Isi kolom keterangan

    // 3. Tulis ke Trash & Hapus dari Source
    sheetTrash.appendRow(rowData);
    sheetSource.deleteRow(rowIdx);

    return "Data berhasil dihapus (Soft Delete).";
  } catch(e) { return "Error: " + e.message; }
}

// 4. PROSES VERIFIKASI (ADMIN)
function processVerifySK(form) {
  try {
    var ssId = "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4";
    var ss = SpreadsheetApp.openById(ssId);
    var sheet = ss.getSheetByName("Unggah_SK");
    var rowIdx = parseInt(form.rowIndex) + 1;

    sheet.getRange(rowIdx, getColIdx(sheet, "Status")).setValue(form.statusVerif);
    sheet.getRange(rowIdx, getColIdx(sheet, "Keterangan")).setValue(form.keterangan);
    
    // Tracking Verval
    sheet.getRange(rowIdx, getColIdx(sheet, "Verval")).setValue(new Date());
    sheet.getRange(rowIdx, getColIdx(sheet, "Verifikator")).setValue(form.verifikator);

    return "Verifikasi berhasil disimpan.";
  } catch(e) { return "Error: " + e.message; }
}

// Helper Cari Index Kolom (1-based untuk getRange)
function getColIdx(sheet, name) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var idx = headers.indexOf(name);
  // Coba nama lain jika tidak ketemu
  if (idx < 0 && name == "Nama Sekolah") idx = headers.indexOf("Nama SD");
  if (idx < 0 && name == "Link File") idx = headers.indexOf("Dokumen");
  return idx + 1;
}