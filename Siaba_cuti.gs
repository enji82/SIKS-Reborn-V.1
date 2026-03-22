/* ======================================================================
   MODUL: DATA CUTI (SIABA - ENTERPRISE LOCKSERVICE & SULTAN BLUEPRINT)
   ====================================================================== */

const KONFIG_CUTI = {
  DB_ID: "1UYG80gGxuC19ieaVBzJaUV8bhlS2q5gExr0-Yl7upKo", 
  FOLDER_ID: "1uPeOU7F_mgjZVyOLSsj-3LXGdq9rmmWl",
  SHEET_MAIN: "Form Cuti",
  SHEET_DB: "Database Cuti"
};

/* ======================================================================
   0. SISTEM KEAMANAN NPSN & MASTER DATABASE
   ====================================================================== */
function getUnitKerjaByNPSN(npsn) {
  try {
    const ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    const sheet = ss.getSheetByName("Database_Sekolah");
    if (!sheet) return JSON.stringify({ error: "Sheet Database_Sekolah tidak ditemukan." });

    const data = sheet.getDataRange().getDisplayValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(npsn).trim()) {
        return JSON.stringify({ unitKerja: data[i][2] });
      }
    }
    return JSON.stringify({ error: "NPSN (" + npsn + ") tidak terdaftar." });
  } catch (e) { return JSON.stringify({ error: "Error Server: " + e.message }); }
}

function getDatabasePegawai() {
  try {
    const ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    const sheet = ss.getSheetByName("Database_ASN");
    if (!sheet) return [];

    const data = sheet.getDataRange().getDisplayValues();
    let result = [];
    for (let i = 1; i < data.length; i++) {
      result.push({ unit: data[i][0], nip: data[i][1], nama: data[i][2], npsn: data[i][3] });
    }
    return result;
  } catch (e) { return []; }
}

function getDatabaseCutiOptions() {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_DB);
    if (!sheet) return JSON.stringify([]);
    
    var data = sheet.getDataRange().getDisplayValues();
    var res = [];
    for (var i = 1; i < data.length; i++) { 
      if (data[i][0] && data[i][2]) {
          res.push({ 
              nip: String(data[i][0]), 
              unit: String(data[i][1]), 
              nama: String(data[i][2]), 
              status: String(data[i][3]), 
              alamat: String(data[i][8]), 
              hp: String(data[i][9]) 
          });
      }
    }
    return JSON.stringify(res);
  } catch (e) { return JSON.stringify([]); }
}

/* ======================================================================
   1. GET DATA CUTI
   ====================================================================== */
