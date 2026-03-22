/* ======================================================================
   SK.gs - LOGIKA BACKEND SIABA SK (BAB VIII COMPLIANT)
   Variabel Global (SPREADSHEET_IDS & FOLDER_CONFIG) diambil dari Code.gs
   ====================================================================== */

/* ======================================================================
   HELPER FUNCTIONS
   ====================================================================== */
function handleError(context, error) {
  Logger.log("ERROR [" + context + "]: " + error);
  rekamCCTV("ERROR " + context, error.toString()); 
  return { success: false, message: error.message || error.toString() };
}

function getOrCreateFolder(parentFolder, folderName) {
  var folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
}

/* ======================================================================
   CORE: PROSES SIMPAN DATA BARU (INSERT)
   ====================================================================== */
function processManualForm(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheet = ss.getSheetByName("Unggah_SK");
    
    const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK);
    const folderTahun = getOrCreateFolder(mainFolder, formData.tahunAjaran.replace(/\//g, '-'));
    const targetFolder = getOrCreateFolder(folderTahun, formData.semester);
    
    const namaFile = `${formData.namaSd} - ${formData.tahunAjaran.replace(/\//g,'-')} - ${formData.semester} - ${formData.kriteriaSk} - ${formData.nomorSk}.pdf`;
    
    const blob = Utilities.newBlob(Utilities.base64Decode(formData.fileData.data), formData.fileData.mimeType, namaFile);
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    sheet.appendRow([
      "'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"), // A
      formData.namaSd,        
      formData.tahunAjaran,   
      formData.semester,      
      "'" + formData.nomorSk, 
      "'" + formData.tanggalSk, 
      formData.kriteriaSk,    
      file.getUrl(),          
      formData.userInput,     
      "Diproses",             
      "", "", "", "", ""      
    ]);

    return { success: true, message: "Data SK berhasil disimpan." };
  } catch (e) { return handleError('processManualForm', e); }
}

/* ======================================================================
   CORE: UPDATE DATA (EDIT)
   ====================================================================== */
function simpanPerubahanSK(form) {
  try {
    rekamCCTV("START EDIT", "No SK: " + form.nomorSk);

    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    var sheet = ss.getSheetByName("Unggah_SK");
    var rowIdx = parseInt(form.editRowId);

    if (isNaN(rowIdx)) throw "Row ID Invalid";

    var KOLOM = {
      NAMA_SD:   2,  
      TAHUN:     3,  
      SEMESTER:  4,  
      NO_SK:     5,  
      TGL_SK:    6,  
      KRITERIA:  7,  
      FILE_URL:  8,  
      STATUS:    10, 
      TGL_UPD:   11, 
      USER_UPD:  12  
    };

    if (form.namaSd && form.namaSd !== "") sheet.getRange(rowIdx, KOLOM.NAMA_SD).setValue(form.namaSd);
    if (form.tahunAjaran && form.tahunAjaran !== "") sheet.getRange(rowIdx, KOLOM.TAHUN).setValue(form.tahunAjaran);
    if (form.semester && form.semester !== "") sheet.getRange(rowIdx, KOLOM.SEMESTER).setValue(form.semester);

    sheet.getRange(rowIdx, KOLOM.NO_SK).setValue("'" + form.nomorSk);
    sheet.getRange(rowIdx, KOLOM.TGL_SK).setValue("'" + form.tanggalSk); 
    sheet.getRange(rowIdx, KOLOM.KRITERIA).setValue(form.kriteriaSk);

    if (form.fileData && form.fileData.data) {
       const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK);
       
       var thn = (form.tahunAjaran && form.tahunAjaran !== "") ? form.tahunAjaran : sheet.getRange(rowIdx, KOLOM.TAHUN).getDisplayValue();
       var sem = (form.semester && form.semester !== "") ? form.semester : sheet.getRange(rowIdx, KOLOM.SEMESTER).getDisplayValue();
       
       const folderTahun = getOrCreateFolder(mainFolder, thn.toString().replace(/\//g, '-'));
       const targetFolder = getOrCreateFolder(folderTahun, sem);

       var namaSdFix = (form.namaSd && form.namaSd !== "") ? form.namaSd : sheet.getRange(rowIdx, KOLOM.NAMA_SD).getDisplayValue();
       const namaFile = `${namaSdFix} - ${thn.toString().replace(/\//g,'-')} - ${sem} - ${form.kriteriaSk} - ${form.nomorSk}.pdf`;

       var blob = Utilities.newBlob(Utilities.base64Decode(form.fileData.data), form.fileData.mimeType, namaFile);
       var file = targetFolder.createFile(blob);
       file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       
       sheet.getRange(rowIdx, KOLOM.FILE_URL).setValue(file.getUrl());
       rekamCCTV("UPLOAD", "File baru tersimpan: " + file.getUrl());
    }

    sheet.getRange(rowIdx, KOLOM.STATUS).setValue("Diproses");
    sheet.getRange(rowIdx, KOLOM.TGL_UPD).setValue("'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"));
    sheet.getRange(rowIdx, KOLOM.USER_UPD).setValue(form.userUpdate);

    rekamCCTV("SUKSES", "Data baris " + rowIdx + " berhasil diupdate.");
    return { success: true, message: "Data berhasil diperbarui." };

  } catch (e) {
    rekamCCTV("ERROR", e.toString());
    return { success: false, message: "Error Server: " + e.toString() };
  }
}

