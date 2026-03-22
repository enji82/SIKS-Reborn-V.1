/* ======================================================================
   MODUL: KELOLA PTK SD
   Spreadsheet ID: 1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE
   Sheet: Master Data GTK
   ====================================================================== */

var ID_DB_PTK = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE";
var SHEET_PTK = "Master Data GTK";

// 1. AMBIL OPSI FILTER (UNIT & STATUS)
function getFilterOptionsPTK() {
  try {
    var ss = SpreadsheetApp.openById(ID_DB_PTK);
    var sheet = ss.getSheetByName(SHEET_PTK);
    if (!sheet) return JSON.stringify({ units: [], statuses: [] });
    
    // Ambil Kolom C (Unit) dan S (Status)
    var lastRow = sheet.getLastRow();
    if(lastRow < 2) return JSON.stringify({ units: [], statuses: [] });

    // Ambil data Unit (C/Index 2) dan Status (S/Index 18)
    // Kita ambil range besar sekalian biar 1x call
    var data = sheet.getRange(2, 1, lastRow - 1, 19).getValues(); 
    
    var unitSet = new Set();
    var statusSet = new Set();
    
    for(var i=0; i<data.length; i++){
        if(data[i][2]) unitSet.add(String(data[i][2]).trim());
        if(data[i][18]) statusSet.add(String(data[i][18]).trim());
    }
    
    return JSON.stringify({
        units: Array.from(unitSet).sort(),
        statuses: Array.from(statusSet).sort()
    });
  } catch(e) { return JSON.stringify({ error: e.message }); }
}

// 2. AMBIL DATA UTAMA (OPTIMASI DISPLAY VALUES)
function getDataPTKSD(filterUnit, filterStatus) {
  var ss = SpreadsheetApp.openById(ID_DB_PTK);
  var sheet = ss.getSheetByName(SHEET_PTK);
  var data = sheet.getDataRange().getValues();
  data.shift(); 
  
  var result = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    
    var tglLahirISO = parseIndoDate(row[9]);
    var tmtJabISO   = parseIndoDate(row[20]);
    var tmtGolISO   = parseIndoDate(row[22]);

    result.push({
      id: row[0],              // A
      npsn: row[1],            // B
      unit: row[2],            // C
      gelar_depan: row[3],     // D
      nama_no_gelar: row[4],   // E
      gelar_belakang: row[5],  // F
      nama_lengkap: row[6],    // G
      nip: row[7],             // H
      tmp_lahir: row[8],       // I
      tgl_lahir: tglLahirISO,  // J
      nik: row[10],            // K
      lp: row[11],             // L
      agama: row[12],          // M
      pendidikan: row[13],     // N
      jurusan: row[14],        // O
      thn_lulus: row[15],      // P
      alamat: row[16],         // Q
      hp: row[17],             // R
      status_peg: row[18],     // S
      jabatan: row[19],        // T
      tmt_jabatan: tmtJabISO,  // U
      pangkat: row[21],        // V
      tmt_gol: tmtGolISO,      // W
      mkg: row[23],            // X
      kelas_jab: row[24],      // Y
      tugas: row[25],          // Z
      nuptk: row[26],          // AA
      serdik: row[27],         // AB
      dapodik: row[28],        // AC
      tugtam: row[29],         // AD
      email: row[30],          // AE (Sekarang menjadi Email)
      diinput: row[31] ? Utilities.formatDate(new Date(row[31]), Session.getScriptTimeZone(), "dd/MM/yy HH:mm") : "", // AF
      user_input: row[32],     // AG
      diedit: row[33] ? Utilities.formatDate(new Date(row[33]), Session.getScriptTimeZone(), "dd/MM/yy HH:mm") : "",    // AH
      user_edit: row[34]       // AI
    });
  }
  
  return JSON.stringify(result);
}