function getDataCuti(tahun, bulan, unitFilter) { 
  try {
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    if (!sheet) return JSON.stringify({ error: "Sheet Form Cuti tidak ditemukan." });
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    var dataDisplay = sheet.getRange(1, 1, lastRow, 51).getDisplayValues(); 
    var result = [];
    
    var fTahun = tahun ? String(tahun).trim() : "";
    var fBulan = bulan ? String(bulan).toLowerCase().trim() : "";

    for (var i = 1; i < dataDisplay.length; i++) {
      var rowTxt = dataDisplay[i];
      if (!rowTxt[1] && !rowTxt[2]) continue;
      
      var rawTglMulai = String(rowTxt[4]).replace(/'/g, "").trim().toLowerCase(); 
      var rTahun = "";
      var parts = rawTglMulai.split(/[-/\s]/); 
      
      for(var p=0; p<parts.length; p++) {
         var chunk = parts[p].trim();
         if(chunk.length === 4 && !isNaN(chunk)) {
             rTahun = chunk;
             break;
         }
      }
      
      if (fTahun !== "" && rTahun !== fTahun) continue; 

      var tInput = parseTime(rowTxt[13]); 
      var tEdit  = parseTime(rowTxt[15]); 
      var tVerif = parseTime(rowTxt[17]); 
      var lastActivity = Math.max(tInput, tEdit, tVerif);

      result.push({
        rowBaris: i + 1,
        unit: rowTxt[0], nama: rowTxt[1], nip: rowTxt[2], jenis: rowTxt[3],
        tglMulai: rowTxt[4], tglSelesai: rowTxt[5], jumlah: rowTxt[6],
        alasan: rowTxt[7], alamat: rowTxt[8], telepon: rowTxt[9],
        status: rowTxt[10], ket: rowTxt[11], fileUrl: rowTxt[12],
        tglInput: rowTxt[13], userInput: rowTxt[14],
        tglEdit: rowTxt[15], userEdit: rowTxt[16],
        tglVerif: rowTxt[17], verifikator: rowTxt[18],
        tanggal: rowTxt[21] || "", 
        npsn: rowTxt[50] || "", 
        timestamp: lastActivity
      });
    }
    
    result.sort(function(a, b) { return b.timestamp - a.timestamp; });
    return JSON.stringify(result);
  } catch(e) { return JSON.stringify({ error: "Gagal Server: " + e.message }); }
}

/* ======================================================================
   2. TULIS DATA CUTI
   ====================================================================== */

function simpanPengajuanCuti(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000); 
    var errorBentrok = cekBentrokCuti(payload.nip, payload.tglMulai, payload.tglSelesai, null);
    if (errorBentrok) return errorBentrok;

    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    
    var sysDateStr = "'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var tglMulaiIndo = formatIndoText(payload.tglMulai);
    var tglSelesaiIndo = formatIndoText(payload.tglSelesai);
    var tglPengajuanFormat = formatTglIndo(payload.tglPengajuan);
    
    var dbData = getDetailPegawaiByNip(payload.nip); 
    var pejabat = lookupPejabatStruktural(payload.jenisCuti, payload.unit, (dbData ? dbData.golongan : ""), (dbData ? dbData.jabatan : ""));
    var pData = setupPdfData(payload, dbData, pejabat, tglPengajuanFormat, tglMulaiIndo, tglSelesaiIndo);
    var linkPdf = generatePdfCuti(pData); 

    var rowData = new Array(51).fill("");
    rowData[0]=payload.unit; rowData[1]=payload.nama; rowData[2]="'"+payload.nip; rowData[3]=payload.jenisCuti;
    rowData[4]=tglMulaiIndo; rowData[5]=tglSelesaiIndo; rowData[6]=payload.jumlahHari; rowData[7]=payload.alasan;
    rowData[8]=payload.alamat; rowData[9]="'"+payload.hp; rowData[10]="Diproses"; rowData[11]=""; rowData[12]=linkPdf;
    rowData[13]=sysDateStr; rowData[14]=payload.userInput; 
    rowData[21]=tglPengajuanFormat; rowData[22]=pData.jabatan; rowData[23]=pData.masa_kerja; rowData[24]=pData.unit;
    rowData[25]=pData.ct; rowData[26]=pData.cb; rowData[27]=pData.cs; rowData[28]=pData.cm; rowData[29]=pData.cap; rowData[30]=pData.cltn;
    rowData[31]=pData["N-2"]; rowData[32]=pData["N-1"]; rowData[33]=pData["N"];
    rowData[34]=pData.jabatan_atasan; rowData[35]=pData.nama_atasan; rowData[36]=pData.nip_atasan;
    rowData[37]=pData.jabatan_setuju; rowData[38]=pData.nama_setuju; rowData[39]=pData.nip_setuju; rowData[40]=pData.kepada;
    rowData[50]=payload.npsn; 

    sheet.appendRow(rowData);
    SpreadsheetApp.flush();
    return "Sukses";
  } catch (e) { return (e.message.includes("lock")) ? "Sistem sibuk memproses dokumen. Coba sebentar lagi." : "Error: " + e.message; } finally { lock.releaseLock(); }
}