/* ======================================================================
   CORE: GET DATA LIST 
   ====================================================================== */
function getDaftarSK() {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    var sheet = ss.getSheetByName("Unggah_SK");
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    
    function parseTimeInternal(val) {
      if (!val) return 0;
      var s = String(val).replace(/'/g, "").trim();
      if (s === "") return 0;
      var parts = s.split(" ");
      var sep = parts[0].includes("-") ? "-" : "/";
      var dP = parts[0].split(sep);
      if (dP.length !== 3) return 0;
      var tP = (parts[1]||"00:00:00").split(":");
      var y = dP[2].length === 4 ? dP[2] : dP[0];
      var m = dP[1];
      var d = dP[0].length <= 2 ? dP[0] : dP[2];
      return new Date(parseInt(y), parseInt(m)-1, parseInt(d), parseInt(tP[0]||0), parseInt(tP[1]||0), parseInt(tP[2]||0)).getTime();
    }

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[1]) continue; 

      var tUnggah = parseTimeInternal(row[0]);
      var tUpdate = parseTimeInternal(row[10]);
      var tVerval = parseTimeInternal(row[12]);
      
      var lastActivity = Math.max(tUnggah, tUpdate, tVerval);

      result.push({
        rowBaris: i + 1,
        tglUnggah: row[0],
        namaSd: row[1], tahun: row[2], semester: row[3], noSk: row[4],
        tglSk: row[5], tglSkDisplay: row[5], 
        kriteria: row[6], fileUrl: row[7], userInput: row[8], status: row[9],
        tglUpdate: row[10], userUpdate: row[11],
        tglVerval: row[12], verifikator: row[13], keterangan: row[14],
        timestamp: lastActivity
      });
    }
    
    result.sort(function(a, b) { return b.timestamp - a.timestamp; });
    
    return result;
  } catch (e) { return []; }
}

/* ======================================================================
   HELPER: CEK DUPLIKAT, HAPUS, & VERIFIKASI 
   ====================================================================== */
