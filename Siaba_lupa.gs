/* ======================================================================
   MODUL LUPA PRESENSI (VERSI ENTERPRISE - FULL SCRIPT SULTAN)
   ====================================================================== */

// 1. PUSAT KONTROL DATABASE
const KONFIG_LUPA = {
  DB_ID: "160IjN8aiDAgDYXjgDLStS4nCZLKn3Ny-dq3BOFAfDrU", 
  SHEET_NAMA: "Lupa_Presensi",
  FOLDER_ID: (typeof FOLDER_CONFIG !== 'undefined' && FOLDER_CONFIG.SIABA_LUPA) ? FOLDER_CONFIG.SIABA_LUPA : "10kwGuGfwO5uFreEt7zBJZUaDx1fUSXo9" 
};

/* ======================================================================
   SISTEM KEAMANAN (MENGAMBIL DATA BERDASARKAN NPSN)
   ====================================================================== */
function getUnitKerjaByNPSN(npsn) {
  try {
    const ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
    const sheet = ss.getSheetByName("Database_Sekolah");
    if (!sheet) return JSON.stringify({ error: "Sheet Database_Sekolah tidak ditemukan." });

    const data = sheet.getDataRange().getDisplayValues();
    // Kolom A (0) = NPSN, Kolom C (2) = Unit Kerja
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(npsn).trim()) {
        return JSON.stringify({ unitKerja: data[i][2] });
      }
    }
    return JSON.stringify({ error: "NPSN (" + npsn + ") tidak terdaftar di Database Sekolah." });
  } catch (e) {
    return JSON.stringify({ error: "Error Server: " + e.message });
  }
}

function getDatabasePegawai() {
  try {
    const ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
    const sheet = ss.getSheetByName("Database_ASN");
    if (!sheet) return [];

    const data = sheet.getDataRange().getDisplayValues();
    let result = [];
    // Kolom A(0)=Unit, B(1)=NIP, C(2)=Nama, D(3)=NPSN
    for (let i = 1; i < data.length; i++) {
      result.push({ unit: data[i][0], nip: data[i][1], nama: data[i][2], npsn: data[i][3] });
    }
    return result;
  } catch (e) {
    return [];
  }
}

/* ======================================================================
   FUNGSI BACA DATA (GET)
   ====================================================================== */
function getDaftarLupaPresensi(tahun, bulan) {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_LUPA.SHEET_NAMA);
    
    if (!sheet) return JSON.stringify({ error: "Sheet 'Lupa_Presensi' tidak ditemukan di database." });

    var data = sheet.getDataRange().getDisplayValues(); 
    var result = [];

    var fTahun = (tahun) ? String(tahun).trim() : "";
    var mapBulan = { "Januari": "01", "Februari": "02", "Maret": "03", "April": "04", "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08", "September": "09", "Oktober": "10", "November": "11", "Desember": "12" };
    var fBulanAngka = mapBulan[bulan] || ""; 

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i]; 
      if (!row[1] && !row[2]) continue; 
      
      var txtTgl = String(row[3]).replace(/'/g, "").trim(); 
      if (fTahun !== "") { if (txtTgl.indexOf(fTahun) === -1) continue; }
      if (fBulanAngka !== "") { if (txtTgl.indexOf("-" + fBulanAngka + "-") === -1 && txtTgl.indexOf("/" + fBulanAngka + "/") === -1) continue; }
      
      result.push({
        rowBaris: i + 1,       
        unit: row[0], nama: row[1], nip: row[2],           
        tanggal: row[3], jam: row[4], jenis: row[5], komulatif: row[6],     
        tglKirim: row[7], userInput: row[8], fileUrl: row[9], status: row[10],       
        tglEdit: row[11], userEdit: row[12], tglVerif: row[13], adminVerif: row[14], ket: row[15],
        npsn: row[16] || "" // AMBIL KOLOM Q (NPSN) INDEX 16
      });
    }
    return JSON.stringify(result);
  } catch (e) { 
    return JSON.stringify({ error: "Error Server GAS: " + e.message }); 
  }
}

/* ======================================================================
   FUNGSI TULIS DATA (CREATE & UPDATE DENGAN ANTI-BENTROK)
   ====================================================================== */