function updatePengajuanCuti(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var rowIndex = parseInt(payload.rowBaris);
    var errorBentrok = cekBentrokCuti(payload.nip, payload.tglMulai, payload.tglSelesai, rowIndex);
    if (errorBentrok) return errorBentrok;

    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    
    var statusLama = String(sheet.getRange(rowIndex, 11).getValue()).toLowerCase();
    if (statusLama.includes("ok") || statusLama.includes("setuju")) return "Gagal: Data sudah Disetujui.";

    var tglEditStr = "'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var tglMulaiIndo = formatIndoText(payload.tglMulai);
    var tglSelesaiIndo = formatIndoText(payload.tglSelesai);
    var tglPengajuanFormat = formatTglIndo(payload.tglPengajuan);

    var dbData = getDetailPegawaiByNip(payload.nip); 
    var pejabat = lookupPejabatStruktural(payload.jenisCuti, payload.unit, (dbData ? dbData.golongan : ""), (dbData ? dbData.jabatan : ""));
    var pData = setupPdfData(payload, dbData, pejabat, tglPengajuanFormat, tglMulaiIndo, tglSelesaiIndo);
    var linkPdf = generatePdfCuti(pData); 

    sheet.getRange(rowIndex, 1, 1, 10).setValues([[
        payload.unit, payload.nama, "'" + payload.nip, payload.jenisCuti, 
        tglMulaiIndo, tglSelesaiIndo, payload.jumlahHari, payload.alasan, 
        payload.alamat, "'" + payload.hp
    ]]);

    sheet.getRange(rowIndex, 11, 1, 3).setValues([["Diproses", "", linkPdf]]);
    sheet.getRange(rowIndex, 16, 1, 4).setValues([[tglEditStr, payload.userInput, "", ""]]); 
    
    sheet.getRange(rowIndex, 22, 1, 20).setValues([[
      tglPengajuanFormat, pData.jabatan, pData.masa_kerja, pData.unit,
      pData.ct, pData.cb, pData.cs, pData.cm, pData.cap, pData.cltn, 
      pData["N-2"], pData["N-1"], pData["N"], 
      pData.jabatan_atasan, pData.nama_atasan, pData.nip_atasan,
      pData.jabatan_setuju, pData.nama_setuju, pData.nip_setuju, pData.kepada       
    ]]);

    sheet.getRange(rowIndex, 51).setValue(payload.npsn);
    SpreadsheetApp.flush();
    return "Sukses";
  } catch (e) { return (e.message.includes("lock")) ? "Sistem sibuk memproses PDF." : "Error: " + e.message; } finally { lock.releaseLock(); }
}

function hapusPengajuanCuti(rowBaris, kodeInput, userDelete) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var d = new Date(); var kd = d.getFullYear()+""+String(d.getMonth()+1).padStart(2,'0')+""+String(d.getDate()).padStart(2,'0');
    if (String(kodeInput).trim() !== kd) return "KODE_SALAH";

    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    sheet.deleteRow(parseInt(rowBaris));
    SpreadsheetApp.flush();
    return "Sukses";
  } catch (e) { return (e.message.includes("lock")) ? "Sistem sibuk." : "Error: " + e.message; } finally { lock.releaseLock(); }
}

function verifikasiPengajuan(rowBaris, status, catatan, adminName) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    var row = parseInt(rowBaris);

    var rowData = sheet.getRange(row, 1, 1, 51).getDisplayValues()[0];
    var oldUrl = rowData[12]; 

    sheet.getRange(row, 11).setValue(status);
    sheet.getRange(row, 12).setValue("'" + catatan);
    sheet.getRange(row, 18).setValue("'" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss"));
    sheet.getRange(row, 19).setValue(adminName || "Admin");

    var pData = {
        asn: rowData[1], nip: String(rowData[2]).replace(/'/g, ""), unit: rowData[24],
        jabatan: rowData[22], masa_kerja: rowData[23], 
        ct: rowData[25], cb: rowData[26], cs: rowData[27], cm: rowData[28], cap: rowData[29], cltn: rowData[30],
        "N-2": rowData[31], "N-1": rowData[32], "N": rowData[33],
        jabatan_atasan: rowData[34], nama_atasan: rowData[35], nip_atasan: rowData[36],
        jabatan_setuju: rowData[37], nama_setuju: rowData[38], nip_setuju: rowData[39],
        kepada: rowData[40],
        tanggal: rowData[21], 
        alasan: rowData[7], jumlah: rowData[6],
        tmc: rowData[4], tsc: rowData[5], alamat: rowData[8], telp: String(rowData[9]).replace(/'/g, ""),
        jenisCutiRaw: rowData[3], 
        tglMulaiRaw: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd") 
    };
    
    var linkPdf = generatePdfCuti(pData);
    if (linkPdf && linkPdf.length > 5) {
        sheet.getRange(row, 13).setValue(linkPdf); 
        if (oldUrl && oldUrl.includes("docs.google.com")) {
            try {
                var match = oldUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) DriveApp.getFileById(match[1]).setTrashed(true);
            } catch(e){}
        }
    }

    SpreadsheetApp.flush();
    return "Sukses";
  } catch (e) { return (e.message.includes("lock")) ? "Sistem memproses PDF, harap tunggu." : "Error: " + e.message; } finally { lock.releaseLock(); }
}