function cekDuplikatSK(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheet = ss.getSheetByName("Unggah_SK");
    var data = sheet.getDataRange().getDisplayValues();
    
    var tSd = String(payload.namaSd).trim().toUpperCase();
    var tTh = String(payload.tahunAjaran).trim().toUpperCase();
    var tSm = String(payload.semester).trim().toUpperCase();
    var tKr = String(payload.kriteria).trim().toUpperCase();
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      var dbSd = String(row[1] || "").trim().toUpperCase(); 
      var dbTh = String(row[2] || "").trim().toUpperCase(); 
      var dbSm = String(row[3] || "").trim().toUpperCase(); 
      var dbKr = String(row[6] || "").trim().toUpperCase(); 
      
      if (dbSd === tSd && dbTh === tTh && dbSm === tSm && dbKr === tKr) {
        var status = String(row[9] || "").toLowerCase(); 
        var isLocked = (status.includes("ok") || status.includes("setuju"));
        
        return { 
          found: true, isLocked: isLocked,
          data: {
            rowId: i + 1, namaSd: row[1], tahun: row[2], semester: row[3],
            noSk: row[4], tglSk: row[5], kriteria: row[6], fileUrl: row[7], status: row[9]
          }
        };
      }
    }
    return { found: false };
  } catch (e) { return { found: false }; }
}

function hapusDataSK(form) {
  try {
    var KODE_RAHASIA = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(form.hapusKode).trim() !== KODE_RAHASIA) {
      return { success: false, message: "KODE_SALAH" };
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheetSource = ss.getSheetByName("Unggah_SK");
    
    var sheetTrash = ss.getSheetByName("Trash_SK");
    if (!sheetTrash) {
       sheetTrash = ss.insertSheet("Trash_SK");
       var headers = sheetSource.getRange("A1:Q1").getDisplayValues();
       headers[0].push("TGL HAPUS", "USER HAPUS", "ALASAN");
       sheetTrash.appendRow(headers[0]); 
    }

    var rowIdx = parseInt(form.hapusRowId);
    if (isNaN(rowIdx)) return { success: false, message: "Row ID Invalid" };

    var rangeData = sheetSource.getRange(rowIdx, 1, 1, sheetSource.getLastColumn());
    var values = rangeData.getDisplayValues()[0]; 
    
    var tahun = values[2];   
    var semester = values[3]; 
    var fileUrl = values[7];  

    if (fileUrl && fileUrl.indexOf("drive.google.com") !== -1) {
        try {
          var fileIdMatch = fileUrl.match(/[-\w]{25,}/);
          if (fileIdMatch) {
             var file = DriveApp.getFileById(fileIdMatch[0]);
             var trashRoot = DriveApp.getFolderById(FOLDER_CONFIG.TRASH_SK);
             var folderTahun = getOrCreateFolder(trashRoot, String(tahun).replace(/\//g, '-'));
             var folderSmt = getOrCreateFolder(folderTahun, String(semester));
             file.moveTo(folderSmt); 
          }
        } catch (errFile) {
          rekamCCTV("ERROR HAPUS FILE", errFile.toString());
        }
    }

    var trashValues = values.slice(); 
    trashValues.push("'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"));        
    trashValues.push(form.userDelete);   
    trashValues.push(form.hapusAlasan || "-");  

    sheetTrash.appendRow(trashValues);
    sheetSource.deleteRow(rowIdx);

    rekamCCTV("HAPUS DATA", "Menghapus Baris " + rowIdx + " oleh " + form.userDelete);
    return { success: true, message: "Data berhasil dihapus." };

  } catch (e) {
    rekamCCTV("ERROR HAPUS", e.toString());
    return { success: false, message: "Gagal menghapus: " + e.toString() };
  }
}

function verifikasiDataSK(form) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    var sheet = ss.getSheetByName("Unggah_SK");
    var rowIdx = parseInt(form.verifRowId);

    if (isNaN(rowIdx) || rowIdx < 2) return { success: false, message: "ID Baris tidak valid!" };

    sheet.getRange(rowIdx, 10).setValue(form.verifStatus);
    sheet.getRange(rowIdx, 13).setValue("'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss")); 
    sheet.getRange(rowIdx, 14).setValue(form.verifikator); 
    sheet.getRange(rowIdx, 15).setValue("'" + form.verifKeterangan);

    SpreadsheetApp.flush();
    return { success: true, message: "Data diverifikasi: " + form.verifStatus };
  } catch (e) { return { success: false, message: "Error Verifikasi: " + e.toString() }; }
}

/* ======================================================================
   HELPER: REKAM JEJAK CCTV
   ====================================================================== */
