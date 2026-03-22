/* ======================================================================
   MODUL SALAH PRESENSI (VERSI ENTERPRISE - PURE SULTAN BLUEPRINT)
   ====================================================================== */

// 1. PUSAT KONTROL DATABASE
const KONFIG_SALAH = {
  DB_ID: "1TZGrMiTuyvh2Xbo44RhJuWlQnOC5LzClsgIoNKtRFkY", // ID Database Boss
  SHEET_NAMA: "Salah_Presensi"
};

// =================================================================
// 2. FUNGSI BACA DATA (DENGAN VAKSIN TANGGAL & KOLOM O/NPSN)
// =================================================================
function getDaftarSalahPresensi(tahun, bulan) {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_SALAH.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_SALAH.SHEET_NAMA);
    if (!sheet) return JSON.stringify({ error: "Sheet 'Salah_Presensi' tidak ditemukan." });

    var data = sheet.getDataRange().getDisplayValues(); 
    var result = [];

    var fTahun  = (tahun) ? String(tahun).trim() : "";
    var fTahunPendek = fTahun.length === 4 ? fTahun.substring(2) : fTahun; // Toleransi format '26

    var mapBulan = { "Januari": "01", "Februari": "02", "Maret": "03", "April": "04", "Mei": "05", "Juni": "06", "Juli": "07", "Agustus": "08", "September": "09", "Oktober": "10", "November": "11", "Desember": "12" };
    var fBulanAngka = mapBulan[bulan] || ""; 

    for (var i = data.length - 1; i >= 1; i--) {
      var row = data[i];
      if (!row[1] && !row[2]) continue; // Abaikan baris kosong

      var txtTgl = String(row[3]).replace(/'/g, "").trim(); 
      
      // VAKSIN TANGGAL: Cari "2026" atau "/26" atau "-26"
      if (fTahun !== "") {
          if (txtTgl.indexOf(fTahun) === -1 && txtTgl.indexOf("/" + fTahunPendek) === -1 && txtTgl.indexOf("-" + fTahunPendek) === -1) {
              continue; 
          }
      }

      if (fBulanAngka !== "") {
          if (txtTgl.indexOf("-" + fBulanAngka + "-") === -1 && txtTgl.indexOf("/" + fBulanAngka + "/") === -1) continue;
      }

      result.push({
        rowBaris: i + 1,
        unit:     row[0],  
        nama:     row[1],  
        nip:      row[2],  
        tanggal:  row[3],  
        jam:      row[4],  
        jenis:    row[5],  
        tglKirim: row[6],  
        userInput:row[7],  
        status:   row[8],  
        ket:      row[9],  
        tglEdit:  row[10], 
        userEdit: row[11], 
        tglVerif: row[12], 
        adminVerif: row[13],
        npsn:     row[14] || "" // <--- AMBIL KOLOM O (INDEX 14) UNTUK FILTER PRIVATISASI!
      });
    }
    return JSON.stringify(result);
  } catch (e) { 
      return JSON.stringify({ error: "Error Server: " + e.message }); 
  }
}

// =================================================================
// 3. FUNGSI TULIS DATA (SIMPAN KOLOM O & RESET STATUS)
// =================================================================

function simpanSalahAbsen(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 
    
    var ss = SpreadsheetApp.openById(KONFIG_SALAH.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_SALAH.SHEET_NAMA);
    if (!sheet) throw new Error("Sheet tidak ditemukan!");
    
    var tglSimpan = form.tanggal; 
    var jamSimpan = String(form.waktu); 
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    var namaUser = form.user_login || "Guest";
    var tglKirim = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    
    // Cek Bentrok (Mencegah submit ganda)
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
        var rowStatus = String(data[i][8]).toLowerCase();
        if(String(data[i][2]).replace(/'/g,"").trim() === form.nip_asn && !rowStatus.includes("tolak")) {
            var rowTglRaw = String(data[i][3]).replace(/'/g,"").trim();
            // Samakan format YYYY-MM-DD
            if (rowTglRaw === tglSimpan && String(data[i][5]).trim() === form.jenis) {
                return "Gagal: Data ganda! Anda sudah mengajukan untuk tanggal dan jenis presensi tersebut.";
            }
        }
    }

    // SUSUN ARRAY (Total 15 Kolom A-O)
    var barisBaru = [
      form.unit_kerja, 
      form.nama_asn, 
      "'"+form.nip_asn, 
      "'" + tglSimpan, 
      "'" + jamSimpan, 
      form.jenis,      
      tglKirim, 
      namaUser, 
      "Diproses", 
      "",  // Ket kosong
      "",  // Tgl Edit kosong
      "",  // User Edit kosong
      "",  // Tgl Verif kosong
      "",  // Admin verif kosong
      form.npsn // <--- KOLOM O (NPSN) DITULIS KE SPREADSHEET!
    ];

    sheet.appendRow(barisBaru);
    return "Sukses Data Berhasil Disimpan";
    
  } catch (e) {
    return (e.message.includes("lock")) ? "Error: Sistem sedang sibuk. Coba lagi." : "Gagal simpan: " + e.message;
  } finally { lock.releaseLock(); }
}