/* ======================================================================
   3. HELPERS & GENERATOR PDF
   ====================================================================== */

function cekBentrokCuti(nipBaru, tglMulaiBaruStr, tglSelesaiBaruStr, rowIdPengecualian) {
  var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
  var data = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN).getDataRange().getDisplayValues();
  var d1 = new Date(tglMulaiBaruStr); d1.setHours(0,0,0,0);
  var d2 = new Date(tglSelesaiBaruStr); d2.setHours(0,0,0,0);

  for (var i = 1; i < data.length; i++) {
    if (rowIdPengecualian && (i + 1) == rowIdPengecualian) continue;
    var st = String(data[i][10]).toLowerCase();
    if (String(data[i][2]).replace(/'/g,"").trim() === String(nipBaru).trim() && !st.includes("tolak") && !st.includes("batal")) {
      var tM = parseDateIndo(data[i][4]) || new Date(data[i][4]);
      var tS = parseDateIndo(data[i][5]) || new Date(data[i][5]);
      if (tM && tS) {
        tM.setHours(0,0,0,0); tS.setHours(0,0,0,0);
        if (d1 <= tS && d2 >= tM) return "Gagal: Tanggal bentrok dengan pengajuan aktif.";
      }
    }
  }
  return null;
}

function getDetailPegawaiByNip(targetNip) {
  var data = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID).getSheetByName(KONFIG_CUTI.SHEET_DB).getDataRange().getDisplayValues();
  for (var i = 1; i < data.length; i++) { if (String(data[i][0]).trim() === String(targetNip).trim()) return { golongan: data[i][4], jabatan: data[i][5], unitLengkap: data[i][6], masaKerja: data[i][7], fullRow: data[i] }; }
  return null;
}

function lookupPejabatStruktural(jenisCuti, unitUser, golUser, tugasUser) {
  try {
      var data = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID).getSheetByName("Data Atasan").getDataRange().getDisplayValues();
      var j = String(jenisCuti).toLowerCase().trim();
      var t = String(tugasUser).toLowerCase().trim();
      var g = String(golUser).toLowerCase().trim();
      var u = String(unitUser).toLowerCase().trim();

      function cleanStr(str) {
          return str.toLowerCase().replace(/kecamatan secang/g, '').replace(/kabupaten magelang/g, '').replace(/\bnegeri\b/g, 'n').replace(/\bsdn\b/g, 'sd n').replace(/\bsmpn\b/g, 'smp n').replace(/[^a-z0-9]/g, ''); 
      }
      
      var cleanU = cleanStr(u);
      var cleanT = cleanStr(t);
      var bestMatch = null;
      var highestScore = -1;

      for (var i = 1; i < data.length; i++) {
          var ruleJ = String(data[i][0]).toLowerCase().trim();
          var ruleT = String(data[i][1]).toLowerCase().trim();
          var ruleG = String(data[i][2]).toLowerCase().trim();
          var ruleU = String(data[i][3]).toLowerCase().trim();

          if (ruleJ === "" && ruleT === "" && ruleG === "" && ruleU === "") continue;

          var isMatch = true;
          var score = 0;

          if (ruleJ !== "") { if (j === ruleJ || j.indexOf(ruleJ) > -1) score += 100; else isMatch = false; }
          if (ruleT !== "") { var cRuleT = cleanStr(ruleT); if (cleanT === cRuleT || cleanT.indexOf(cRuleT) > -1 || cRuleT.indexOf(cleanT) > -1) score += 50; else isMatch = false; }
          if (ruleG !== "") { if (g === ruleG || g.indexOf(ruleG) > -1) score += 50; else isMatch = false; }
          if (ruleU !== "") { var cRuleU = cleanStr(ruleU); if (cleanU === cRuleU || cleanU.indexOf(cRuleU) > -1 || cRuleU.indexOf(cleanU) > -1) score += 10; else isMatch = false; }

          if (isMatch && score > highestScore) {
              highestScore = score;
              bestMatch = { nama_atasan: data[i][4], nip_atasan: data[i][5], jabatan_atasan: data[i][6], nama_setuju: data[i][7], nip_setuju: data[i][8], jabatan_setuju: data[i][9], kepada: data[i][10] };
          }
      }
      return bestMatch;
  } catch (e) { return null; }
}

