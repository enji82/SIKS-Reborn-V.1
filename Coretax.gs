/* ======================================================================
   CORETAX.GS - ENGINE LAPORAN SPT TAHUNAN & CORETAX
   100% COMPLIANT DENGAN BAB VIII (getDisplayValues)
   ====================================================================== */

var CORETX_SPREADSHEET_ID = "1Zp8TpS3_qls7Lbpcc5pULht7gAJOHYLR9uZXk5cll2M";
var CORETX_SHEET_NAME = "input_coretax";

function getCoretaxData(filterUnit) {
  var result = [];
  try {
    var ss = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CORETX_SHEET_NAME);
    if (!sheet) return { error: "Sheet input_coretax tidak ditemukan!" };

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    // VAKSIN TAHUN PAJAK: Menarik 16 Kolom
    var data = sheet.getRange(2, 1, lastRow - 1, 16).getDisplayValues();
    var reqUnit = String(filterUnit || "").trim().toUpperCase();

    for (var i = data.length - 1; i >= 0; i--) {
      var row = data[i];
      var rUnit = String(row[1] || "").trim().toUpperCase();

      if (reqUnit && reqUnit !== "SEMUA" && rUnit !== reqUnit) continue;

      result.push({
        rowId: i + 2,
        npsn: row[0],
        unitKerja: row[1],
        namaAsn: row[2],
        nip: row[3],
        bpa2: row[4],
        fileBpa2: row[5],
        laporSpt: row[6],
        alasan: row[7],
        fileBukti: row[8],
        tglEdit: row[9],
        userEdit: row[10],
        tglVerif: row[11] || "",      
        userVerif: row[12] || "",     
        alasanVerif: row[13] || "",   
        statusVerif: row[14] || "Belum",
        tahunPajak: row[15] || "" // Kolom P (Index 15)
      });
    }
  } catch (e) {
    return { error: "Server Error: " + e.toString() };
  }
  return result;
}

function getCoretaxMasterPegawai(unitKerja, npsn) {
  var listPegawai = [];
  try {
    var MASTER_PTK_ID = "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA"; 
    var ssMaster = SpreadsheetApp.openById(MASTER_PTK_ID);
    var sheetMaster = ssMaster.getSheetByName("Database_ASN"); 
    
    if (!sheetMaster) {
        sheetMaster = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID).getSheetByName("Database_ASN");
    }
    
    if (sheetMaster) {
        var data = sheetMaster.getDataRange().getDisplayValues();
        var qUnit = String(unitKerja || "").trim().toUpperCase().replace(/\s+/g, ' ');
        var qNpsn = String(npsn || "").trim();
        
        for (var i = 1; i < data.length; i++) {
            var rUnit = String(data[i][0] || "").trim().toUpperCase().replace(/\s+/g, ' ');
            var rNip = String(data[i][1] || "").trim();
            var rNama = String(data[i][2] || "").trim();
            var rNpsn = String(data[i][3] || "").trim();
            
            var isMatch = false;
            if (qNpsn !== "" && rNpsn !== "") {
                isMatch = (rNpsn === qNpsn); 
            } else {
                isMatch = (rUnit === qUnit); 
            }
            
            if (isMatch && rNama !== "") {
                listPegawai.push({ nip: rNip, nama: rNama });
            }
        }
    }
  } catch(e) { Logger.log("Master Pegawai Error: " + e.message); }
  
  listPegawai.sort(function(a, b) { return a.nama.localeCompare(b.nama); });
  return listPegawai;
}

function getCoretaxListUnitKerja() {
   var unique = [];
   try {
      var ss = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID);
      var sheet = ss.getSheetByName(CORETX_SHEET_NAME);
      if(!sheet) return [];
      var data = sheet.getRange(2, 2, sheet.getLastRow(), 1).getDisplayValues(); 
      var map = {};
      for(var i=0; i<data.length; i++) {
          var u = String(data[i][0]).trim();
          if(u && !map[u]) { map[u] = true; unique.push(u); }
      }
      unique.sort();
   } catch(e) {}
   return unique;
}

