/* ======================================================================
   LAPBUL.GS - FULL ENGINE (KELOLA, STATUS, & DASHBOARD)
   100% COMPLIANT DENGAN BAB VIII (getDisplayValues)
   ====================================================================== */

var IDS = (typeof SPREADSHEET_IDS !== 'undefined') ? SPREADSHEET_IDS : {
    PAUD_DATA: "1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs", 
    SD_DATA: "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s"    
};

/* ======================================================================
   1. MODUL KELOLA DATA (PARTIAL FETCH)
   ====================================================================== */
function getLapbulKelolaData(filterJenjang, filterBulan, filterTahun, filterStatus, keyword) {
  var result = [];
  var isSearching = (keyword && keyword.length > 2);
  var LIMIT_PER_SHEET = isSearching ? 2000 : 300; 

  var reqJenjang = String(filterJenjang || "").toUpperCase().trim();
  var reqBulan = String(filterBulan || "").toLowerCase().trim();
  var reqTahun = String(filterTahun || "").toLowerCase().trim();
  var reqStatus = String(filterStatus || "").toLowerCase().trim();
  var reqKey = String(keyword || "").toLowerCase().trim();

  var cleanStringDate = function(val) {
      if (!val) return "-";
      var s = String(val).replace(/['"]/g, "").trim();
      if (s === "") return "-";
      return s;
  };

  var fetchDataSmart = function(spreadsheetId, sheetName, sourceLabel) {
      var sourceResult = [];
      try {
          var ss = SpreadsheetApp.openById(spreadsheetId);
          var sheet = ss.getSheetByName(sheetName);
          if (!sheet) return [];

          var lastRow = sheet.getLastRow();
          if (lastRow < 2) return []; 

          var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).toLowerCase().trim(); });

          var idx = {
              nama: headers.indexOf("nama sekolah") > -1 ? headers.indexOf("nama sekolah") : headers.indexOf("nama"),
              npsn: headers.indexOf("npsn"),
              bulan: headers.indexOf("bulan"),
              tahun: headers.indexOf("tahun"),
              jenjang: headers.indexOf("jenjang"),
              statusSekolah: headers.findIndex(function(h) { return h.includes("status sekolah") || h === "status"; }),
              rombel: headers.findIndex(function(h) { return h.includes("rombel") || h.includes("jml") || h.includes("total"); }),
              file: headers.findIndex(function(h) { return h.includes("file") || h.includes("dokumen"); })
          };

          var col = (sourceLabel === 'PAUD') ? 
                    { tglKirim:0, userKirim:43, tglEdit:44, userEdit:45, tglVerif:46, userVerif:47, statusData:48, ket:49 } : 
                    { tglKirim:0, userKirim:219, tglEdit:220, userEdit:221, tglVerif:222, userVerif:223, statusData:218, ket:224 };

          var startRow = Math.max(2, lastRow - LIMIT_PER_SHEET + 1); 
          var numRows = (lastRow - startRow + 1);
          if (numRows < 1) return [];

          var data = sheet.getRange(startRow, 1, numRows, sheet.getLastColumn()).getDisplayValues();

          for (var i = data.length - 1; i >= 0; i--) {
              var row = data[i];
              var realRowNumber = startRow + i; 

              if (reqBulan && String(row[idx.bulan]||"").toLowerCase() !== reqBulan) continue;
              if (reqTahun && String(row[idx.tahun]||"").toLowerCase() !== reqTahun) continue;
              if (reqJenjang && String(row[idx.jenjang]||"").toUpperCase() !== reqJenjang) continue;

              var rStatusData = String(row[col.statusData] || "Diproses");
              if (rStatusData.toLowerCase().includes("hapus")) continue;
              if (reqStatus && !rStatusData.toLowerCase().includes(reqStatus)) continue;

              var rNama = (idx.nama > -1) ? String(row[idx.nama]) : "Tanpa Nama";
              var rNpsn = (idx.npsn > -1) ? String(row[idx.npsn]) : "";
              if (reqKey && !rNama.toLowerCase().includes(reqKey) && !rNpsn.includes(reqKey)) continue;

              sourceResult.push({
                  rowId: realRowNumber,
                  source: sourceLabel,
                  namaSekolah: rNama,
                  npsn: rNpsn,
                  bulan: String(row[idx.bulan]||""),
                  tahun: String(row[idx.tahun]||""),
                  jenjang: String(row[idx.jenjang]||""),
                  statusSekolah: (idx.statusSekolah > -1) ? row[idx.statusSekolah] : "",
                  rombel: (idx.rombel > -1) ? (parseInt(row[idx.rombel]) || 0) : 0,
                  fileUrl: (idx.file > -1) ? row[idx.file] : "",
                  tglKirim: cleanStringDate(row[col.tglKirim]),
                  userKirim: row[col.userKirim] || "-",
                  tglEdit: cleanStringDate(row[col.tglEdit]),
                  userEdit: row[col.userEdit] || "-",
                  tglVerif: cleanStringDate(row[col.tglVerif]),
                  verifikator: row[col.userVerif] || "-",
                  statusData: rStatusData,
                  keterangan: row[col.ket] || ""
              });
          }
      } catch (e) {}
      return sourceResult;
  };

  var dataPAUD = fetchDataSmart(IDS.PAUD_DATA, "Input PAUD", "PAUD");
  var dataSD = fetchDataSmart(IDS.SD_DATA, "Input SD", "SD");
  
  return dataPAUD.concat(dataSD);
}