function setupPdfData(payload, dbData, pejabat, tglPengajuanFormat, tglMulaiIndo, tglSelesaiIndo) {
    var d = { tanggal: tglPengajuanFormat, asn: payload.nama, nip: payload.nip, jabatan: (dbData?dbData.jabatan:"-"), masa_kerja: (dbData?dbData.masaKerja:"-"), unit: (dbData?dbData.unitLengkap:payload.unit), alasan: payload.alasan, jumlah: payload.jumlahHari, tmc: tglMulaiIndo, tsc: tglSelesaiIndo, alamat: payload.alamat, telp: payload.hp, ct:"", cs:"", cap:"", cb:"", cm:"", cltn:"", "N-2":"-", "N-1":"-", "N":"-", jenisCutiRaw: payload.jenisCuti, tglMulaiRaw: payload.tglMulai };
    
    if (pejabat) { 
        d.kepada = pejabat.kepada; d.nama_atasan = pejabat.nama_atasan; d.nip_atasan = pejabat.nip_atasan; d.jabatan_atasan = pejabat.jabatan_atasan; d.nama_setuju = pejabat.nama_setuju; d.nip_setuju = pejabat.nip_setuju; d.jabatan_setuju = pejabat.jabatan_setuju; 
    } else { 
        d.kepada = dbData?dbData.fullRow[19]:""; d.nama_atasan = dbData?dbData.fullRow[13]:""; d.nip_atasan = dbData?dbData.fullRow[14]:""; d.jabatan_atasan = dbData?dbData.fullRow[15]:""; d.nama_setuju = dbData?dbData.fullRow[16]:""; d.nip_setuju = dbData?dbData.fullRow[17]:""; d.jabatan_setuju = dbData?dbData.fullRow[18]:""; 
    }
    
    var thnMulai = parseInt(payload.tglMulai.split("-")[0]);
    if (dbData) { 
        if (thnMulai===2023){d["N-2"]=dbData.fullRow[26]||"0";d["N-1"]=dbData.fullRow[28]||"0";d["N"]=dbData.fullRow[30]||"0"} 
        else if (thnMulai===2024){d["N-2"]=dbData.fullRow[38]||"0";d["N-1"]=dbData.fullRow[40]||"0";d["N"]=dbData.fullRow[42]||"0"} 
        else if (thnMulai===2025){d["N-2"]=dbData.fullRow[50]||"0";d["N-1"]=dbData.fullRow[52]||"0";d["N"]=dbData.fullRow[54]||"0"} 
        else if (thnMulai===2026){d["N-2"]=dbData.fullRow[62]||"0";d["N-1"]=dbData.fullRow[64]||"0";d["N"]=dbData.fullRow[66]||"0"} 
    }
    
    var j = String(payload.jenisCuti).toLowerCase(); var CK = "✓";
    if(j.includes("sakit")) d.cs=CK; else if(j.includes("penting")) d.cap=CK; else if(j.includes("besar")) d.cb=CK; else if(j.includes("melahirkan")) d.cm=CK; else if(j.includes("luar")||j.includes("tanggungan")) d.cltn=CK; else d.ct=CK;
    return d;
}