// 3. UPDATE DATA PTK
function updateDataPTK(form) {
  try {
    var ss = SpreadsheetApp.openById(ID_DB_PTK);
    var sheet = ss.getSheetByName(SHEET_PTK);
    var data = sheet.getDataRange().getValues();
    
    var rowIndex = -1;
    for(var i=1; i<data.length; i++){
        if(String(data[i][0]) === String(form.id)){
            rowIndex = i + 1; 
            break;
        }
    }
    
    if(rowIndex === -1) return "Error: ID PTK tidak ditemukan.";

    var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, '');
    if (inputNip !== "" && inputNip !== "-") {
        for (var i = 1; i < data.length; i++) {
            var rowNip = String(data[i][7]).replace(/[^0-9]/g, ''); 
            var rowId = String(data[i][0]);
            if (rowNip === inputNip && rowId !== String(form.id)) {
                return "Gagal: NIP " + inputNip + " sudah dipakai oleh " + data[i][6];
            }
        }
    }

    var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
    var mkg = ""; if (form.mkg_thn || form.mkg_bln) { mkg = (form.mkg_thn || "0") + " Tahun " + (form.mkg_bln || "0") + " Bulan"; }
    var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    var user = form.user_login || "Admin";

    if (form.npsn_baru && form.unit_kerja) {
        sheet.getRange(rowIndex, 2).setValue("'" + form.npsn_baru); 
        sheet.getRange(rowIndex, 3).setValue(form.unit_kerja);      
    }

    sheet.getRange(rowIndex, 4).setValue(form.gelar_depan || "");         // D
    sheet.getRange(rowIndex, 5).setValue(form.nama_lengkap || "");        // E
    sheet.getRange(rowIndex, 6).setValue(form.gelar_belakang || "");      // F
    sheet.getRange(rowIndex, 7).setValue(namaFull);                       // G
    sheet.getRange(rowIndex, 8).setValue("'"+(form.nip || ""));           // H
    sheet.getRange(rowIndex, 9).setValue(form.tmp_lahir || "");           // I
    sheet.getRange(rowIndex, 10).setValue("'"+(form.tgl_lahir || ""));    // J
    sheet.getRange(rowIndex, 11).setValue("'"+(form.nik || ""));          // K
    sheet.getRange(rowIndex, 12).setValue(form.lp || "");                 // L
    sheet.getRange(rowIndex, 13).setValue(form.agama || "");              // M
    sheet.getRange(rowIndex, 14).setValue(form.pendidikan || "");         // N
    sheet.getRange(rowIndex, 15).setValue(form.jurusan || "");            // O
    sheet.getRange(rowIndex, 16).setValue(form.thn_lulus || "");          // P
    sheet.getRange(rowIndex, 17).setValue(form.alamat || "");             // Q
    sheet.getRange(rowIndex, 18).setValue("'"+(form.hp || ""));           // R
    sheet.getRange(rowIndex, 19).setValue(form.status_peg || "");         // S
    sheet.getRange(rowIndex, 20).setValue(form.jabatan || "");            // T
    sheet.getRange(rowIndex, 21).setValue("'"+(form.tmt_jabatan || ""));  // U
    sheet.getRange(rowIndex, 22).setValue(form.pangkat || "");            // V
    sheet.getRange(rowIndex, 23).setValue("'"+(form.tmt_gol || ""));      // W
    sheet.getRange(rowIndex, 24).setValue(mkg);                           // X
    sheet.getRange(rowIndex, 26).setValue(form.tugas || "");              // Z
    sheet.getRange(rowIndex, 27).setValue("'"+(form.nuptk || ""));        // AA
    sheet.getRange(rowIndex, 28).setValue(form.serdik || "");             // AB
    sheet.getRange(rowIndex, 29).setValue(form.dapodik || "");            // AC
    sheet.getRange(rowIndex, 30).setValue(form.tugtam || "");             // AD
    sheet.getRange(rowIndex, 31).setValue(form.email || "");              // AE (Email Disimpan di Sini)
    
    sheet.getRange(rowIndex, 34).setValue(now);                           // AH (Diedit)
    sheet.getRange(rowIndex, 35).setValue(user);                          // AI (User Edit)

    return "Sukses";
  } catch(e) { return "Error: " + e.message; }
}

/* ======================================================================
   MODUL: REFERENSI & INSERT PTK (AUTO FILL)
   ====================================================================== */