/* ======================================================================
   2. MODUL: MASTER DATA & PENYIMPANAN
   ====================================================================== */
function getSekolahByNPSN(npsn) {
  try {
    const ss = SpreadsheetApp.openById("1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA");
    const sheet = ss.getSheetByName("Data_Sekolah");
    const data = sheet.getDataRange().getDisplayValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(npsn).trim()) {
        return {
          found: true,
          npsn: data[i][0],
          jenjang: data[i][1],
          nama_sekolah: data[i][2],
          status_sekolah: data[i][3]
        };
      }
    }
    return { found: false };
  } catch (e) { return { error: e.toString() }; }
}

function getAllSchoolsList() {
  try {
    const ss = SpreadsheetApp.openById("1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA");
    const sheet = ss.getSheetByName("Data_Sekolah");
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    const data = sheet.getRange(2, 1, lastRow - 1, 16).getDisplayValues(); 
    
    const fmtDate = function(d) {
      if (!d) return "";
      if (d.includes("-")) {
         var p = d.split("-");
         if(p[2] && p[2].length === 4) return p[2]+"-"+p[1]+"-"+p[0]; 
      }
      return d;
    };

    return data.map(function(r) {
      return {
        npsn: String(r[0]).trim(),
        jenjang: r[1],
        nama: r[2],
        status: r[3],
        yayasan: r[4],
        no_sk_pendirian: r[5],
        tgl_pendirian: fmtDate(r[6]),
        no_sk_ijin: r[7],
        tgl_ijin: fmtDate(r[8]),
        akreditasi: r[9],
        skor: r[10],
        no_sertifikat: r[11],
        tgl_sertifikat: fmtDate(r[12]),
        alamat: r[13],
        telepon: r[14],
        email: r[15],
        search_key: (String(r[0]) + " " + String(r[2])).toLowerCase()
      };
    });
  } catch (e) {
    return [];
  }
}

function simpanLapbulSD_Complex(form, fileData) {
  return prosesSimpanLengkap(IDS.SD_DATA, "Input SD", "SD", form, fileData);
}

function simpanLapbulPAUD(form, fileData) {
  return prosesSimpanLengkap(IDS.PAUD_DATA, "Input PAUD", "PAUD", form, fileData);
}