function generatePdfCuti(data) {
  var ID_TEMPLATE = "1k5KmEZj5nikuUV-MLnY4c6Tn-jFIhmOMGwhjvqaUSzk"; 
  var ID_IMAGE_CHECK = "1AbFps5ZiyeBH9hVa_XTYvfnoO77DxFle";
  try {
    var pF = DriveApp.getFolderById(KONFIG_CUTI.FOLDER_ID);
    var p = data.tglMulaiRaw.split("-"); 
    var mN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"][parseInt(p[1],10)-1];
    var yF = pF.getFoldersByName(p[0]).hasNext() ? pF.getFoldersByName(p[0]).next() : pF.createFolder(p[0]);
    var tF = yF.getFoldersByName(mN).hasNext() ? yF.getFoldersByName(mN).next() : yF.createFolder(mN);
    
    var namaFileMurni = data.jenisCutiRaw + " - " + data.asn + " - " + data.tmc;
    var tempFile = DriveApp.getFileById(ID_TEMPLATE).makeCopy("TEMP_" + namaFileMurni, tF);
    var tDoc = DocumentApp.openById(tempFile.getId());
    var b = tDoc.getBody(); 
    var img = DriveApp.getFileById(ID_IMAGE_CHECK).getBlob();
    
    for (var k in data) {
        if(["ct","cs","cb","cm","cap","cltn"].indexOf(k)>-1) {
            var n=b.findText("{{"+k+"}}"); 
            while(n){
                var el=n.getElement(); 
                el.deleteText(n.getStartOffset(), n.getEndOffsetInclusive()); 
                if(data[k]==="✓") el.getParent().asParagraph().insertInlineImage(n.getStartOffset(), img).setWidth(11).setHeight(11); 
                n=b.findText("{{"+k+"}}");
            }
        } else if(k!=="jenisCutiRaw" && k!=="tglMulaiRaw") { 
            b.replaceText("{{"+k+"}}", (data[k]==null?"":String(data[k]))); 
        }
    }
    tDoc.saveAndClose(); 
    
    Utilities.sleep(3000); 

    var pdfBlob = tempFile.getAs("application/pdf");
    var pdfFile = tF.createFile(pdfBlob).setName(namaFileMurni + ".pdf");
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); 
    tempFile.setTrashed(true);

    return pdfFile.getUrl();
  } catch(e) { return ""; }
}

function formatTglIndo(iso) { 
    if(!iso) return ""; 
    var p = iso.split("-"); 
    if (p.length !== 3) return iso;
    var m = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10)-1] + " " + p[0]; 
}

function formatIndoText(iso) { 
    if(!iso) return ""; 
    var p = iso.split("-"); 
    if (p.length !== 3) return iso;
    var m = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    return parseInt(p[2], 10) + " " + m[parseInt(p[1], 10)-1] + " " + p[0]; 
}

function parseTime(val) { if (!val) return 0; if (val instanceof Date) return val.getTime(); var s = String(val).replace(/'/g, "").trim(); if (s === "") return 0; var iso = s.split("-"); if (iso.length === 3 && iso[0].length === 4) return new Date(s).getTime(); var parts = s.split(" "); var sep = parts[0].includes("-") ? "-" : "/"; var dP = parts[0].split(sep); if (dP.length !== 3) return 0; var tP = (parts[1]||"00:00:00").split(":"); return new Date(parseInt(dP[2]), parseInt(dP[1])-1, parseInt(dP[0]), parseInt(tP[0]||0), parseInt(tP[1]||0), parseInt(tP[2]||0)).getTime(); }
function parseDateIndo(str) { if(!str) return null; str = String(str).toLowerCase().replace(/,/g, ""); var p = str.split(" "); if (p.length >= 3) { var mIdx = ["januari","februari","maret","april","mei","juni","juli","agustus","september","oktober","november","desember"].indexOf(p[1]); if(mIdx > -1) return new Date(parseInt(p[2]), mIdx, parseInt(p[0])); } var p2 = str.split("/"); if (p2.length === 3) return new Date(p2[2], p2[1]-1, p2[0]); return null; }

/* ======================================================================
   MODUL: SISA CUTI TAHUNAN & REKAP
   ====================================================================== */
function getSisaCutiData() {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName("Sisa CT");
    if (!sheet) return JSON.stringify({ error: "Sheet 'Sisa CT' tidak ditemukan di database." });
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 1) return JSON.stringify({ headers: [], data: [] });
    
    var rawValues = sheet.getRange(1, 1, lastRow, 13).getDisplayValues(); 
    var headers = rawValues[0];
    var rows = rawValues.slice(1);
    
    rows.sort(function(a, b) { 
        var valA = String(a[1]).toLowerCase(); 
        var valB = String(b[1]).toLowerCase(); 
        if (valA < valB) return -1; 
        if (valA > valB) return 1; 
        return 0; 
    });
    
    return JSON.stringify({ headers: headers, data: rows });
  } catch (e) { return JSON.stringify({ error: "Error Server: " + e.toString() }); }
}

