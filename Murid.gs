// ==========================================
// DATA MURID PAUD MENURUT ROMBEL
// ID: 1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs
// ==========================================

function getDataMuridPAUDRombel() {
  var id = "1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Murid Rombel PAUD");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:Q (A=1, Q=17)
  var data = sheet.getRange(3, 1, lastRow - 2, 17).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID PAUD MENURUT JENIS KELAMIN
// ID: 1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs
// Sheet: Murid JK PAUD
// ==========================================

function getDataMuridPAUDJK() {
  var id = "1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Murid JK PAUD");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:AM (A=1, AM=39)
  // Data dimulai dari baris 3
  var data = sheet.getRange(3, 1, lastRow - 2, 39).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID SD PER KELAS
// ID: 1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s
// Sheet: Murid SD per Kelas
// ==========================================

function getDataMuridSDKelas() {
  var id = "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Murid SD per Kelas");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:AA (A=1, AA=27)
  // Data dimulai dari baris 3
  var data = sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID SD PER ROMBEL (A-BO)
// ID: 1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s
// ==========================================

function getDataMuridSDRombel() {
  var id = "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Murid SD per Rombel");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  // Header ada 3 baris (A1-BO3), data mulai baris 4
  if (lastRow < 4) return []; 
  
  // Ambil Range A4:BO (A=1, BO=67)
  var data = sheet.getRange(4, 1, lastRow - 3, 67).getDisplayValues();
  return data;
}

// ==========================================
// DATA MURID SD PER AGAMA (A-DN)
// ID: 1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s
// Sheet: Murid SD per Agama
// ==========================================

function getDataMuridSDAgama() {
  var id = "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Murid SD per Agama");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  // Header ada 3 baris, data mulai baris 4
  if (lastRow < 4) return []; 
  
  // Ambil Range A4:DN
  // Struktur:
  // Static (A-F) = 6 kolom
  // Kelas 1-6 + Total = 7 group * 18 kolom = 126 kolom
  // Total = 6 + 126 = 132 kolom
  // Kolom ke-132 adalah DN (A=1, Z=26, AA=27... DN=118?? Cek hitungan)
  
  // Hitung manual:
  // A-F = 6
  // G-X (K1) = 18
  // Y-AP (K2) = 18
  // AQ-BH (K3) = 18
  // BI-BZ (K4) = 18
  // CA-CR (K5) = 18
  // CS-DJ (K6) = 18
  // DK-EB (Total) = 18
  // Total sampai kolom EB (Kolom ke 132)
  
  // Ambil 132 kolom
  var data = sheet.getRange(4, 1, lastRow - 3, 132).getDisplayValues();
  return data;
}

/* ======================================================================
   MODUL: DASHBOARD MURID (FINAL FIX - AKURASI INDEKS KOLOM)
   ====================================================================== */