function cekBentrokLupa(nipBaru, tglBaruStr, jenisBaru, rowIdPengecualian) {
  var ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
  var sheet = ss.getSheetByName(KONFIG_LUPA.SHEET_NAMA);
  var data = sheet.getDataRange().getValues();
  
  var tglBaruYMD = normalizeToYMD(tglBaruStr);
  var jenisBaruClean = String(jenisBaru).trim().toLowerCase();

  for (var i = 1; i < data.length; i++) {
    if (rowIdPengecualian && (i + 1) == rowIdPengecualian) continue;
    var rowNip = String(data[i][2]).replace(/'/g, "").trim(); 
    var rowStatus = String(data[i][10]).toLowerCase();
    
    if (rowNip === String(nipBaru).trim() && !rowStatus.includes("tolak")) {
       var rowTglRaw = data[i][3];
       var rowTglYMD = normalizeToYMD(rowTglRaw);
       var rowJenis = String(data[i][5]).trim().toLowerCase();
       
       if (rowTglYMD === tglBaruYMD && rowJenis === jenisBaruClean) {
           return "Gagal: Data ganda! Anda sudah mengajukan Lupa Presensi (" + data[i][5] + ") pada tanggal " + String(rowTglRaw).replace(/'/g,"") + ".";
       }
    }
  }
  return null; 
}

function simpanLupaPresensi(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 

    var tglSimpan = dataKirim.tanggal; 
    var err = cekBentrokLupa(dataKirim.nip_asn, tglSimpan, dataKirim.jenis, null);
    if (err) return err; 

    var ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_LUPA.SHEET_NAMA);

    var jamSimpan = dataKirim.waktu;
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    var targetFolder = getFolderTahunBulan(KONFIG_LUPA.FOLDER_ID, tglSimpan);
    var fileExt = dataKirim.file.name.split('.').pop();
    var fileNameBaru = dataKirim.nip_asn + " - " + tglSimpan + " - " + dataKirim.jenis + "." + fileExt;
    
    var fileBlob = Utilities.newBlob(Utilities.base64Decode(dataKirim.file.data), dataKirim.file.mimeType, dataKirim.file.name);
    var newFile = targetFolder.createFile(fileBlob).setName(fileNameBaru);
    newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    var fileUrl = newFile.getUrl();

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    
    // SUSUNAN ARRAY DATA (HARUS BERJUMLAH 17 KOLOM A-Q)
    var rowData = [
      dataKirim.unit_kerja, dataKirim.nama_asn, dataKirim.nip_asn,
      "'" + tglSimpan, "'" + jamSimpan, dataKirim.jenis, "'" + dataKirim.komulatif,
      timestamp, dataKirim.user_login, fileUrl, "Diproses", "", "", "", "", "",
      dataKirim.npsn // KOLOM Q (NPSN) DITULIS DI SINI!
    ];
    sheet.appendRow(rowData);
    return "Sukses Data Berhasil Disimpan";
    
  } catch (e) { 
      return (e.message.includes("lock")) ? "Error: Sistem sedang memproses data user lain. Silakan coba lagi." : "Error: " + e.message; 
  } finally {
      lock.releaseLock(); 
  }
}