// 1. AMBIL DATA REFERENSI (JABATAN, PANGKAT, TUGAS)
function getReferensiPTK() {
  var ss = SpreadsheetApp.openById(ID_DB_PTK);
  
  // Fungsi Helper untuk mengambil data kolom tertentu
  function getColData(sheetName, colIndex) {
    var s = ss.getSheetByName(sheetName);
    if (!s) return [];
    var last = s.getLastRow();
    if (last < 2) return [];
    var data = s.getRange(2, colIndex, last - 1, 1).getValues();
    var res = [];
    for (var i = 0; i < data.length; i++) {
        var val = String(data[i][0]).trim();
        if (val !== "") res.push(val);
    }
    return res;
  }

  function getPangkat() {
     var s = ss.getSheetByName("data_pangkat");
     if(!s) return [];
     var last = s.getLastRow();
     if (last < 2) return [];
     var data = s.getRange(2, 1, last-1, 1).getValues();
     var res = [];
     for(var i=0; i<data.length; i++) {
         var val = String(data[i][0]).trim();
         if(val !== "") res.push(val);
     }
     return res;
  }

  return JSON.stringify({
    jabatan_non_asn: getColData("isian_jabatan", 1),           // Kolom A
    jabatan_asn: getColData("isian_jabatan", 2),               // Kolom B
    tugas_non_asn: getColData("isian_tugas_di_sekolah", 1),    // Kolom A
    tugas_asn: getColData("isian_tugas_di_sekolah", 2),        // Kolom B
    pangkat: getPangkat()
  });
}

// 2. INSERT DATA PTK (AUTO FILL LOGIC)
function insertDataPTK(form) {
  var ss = SpreadsheetApp.openById(ID_DB_PTK); 
  var sheet = ss.getSheetByName(SHEET_PTK);
  if (!sheet) return "Error: Sheet 'Master Data GTK' tidak ditemukan.";

  var inputNip = String(form.nip || "").trim().replace(/[^0-9]/g, ''); 
  if (inputNip !== "" && inputNip !== "-") {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var rowNip = String(data[i][7]).replace(/[^0-9]/g, ''); 
        if (rowNip === inputNip) {
          return "Gagal: NIP " + inputNip + " sudah terdaftar atas nama " + data[i][6];
        }
      }
  }

  var newId = "GTK-" + new Date().getTime();
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var mkg = ""; if (form.mkg_thn || form.mkg_bln) { mkg = (form.mkg_thn || "0") + " Tahun " + (form.mkg_bln || "0") + " Bulan"; }
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  var rowData = [
      newId,                  // A (0)
      form.npsn_baru || form.npsn_login || "",  // B (1)
      form.unit_kerja || form.unit_login || "",  // C (2)
      form.gelar_depan || "", // D (3)
      form.nama_lengkap || "",// E (4)
      form.gelar_belakang || "",// F (5)
      namaFull || "",         // G (6)
      "'" + (form.nip || ""), // H (7)
      form.tmp_lahir || "",   // I (8)
      form.tgl_lahir || "",   // J (9)
      "'" + (form.nik || ""), // K (10)
      form.lp || "",          // L (11)
      form.agama || "",       // M (12)
      form.pendidikan || "",  // N (13)
      form.jurusan || "",     // O (14)
      form.thn_lulus || "",   // P (15)
      form.alamat || "",      // Q (16)
      "'" + (form.hp || ""),  // R (17)
      form.status_peg || "",  // S (18)
      form.jabatan || "",     // T (19)
      form.tmt_jabatan || "", // U (20)
      form.pangkat || "",     // V (21)
      form.tmt_gol || "",     // W (22)
      mkg,                    // X (23) 
      "",                     // Y (24) Kelas Jabatan 
      form.tugas || "",       // Z (25)
      "'" + (form.nuptk || ""),// AA (26)
      form.serdik || "",      // AB (27)
      form.dapodik || "",     // AC (28)
      form.tugtam || "",      // AD (29)
      form.email || "",       // AE (30) (Sekarang diisi dengan Email)
      timestamp,              // AF (31)
      form.user_login || "",  // AG (32)
      "",                     // AH (33)
      ""                      // AI (34)
  ];

  sheet.appendRow(rowData);
  return "Sukses";
}

function getUnitKerjaByNpsnPTK(npsn) {
  var id = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE";
  try {
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheetByName("Database Sekolah");
    if (!sheet) return JSON.stringify({ error: "Sheet 'Database Sekolah' tidak ditemukan di Spreadsheet PTK." });

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify({ error: "Database Sekolah kosong." });

    // Ambil Kolom A (NPSN), B (Jenjang), C (Unit Kerja)
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
    var searchNpsn = String(npsn).trim().toUpperCase();

    for (var i = 0; i < data.length; i++) {
      var rowNpsn = String(data[i][0]).trim().toUpperCase();
      if (rowNpsn === searchNpsn) {
        var unitKerja = String(data[i][2]).trim();
        return JSON.stringify({ unitKerja: unitKerja }); 
      }
    }
    
    return JSON.stringify({ error: "NPSN tidak terdaftar di Database Sekolah PTK." });
  } catch (e) {
    return JSON.stringify({ error: "Gagal memuat Database Sekolah PTK: " + e.message });
  }
}

