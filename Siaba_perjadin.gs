/* ====================================================================== */
/* MODUL: PERJALANAN DINAS (SIABA) - FULL BACKEND SULTAN                  */
/* ====================================================================== */

var ID_SS_DINAS = "1I_2yUFGXnBJTCSW6oaT3D482YCs8TIRkKgQVBbvpa1M"; 
var ID_FOLDER_DINAS = "1uPeOU7F_mgjZVyOLSsj-3LXGdq9rmmWl";

/* ----------------------------------------------------------------------
   1. GET DAFTAR DINAS (UNTUK DATATABLES)
   ---------------------------------------------------------------------- */
function getDaftarDinas(tahun, bulan, status, _cb) {
  try {
    SpreadsheetApp.flush();
    var ss = SpreadsheetApp.openById(ID_SS_DINAS);
    var sheet = ss.getSheetByName("Perjalanan_Dinas");
    if (!sheet) return JSON.stringify([]);

    // BAB VIII: Menggunakan getDisplayValues agar aman
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];
    
    var fTahun = (tahun == null) ? "" : String(tahun).trim();
    var fBulan = (bulan == null) ? "" : String(bulan).trim();
    var fStatus = (status == null) ? "" : String(status).trim();

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (String(row[1]).trim() === "") continue; 

      var valTgl = row[3];
      var rowTahun = "", rowBulan = "";

      // Format Teks karena menggunakan getDisplayValues
      var s = String(valTgl).replace(/'/g, "").trim();
      var parts = s.split(/[-/]/); 
      if (parts.length === 3) {
         if(parts[2].length === 4) { rowTahun = String(parts[2]); rowBulan = String(parseInt(parts[1], 10)); }
         else if (parts[0].length === 4) { rowTahun = String(parts[0]); rowBulan = String(parseInt(parts[1], 10)); }
      }

      var matchTahun = (fTahun === "") || (rowTahun === fTahun);
      var matchBulan = (fBulan === "") || (rowBulan === fBulan);
      var matchStatus = (fStatus === "") || (String(row[9]) == fStatus);

      if (matchTahun && matchBulan && matchStatus) {
        var t1 = parseTime(row[11]); // Tgl Kirim
        var t2 = parseTime(row[13]); // Last Update
        var t3 = parseTime(row[15]); // Tgl Verif
        var lastActivity = Math.max(t1, t2, t3);

        result.push({
          rowBaris: i + 1,
          jenis: row[0], noSpt: row[1], tglSpt: cleanDate(row[2]), tglMulai: cleanDate(row[3]), tglSelesai: cleanDate(row[4]),
          tujuan: row[5], kegiatan: row[6], jmlAsn: row[7], dokumen: row[8], status: row[9], jenisDok: row[10],
          tglKirim: cleanDate(row[11]), userKirim: row[12], lastUpdate: cleanDate(row[13]), lastUser: row[14],
          tglVerif: cleanDate(row[15]), verifikator: row[16], keterangan: row[17],
          timestamp: lastActivity
        });
      }
    }
    
    result.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return JSON.stringify(result);
  } catch (e) { return JSON.stringify({error: e.toString()}); } 
}

/* ----------------------------------------------------------------------
   2. SIMPAN & UPDATE SPT (UNIFIED)
   ---------------------------------------------------------------------- */