function updateLupaPresensi(form, fileData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 

    var baris = parseInt(form.recId);
    var targetNip = form.nip_asn || form.nip_lama; 
    var tglSimpan = form.tanggal; 

    var err = cekBentrokLupa(targetNip, tglSimpan, form.jenis, baris);
    if (err) return err;

    var ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_LUPA.SHEET_NAMA);
    
    var rangeLama = sheet.getRange(baris, 1, 1, 17); 
    var valLama = rangeLama.getValues()[0];
    var finalUrl = valLama[9]; 
    
    var targetFolder = getFolderTahunBulan(KONFIG_LUPA.FOLDER_ID, tglSimpan);
    var fileNameBaru = targetNip + " - " + tglSimpan + " - " + form.jenis + ".pdf";

    if (fileData && fileData.data) {
       var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, fileNameBaru);
       var newFile = targetFolder.createFile(blob);
       newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
       finalUrl = newFile.getUrl();
    } else {
       var tglLamaSheet = String(valLama[3]).replace(/'/g, "");
       if (tglSimpan !== tglLamaSheet || form.jenis !== valLama[5]) {
           try { 
             var idFile = finalUrl.match(/[-\w]{25,}/);
             if(idFile) {
                 var fileDrive = DriveApp.getFileById(idFile[0]);
                 fileDrive.setName(fileNameBaru);
                 if (tglSimpan !== tglLamaSheet) fileDrive.moveTo(targetFolder);
             }
           } catch(e) {}
       }
    }

    var jamSimpan = form.waktu; 
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    // UPDATE DATA UTAMA
    sheet.getRange(baris, 4).setValue("'" + tglSimpan);      
    sheet.getRange(baris, 5).setValue("'" + jamSimpan);      
    sheet.getRange(baris, 6).setValue(form.jenis);   
    sheet.getRange(baris, 7).setValue("'" + form.komulatif); 
    sheet.getRange(baris, 10).setValue(finalUrl);    
    
    // =========================================================
    // LOGIKA SULTAN: RESET STATUS & BERSIHKAN JEJAK VERIFIKASI LAMA
    // =========================================================
    sheet.getRange(baris, 11).setValue("Diproses"); // Kembalikan otomatis ke Diproses
    sheet.getRange(baris, 14).setValue("");         // Hapus Tanggal Verif Lama
    sheet.getRange(baris, 15).setValue("");         // Hapus Nama Admin Verif Lama
    sheet.getRange(baris, 16).setValue("");         // Hapus Catatan Penolakan/Revisi Lama
    // =========================================================

    sheet.getRange(baris, 12).setValue(Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"));        
    sheet.getRange(baris, 13).setValue(form.user_login);
    sheet.getRange(baris, 17).setValue(form.npsn); 

    return "Sukses Data Berhasil Diupdate";
  } catch(e) { 
      return (e.message.includes("lock")) ? "Error: Sistem sedang sibuk. Silakan coba lagi." : "Error: " + e.message; 
  } finally { lock.releaseLock(); }
}

function hapusLupaPresensi(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
    var sheetMain = ss.getSheetByName(KONFIG_LUPA.SHEET_NAMA);

    var rowIdx = parseInt(dataKirim.recId);
    if (isNaN(rowIdx)) throw new Error("ID Baris tidak valid.");

    var now = new Date();
    var validCode = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
    if(String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH"); 

    var fileUrl = sheetMain.getRange(rowIdx, 10).getValue(); 
    if (fileUrl && String(fileUrl).includes("drive")) {
        try {
            var fid = fileUrl.match(/[-\w]{25,}/);
            if(fid) DriveApp.getFileById(fid[0]).setTrashed(true); 
        } catch(e) { console.log("Gagal hapus file drive: " + e.message); }
    }

    sheetMain.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if(e.message === "KODE_SALAH") return "KODE_SALAH";
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Error Server: " + e.message;
  } finally { lock.releaseLock(); }
}

function verifikasiLupaPresensi(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var ss = SpreadsheetApp.openById(KONFIG_LUPA.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_LUPA.SHEET_NAMA);
    
    var baris = parseInt(form.recId);
    if (isNaN(baris) || baris < 2) throw new Error("ID Baris tidak valid.");

    sheet.getRange(baris, 11).setValue(form.status);
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(baris, 14).setValue(now);
    sheet.getRange(baris, 15).setValue(form.user_verif);
    sheet.getRange(baris, 16).setValue(form.keterangan);

    return "Sukses";
  } catch (e) {
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Gagal Verifikasi: " + e.message;
  } finally { lock.releaseLock(); }
}

/* ======================================================================
   HELPER UTILITIES (FUNGSI PENDUKUNG WAJIB)
   ====================================================================== */
function normalizeToYMD(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  var s = String(val).replace(/'/g, "").trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  var parts = s.split(/[-/]/); 
  if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
      return parts[2] + "-" + parts[1].padStart(2, '0') + "-" + parts[0].padStart(2, '0');
  }
  return s; 
}

function getFolderTahunBulan(parentId, strTgl) {
  try {
      var parts = strTgl.split("-");
      var year = (parts[0].length === 4) ? parts[0] : parts[2]; 
      var monthIdx = parseInt(parts[1], 10) - 1; 
      var arrBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      var monthName = arrBulan[monthIdx] || "Unknown";
      
      var parentFolder = DriveApp.getFolderById(parentId);
      var yearFolder = (parentFolder.getFoldersByName(year).hasNext()) ? parentFolder.getFoldersByName(year).next() : parentFolder.createFolder(year);
      var targetFolder = (yearFolder.getFoldersByName(monthName).hasNext()) ? yearFolder.getFoldersByName(monthName).next() : yearFolder.createFolder(monthName);
      
      return targetFolder;
  } catch(e) { throw new Error("Gagal Akses Folder Drive! Detail: " + e.message); }
}