/* ======================================================================
   HELPER: PARSE TANGGAL CERDAS (ISO, SLASH, INDO TEXT)
   ====================================================================== */
function parseIndoDate(dateStr) {
  if (!dateStr || dateStr === "-" || dateStr === "") return "";
  
  var str = String(dateStr).trim();

  // 1. Cek jika sudah format ISO (yyyy-MM-dd) -> Cocok untuk HTML Date
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;

  // 2. Cek format Slash (dd/MM/yyyy) -> Contoh: 31/12/1990
  var slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    var day = slashMatch[1].length === 1 ? "0" + slashMatch[1] : slashMatch[1];
    var month = slashMatch[2].length === 1 ? "0" + slashMatch[2] : slashMatch[2];
    var year = slashMatch[3];
    return year + "-" + month + "-" + day;
  }

  // 3. Cek format Indo Teks (dd MMMM yyyy) -> Contoh: 17 Agustus 1945
  var months = {
    'Januari': '01', 'Februari': '02', 'Maret': '03', 'April': '04', 'Mei': '05', 'Juni': '06',
    'Juli': '07', 'Agustus': '08', 'September': '09', 'Oktober': '10', 'November': '11', 'Desember': '12',
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'Jun': '06', 'Jul': '07', 'Agu': '08', 'Sep': '09', 'Okt': '10', 'Nov': '11', 'Des': '12' 
  };

  var parts = str.split(' '); 
  if (parts.length >= 3) {
    // Ambil bagian angka pertama sebagai tanggal (buang karakter non-digit jika ada)
    var dayRaw = parts[0].replace(/[^0-9]/g, ''); 
    var day = dayRaw.length === 1 ? "0" + dayRaw : dayRaw;
    
    var monthName = parts[1];
    var year = parts[2];
    
    var month = months[monthName];
    
    if (month && year.match(/^\d{4}$/)) {
        return year + "-" + month + "-" + day;
    }
  }
    
  // 4. Fallback: Coba Parse sebagai Object Date (Excel Serial Number)
  try {
    var d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      // Pastikan timezone sesuai script (Jakarta)
      return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
  } catch(e) {}
    
  return ""; // Nyerah, balikin kosong
}

/* ======================================================================
   MODUL: HAPUS DATA PTK (MOVE TO NON-AKTIF)
   ====================================================================== */
function moveDataPTKToNonAktif(id, reason, userLogin) {
  try {
    var ss = SpreadsheetApp.openById(ID_DB_PTK);
    var sheetSource = ss.getSheetByName(SHEET_PTK);
    var sheetTarget = ss.getSheetByName("gtk_non_aktif"); // Pastikan sheet ini ada!
    
    // Jika sheet target belum ada, buat baru (Opsional/Safety)
    if (!sheetTarget) {
      sheetTarget = ss.insertSheet("gtk_non_aktif");
      // Copy header dari source
      var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues();
      // Tambah header pelengkap
      headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus");
      sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers);
    }

    var data = sheetSource.getDataRange().getValues();
    var rowIndex = -1;

    // Cari Baris berdasarkan ID (Kolom A / Index 0)
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        rowIndex = i;
        break;
      }
    }

    if (rowIndex === -1) return "Data tidak ditemukan.";

    // Ambil Data Baris Tersebut
    var rowData = data[rowIndex];
    
    // Tambahkan Info Penghapusan
    var deleteTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
    rowData.push(reason, deleteTime, userLogin);

    // 1. Simpan ke Sheet Non Aktif
    sheetTarget.appendRow(rowData);

    // 2. Hapus dari Sheet Utama (Perhatikan +1 karena array 0-based vs sheet 1-based)
    sheetSource.deleteRow(rowIndex + 1);

    return "Sukses";

  } catch (e) {
    return "Error: " + e.message;
  }
}

function getDataKeadaanGTK() {
  var id = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE"; // ID Spreadsheet
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Keadaan GTK");
  if (!sheet) return [];
  
  // Asumsi Data mulai dari Baris 3 (Karena header bertingkat 2 baris)
  // Kolom A sampai BD (56 Kolom)
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  
  // Ambil Range A3:BD_LastRow
  var data = sheet.getRange(3, 1, lastRow - 2, 56).getDisplayValues();
  return data;
}