function simpanSptUnified(payload) {
  try {
    var ss = SpreadsheetApp.openById(ID_SS_DINAS);
    var sheetMaster = ss.getSheetByName("Perjalanan_Dinas");
    var sheetDetail = ss.getSheetByName("Perjalanan_Dinas_Peserta");
    
    if (!sheetDetail) {
      sheetDetail = ss.insertSheet("Perjalanan_Dinas_Peserta");
      sheetDetail.appendRow(["No SPT", "NIP", "Nama", "Unit", "Status", "Keterangan", "Waktu Input"]);
    }

    var now = new Date();
    var sysDateStr = "'" + Utilities.formatDate(now, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
    var userName = payload.user_login || "User Web";

    var tglSptTxt = toTextDate(payload.header.tglSpt);
    var tglMulaiTxt = toTextDate(payload.header.tglMulai);
    var tglSelesaiTxt = toTextDate(payload.header.tglSelesai);

    var fileUrl = "";
    if (payload.fileData && payload.fileName) {
      var folder = DriveApp.getFolderById(ID_FOLDER_DINAS);
      var blob = Utilities.newBlob(Utilities.base64Decode(payload.fileData), payload.mimeType, payload.fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fileUrl = file.getUrl();
    }

    if (payload.isNewSpt) {
      sheetMaster.appendRow([
        payload.header.jenis, payload.header.noSpt, tglSptTxt, tglMulaiTxt, tglSelesaiTxt,
        payload.header.tujuan, payload.header.kegiatan, payload.listPeserta.length, fileUrl, "Diproses", 
        payload.header.jenisDok, sysDateStr, userName, sysDateStr, userName, "", "", ""
      ]);
    } else {
      // BAB VIII: Menggunakan getDisplayValues
      var dataM = sheetMaster.getDataRange().getDisplayValues();
      var found = false;
      for(var j=1; j<dataM.length; j++){
        if(String(dataM[j][1]).trim() === String(payload.header.noSpt).trim()) {
          var r = j + 1;
          if(payload.header.jenis) sheetMaster.getRange(r, 1).setValue(payload.header.jenis);
          if(payload.header.tglSpt) sheetMaster.getRange(r, 3).setValue(tglSptTxt);
          if(payload.header.tglMulai) sheetMaster.getRange(r, 4).setValue(tglMulaiTxt);
          if(payload.header.tglSelesai) sheetMaster.getRange(r, 5).setValue(tglSelesaiTxt);
          if(payload.header.tujuan) sheetMaster.getRange(r, 6).setValue(payload.header.tujuan);
          if(payload.header.kegiatan) sheetMaster.getRange(r, 7).setValue(payload.header.kegiatan);
          if(fileUrl !== "") sheetMaster.getRange(r, 9).setValue(fileUrl);
          if(payload.header.jenisDok) sheetMaster.getRange(r, 11).setValue(payload.header.jenisDok);

          var curJml = parseInt(dataM[j][7] || 0);
          sheetMaster.getRange(r, 8).setValue(curJml + payload.listPeserta.length);
          sheetMaster.getRange(r, 14).setValue(sysDateStr); 
          sheetMaster.getRange(r, 15).setValue(userName);   
          found = true;
          break;
        }
      }
      if(!found) return "Error: Data tidak ditemukan.";
    }

    var rowsPeserta = [];
    payload.listPeserta.forEach(function(p){
      rowsPeserta.push([payload.header.noSpt, p.nip, p.nama, p.unit, "Diproses", "", sysDateStr]);
    });
    if(rowsPeserta.length > 0) {
      sheetDetail.getRange(sheetDetail.getLastRow() + 1, 1, rowsPeserta.length, 7).setValues(rowsPeserta);
    }

    SpreadsheetApp.flush();
    return "Sukses";
  } catch (e) { return "Error: " + e.toString(); }
}

/* ----------------------------------------------------------------------
   3. PENCARIAN & PESERTA
   ---------------------------------------------------------------------- */
function cariPegawaiDatabase(keyword) {
  try {
      var ss = SpreadsheetApp.openById(ID_SS_DINAS);
      var sheet = ss.getSheetByName("Database"); 
      if(!sheet) return JSON.stringify([]);

      // BAB VIII: Menggunakan getDisplayValues
      var data = sheet.getDataRange().getDisplayValues();
      var result = []; 
      var k = keyword.toLowerCase();

      for(var i=1; i<data.length; i++) {
        var nip = String(data[i][1]).toLowerCase(); 
        var nama = String(data[i][2]).toLowerCase();
        
        if(nama.includes(k) || nip.includes(k)) {
           result.push({ unit: data[i][0], nip: data[i][1], nama: data[i][2] });
           if(result.length >= 10) break;
        }
      }
      return JSON.stringify(result);
  } catch(e) { return JSON.stringify([]); }
}

function cekInfoSpt(noSpt) {
  try {
    var ss = SpreadsheetApp.openById(ID_SS_DINAS);
    var sheet = ss.getSheetByName("Perjalanan_Dinas");
    if (!sheet) return JSON.stringify({ found: false });
    
    // BAB VIII: Menggunakan getDisplayValues
    var data = sheet.getDataRange().getDisplayValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]).trim().toUpperCase() === String(noSpt).trim().toUpperCase()) {
        return JSON.stringify({
          found: true,
          data: {
            jenis: data[i][0],
            tglSpt: toHtmlDate(data[i][2]),
            tglMulai: toHtmlDate(data[i][3]),
            tglSelesai: toHtmlDate(data[i][4]),
            tujuan: data[i][5],
            kegiatan: data[i][6],
            status: data[i][9],
            jenisDok: data[i][10]
          }
        });
      }
    }
    return JSON.stringify({ found: false });
  } catch(e) { return JSON.stringify({ found: false }); }
}