function getRekapYears() {
  var ID_MASTER = KONFIG_CUTI.DB_ID;
  try {
    var ss = SpreadsheetApp.openById(ID_MASTER);
    var sheet = ss.getSheetByName("Jumlah Cuti");
    if (!sheet) return [];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    
    var data = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
    var result = data.filter(function(row) { return row[0] !== "" && row[1] !== ""; });
    return result.map(function(r) { return { tahun: r[0], id: r[1] }; });
  } catch (e) { return []; }
}

function getRekapData(targetInput) {
  var ID_MASTER = KONFIG_CUTI.DB_ID;
  var ss, sheet;
  try { ss = SpreadsheetApp.openById(ID_MASTER); sheet = ss.getSheetByName(targetInput); } catch(e) {}
  if (!sheet) {
      try { ss = SpreadsheetApp.openById(targetInput); sheet = ss.getSheets()[0]; } 
      catch(e) { return JSON.stringify({ error: "Gagal membuka data. Pastikan Nama Tab atau ID File benar." }); }
  }
  try {
    var lastRow = sheet.getLastRow();
    if (lastRow < 3) return JSON.stringify({ h1:[], h2:[], data: [] });
    
    var rawValues = sheet.getRange(1, 1, lastRow, 15).getDisplayValues();
    var h1 = rawValues[0]; var h2 = rawValues[1]; var dataRows = rawValues.slice(2);
    
    return JSON.stringify({ h1: h1, h2: h2, data: dataRows });
  } catch (e) { return JSON.stringify({ error: "Error: " + e.toString() }); }
}

/* ======================================================================
   MODUL: UNGGAH SURAT CUTI (VAKSIN FLUSH & JSON RETURN)
   ====================================================================== */

function getUnitOptionsUnggah() {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    if (!sheet) return [];
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];
    
    var data = sheet.getRange(2, 1, lastRow - 1, 1).getDisplayValues();
    var unique = {};
    var result = [];
    
    for (var i = 0; i < data.length; i++) {
      var unit = String(data[i][0]).trim();
      if (unit && !unique[unit]) {
        unique[unit] = true;
        result.push(unit);
      }
    }
    result.sort();
    return result;
  } catch (e) { return []; }
}

function getDaftarUnggahCuti(tahun, bulan, unit, status) {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    if (!sheet) return JSON.stringify([]);

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]);
    
    var data = sheet.getRange(2, 1, lastRow - 1, 51).getDisplayValues();
    var result = [];

    var fTahun  = (tahun && String(tahun).trim() !== "") ? String(tahun).trim() : null;
    var fBulan  = (bulan && String(bulan).trim() !== "") ? String(bulan).trim() : null;
    var arrBulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    function parseToTs(strDate) {
      if (!strDate || strDate === "") return 0;
      strDate = String(strDate).trim();
      if (strDate.indexOf(":") > -1 && strDate.indexOf("-") > -1 && strDate.length > 10) {
         var parts = strDate.split(" ");
         var dPart = parts[0].split("-");
         var tPart = parts[1].split(":");
         return new Date(dPart[2], dPart[1]-1, dPart[0], tPart[0], tPart[1], tPart[2]).getTime();
      }
      if (strDate.indexOf(" ") > -1) {
         var p = strDate.split(" ");
         if (p.length >= 3) {
             var thn = 0, bln = 0, tgl = 0;
             for(var i=0; i<p.length; i++) {
                 if(!isNaN(p[i]) && p[i].length === 4) thn = parseInt(p[i]);
                 else if(arrBulanIndo.indexOf(p[i]) > -1) bln = arrBulanIndo.indexOf(p[i]);
                 else if(!isNaN(p[i]) && p[i].length <= 2) tgl = parseInt(p[i]);
             }
             if (thn > 0) return new Date(thn, bln, tgl).getTime();
         }
      }
      var std = new Date(strDate).getTime();
      return isNaN(std) ? 0 : std;
    }

    for (var i = 0; i < data.length; i++) {
        var row = data[i];
        if (!row[1]) continue; 
        
        if (String(row[10]).trim().toLowerCase() !== "disetujui") continue;

        var rawTgl = String(row[4]).trim(); 
        var rTahun = "", rBulan = "";
        
        if (rawTgl.indexOf(" ") > -1) {
             var p = rawTgl.split(" ");
             if (p.length >= 3) {
                 for(var x=0; x<p.length; x++) {
                     if(!isNaN(p[x]) && p[x].length === 4) rTahun = p[x];
                     if(arrBulanIndo.indexOf(p[x]) > -1) rBulan = p[x];
                 }
             }
        }
        
        if (fTahun && rTahun !== fTahun) continue;
        if (fBulan && rBulan !== fBulan) continue;

        var tsMulai  = parseToTs(row[4]);  
        var tsUnggah = parseToTs(row[43]); 
        var tsEdit   = parseToTs(row[45]); 
        var tsVerif  = parseToTs(row[47]); 
        var lastActivityTs = Math.max(tsMulai, tsUnggah, tsEdit, tsVerif);

        result.push({
            rowBaris: i + 2,
            unit: row[0], nama: row[1], nip: row[2], jenis: row[3],
            tglMulai: row[4], tglSelesai: row[5], jumlah: row[6],
            fileUrl: row[41], statusUnggah: row[42], 
            tglUnggah: row[43], userUnggah: row[44],   
            tglEdit: row[45], userEdit: row[46],     
            tglVerif: row[47], verifikator: row[48], ket: row[49],
            npsn: row[50] || "",
            lastActivity: lastActivityTs
        });
    }

    result.sort(function(a, b) { 
        if (b.lastActivity === a.lastActivity) return b.rowBaris - a.rowBaris;
        return b.lastActivity - a.lastActivity; 
    });

    return JSON.stringify(result);
  } catch (e) { return JSON.stringify([{ error: e.toString() }]); }
}