function getDataKebutuhanGuru() {
  var id = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Kebutuhan Guru");
  if (!sheet) return [];
  
  // Data mulai baris 3 (Header 2 baris)
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  
  // Ambil A3:AP
  // A=1, AP=42
  var data = sheet.getRange(3, 1, lastRow - 2, 42).getDisplayValues();
  return data;
}

// =============================================================
// BACKEND: KELOLA DATA PTK SD SWASTA (SDS) - REVISI ID
// =============================================================

var ID_SPREADSHEET_PTK = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE"; // ID Database Utama

/**
 * 1. GET DATA (READ)
 */
function getDataPTKSDS() {
  try {
    var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PTK); 
    var sheet = ss.getSheetByName("Master Data GTK SDS");
    if (!sheet) return JSON.stringify([]);

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]); 

    // Ambil Data A2:AF (Index 0 s.d 31) -> Email ada di AF (31)
    var data = sheet.getRange(2, 1, lastRow - 1, 32).getDisplayValues();
    
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if(row[0] === "") continue; 

      result.push({
        id: row[0],             
        npsn: row[1],           
        unit: row[2],           
        gelar_depan: row[3],    
        nama_no_gelar: row[4],  
        gelar_belakang: row[5], 
        nama_lengkap: row[6],   
        niy: row[7],            
        tmp_lahir: row[8],      
        tgl_lahir: row[9],      
        nik: row[10],           
        lp: row[11],            
        agama: row[12],         
        pendidikan: row[13],    
        jurusan: row[14],       
        thn_lulus: row[15],     
        alamat: row[16],        
        hp: row[17],            
        status_peg: row[18],    
        jabatan: row[19],       
        tmt_jabatan: row[20],   
        inpassing: row[21],     
        tmt_inpassing: row[22], 
        nuptk: row[23],         
        serdik: row[24],        
        dapodik: row[25],       
        tugtam: row[26], 
        // Index 27-31: Data Diinput/Diedit & Email
        diinput: row[27],       
        user_input: row[28],    
        diedit: row[29],        
        user_edit: row[30],
        email: row[31] || "" // <--- Email di Kolom AF (Index 31)
      });
    }
    return JSON.stringify(result);
    
  } catch(e) {
    return JSON.stringify([]); 
  }
}

/**
 * 2. INSERT DATA (CREATE)
 */
function insertDataPTKSDS(form) {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PTK);
  var sheet = ss.getSheetByName("Master Data GTK SDS");
  if (!sheet) return "Error: Sheet SDS tidak ditemukan.";

  var data = sheet.getDataRange().getValues();
  var inputNik = String(form.nik).trim(); 

  for (var i = 1; i < data.length; i++) {
    var rowNik = String(data[i][10]).replace(/'/g, "").trim(); 
    if (rowNik === inputNik) {
      var namaPemilik = data[i][6]; 
      return "NIK " + inputNik + " sudah terdaftar atas nama " + namaPemilik + ", hubungi admin Korwil untuk melanjutkan.";
    }
  }

  var newId = "SDS-" + new Date().getTime();
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  var rowData = [
    newId,                  
    form.npsn_baru || form.npsn_login || "",  
    form.unit_kerja || form.unit_login || "",  
    form.gelar_depan || "",       
    form.nama_lengkap || "",      
    form.gelar_belakang || "",    
    namaFull || "",               
    form.niy || "",               
    form.tmp_lahir || "",         
    form.tgl_lahir || "",         
    "'" + (form.nik || ""),         
    form.lp || "",                
    form.agama || "",             
    form.pendidikan || "",        
    form.jurusan || "",           
    form.thn_lulus || "",         
    form.alamat || "",            
    "'" + (form.hp || ""),          
    form.status_peg || "",        
    form.jabatan || "",           
    form.tmt_jabatan || "",       
    form.inpassing || "",         
    form.tmt_inpassing || "",     
    "'" + (form.nuptk || ""),       
    form.serdik || "",            
    form.dapodik || "",           
    form.tugtam || "",            
    timestamp,              
    form.user_login || "",        
    "",                     
    "",
    form.email || ""  // <--- Menyisipkan Email di akhir (Kolom AF)
  ];

  sheet.appendRow(rowData);
  return "Sukses";
}

/**
 * 3. UPDATE DATA (EDIT)
 */