function updateSalahAbsen(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); 

    var ss = SpreadsheetApp.openById(KONFIG_SALAH.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_SALAH.SHEET_NAMA);
    var barisKetemu = parseInt(form.recId);

    var targetNip = String(form.nip_lama).trim();
    var statusLama = String(sheet.getRange(barisKetemu, 9).getValue()).trim();

    // Cegah edit jika sudah disetujui
    if (statusLama.toLowerCase().includes("ok") || statusLama.toLowerCase().includes("setuju")) {
        return "Gagal: Data sudah Disetujui dan tidak bisa diedit.";
    }

    var jamSimpan = String(form.waktu); 
    if (jamSimpan && jamSimpan.includes(":")) {
       var jamParts = jamSimpan.split(":");
       jamSimpan = String(jamParts[0]).padStart(2, '0') + ":" + String(jamParts[1]).padStart(2, '0');
    }

    var tglEdit = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");

    // Update Input Dasar
    sheet.getRange(barisKetemu, 4).setValue("'" + form.tanggal);      
    sheet.getRange(barisKetemu, 5).setValue("'" + jamSimpan);     
    sheet.getRange(barisKetemu, 6).setValue(form.jenis);           

    // =========================================================
    // LOGIKA RESET SULTAN (Revisi/Ditolak -> Diproses)
    // =========================================================
    sheet.getRange(barisKetemu, 9).setValue("Diproses"); // Kembalikan ke Diproses
    sheet.getRange(barisKetemu, 10).setValue("");        // Hapus Catatan Penolakan Lama
    sheet.getRange(barisKetemu, 13).setValue("");        // Hapus Tgl Verif Lama
    sheet.getRange(barisKetemu, 14).setValue("");        // Hapus Admin Verif Lama

    // Catat Jejak Edit & NPSN
    sheet.getRange(barisKetemu, 11).setValue("'" + tglEdit);       
    sheet.getRange(barisKetemu, 12).setValue(form.user_login); 
    sheet.getRange(barisKetemu, 15).setValue(form.npsn); // <--- KOLOM O DIUPDATE!

    return "Sukses Data Berhasil Diupdate";
  } catch (e) {
    return (e.message.includes("lock")) ? "Error: Sistem sibuk." : "Error: " + e.message;
  } finally { lock.releaseLock(); }
}

function hapusSalahAbsen(dataKirim) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var ss = SpreadsheetApp.openById(KONFIG_SALAH.DB_ID);
    var sheetMain = ss.getSheetByName(KONFIG_SALAH.SHEET_NAMA);

    var rowIdx = parseInt(dataKirim.recId);
    if (isNaN(rowIdx)) throw new Error("ID Baris tidak valid.");

    var now = new Date();
    var validCode = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd");
    if(String(dataKirim.kode).trim() !== validCode) throw new Error("KODE_SALAH"); 

    sheetMain.deleteRow(rowIdx);
    return "Sukses";

  } catch (e) {
    if(e.message === "KODE_SALAH") return "KODE_SALAH";
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Error Server: " + e.message;
  } finally { lock.releaseLock(); }
}

function verifikasiSalahAbsen(form) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var ss = SpreadsheetApp.openById(KONFIG_SALAH.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_SALAH.SHEET_NAMA);
    
    var baris = parseInt(form.recId);
    if (isNaN(baris) || baris < 2) throw new Error("ID Baris tidak valid.");

    sheet.getRange(baris, 9).setValue(form.status);
    sheet.getRange(baris, 10).setValue("'" + form.keterangan);
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    sheet.getRange(baris, 13).setValue("'" + now);
    sheet.getRange(baris, 14).setValue(form.user_verif);

    return "Sukses";
  } catch (e) {
    return (e.message.includes("lock")) ? "Sistem sibuk, coba lagi." : "Gagal Verifikasi: " + e.message;
  } finally { lock.releaseLock(); }
}