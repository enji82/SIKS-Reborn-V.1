/* ======================================================================
   MODUL: E-FILE (ARSIP DIGITAL ELEKTRONIK)
   ====================================================================== */

var EFILE_DB_ID = "1HzE0EEfIJBTX39oxJpoRDgP04aD9fY-zi2Dln7FbFPQ";
var EFILE_FOLDER_ID = "1BUHkoCanHu24ApTnfwhbBCgOEFxBAmAo";

function getEfileMasterData(npsnFilter) {
  try {
    var ss = SpreadsheetApp.openById(EFILE_DB_ID);
    
    var shKat = ss.getSheetByName("Master_Kategori_Efile");
    var dataKat = shKat ? shKat.getDataRange().getDisplayValues() : [];
    var resKat = [];
    for(var i=1; i<dataKat.length; i++) {
        if(String(dataKat[i][0]).trim() !== "") {
            resKat.push({ 
                idKat: dataKat[i][0], namaKat: dataKat[i][1], parent: dataKat[i][2],
                format: dataKat[i][3] ? String(dataKat[i][3]).trim().toUpperCase() : "PDF",
                jenisPeriode: dataKat[i][4] ? String(dataKat[i][4]).trim().toUpperCase() : "" 
            });
        }
    }
    
    var shPtk = ss.getSheetByName("Database_PTK");
    var dataPtk = shPtk ? shPtk.getDataRange().getDisplayValues() : [];
    var resPtk = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    for(var j=1; j<dataPtk.length; j++) {
        var rNpsn = String(dataPtk[j][4]).trim().toUpperCase(); 
        var rUnit = String(dataPtk[j][5]).trim().toUpperCase(); 
        if (targetNpsn === "" || targetNpsn === "SEMUA" || rNpsn === targetNpsn || rUnit === targetNpsn) {
            if(String(dataPtk[j][0]).trim() !== "") {
                resPtk.push({ id_ptk: dataPtk[j][0], nama: dataPtk[j][1], status: dataPtk[j][2], nip: dataPtk[j][3], npsn: dataPtk[j][4], unit: dataPtk[j][5] });
            }
        }
    }
    return JSON.stringify({ success: true, kategori: resKat, ptk: resPtk });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function getEfileData(npsnFilter) {
  try {
    var ss = SpreadsheetApp.openById(EFILE_DB_ID);
    var sheet = ss.getSheetByName("Database_Efile");
    if(!sheet) return JSON.stringify({ success: false, message: "Sheet Database_Efile tidak ditemukan." });
    
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    var targetNpsn = String(npsnFilter || "").trim().toUpperCase();
    
    for(var i=1; i<data.length; i++) {
        var rNpsn = String(data[i][11]).trim().toUpperCase(); 
        if (targetNpsn === "" || targetNpsn === "SEMUA" || rNpsn === targetNpsn) {
            result.push({
                rowId: i + 1, id_ptk: data[i][0], nama: data[i][1], id_kategori: data[i][2], nama_kategori: data[i][3],
                tahun: data[i][4], file_name: data[i][5], url: data[i][6], status: data[i][7], catatan: data[i][8],
                tgl_upload: data[i][9], uploader: data[i][10], npsn: data[i][11], tgl_verif: data[i][12] || "-", verifikator: data[i][13] || "-",
                periode: data[i][14] || "-" 
            });
        }
    }
    result.sort(function(a,b) { return b.rowId - a.rowId; });
    return JSON.stringify({ success: true, data: result });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

function simpanEfileBatch(batchData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); 
    var ss = SpreadsheetApp.openById(EFILE_DB_ID);
    var sheet = ss.getSheetByName("Database_Efile");
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    var pFolder = DriveApp.getFolderById(EFILE_FOLDER_ID);
    var rowsToAppend = [];
    
    for(var i = 0; i < batchData.length; i++) {
        var item = batchData[i]; var fileUrl = "";
        if (item.fileBase64) {
            var idFolder = pFolder.getFoldersByName(item.id_ptk);
            var fPtk = idFolder.hasNext() ? idFolder.next() : pFolder.createFolder(item.id_ptk);
            var blob = Utilities.newBlob(Utilities.base64Decode(item.fileBase64), item.mimeType, item.nama_file);
            var file = fPtk.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
            fileUrl = file.getUrl();
        } else { throw new Error("File tidak valid."); }
        
        rowsToAppend.push([
            item.id_ptk, item.nama_ptk, item.id_kategori, item.nama_kategori, 
            item.tahun, item.nama_file, fileUrl, "Diproses", "", "'" + now, item.user_login, item.npsn,
            "", "", item.periode
        ]);
    }
    if(rowsToAppend.length > 0) sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    SpreadsheetApp.flush();
    return JSON.stringify({ success: true, message: batchData.length + " Berkas berhasil diunggah." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function verifikasiEfileData(rowId, status, catatan, adminName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.openById(EFILE_DB_ID); var sheet = ss.getSheetByName("Database_Efile"); var r = parseInt(rowId);
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(r, 8).setValue(status); sheet.getRange(r, 9).setValue(catatan);
    sheet.getRange(r, 13).setValue(now); sheet.getRange(r, 14).setValue(adminName); 
    SpreadsheetApp.flush(); return JSON.stringify({ success: true, message: "Berkas berhasil di-" + status });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function hapusEfileData(rowId, securityCode) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = new Date(); var kd = d.getFullYear()+""+String(d.getMonth()+1).padStart(2,'0')+""+String(d.getDate()).padStart(2,'0');
    if (String(securityCode).trim() !== kd) return JSON.stringify({ success: false, message: "Kode Keamanan Salah!" });
    var ss = SpreadsheetApp.openById(EFILE_DB_ID); var sheet = ss.getSheetByName("Database_Efile"); var r = parseInt(rowId);
    var urlDrive = sheet.getRange(r, 7).getValue();
    if(urlDrive && urlDrive.includes('drive.google.com')) {
        try { var match = urlDrive.match(/\/d\/([a-zA-Z0-9_-]+)/) || urlDrive.match(/id=([a-zA-Z0-9_-]+)/); if(match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true); } catch(ex){}
    }
    sheet.deleteRow(r); SpreadsheetApp.flush(); return JSON.stringify({ success: true, message: "Berkas berhasil dihapus permanen." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

// VAKSIN NON-DESTRUCTIVE EDIT: fileData bisa kosong (null)
function perbaikiEfileData(payload, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var ss = SpreadsheetApp.openById(EFILE_DB_ID); var sheet = ss.getSheetByName("Database_Efile"); var r = parseInt(payload.rowId);
    var oldUrl = sheet.getRange(r, 7).getValue(); var newFileUrl = oldUrl; 

    // Jika user mengunggah file baru
    if (fileData && fileData.data) {
        if(oldUrl && oldUrl.includes('drive.google.com')) {
            try { var match = oldUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || oldUrl.match(/id=([a-zA-Z0-9_-]+)/); if(match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true); } catch(ex){} 
        }
        var pFolder = DriveApp.getFolderById(EFILE_FOLDER_ID); var idFolder = pFolder.getFoldersByName(payload.id_ptk);
        var fPtk = idFolder.hasNext() ? idFolder.next() : pFolder.createFolder(payload.id_ptk);
        var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, payload.nama_file);
        var file = fPtk.createFile(blob); file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        newFileUrl = file.getUrl();
    }
    
    var now = "'" + Utilities.formatDate(new Date(), "Asia/Jakarta", "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(r, 5).setValue(payload.tahun);        // E: Edit Tahun
    sheet.getRange(r, 6).setValue(payload.nama_file);    // F: Edit Nama File
    sheet.getRange(r, 7).setValue(newFileUrl);           // G: URL Baru atau Lama
    sheet.getRange(r, 8).setValue("Diproses");           // H: Reset Status
    sheet.getRange(r, 9).setValue("");                   // I: Kosongkan Catatan
    sheet.getRange(r, 10).setValue(now);                 // J: Tgl Edit
    sheet.getRange(r, 11).setValue(payload.user_login);  // K: Uploader
    sheet.getRange(r, 13).setValue("");                  // M: Kosongkan Verif
    sheet.getRange(r, 14).setValue("");                  // N: Kosongkan Verif
    sheet.getRange(r, 15).setValue(payload.periode);     // O: Edit Periode             

    SpreadsheetApp.flush(); return JSON.stringify({ success: true, message: "Perbaikan data berhasil disimpan." });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); } finally { lock.releaseLock(); }
}

function getEfileViewerData(keyword, npsnFilter) {
  try {
    var ss = SpreadsheetApp.openById(EFILE_DB_ID); var searchKey = String(keyword).trim().toLowerCase();
    var shPtk = ss.getSheetByName("Database_PTK"); var dataPtk = shPtk.getDataRange().getDisplayValues(); var ptkFound = null;
    for(var i=1; i<dataPtk.length; i++) {
        var rNpsn = String(dataPtk[i][4]).trim().toUpperCase(); var rUnit = String(dataPtk[i][5]).trim().toUpperCase(); var rId = String(dataPtk[i][0]).toLowerCase(); var rNama = String(dataPtk[i][1]).toLowerCase();
        if(npsnFilter && npsnFilter !== "SEMUA" && npsnFilter !== "" && rNpsn !== npsnFilter && rUnit !== npsnFilter) continue;
        if(rId === searchKey || rNama.includes(searchKey)) { ptkFound = { id_ptk: dataPtk[i][0], nama: dataPtk[i][1], nip: dataPtk[i][3], npsn: dataPtk[i][4], unit: dataPtk[i][5] }; break; }
    }
    if(!ptkFound) return JSON.stringify({ success: false, message: "PTK tidak ditemukan." });

    var shKat = ss.getSheetByName("Master_Kategori_Efile"); var dataKat = shKat.getDataRange().getDisplayValues(); var categories = [];
    for(var k=1; k<dataKat.length; k++) { if(String(dataKat[k][0]).trim() !== "") categories.push({ idKat: dataKat[k][0], namaKat: dataKat[k][1], parent: dataKat[k][2] }); }

    var shFile = ss.getSheetByName("Database_Efile"); var dataFile = shFile.getDataRange().getDisplayValues(); var files = [];
    for(var f=1; f<dataFile.length; f++) {
        var st = String(dataFile[f][7]).toLowerCase();
        if(String(dataFile[f][0]) === ptkFound.id_ptk && (st.includes('setuju') || st.includes('ok'))) { files.push({ id_kategori: dataFile[f][2], tahun: dataFile[f][4], file_name: dataFile[f][5], url: dataFile[f][6] }); }
    }
    files.sort(function(a,b){ return parseInt(b.tahun||0) - parseInt(a.tahun||0); });
    return JSON.stringify({ success: true, ptk: ptkFound, categories: categories, files: files });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

// ======================================================================
// 9. INIT DASHBOARD E-FILE (TARIK MENU KATEGORI)
// ======================================================================
function getEfileDashboardInit(npsnFilter) {
  try {
    var ss = SpreadsheetApp.openById(EFILE_DB_ID);
    
    // 1. Tarik Menu dari Sheet "Dashboard" (A:Rekap, B:Lapor, C:Nama_Kategori)
    var shDash = ss.getSheetByName("Dashboard");
    if(!shDash) return JSON.stringify({ success: false, message: "Sheet 'Dashboard' tidak ditemukan." });
    
    var dataDash = shDash.getDataRange().getDisplayValues();
    var listKategori = [];
    for(var i=1; i<dataDash.length; i++) {
        if(String(dataDash[i][0]).trim() !== "") {
            listKategori.push({
                sheetRekap: dataDash[i][0],
                sheetLapor: dataDash[i][1],
                namaKategori: dataDash[i][2] || "Kategori " + i // Fallback jika Kolom C kosong
            });
        }
    }
    
    // 2. Evaluasi Akses Unit (Jika Admin, beri opsi semua unit)
    var shPtk = ss.getSheetByName("Database_PTK");
    var dataPtk = shPtk ? shPtk.getDataRange().getDisplayValues() : [];
    var myUnit = "";
    
    if (npsnFilter && npsnFilter !== "SEMUA") {
        for(var j=1; j<dataPtk.length; j++) {
            var rNpsn = String(dataPtk[j][4]).trim().toUpperCase(); 
            var rUnit = String(dataPtk[j][5]).trim().toUpperCase(); 
            var filterRaw = String(npsnFilter).trim().toUpperCase();
            if (rNpsn === filterRaw || rUnit === filterRaw) { myUnit = dataPtk[j][5]; break; }
        }
    }

    return JSON.stringify({ success: true, kategori: listKategori, myUnit: myUnit });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}

// ======================================================================
// 10. GET DATA DASHBOARD SPESIFIK (BERDASARKAN PILIHAN KATEGORI)
// ======================================================================
function getEfileDashboardData(sheetRekapName, sheetLaporName) {
  try {
    var ss = SpreadsheetApp.openById(EFILE_DB_ID);
    
    // 1. Tarik Data Rekapitulasi Tabel (A:NPSN, B:Unit, C:Tahun, D:Jml, E:Sudah, F:Belum)
    var shRekap = ss.getSheetByName(sheetRekapName);
    if(!shRekap) throw new Error("Sheet Rekap (" + sheetRekapName + ") tidak ditemukan.");
    var dataRekapRaw = shRekap.getDataRange().getDisplayValues();
    var arrRekap = [];
    for(var i=1; i<dataRekapRaw.length; i++) {
        if(String(dataRekapRaw[i][1]).trim() !== "") {
            arrRekap.push({
                npsn: dataRekapRaw[i][0], unit: dataRekapRaw[i][1], tahun: dataRekapRaw[i][2],
                jml: dataRekapRaw[i][3], sudah: dataRekapRaw[i][4], belum: dataRekapRaw[i][5]
            });
        }
    }

    // 2. Tarik Data Lapor (A:ID, B:Nama, C:NIP, E:Unit, F dst: Tahun dinamis)
    var shLapor = ss.getSheetByName(sheetLaporName);
    if(!shLapor) throw new Error("Sheet Lapor (" + sheetLaporName + ") tidak ditemukan.");
    var dataLaporRaw = shLapor.getDataRange().getDisplayValues();
    
    var arrBelum = [];
    var headerTahun = dataLaporRaw[0]; // Baris 1 berisi judul Tahun
    
    for(var r=1; r<dataLaporRaw.length; r++) {
        // VAKSIN 1: Gunakan Nama sebagai patokan validasi baris, bukan Unit. 
        // Jika nama ada, tarik datanya meskipun unitnya kosong.
        var namaPtk = String(dataLaporRaw[r][1]).trim(); 
        if(namaPtk === "") continue; 
        
        var nipPtk = String(dataLaporRaw[r][2]).trim() || "-"; // Kolom C
        var unitLapor = String(dataLaporRaw[r][4]).trim() || "Unit Belum Ditentukan"; // Kolom E
        
        // Loop dinamis ke samping membaca setiap kolom tahun
        for(var c=5; c<headerTahun.length; c++) {
            var tahunStr = String(headerTahun[c]).trim();
            var statusStr = String(dataLaporRaw[r][c]).trim().toLowerCase();
            
            // VAKSIN 2: Parser Agresif. Anggap sel Kosong ("") atau Strip ("-") sebagai Belum!
            if(tahunStr !== "") {
                if(statusStr === "" || statusStr === "-" || statusStr.includes("belum")) {
                    arrBelum.push({
                        nama: namaPtk, nip: nipPtk, unit: unitLapor, tahun: tahunStr
                    });
                }
            }
        }
    }

    return JSON.stringify({ success: true, rekap: arrRekap, belum: arrBelum });
  } catch(e) { return JSON.stringify({ success: false, message: e.message }); }
}