function rekamCCTV(aktivitas, data) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA); 
    var sheet = ss.getSheetByName("Log_CCTV");
    if (!sheet) {
      sheet = ss.insertSheet("Log_CCTV");
      sheet.appendRow(["TIMESTAMP", "AKTIVITAS", "DATA MENTAH"]);
    }
    var dataString = (typeof data === 'object') ? JSON.stringify(data) : data;
    sheet.appendRow(["'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"), aktivitas, dataString]);
  } catch (e) { Logger.log("CCTV Error"); }
}

/* ======================================================================
   CORE: GET DATA SAMPAH (TRASH)
   ====================================================================== */
function getTrashSK() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
  const sheet = ss.getSheetByName("Trash_SK");
  if (!sheet) return [];

  var data = sheet.getDataRange().getDisplayValues();
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[1]) continue; 

    result.push({
      rowBaris: i + 1,
      namaSd: row[1], 
      noSk: row[4],   
      tglHapus: row[15],  
      userHapus: row[16],      
      alasanHapus: row[17]     
    });
  }
  return result;
}

/* ======================================================================
   CORE: RESTORE DATA (PULIHKAN DARI TRASH)
   ====================================================================== */
function restoreDataSK(form) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheetTrash = ss.getSheetByName("Trash_SK");
    const sheetActive = ss.getSheetByName("Unggah_SK");
    
    var rowIdx = parseInt(form.rowId);
    var values = sheetTrash.getRange(rowIdx, 1, 1, sheetTrash.getLastColumn()).getDisplayValues()[0];
    
    var cleanValues = values.slice(0, 15);
    
    var fileUrl = cleanValues[7];
    if (fileUrl && fileUrl.indexOf("drive.google.com") !== -1) {
        try {
          var fileIdMatch = fileUrl.match(/[-\w]{25,}/);
          if (fileIdMatch) DriveApp.getFileById(fileIdMatch[0]).moveTo(DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK));
        } catch (e) {}
    }

    sheetActive.appendRow(cleanValues);
    sheetTrash.deleteRow(rowIdx);
    
    return { success: true, message: "Data berhasil dipulihkan." };
    
  } catch (e) {
    return { success: false, message: "Gagal Restore: " + e.toString() };
  }
}

/* ======================================================================
   MODULE: STATUS PENGIRIMAN SK (BAB VIII & MULTI-LEVEL HEADER FIX)
   ====================================================================== */
function getSiabaStatusData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheet = ss.getSheetByName("Status_SK");
    
    // BAB VIII: getDisplayValues Validated
    var rawData = sheet.getDataRange().getDisplayValues();
    
    // Karena Baris 1 dan 2 sekarang adalah Header Bertingkat, 
    // minimal harus ada 3 baris jika ada datanya.
    if (rawData.length < 3) return { error: "Data Status SK belum tersedia." };

    // Potong 2 baris pertama, ambil dari indeks 2 (baris ke-3) sampai habis
    var rows = rawData.slice(2); 

    // Ambil list nama sekolah dari Kolom 1 (Index 0) untuk dropdown filter
    var listSekolah = [];
    rows.forEach(r => {
      if(r[0] && r[0] !== "") {
         listSekolah.push(r[0]);
      }
    });
    
    listSekolah = [...new Set(listSekolah)].sort();

    return {
       rows: rows,
       schools: listSekolah
    };

  } catch (e) {
    return { error: "Gagal ambil data: " + e.toString() };
  }
}

/* ======================================================================
   MODULE: DASHBOARD SK 
   ====================================================================== */