function coretaxUploadFile(fileData, fileName) {
  try {
    var FOLDER_ID = "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El"; 
    var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, fileName);
    var file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return ""; }
}

function simpanCoretaxData(form, bpa2File, buktiFile) {
  try {
    var ss = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CORETX_SHEET_NAME);
    
    // VAKSIN 1: Validasi NIP & TAHUN PAJAK GANDA
    var lastRow = sheet.getLastRow() || 1;
    if (lastRow >= 2) {
        var dataNIP = sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues(); 
        var dataTahun = sheet.getRange(2, 16, lastRow - 1, 1).getDisplayValues(); 
        var inputNIP = String(form.nip).trim();
        var inputTahun = String(form.tahun_pajak).trim();

        if(inputNIP !== "" && inputNIP !== "NON-ASN") {
            for(var i=0; i < dataNIP.length; i++) {
                if(String(dataNIP[i][0]).trim() === inputNIP && String(dataTahun[i][0]).trim() === inputTahun) {
                    return { success: false, message: "Validasi Gagal: Data SPT untuk NIP tersebut di Tahun Pajak " + inputTahun + " sudah ada!" };
                }
            }
        }
    }

    var urlBpa2 = "";
    if (bpa2File && bpa2File.data) {
        urlBpa2 = coretaxUploadFile(bpa2File, "BPA2_" + form.nama_asn + "_" + form.nip + ".pdf");
    }

    var urlBukti = "";
    if (buktiFile && buktiFile.data) {
        var ext = "jpg";
        if(buktiFile.mimeType === "image/png") ext = "png";
        urlBukti = coretaxUploadFile(buktiFile, "BuktiSPT_" + form.nama_asn + "_" + form.nip + "." + ext);
    }

    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var userLog = form.user_login || "Admin";

    // VAKSIN 2: Susunan 16 Kolom Baru
    var rowData = [
      form.npsn || "", form.unit_kerja, form.nama_asn, form.nip, form.bpa2, urlBpa2, form.lapor_spt, form.alasan || "", urlBukti,
      "'" + now, userLog, "", "", "", "Diproses", form.tahun_pajak
    ];

    sheet.appendRow(rowData);
    SpreadsheetApp.flush();
    return { success: true, message: "Laporan SPT Coretax berhasil disimpan!", urlBpa2: urlBpa2, urlBukti: urlBukti };

  } catch (e) {
    return { success: false, message: "Error Server: " + e.toString() };
  }
}

function updateCoretaxData(form, bpa2File, buktiFile) {
  try {
    var ss = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CORETX_SHEET_NAME);
    var rowId = parseInt(form.rowid);
    
    var urlBpa2 = form.file_bpa2_lama || ""; 
    if (bpa2File && bpa2File.data) {
       urlBpa2 = coretaxUploadFile(bpa2File, "BPA2_Rev_" + form.nama_asn + "_" + form.nip + ".pdf");
    }

    var urlBukti = form.file_bukti_lama || "";
    if (buktiFile && buktiFile.data) {
       var ext = "jpg"; if(buktiFile.mimeType === "image/png") ext = "png";
       urlBukti = coretaxUploadFile(buktiFile, "BuktiSPT_Rev_" + form.nama_asn + "_" + form.nip + "." + ext);
    }

    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var userLog = form.user_login || "Admin";
    
    var currentRowData = sheet.getRange(rowId, 1, 1, 16).getValues()[0]; // Tarik 16 Kolom
    
    var oldStatus = String(currentRowData[14] || "").trim();
    var oldStatusLower = oldStatus.toLowerCase();
    var finalStatus = oldStatus; 
    
    if (oldStatusLower === "" || oldStatusLower === "belum" || oldStatusLower === "revisi" || oldStatusLower === "ditolak" || oldStatusLower === "diproses") {
        finalStatus = "Diproses";
    }

    // Susunan 16 Kolom (Tahun Pajak di Index 15)
    var newRowData = [
      form.npsn || currentRowData[0], form.unit_kerja, form.nama_asn, form.nip, form.bpa2, urlBpa2, form.lapor_spt, form.alasan || "", urlBukti,
      "'" + now, userLog, currentRowData[11] || "", currentRowData[12] || "", currentRowData[13] || "", finalStatus, form.tahun_pajak 
    ];

    sheet.getRange(rowId, 1, 1, 16).setValues([newRowData]);
    SpreadsheetApp.flush(); 
    return { success: true, message: "Data SPT berhasil diperbarui!", urlBpa2: urlBpa2, urlBukti: urlBukti };

  } catch (e) { 
    return { success: false, message: "Gagal Update: " + e.toString() }; 
  }
}