function prosesSimpanLengkap(idSpreadsheet, namaSheet, source, form, fileData) {
  try {
    var ss = SpreadsheetApp.openById(idSpreadsheet);
    var sheet = ss.getSheetByName(namaSheet);
    
    var fileUrl = "";
    if (fileData && fileData.data) {
      var folderId = "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El"; 
      var fileName = "Laporan " + source + " - " + form.nama_sekolah + " - " + form.bulan + " " + form.tahun + ".pdf";
      fileUrl = uploadFileToDrive(fileData, folderId, fileName);
    }

    var headers = sheet.getRange(1, 1, 1, 300).getValues()[0].map(function(h) { 
      return String(h).toLowerCase().trim(); 
    });
    
    var rowData = new Array(headers.length).fill(""); 

    var isi = function(daftarNama, nilai) {
      if (!Array.isArray(daftarNama)) daftarNama = [daftarNama];
      var nilaiFinal = (nilai === null || nilai === undefined) ? "" : String(nilai);
      for (var i = 0; i < daftarNama.length; i++) {
        var idx = headers.indexOf(daftarNama[i].toLowerCase());
        if (idx > -1) { rowData[idx] = nilaiFinal; return; }
      }
    };

    isi(["nama sekolah", "nama"], form.nama_sekolah);
    isi(["npsn"], form.npsn);
    isi(["bulan"], form.bulan);
    isi(["tahun"], form.tahun);
    isi(["jenjang"], form.jenjang);
    isi(["status sekolah", "status"], form.status_sekolah);
    isi(["rombel", "total rombel", "jumlah rombel"], form.total_rombel || form.jumlah_rombel);

    if (source === "PAUD") {
        isi("0-1 L", form.u01_l); isi("0-1 P", form.u01_p);
        isi("1-2 L", form.u12_l); isi("1-2 P", form.u12_p);
        isi("2-3 L", form.u23_l); isi("2-3 P", form.u23_p);
        isi("3-4 L", form.u34_l); isi("3-4 P", form.u34_p);
        isi("4-5 L", form.u45_l); isi("4-5 P", form.u45_p);
        isi("5-6 L", form.u56_l); isi("5-6 P", form.u56_p);
        isi(["> 6 L", ">6 l"], form.u6_l);  isi(["> 6 P", ">6 p"], form.u6_p);
        isi("A L", form.kel_a_l); isi("A P", form.kel_a_p);
        isi("B L", form.kel_b_l); isi("B P", form.kel_b_p);
        isi("KS GTY", form.ks_gty); isi("KS GTT", form.ks_gtt); isi("KS PNS", form.ks_pns); isi("KS PPPK", form.ks_pppk);
        isi("GK GTY", form.gk_gty); isi("GK GTT", form.gk_gtt); isi("GK PNS", form.gk_pns); isi("GK PPPK", form.gk_pppk);
        isi("GP GTY", form.gp_gty); isi("GP GTT", form.gp_gtt); isi("GP PNS", form.gp_pns); isi("GP PPPK", form.gp_pppk);
        isi(["Penjaga", "Penjaga Sekolah"], form.td_penjaga);
        isi(["TAS", "Tenaga Administrasi", "Adm"], form.td_adm);
        isi(["Pustakawan", "Tenaga Perpustakaan"], form.td_perpus);
        isi(["Tendik Lain", "Tendik Lainnya"], form.td_lain);
    } else {
        for (var key in form) { isi([key, key.replace(/_/g, " ")], form[key]); }
    }

    isi(["dokumen", "file laporan", "link file"], fileUrl);
    
    var now = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    isi(["waktu kirim", "tgl kirim", "tanggal kirim", "timestamp"], "'" + now);
    isi(["status data", "status"], "Diproses");
    var userLogin = form.user_login || "Admin";
    isi(["user kirim", "user input", "pengirim"], userLogin);

    sheet.appendRow(rowData);
    
    if (typeof updateDataSekolahMaster === 'function') {
        updateDataSekolahMaster(form);
    }

    return { success: true, message: "Laporan berhasil disimpan! (" + userLogin + ")" };

  } catch (e) {
    return { success: false, message: "Error Server: " + e.toString() };
  }
}

function updateDataSekolahMaster(form) {
  try {
    const ss = SpreadsheetApp.openById("1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA");
    const sheet = ss.getSheetByName("Data_Sekolah");
    const data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(form.npsn).trim()) {
        var updateRange = sheet.getRange(i + 1, 5, 1, 12); 
        var updateValues = [[
          form.yayasan, form.no_sk_pendirian, form.tgl_pendirian, 
          form.no_sk_ijin, form.tgl_ijin, form.akreditasi, 
          form.skor, form.no_sertifikat, form.tgl_sertifikat, 
          form.alamat, form.telepon, form.email              
        ]];
        updateRange.setValues(updateValues);
        break; 
      }
    }
  } catch(e) {}
}

function uploadFileToDrive(fileData, folderId, fileName) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, fileName);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) { return "Error Upload"; }
}

/* ======================================================================
   3. MODUL: EDIT DATA (GET DETAIL & UPDATE)
   ====================================================================== */
function getDetailRowSD(rowId) { return getDetailGeneral(IDS.SD_DATA, "Input SD", rowId); }
function getDetailRowPAUD(rowId) { return getDetailGeneral(IDS.PAUD_DATA, "Input PAUD", rowId); }

function getDetailGeneral(idSS, namaSheet, rowId) {
  var result = {};
  try {
    var ss = SpreadsheetApp.openById(idSS);
    var sheet = ss.getSheetByName(namaSheet);
    if (!sheet) return { error: "Sheet tidak ditemukan!" };

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var data = sheet.getRange(parseInt(rowId), 1, 1, lastCol).getDisplayValues()[0];
    
    for (var i = 0; i < headers.length; i++) { result[String(headers[i]).trim()] = data[i]; }
    result.ROW_ID = rowId;
    return result;
  } catch (e) { return { error: "Error Backend: " + e.toString() }; }
}