function getDashboardSK(filterTahun, filterSemester) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    
    const sheetData = ss.getSheetByName("Unggah_SK");
    if (!sheetData) return { error: "Sheet 'Unggah_SK' tidak ditemukan!" };
    var rawData = sheetData.getDataRange().getDisplayValues();
    var rows = rawData.slice(1); 

    var masterSekolah = [];
    var sheetMaster = ss.getSheetByName("Master_Sekolah");
    if (sheetMaster) {
        var rawMaster = sheetMaster.getDataRange().getDisplayValues();
        for (var i = 1; i < rawMaster.length; i++) {
            if(rawMaster[i][0]) masterSekolah.push(String(rawMaster[i][0]).trim());
        }
    }

    var stats = {
      totalMasuk: 0, diproses: 0, revisi: 0, disetujui: 0, ditolak: 0,
      progress: 0, belumLaporCount: 0, belumLaporList: [], recent: []
    };

    var sekolahSudahLapor = new Set();

    var filteredRows = rows.filter(function(r) {
      if (!r[1]) return false;
      
      var rTahun = String(r[2] || "").trim();
      var rSmt = String(r[3] || "").trim();
      
      var matchTahun = (filterTahun === "" || rTahun === String(filterTahun));
      var matchSmt = (filterSemester === "" || rSmt === String(filterSemester));
      
      if (matchTahun && matchSmt) {
          sekolahSudahLapor.add(String(r[1]).trim());
          return true;
      }
      return false;
    });

    stats.totalMasuk = filteredRows.length;

    filteredRows.forEach(function(r) {
      var s = String(r[9] || "").toLowerCase(); 

      if (s.includes("ok") || s.includes("setuju") || s.includes("valid")) stats.disetujui++;
      else if (s.includes("revisi")) stats.revisi++;
      else if (s.includes("tolak")) stats.ditolak++;
      else stats.diproses++;
    });

    if (masterSekolah.length > 0) {
        stats.belumLaporList = masterSekolah.filter(x => !sekolahSudahLapor.has(x)).sort();
        stats.belumLaporCount = stats.belumLaporList.length;
        stats.progress = Math.round((stats.disetujui / masterSekolah.length) * 100);
    }

    // VAKSIN PARSER ABSOLUT UNTUK WAKTU TERAKHIR
    function parseStringDateToTime(str) {
        if(!str || str==="" || str==="-") return 0;
        try {
            var cleanStr = String(str).replace(/['"]/g, "").trim();
            if(cleanStr === "") return 0;
            var p = cleanStr.split(' '); 
            var dateParts = p[0].split(/[-/]/); 
            if(dateParts.length !== 3) return 0;
            var timeParts = (p[1] || "00:00:00").split(':');
            var y, m, d;
            if(dateParts[0].length === 4) { y = parseInt(dateParts[0],10); m = parseInt(dateParts[1],10)-1; d = parseInt(dateParts[2],10); } 
            else { y = parseInt(dateParts[2],10); m = parseInt(dateParts[1],10)-1; d = parseInt(dateParts[0],10); }
            var hr = parseInt(timeParts[0]||0,10); var mn = parseInt(timeParts[1]||0,10); var sc = parseInt(timeParts[2]||0,10);
            return new Date(y, m, d, hr, mn, sc).getTime(); 
        } catch(e) { return 0; }
    }

    // Sort menggunakan kombinasi 3 kolom waktu
    var sorted = filteredRows.sort(function(a, b) {
      var timeA = Math.max(parseStringDateToTime(a[0]), parseStringDateToTime(a[10]), parseStringDateToTime(a[12]));
      var timeB = Math.max(parseStringDateToTime(b[0]), parseStringDateToTime(b[10]), parseStringDateToTime(b[12]));
      return timeB - timeA; 
    }).slice(0, 7); 

    stats.recent = sorted.map(function(r) {
        var tKirim = parseStringDateToTime(r[0]);
        var tEdit = parseStringDateToTime(r[10]);
        var tVerif = parseStringDateToTime(r[12]);
        var maxTime = Math.max(tKirim, tEdit, tVerif);
        
        var displayTime = String(r[0]);
        if (maxTime === tEdit && tEdit > 0) displayTime = String(r[10]);
        if (maxTime === tVerif && tVerif > 0) displayTime = String(r[12]);
        
        displayTime = displayTime.replace(/['"]/g, "").trim();

        return {
            sekolah: r[1],
            status: r[9], 
            waktu: displayTime.substring(0, 16) 
        };
    });

    return stats;

  } catch (e) { return { error: e.toString() }; }
}