function processVerifikasiCoretax(rowId, status, alasan, userLogin) {
  try {
    var ss = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CORETX_SHEET_NAME);
    var r = parseInt(rowId);

    if (!sheet || isNaN(r)) return { success: false, message: "Referensi Data Salah" };

    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    sheet.getRange(r, 12).setValue("'" + now);          
    sheet.getRange(r, 13).setValue(userLogin);   
    sheet.getRange(r, 14).setValue(alasan);     
    sheet.getRange(r, 15).setValue(status);     

    SpreadsheetApp.flush();
    return { success: true, message: "Berhasil verifikasi: " + status };
  } catch (e) { return { success: false, message: "Gagal Verifikasi: " + e.toString() }; }
}

function deleteCoretaxData(rowId, inputCode, userLogin) {
  try {
    var now = new Date();
    var serverCode = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd"); 
    if (String(inputCode).trim() !== serverCode) { return { success: false, message: "Kode Keamanan Salah!" }; }

    var ss = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID);
    var sheetMain = ss.getSheetByName(CORETX_SHEET_NAME);
    
    var r = parseInt(rowId);
    sheetMain.deleteRow(r);
    
    SpreadsheetApp.flush();
    return { success: true, message: "Data berhasil dihapus secara permanen." };

  } catch (e) { return { success: false, message: "Error System: " + e.toString() }; }
}

/* ======================================================================
   CORETAX.GS - ENGINE DASHBOARD (BAB VIII COMPLIANT)
   ====================================================================== */

function getCoretaxDashboardData() {
    try {
        var ss = SpreadsheetApp.openById(CORETX_SPREADSHEET_ID);
        var shRekap = ss.getSheetByName("rekap_lapor");
        var shBelum = ss.getSheetByName("belum_lapor_spt");

        // BAB VIII: Eksekusi getDisplayValues Mutlak
        var dataRekap = shRekap ? shRekap.getDataRange().getDisplayValues() : [];
        var dataBelum = shBelum ? shBelum.getDataRange().getDisplayValues() : [];

        var resRekap = [];
        for (var i = 1; i < dataRekap.length; i++) {
            if (!dataRekap[i][1] || String(dataRekap[i][1]).trim() === "") continue;
            resRekap.push({
                npsn: dataRekap[i][0],
                unit: dataRekap[i][1],
                tahun: dataRekap[i][2],
                jml: parseInt(dataRekap[i][3]) || 0,
                sudah: parseInt(dataRekap[i][4]) || 0,
                belum: parseInt(dataRekap[i][5]) || 0
            });
        }

        var resBelum = [];
        for (var j = 1; j < dataBelum.length; j++) {
            if (!dataBelum[j][0] || String(dataBelum[j][0]).trim() === "") continue;
            resBelum.push({
                nama: dataBelum[j][0],
                nip: dataBelum[j][1],
                unit: dataBelum[j][2],
                tahun: dataBelum[j][3],
                status: dataBelum[j][4]
            });
        }

        return JSON.stringify({ success: true, rekap: resRekap, belum: resBelum });
    } catch(e) {
        return JSON.stringify({ success: false, error: e.message });
    }
}