function updateDataPTKSDS(form) {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PTK); 
  var sheet = ss.getSheetByName("Master Data GTK SDS");
  var data = sheet.getDataRange().getValues();
  
  var rowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == form.id) {
      rowIdx = i + 1; 
      break;
    }
  }
  
  if (rowIdx == -1) return "Error: ID tidak ditemukan.";

  var inputNik = String(form.nik || "").trim();
  if (inputNik !== "") {
      for (var i = 1; i < data.length; i++) {
          var rowNik = String(data[i][10]).replace(/'/g, '').trim(); 
          var rowId = String(data[i][0]);
          if (rowNik === inputNik && rowId !== String(form.id)) {
              return "Gagal: NIK " + inputNik + " sudah dipakai oleh " + data[i][6];
          }
      }
  }

  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  // Mutasi Unit/NPSN
  if (form.npsn_baru && form.unit_kerja) {
      sheet.getRange(rowIdx, 2).setValue("'" + form.npsn_baru); 
      sheet.getRange(rowIdx, 3).setValue(form.unit_kerja);      
  }

  var updateValues = [[
    form.gelar_depan || "",       // D
    form.nama_lengkap || "",      // E
    form.gelar_belakang || "",    // F
    namaFull || "",               // G
    form.niy || "",               // H
    form.tmp_lahir || "",         // I
    form.tgl_lahir || "",         // J
    "'" + (form.nik || ""),       // K
    form.lp || "",                // L
    form.agama || "",             // M
    form.pendidikan || "",        // N
    form.jurusan || "",           // O
    form.thn_lulus || "",         // P
    form.alamat || "",            // Q
    "'" + (form.hp || ""),        // R
    form.status_peg || "",        // S
    form.jabatan || "",           // T
    form.tmt_jabatan || "",       // U
    form.inpassing || "",         // V
    form.tmt_inpassing || "",     // W
    "'" + (form.nuptk || ""),     // X
    form.serdik || "",            // Y
    form.dapodik || "",           // Z
    form.tugtam || ""             // AA
  ]];
  
  sheet.getRange(rowIdx, 4, 1, 24).setValues(updateValues);

  sheet.getRange(rowIdx, 30).setValue(timestamp);       // AD (Tgl Edit)
  sheet.getRange(rowIdx, 31).setValue(form.user_login); // AE (User Edit)
  sheet.getRange(rowIdx, 32).setValue(form.email || ""); // AF (Email)

  return "Sukses";
}

/**
 * 4. DELETE DATA
 */
function deleteDataPTKSDS(id, alasan, userLogin) {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PTK); 
  var sheetSource = ss.getSheetByName("Master Data GTK SDS");
  var sheetTarget = ss.getSheetByName("gtk_non_aktif_sds"); 
  
  if (!sheetTarget) {
    sheetTarget = ss.insertSheet("gtk_non_aktif_sds");
    var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues();
    headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus");
    sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers);
  }

  var data = sheetSource.getDataRange().getValues();
  var rowIndex = -1;
  var rowData = [];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      rowIndex = i + 1;
      rowData = data[i];
      break;
    }
  }

  if (rowIndex === -1) return "Error: Data tidak ditemukan.";

  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm:ss");
  
  // Masukkan alasan, waktu, dan user ke array data yang dipindah
  rowData.push(alasan, timestamp, userLogin);
  sheetTarget.appendRow(rowData);
  
  // Hapus dari sheet utama
  sheetSource.deleteRow(rowIndex);

  return "Sukses";
}

// ==========================================
// DATA KEADAAN GTK SDS (Untuk Halaman Laporan)
// ==========================================

function getDataKeadaanGTKSDS() {
  var id = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE"; // ID Spreadsheet Database
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Keadaan GTK SDS");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:AA
  // A=1, AA=27
  var data = sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues();
  return data;
}

// ==========================================
// DATA KEBUTUHAN GURU SDS
// ==========================================

function getDataKebutuhanGuruSDS() {
  var id = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Kebutuhan Guru SDS");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return [];
  
  // Ambil A3:AA
  // A=1, AA=27
  var data = sheet.getRange(3, 1, lastRow - 2, 27).getDisplayValues();
  return data;
}

// =============================================================
// BACKEND: KELOLA DATA PTK PAUD
// ID Spreadsheet: 1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU
// =============================================================

var ID_SPREADSHEET_PAUD = "1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU";

/**
 * 1. GET DATA PTK PAUD
 */