function simpanUnggahSurat(form, fileData) {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    var row = parseInt(form.recId);
    
    if (isNaN(row) || row < 2) throw new Error("Data tidak valid.");

    var now = new Date();
    var sysDateStr = "'" + Utilities.formatDate(now, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var userName = form.user_login || "User Web";

    var fileUrl = "";
    if (fileData && fileData.data) {
        var folder = DriveApp.getFolderById(KONFIG_CUTI.FOLDER_ID);
        var namaFile = "SURAT_CUTI - " + form.nama + " - " + form.jenis + ".pdf";
        var blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, namaFile);
        var file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrl = file.getUrl();
    } else {
        throw new Error("File wajib diunggah.");
    }

    var oldStatus = sheet.getRange(row, 43).getValue();
    var isEdit = (oldStatus !== "" && oldStatus !== null);

    if (isEdit) {
        sheet.getRange(row, 42).setValue(fileUrl);      
        sheet.getRange(row, 43).setValue("Diproses");   
        sheet.getRange(row, 46).setValue(sysDateStr);   
        sheet.getRange(row, 47).setValue(userName);     
        sheet.getRange(row, 48).setValue("");           
        sheet.getRange(row, 49).setValue("");           
        sheet.getRange(row, 50).setValue("");           
    } else {
        sheet.getRange(row, 42).setValue(fileUrl);      
        sheet.getRange(row, 43).setValue("Diproses");   
        sheet.getRange(row, 44).setValue(sysDateStr);   
        sheet.getRange(row, 45).setValue(userName);     
    }

    SpreadsheetApp.flush(); // VAKSIN MUTLAK: Paksa tulis memori sebelum JS menarik data lagi
    return JSON.stringify({ status: "Sukses", url: fileUrl }); // VAKSIN ZERO BLINK: Lempar URL PDF baru
  } catch (e) { throw new Error("Gagal Unggah: " + e.message); }
}

function verifikasiUnggahSurat(form) {
  try {
    var ss = SpreadsheetApp.openById(KONFIG_CUTI.DB_ID);
    var sheet = ss.getSheetByName(KONFIG_CUTI.SHEET_MAIN);
    var row = parseInt(form.recId);

    var now = new Date();
    var sysDateStr = "'" + Utilities.formatDate(now, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");

    sheet.getRange(row, 43).setValue(form.status);
    sheet.getRange(row, 48).setValue(sysDateStr);      
    sheet.getRange(row, 49).setValue(form.user_verif); 
    sheet.getRange(row, 50).setValue("'" + form.ket);        

    SpreadsheetApp.flush(); // VAKSIN MUTLAK: Sinkronisasi database
    return "Sukses";
  } catch (e) { throw new Error("Gagal Verifikasi: " + e.message); }
}