function getDashboardMuridData(tahunFilter, bulanFilter) {
  var result = {
    // Struktur Data: t=Total, n=Negeri, s=Swasta
    cards: { 
        sd_total: {t:0, n:0, s:0},
        sd_k1: {t:0, n:0, s:0}, sd_k2: {t:0, n:0, s:0}, sd_k3: {t:0, n:0, s:0},
        sd_k4: {t:0, n:0, s:0}, sd_k5: {t:0, n:0, s:0}, sd_k6: {t:0, n:0, s:0},
        tk:0, kb:0, sps:0 
    },
    chart: { sd_negeri:[], sd_swasta:[], tk:[], kb:[], sps:[] },
    lastMonthName: "-",
    log: [] 
  };

  for(var i=0; i<12; i++) {
    result.chart.sd_negeri[i] = 0; result.chart.sd_swasta[i] = 0;
    result.chart.tk[i] = 0; result.chart.kb[i] = 0; result.chart.sps[i] = 0;
  }

  var thnTarget = String(tahunFilter).trim();
  var blnTarget = parseInt(bulanFilter) || 0; 

  var parseBulan = function(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    var s = String(val).trim().toLowerCase();
    if (s.match(/^\d+$/)) return parseInt(s);
    if (s.includes("jan")) return 1; if (s.includes("feb") || s.includes("pebu")) return 2;
    if (s.includes("mar")) return 3; if (s.includes("apr")) return 4;
    if (s.includes("mei") || s.includes("may")) return 5; if (s.includes("jun")) return 6;
    if (s.includes("jul")) return 7; if (s.includes("agu")) return 8;
    if (s.includes("sep")) return 9; if (s.includes("okt")) return 10;
    if (s.includes("nov")) return 11; if (s.includes("des")) return 12;
    return 0;
  };

  var sumRange = function(row, startIdx, endIdx) {
    var total = 0;
    for (var c = startIdx; c <= endIdx; c++) {
        var raw = row[c];
        var val = (typeof raw === 'number') ? raw : (parseInt(String(raw).replace(/[^0-9]/g, '')) || 0);
        total += val;
    }
    return total;
  };

  // =========================================================
  // 1. DATA SD
  // =========================================================
  try {
    var ssSD = SpreadsheetApp.openById("1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s");
    var sheetInputSD = ssSD.getSheetByName("Input SD");
    
    if (sheetInputSD) {
        var lastRow = sheetInputSD.getLastRow();
        if (lastRow > 1) {
            // MAPPING (0-Based)
            var idxBulan = 1;   // B
            var idxTahun = 2;   // C
            var idxStatus = 4;  // E
            var idxTotal = 226; // HS

            // MAPPING KELAS (AKURAT)
            // K1 (J:Q)   -> 9 - 16
            // K2 (AE:AL) -> 30 - 37
            // K3 (AZ:BG) -> 51 - 58
            // K4 (BU:CB) -> 73 - 80 (BU = 73, CB = 80)
            // K5 (CP:CW) -> 94 - 101 (CP = 94, CW = 101)
            // K6 (DK:DR) -> 115 - 122 (DK = 115, DR = 122)
            
            var idxK1 = [9, 16];
            var idxK2 = [30, 37];
            var idxK3 = [51, 58];
            var idxK4 = [73, 80]; 
            var idxK5 = [94, 101];
            var idxK6 = [115, 122];

            var maxCol = Math.max(sheetInputSD.getLastColumn(), 230);
            var dataRaw = sheetInputSD.getRange(2, 1, lastRow - 1, maxCol).getDisplayValues();

            for (var i = 0; i < dataRaw.length; i++) {
                var row = dataRaw[i];
                var rowTahun = String(row[idxTahun]).trim();
                var rowBulan = parseBulan(row[idxBulan]); 

                if (rowTahun !== thnTarget) continue;
                if (rowBulan < 1 || rowBulan > 12) continue;

                var rawValTotal = row[idxTotal];
                var valTotal = (typeof rawValTotal === 'number') ? rawValTotal : (parseInt(String(rawValTotal).replace(/[^0-9]/g, '')) || 0);
                var status = String(row[idxStatus]).toLowerCase();
                var isNegeri = status.includes("negeri");

                // CHART
                if (isNegeri) result.chart.sd_negeri[rowBulan - 1] += valTotal;
                else result.chart.sd_swasta[rowBulan - 1] += valTotal;

                // CARD (Hitung Rincian)
                if (rowBulan === blnTarget) {
                    // Total
                    result.cards.sd_total.t += valTotal;
                    if(isNegeri) result.cards.sd_total.n += valTotal;
                    else result.cards.sd_total.s += valTotal;

                    // Kelas
                    var addClass = function(key, start, end) {
                        var v = sumRange(row, start, end);
                        result.cards[key].t += v;
                        if(isNegeri) result.cards[key].n += v;
                        else result.cards[key].s += v;
                    };

                    addClass('sd_k1', idxK1[0], idxK1[1]);
                    addClass('sd_k2', idxK2[0], idxK2[1]);
                    addClass('sd_k3', idxK3[0], idxK3[1]);
                    addClass('sd_k4', idxK4[0], idxK4[1]);
                    addClass('sd_k5', idxK5[0], idxK5[1]);
                    addClass('sd_k6', idxK6[0], idxK6[1]);
                }
            }
        }
    }
  } catch (e) { result.log.push("SD ERROR: " + e.message); }

  // =========================================================
  // 2. DATA PAUD
  // =========================================================
  try {
    var ssPAUD = SpreadsheetApp.openById("1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs");
    var sheetInputPAUD = ssPAUD.getSheetByName("Input PAUD");
    if (sheetInputPAUD) {
        var lastRow = sheetInputPAUD.getLastRow();
        if (lastRow > 1) {
            var idxBulanP = 1; var idxTahunP = 2; var idxJenjang = 6; var idxTotalP = 51;
            var maxColP = Math.max(sheetInputPAUD.getLastColumn(), 60);
            var dataPAUD = sheetInputPAUD.getRange(2, 1, lastRow - 1, maxColP).getDisplayValues();

            for (var i = 0; i < dataPAUD.length; i++) {
                var row = dataPAUD[i];
                var rowTahun = String(row[idxTahunP]).trim();
                var rowBulan = parseBulan(row[idxBulanP]);

                if (rowTahun !== thnTarget) continue;
                if (rowBulan < 1 || rowBulan > 12) continue;

                var valTotal = parseInt(String(row[idxTotalP]).replace(/[^0-9]/g, '')) || 0;
                var jenjang = String(row[idxJenjang]).toUpperCase().trim();

                if (jenjang.includes("TK")) result.chart.tk[rowBulan - 1] += valTotal;
                else if (jenjang.includes("KB")) result.chart.kb[rowBulan - 1] += valTotal;
                else if (jenjang.includes("SPS") || jenjang.includes("TPA")) result.chart.sps[rowBulan - 1] += valTotal;

                if (rowBulan === blnTarget) {
                    if (jenjang.includes("TK")) result.cards.tk += valTotal;
                    else if (jenjang.includes("KB")) result.cards.kb += valTotal;
                    else if (jenjang.includes("SPS") || jenjang.includes("TPA")) result.cards.sps += valTotal;
                }
            }
        }
    }
  } catch (e) { result.log.push("PAUD ERROR: " + e.message); }

  var months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  result.lastMonthName = (blnTarget > 0) ? months[blnTarget - 1] : "-";

  return JSON.stringify(result);
}