function getDataPTKPAUD() {
  try {
    var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PAUD);
    var sheet = ss.getSheetByName("Master Data GTK PAUD");
    if (!sheet) return JSON.stringify([]);

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return JSON.stringify([]); 

    // Ambil Data A2:AG (Index 0 s.d 32)
    var data = sheet.getRange(2, 1, lastRow - 1, 33).getDisplayValues();
    
    var result = [];
    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      if(row[0] === "") continue; 

      result.push({
        id: row[0],             
        npsn: row[1],           
        unit: row[2],
        jenjang: row[3],        // D
        gelar_depan: row[4],    
        nama_no_gelar: row[5],  
        gelar_belakang: row[6], 
        nama_lengkap: row[7],   
        niy: row[8],            
        tmp_lahir: row[9],      
        tgl_lahir: row[10],      
        nik: row[11],           
        lp: row[12],            
        agama: row[13],         
        pendidikan: row[14],    
        jurusan: row[15],       
        thn_lulus: row[16],     
        alamat: row[17],        
        hp: row[18],            
        status_peg: row[19],    
        jabatan: row[20],       
        tmt_jabatan: row[21],   
        inpassing: row[22],     
        tmt_inpassing: row[23], 
        nuptk: row[24],         
        serdik: row[25],        
        dapodik: row[26],       
        tugtam: row[27],        
        diinput: row[28],       
        user_input: row[29],    
        diedit: row[30],        
        user_edit: row[31],
        email: row[32] || ""    // AG (Index 32)
      });
    }
    return JSON.stringify(result);
    
  } catch(e) { return JSON.stringify([]); }
}

/**
 * 2. INSERT DATA PTK PAUD (VALIDASI NIK)
 */
function insertDataPTKPAUD(form) {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PAUD);
  var sheet = ss.getSheetByName("Master Data GTK PAUD");
  if (!sheet) return "Error: Sheet PAUD tidak ditemukan.";

  var data = sheet.getDataRange().getValues();
  var inputNik = String(form.nik).trim(); 

  for (var i = 1; i < data.length; i++) {
    var rowNik = String(data[i][11]).replace(/'/g, "").trim(); 
    if (rowNik === inputNik) {
      var namaPemilik = data[i][7]; 
      return "NIK " + inputNik + " sudah terdaftar atas nama " + namaPemilik + ".";
    }
  }

  var newId = "PAUD-" + new Date().getTime();
  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  var rowData = [
    newId,                  
    form.npsn_baru || form.npsn_login || "",  
    form.unit_kerja || form.unit_login || "",
    form.jenjang || "",     // D: Jenjang
    form.gelar_depan || "",       
    form.nama_lengkap || "",      
    form.gelar_belakang || "",    
    namaFull || "",               
    form.niy || "",               
    form.tmp_lahir || "",         
    form.tgl_lahir || "",         
    "'" + (form.nik || ""),         
    form.lp || "",                
    form.agama || "",             
    form.pendidikan || "",        
    form.jurusan || "",           
    form.thn_lulus || "",         
    form.alamat || "",            
    "'" + (form.hp || ""),          
    form.status_peg || "",        
    form.jabatan || "",           
    form.tmt_jabatan || "",       
    form.inpassing || "",         
    form.tmt_inpassing || "",     
    "'" + (form.nuptk || ""),       
    form.serdik || "",            
    form.dapodik || "",           
    form.tugtam || "",            
    timestamp,              
    form.user_login || "",        
    "",                     
    "",
    form.email || ""      // AG
  ];

  sheet.appendRow(rowData);
  return "Sukses";
}

/**
 * 3. UPDATE DATA PTK PAUD
 */