function getPesertaDinas(noSpt) {
  try {
      var ss = SpreadsheetApp.openById(ID_SS_DINAS);
      var sheet = ss.getSheetByName("Perjalanan_Dinas_Peserta");
      if (!sheet) return JSON.stringify([]);
      
      // BAB VIII: Menggunakan getDisplayValues
      var data = sheet.getDataRange().getDisplayValues();
      var result = [];
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]).trim().toUpperCase() === String(noSpt).trim().toUpperCase()) {
          result.push({ nip: data[i][1], nama: data[i][2], unit: data[i][3], status: data[i][4] });
        }
      }
      return JSON.stringify(result);
  } catch(e) { return JSON.stringify([]); }
}

/* ----------------------------------------------------------------------
   4. VERIFIKASI & HAPUS
   ---------------------------------------------------------------------- */
function verifikasiDataDinas(payload) {
  try {
    var ss = SpreadsheetApp.openById(ID_SS_DINAS);
    var sheet = ss.getSheetByName("Perjalanan_Dinas");
    var row = parseInt(payload.recId);
    var verifikator = payload.user_verif || "Admin";
    var now = new Date();
    var sysDateStr = "'" + Utilities.formatDate(now, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");

    sheet.getRange(row, 10).setValue(payload.status);
    sheet.getRange(row, 16).setValue(sysDateStr);   
    sheet.getRange(row, 17).setValue(verifikator);  

    if (payload.keterangan) {
        sheet.getRange(row, 18).setValue(payload.keterangan);
    } else if (payload.status === 'Disetujui') {
        sheet.getRange(row, 18).setValue("");
    }
    
    SpreadsheetApp.flush();
    return "Sukses";
  } catch(e) { return "Error: " + e.toString(); }
}

function hapusDataDinas(payload) {
  try {
    var d = new Date(); var kd = d.getFullYear()+""+String(d.getMonth()+1).padStart(2,'0')+""+String(d.getDate()).padStart(2,'0');
    if (payload.kode !== kd) return "KODE_SALAH";
      
    var ss = SpreadsheetApp.openById(ID_SS_DINAS);
    var sheet = ss.getSheetByName("Perjalanan_Dinas");
    sheet.deleteRow(parseInt(payload.recId));
    SpreadsheetApp.flush();
    return "Sukses";
  } catch(e) { return "Error: " + e.toString(); }
}

/* ----------------------------------------------------------------------
   5. HELPER FORMAT TANGGAL & WAKTU (Aman untuk String)
   ---------------------------------------------------------------------- */
function cleanDate(val) {
  if (!val) return "";
  return String(val).replace(/'/g, "").trim();
}

function toTextDate(htmlDate) {
  if (!htmlDate) return "";
  var p = htmlDate.split("-");
  if (p.length === 3) return "'" + p[2] + "-" + p[1] + "-" + p[0];
  return "'" + htmlDate;
}

function toHtmlDate(textDate) {
  if (!textDate) return "";
  var str = String(textDate).replace(/'/g, "").trim();
  var p = str.split("-");
  if (p.length === 3 && p[0].length === 2) return p[2] + "-" + p[1] + "-" + p[0]; 
  return str;
}

function parseTime(val) { 
  if (!val) return 0; 
  var s = String(val).replace(/'/g, "").trim(); 
  if (s === "") return 0; 
  var parts = s.split(" "); 
  var sep = parts[0].includes("-") ? "-" : "/"; 
  var dP = parts[0].split(sep); 
  if (dP.length !== 3) return 0; 
  var tP = (parts[1]||"00:00:00").split(":"); 
  var year = dP[2].length === 4 ? dP[2] : dP[0];
  var month = dP[1];
  var day = dP[0].length === 2 ? dP[0] : dP[2];
  
  return new Date(parseInt(year), parseInt(month)-1, parseInt(day), parseInt(tP[0]||0), parseInt(tP[1]||0), parseInt(tP[2]||0)).getTime(); 
}