function updateLapbulSD(form, fileData) { return prosesUpdateLengkap(IDS.SD_DATA, "Input SD", form, fileData); }
function updateLapbulPAUD(form, fileData) { return prosesUpdateLengkap(IDS.PAUD_DATA, "Input PAUD", form, fileData); }

function prosesUpdateLengkap(idSS, namaSheet, form, fileData) {
  try {
    var ss = SpreadsheetApp.openById(idSS);
    var sheet = ss.getSheetByName(namaSheet);
    var rowId = parseInt(form.EDIT_ROW_ID);
    
    var fileUrl = form.file_url_lama || ""; 
    if (fileData && fileData.data) {
       var folderId = "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El"; 
       fileUrl = uploadFileToDrive(fileData, folderId, "Laporan " + namaSheet + " - " + form.nama_sekolah + " - " + form.bulan + " " + form.tahun + " (Revisi)");
    }

    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var currentRowData = sheet.getRange(rowId, 1, 1, lastCol).getValues()[0];
    var newRowData = [];

    var now = new Date();
    var strTglEdit = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");
    var strUserEdit = form.user_login || "Admin";

    for (var i = 0; i < headers.length; i++) {
        var rawHeader = String(headers[i]).toLowerCase().trim();
        var keyForm = rawHeader.replace(/\s+/g, '_'); 
        
        if (rawHeader.includes("tgl edit") || rawHeader.includes("tanggal edit") || rawHeader.includes("update")) newRowData.push("'" + strTglEdit); 
        else if (rawHeader.includes("user edit") || rawHeader.includes("penyunting")) newRowData.push("'" + strUserEdit); 
        else if (rawHeader.includes("status data") || rawHeader === "status") newRowData.push("Diproses"); 
        else if (rawHeader.includes("dokumen") || rawHeader.includes("file")) newRowData.push(fileUrl);
        else if (form[keyForm] !== undefined) {
             var val = form[keyForm];
             if (rawHeader.includes("tgl") || rawHeader.includes("tanggal")) newRowData.push("'" + val); 
             else newRowData.push(val);
        }
        else newRowData.push(currentRowData[i]);
    }

    sheet.getRange(rowId, 1, 1, newRowData.length).setValues([newRowData]);
    SpreadsheetApp.flush(); 
    
    return { 
        success: true, message: "Data berhasil diperbarui!",
        newData: { tglEdit: strTglEdit, userEdit: strUserEdit, statusData: "Diproses", fileUrl: fileUrl }
    };
  } catch (e) { return { success: false, message: "Gagal Update: " + e.toString() }; }
}