function updateDataPTKPAUD(form) {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PAUD);
  var sheet = ss.getSheetByName("Master Data GTK PAUD");
  var data = sheet.getDataRange().getValues();
  
  var rowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i][0] == form.id) {
      rowIdx = i + 1; 
      break;
    }
  }
  
  if (rowIdx == -1) return "Error: ID tidak ditemukan.";

  var inputNik = String(form.nik || "").trim();
  if (inputNik !== "") {
      for (var i = 1; i < data.length; i++) {
          var rowNik = String(data[i][11]).replace(/'/g, '').trim(); 
          var rowId = String(data[i][0]);
          if (rowNik === inputNik && rowId !== String(form.id)) {
              return "Gagal: NIK " + inputNik + " sudah dipakai oleh " + data[i][7];
          }
      }
  }

  var namaFull = (form.gelar_depan ? form.gelar_depan + " " : "") + form.nama_lengkap + (form.gelar_belakang ? ", " + form.gelar_belakang : "");
  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  // Mutasi Unit/NPSN
  if (form.npsn_baru && form.unit_kerja) {
      sheet.getRange(rowIdx, 2).setValue("'" + form.npsn_baru); 
      sheet.getRange(rowIdx, 3).setValue(form.unit_kerja);      
  }

  var updateValues = [[
    form.jenjang || "",           // D
    form.gelar_depan || "",       // E
    form.nama_lengkap || "",      // F
    form.gelar_belakang || "",    // G
    namaFull || "",               // H
    form.niy || "",               // I
    form.tmp_lahir || "",         // J
    form.tgl_lahir || "",         // K
    "'" + (form.nik || ""),       // L
    form.lp || "",                // M
    form.agama || "",             // N
    form.pendidikan || "",        // O
    form.jurusan || "",           // P
    form.thn_lulus || "",         // Q
    form.alamat || "",            // R
    "'" + (form.hp || ""),        // S
    form.status_peg || "",        // T
    form.jabatan || "",           // U
    form.tmt_jabatan || "",       // V
    form.inpassing || "",         // W
    form.tmt_inpassing || "",     // X
    "'" + (form.nuptk || ""),     // Y
    form.serdik || "",            // Z
    form.dapodik || "",           // AA
    form.tugtam || ""             // AB
  ]];
  
  sheet.getRange(rowIdx, 4, 1, 25).setValues(updateValues);

  sheet.getRange(rowIdx, 31).setValue(timestamp);       // AE (Tgl Edit)
  sheet.getRange(rowIdx, 32).setValue(form.user_login); // AF (User Edit)
  sheet.getRange(rowIdx, 33).setValue(form.email || ""); // AG (Email)

  return "Sukses";
}

/**
 * 4. DELETE DATA PTK PAUD
 */
function deleteDataPTKPAUD(id, alasan, userLogin) {
  var ss = SpreadsheetApp.openById(ID_SPREADSHEET_PAUD);
  var sheetSource = ss.getSheetByName("Master Data GTK PAUD");
  var sheetTarget = ss.getSheetByName("gtk_non_aktif_paud"); 
  
  if (!sheetTarget) {
    sheetTarget = ss.insertSheet("gtk_non_aktif_paud");
    var headers = sheetSource.getRange(1, 1, 1, sheetSource.getLastColumn()).getValues();
    headers[0].push("Alasan Hapus", "Tanggal Hapus", "User Hapus");
    sheetTarget.getRange(1, 1, 1, headers[0].length).setValues(headers);
  }

  var data = sheetSource.getDataRange().getValues();
  var rowIdx = -1;
  var rowData = [];

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      rowIdx = i + 1;
      rowData = data[i];
      break;
    }
  }

  if (rowIdx == -1) return "Error: Data tidak ditemukan.";

  var timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

  rowData.push(alasan, timestamp, userLogin);
  sheetTarget.appendRow(rowData);
  sheetSource.deleteRow(rowIdx);

  return "Sukses";
}

// =============================================================
// HELPER: AMBIL JENJANG DARI DATABASE SEKOLAH (VALIDASI)
// =============================================================

function getJenjangByNPSN(npsn) {
  // PENTING: Ganti ID ini dengan ID Spreadsheet dimana sheet "Database Sekolah" berada
  var id = "1t0-Lmy0YD_GxHzimFWJGh5R5x6RhGL13uqKeVwWoCYE"; 
  
  try {
    var ss = SpreadsheetApp.openById(id);
    var sheet = ss.getSheetByName("Database Sekolah");
    if (!sheet) return "Sheet Tidak Ditemukan"; 

    var lastRow = sheet.getLastRow();
    // Ambil semua data (A:C) biar aman
    var data = sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues();
    
    var searchNpsn = String(npsn).trim();

    for (var i = 0; i < data.length; i++) {
      var rowNpsn = String(data[i][0]).trim(); // Kolom A: NPSN
      var rowJenjang = String(data[i][1]).trim(); // Kolom B: Jenjang
      
      if (rowNpsn === searchNpsn) {
        return rowJenjang; // KETEMU! Kembalikan Jenjang (TK/KB/SPS/TPA)
      }
    }
    return ""; // Tidak ketemu di list
  } catch (e) {
    return ""; // Error Spreadsheet
  }
}

// ==========================================
// DATA KEADAAN GTK PAUD
// ID: 1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU
// ==========================================

function getDataKeadaanGTKPAUD() {
  var id = "1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU"; 
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName("Keadaan GTK PAUD");
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return []; // Header 2 baris
  
  // Ambil Range A3:AB (A=1, AB=28)
  var data = sheet.getRange(3, 1, lastRow - 2, 28).getDisplayValues();
  return data;
}