function processDeleteData(source, rowId, inputCode, userLogin) {
  try {
    var now = new Date();
    var serverCode = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd"); 
    if (String(inputCode).trim() !== serverCode) return { success: false, message: "Kode Keamanan Salah!" };

    var config = source === 'SD' 
      ? { ssId: IDS.SD_DATA, sheetName: "Input SD", trashName: "Trash", folderId: "1MpEgpCDrTX-SHjdNIa3aUpKUyYZpejrb" }
      : { ssId: IDS.PAUD_DATA, sheetName: "Input PAUD", trashName: "Trash", folderId: "1EUIOthRbotJQlSphxVZ-QAdewe17UCOU" };

    var ss = SpreadsheetApp.openById(config.ssId);
    var sheetMain = ss.getSheetByName(config.sheetName);
    var sheetTrash = ss.getSheetByName(config.trashName) || ss.insertSheet(config.trashName);
    
    var r = parseInt(rowId);
    var lastCol = sheetMain.getLastColumn();
    var rowValues = sheetMain.getRange(r, 1, 1, lastCol).getValues()[0];
    
    var fileUrl = "";
    var headers = sheetMain.getRange(1, 1, 1, lastCol).getValues()[0];
    for(var h=0; h<headers.length; h++) {
       if(String(headers[h]).toLowerCase().includes("file")) { fileUrl = rowValues[h]; break; }
    }

    var moveStatus = "File tidak dipindah";
    if (fileUrl && fileUrl.includes("drive.google.com")) {
       try {
         var fileId = fileUrl.match(/[-\w]{25,}/); 
         if (fileId) { DriveApp.getFileById(fileId[0]).moveTo(DriveApp.getFolderById(config.folderId)); moveStatus = "File di-Trash"; }
       } catch (err) { moveStatus = "Gagal pindah file"; }
    }

    var trashData = rowValues.slice(); 
    trashData.push("Dihapus: " + userLogin, "'" + Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss"), moveStatus);
    sheetTrash.appendRow(trashData);
    sheetMain.deleteRow(r);

    return { success: true, message: "Data terhapus permanen." };
  } catch (e) { return { success: false, message: "Error System: " + e.toString() }; }
}

function processVerifikasiLapbul(source, rowId, status, keterangan, userLogin) {
  try {
    var config = source === 'SD' 
      ? { ssId: IDS.SD_DATA, sheetName: "Input SD", colStatus: 219, colKet: 225, colTglVerif: 223, colUserVerif: 224 }
      : { ssId: IDS.PAUD_DATA, sheetName: "Input PAUD", colStatus: 49, colKet: 50, colTglVerif: 47, colUserVerif: 48 };

    var ss = SpreadsheetApp.openById(config.ssId);
    var sheet = ss.getSheetByName(config.sheetName);
    var r = parseInt(rowId);

    var now = new Date();
    var strTgl = Utilities.formatDate(now, "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    sheet.getRange(r, config.colStatus).setValue(status);           
    sheet.getRange(r, config.colKet).setValue(keterangan);          
    sheet.getRange(r, config.colTglVerif).setValue("'" + strTgl);   
    sheet.getRange(r, config.colUserVerif).setValue(userLogin);     

    return { 
      success: true, message: "Berhasil verifikasi",
      newData: { status: status, ket: keterangan, tgl: strTgl, user: userLogin }
    };
  } catch (e) { return { success: false, message: "Gagal Verifikasi: " + e.toString() }; }
}

/* ======================================================================
   4. MODUL: STATUS PENGIRIMAN (HALAMAN LAPBUL_STATUS)
   ====================================================================== */
function getRekapLapbulStatus(filterTahun) {
  var result = { rows: [] };
  
  var fetchData = function(id, sheetName, defaultJenjang) {
    var temp = [];
    try {
      var ss = SpreadsheetApp.openById(id);
      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) return [];
      
      var data = sheet.getDataRange().getDisplayValues();
      if (data.length < 3) return []; 

      for (var i = 2; i < data.length; i++) {
        var row = data[i];
        var rTahun = String(row[3] || "").trim(); 
        if (filterTahun && rTahun !== String(filterTahun)) continue;

        var cleanRow = [
          row[0], row[1], String(row[2] || defaultJenjang).toUpperCase().trim(), rTahun, 
          row[4], row[5], row[6], row[7], row[8], row[9], row[10], row[11], row[12], row[13], row[14], row[15]
        ];
        temp.push(cleanRow);
      }
    } catch (e) {}
    return temp;
  };

  try {
    var rowsSD = fetchData(IDS.SD_DATA, "Status SD", "SD");
    var rowsPAUD = fetchData(IDS.PAUD_DATA, "Status PAUD", "PAUD");
    result.rows = rowsSD.concat(rowsPAUD);
  } catch(e) { result.error = e.toString(); }
  return result;
}

/* ======================================================================
   5. MODUL DASHBOARD: METRIK LAPBUL (VAKSIN BASELINE ABSOLUT)
   ====================================================================== */
function getLapbulMetric_SD(tahun, bulan) {
  return processSheetDashboard(IDS.SD_DATA, "Status SD", tahun, bulan, ["SD"]);
}

function getLapbulMetric_PAUD(tahun, bulan) {
  return processSheetDashboard(IDS.PAUD_DATA, "Status PAUD", tahun, bulan, ["TK", "KB", "SPS", "TPA"]);
}

function processSheetDashboard(idSS, sheetName, tahun, bulan, targetJenjangArray) {
  var result = { recent: [] };

  targetJenjangArray.forEach(function(j) {
    result[j.toLowerCase()] = { 
        total:0, sudah:0, belum:0, persen:0, 
        disetujui:0, diproses:0, revisi:0, ditolak:0,
        listBelum: [] 
    };
  });

  try {
    var schoolMap = {};
        
    // VAKSIN 1: TARIK MASTER SEKOLAH SEBAGAI BASELINE ABSOLUT
    // Ini menjamin "Total Sekolah" tidak akan pernah berkurang meski sekolah tsb pasif 1 tahun penuh
    try {
        var ssMaster = SpreadsheetApp.openById("1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA");
        var sheetMaster = ssMaster.getSheetByName("Data_Sekolah");
        if (sheetMaster) {
            var masterData = sheetMaster.getDataRange().getDisplayValues();
            for (var m = 1; m < masterData.length; m++) {
               var rStat = String(masterData[m][3] || "").toLowerCase();
               // Jangan hitung sekolah yang sudah tutup/nonaktif
               if(rStat.indexOf("tutup") > -1 || rStat.indexOf("non") > -1) continue; 

               var mJenjang = String(masterData[m][1] || "").trim().toUpperCase();
               if (targetJenjangArray.indexOf(mJenjang) > -1) {
                   var mNama = String(masterData[m][2] || "").trim();
                   var mNpsn = String(masterData[m][0] || "").trim();
                   var sKey = mNpsn ? mNpsn : mNama;
                   
                   schoolMap[sKey] = {
                       nama: mNama,
                       jenjang: mJenjang.toLowerCase(),
                       status: "-" // Secara bawaan divonis Belum Lapor
                   };
               }
            }
        }
    } catch(em) { Logger.log("Gagal muat Master Sekolah: " + em.toString()); }

    // VAKSIN 2: TARIK DATA TRANSAKSI & TIMPA STATUSNYA
    var ss = SpreadsheetApp.openById(idSS);
    var sheet = ss.getSheetByName(sheetName);
    
    if (sheet) {
        var data = sheet.getDataRange().getDisplayValues();
        if (data.length >= 3) { 
            // Penerjemah Bulan (1 -> Index Kolom)
            var bIndex = parseInt(bulan, 10);
            if (isNaN(bIndex)) {
                var months = ["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"];
                bIndex = months.indexOf(String(bulan).toLowerCase()) + 1;
            }
            
            if (bIndex >= 1 && bIndex <= 12) {
                var idxStatus = bIndex + 3; // Index kolom status bulan bersangkutan
                
                for (var i = 2; i < data.length; i++) {
                  var row = data[i];
                  var rNama = String(row[0]).trim();
                  var rNpsn = String(row[1]).trim();
                  var rJenjang = String(row[2]).trim().toUpperCase();
                  var rTahun = String(row[3]).trim();

                  if (rTahun !== String(tahun).trim()) continue;
                  if (targetJenjangArray.indexOf(rJenjang) === -1) continue;

                  var rawStatus = String(row[idxStatus] || "").trim();
                  var schoolKey = rNpsn ? rNpsn : rNama;

                  if (!schoolMap[schoolKey]) {
                      // Safety-net: Jika sekolah tidak terdaftar di master tapi ada di transaksi
                      schoolMap[schoolKey] = {
                          nama: rNama,
                          jenjang: rJenjang.toLowerCase(),
                          status: rawStatus
                      };
                  } else {
                      // Timpa status default dengan status dari sheet
                      var oldStatus = schoolMap[schoolKey].status.toLowerCase();
                      if (oldStatus === "" || oldStatus === "-" || oldStatus === "0") {
                          schoolMap[schoolKey].status = rawStatus;
                      }
                  }
                }
            }
        }
    }

    // 3. PENGHITUNGAN MATEMATIS KONSISTEN (TOTAL = SUDAH + BELUM)
    for (var sk in schoolMap) {
        var sData = schoolMap[sk];
        var stats = result[sData.jenjang];
        var st = sData.status.toLowerCase();

        stats.total++; // Menghitung total base absolut dari Master

        if (st === "" || st === "-" || st === "0") {
          stats.belum++;
          stats.listBelum.push(sData.nama); 
        } else {
          stats.sudah++;
          
          if (st.includes('revisi') || st.includes('perbaiki')) stats.revisi++;
          else if (st.includes('tolak') || st.includes('x') || st.includes('salah')) stats.ditolak++;
          else if (st.includes('ok') || st.includes('setuju') || st.includes('valid')) stats.disetujui++;
          else stats.diproses++;

          if (result.recent.length < 10) {
             result.recent.push({ sekolah: sData.nama, jenjang: sData.jenjang.toUpperCase(), status: sData.status });
          }
        }
    }

    // 4. FINALISASI PERSENTASE & SORTING
    targetJenjangArray.forEach(function(j) {
       var k = j.toLowerCase();
       var s = result[k];
       s.persen = s.total === 0 ? 0 : Math.round((s.sudah / s.total) * 100);
       s.listBelum.sort(); 
    });

  } catch (e) { result.error = e.toString(); }

  return JSON.stringify(result);
}