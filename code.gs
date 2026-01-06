const SPREADSHEET_IDS = {
  DATABASE_USER: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SHEET_USER_NAME: "Data User",
  SK_DATA: "1AmvOJAhOfdx09eT54x62flWzBZ1xNQ8Sy5lzvT9zJA4",
  DROPDOWN_DATA: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA", 
  PAUD_DATA: "1an0oQQPdMh6wrUJIAzTGYk3DKFvYprK5SU7RmRXjIgs",
  SD_DATA: "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s",
  LAPBUL_GABUNGAN: "1aKEIkhKApmONrCg-QQbMhXyeGDJBjCZrhR-fvXZFtJU",
  PTK_PAUD_DB: "1XetGkBymmN2NZQlXpzZ2MQyG0nhhZ0sXEPcNsLffhEU",
  PTK_SD_DB: "1HlyLv3Ai3_vKFJu3EKznqI9v8g0tfqiNg0UbIojNMQ0",
  DATA_SEKOLAH: "1qeOYVfqFQdoTpysy55UIdKwAJv3VHo4df3g6u6m72Bs",   
  FORM_OPTIONS_DB: "1prqqKQBYzkCNFmuzblNAZE41ag9rZTCiY2a0WvZCTvU",
  SIABA_REKAP: "1x3b-yzZbiqP2XfJNRC3XTbMmRTHLd8eEdUqAlKY3v9U",
  SIABA_TIDAK_PRESENSI: "1mjXz5l_cqBiiR3x9qJ7BU4yQ3f0ghERT9ph8CC608Zc",
  SIABA_DB: "1sfbvyIZurU04gictep8hI-NnvicGs0wrDqANssVXt6o",
  SIABA_SALAH_DB: "1TZGrMiTuyvh2Xbo44RhJuWlQnOC5LzClsgIoNKtRFkY",
  SIABA_DINAS_DB: "1I_2yUFGXnBJTCSW6oaT3D482YCs8TIRkKgQVBbvpa1M",
  SIABA_CUTI_DB: "1DhBjmLHFMuJqWM6yJHsm-1EKvHzG8U4zK2GuU-dIgn8",
  SIABA_REKAP_HELPER: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SIABA_SKP_SOURCE: "1ReJt2qoDE2f_8LeR8DXJbROB9EAHK8qP2kYp-ZZ3V9w", 
  SIABA_SKP_DB: "1T-AQ0jYJ_jXYEPxzu_KZauOlRTTforVtFEZ_1UrWHwk",
  SIABA_PNS_DB: "1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA",
  SIABA_PAK_DB: "1mAXwf7cHaOqIj2uf51Fup5tyyBzijTeIxVS8uO1E4dM",
};

const FOLDER_CONFIG = {
  MAIN_SK: "1GwIow8B4O1OWoq3nhpzDbMO53LXJJUKs", 
  LAPBUL_KB: "18CxRT-eledBGRtHW1lFd2AZ8Bub6q5ra",
  LAPBUL_TK: "1WUNz_BSFmcwRVlrG67D2afm9oJ-bVI9H",
  LAPBUL_SD: "1I8DRQYpBbTt1mJwtD1WXVD6UK51TC8El",
  SIABA_LUPA: "10kwGuGfwO5uFreEt7zBJZUaDx1fUSXo9",
  SIABA_DINAS: "1uPeOU7F_mgjZVyOLSsj-3LXGdq9rmmWl",
  SIABA_CUTI_DOCS: "1fAmqJXpmGIfEHoUeVm4LjnWvnwVwOfNM",
  SIABA_REKAP_ARCHIVE: "1MoGuseJNrOIMnkZNoqkKcK282jZpUkAm",
  SIABA_SKP_DOCS: "1DGYC8AtJFCpCZ0ou2ae9-5fc2-bWl20G",
  SIABA_PAK_DOCS: "1cvn-pOufs-OIbFQfqhmxc3fcmFuox4Sc",
};

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('SIKS - REBORN')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// PERBAIKAN VITAL: Menggunakan Template agar kode <?!= di dalam file diproses server
function include(filename) {
  return HtmlService.createTemplateFromFile(filename).evaluate().getContent();
}

function checkLogin(username, password) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
  const sheet = ss.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() == username && String(data[i][1]).trim() == password) {
      const userObj = {
        fullName: data[i][2], role: data[i][3], photo: data[i][4] || "", isLoggedIn: true
      };
      PropertiesService.getUserProperties().setProperty('currentUser', JSON.stringify(userObj));
      return userObj;
    }
  }
  return null;
}

function getCurrentUser() {
  const user = PropertiesService.getUserProperties().getProperty('currentUser');
  return user ? JSON.parse(user) : null;
}

function processLogin(formObject) {
  // 1. Ambil ID dari konstanta yang sudah Anda buat di atas
  var ss = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER); 
  
  // 2. Ambil Nama Sheet dari konstanta (tadi tertulis "Users", harusnya "Data User")
  var sheetName = SPREADSHEET_IDS.SHEET_USER_NAME; 
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return { status: "error", message: "Sheet '" + sheetName + "' tidak ditemukan!" };
  }

  var data = sheet.getDataRange().getValues();
  
  // Ambil input dari user (Pastikan name="username" di HTML ada)
  var inputUser = formObject.username ? formObject.username.toString().trim() : "";
  var inputPass = formObject.password ? formObject.password.toString().trim() : "";

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    // Sesuaikan kolom A=0 (User), B=1 (Pass)
    var dbUser = row[0] ? row[0].toString().trim() : "";
    var dbPass = row[1] ? row[1].toString().trim() : "";
    
    if (dbUser === inputUser && dbPass === inputPass) {
      // Simpan juga ke PropertiesService agar fungsi checkSession() lama tetap jalan
      var userObj = {
        fullName: row[2], 
        role: row[3], 
        photo: row[4] || "", 
        isLoggedIn: true
      };
      PropertiesService.getUserProperties().setProperty('currentUser', JSON.stringify(userObj));

      return {
        status: "success",
        username: dbUser,
        nama: row[2], // Nama Lengkap
        role: row[3], 
        foto: row[4]  // ID Foto Drive
      };
    }
  }

  return { status: "error", message: "Username atau Password salah" };
}

function processLogout() {
  PropertiesService.getUserProperties().deleteProperty('currentUser');
}

function getHalaman(namaFile) {
  try {
    const prefix = "page_";
    const realName = namaFile.startsWith(prefix) ? namaFile : prefix + namaFile;
    return HtmlService.createTemplateFromFile(realName).evaluate().getContent();
  } catch (err) {
    return '<div class="p-4"><div class="alert alert-warning">File <b>' + namaFile + '</b> belum ada.</div></div>';
  }
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
}

function prosesUnggahSK(formData) {
  try {
    // 1. TANGKAP USERNAME DARI BROWSER (Ini kuncinya!)
    // Jika formData.username kosong, fallback ke email login
    const usernameKirim = formData.username || Session.getActiveUser().getEmail();
    const usernameCari = usernameKirim.toString().toLowerCase().trim();

    // 2. Buka Database User untuk Mencari Nama Lengkap
    const ssUser = SpreadsheetApp.openById(SPREADSHEET_IDS.DATABASE_USER);
    const sheetUser = ssUser.getSheetByName(SPREADSHEET_IDS.SHEET_USER_NAME);
    const dataUser = sheetUser.getDataRange().getValues();
    
    let namaLengkapFinal = usernameKirim; // Default nama user jika tidak ketemu

    // 3. Loop Cari Username di Kolom A
    for (let i = 1; i < dataUser.length; i++) {
      // Pastikan kolom A ada isinya
      if (dataUser[i][0]) {
        let dbUsername = dataUser[i][0].toString().toLowerCase().trim(); 
        
        // Jika Username Cocok
        if (dbUsername === usernameCari) {
          namaLengkapFinal = dataUser[i][2]; // AMBIL NAMA LENGKAP (KOLOM C)
          break;
        }
      }
    }

    // 4. Proses Simpan File ke Drive
    const ssSK = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheetSK = ssSK.getSheetByName("Unggah_SK");
    const parentFolder = DriveApp.getFolderById(FOLDER_CONFIG.MAIN_SK);
    
    // Buat Folder Tahun & Semester jika belum ada
    const folderTahun = getSubFolder_(parentFolder, formData.tahunAjaran.replace(/\//g, "-"));
    const folderSemester = getSubFolder_(folderTahun, formData.semester);
    
    // Buat File PDF
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(formData.fileData), 
      "application/pdf", 
      formData.namaSd + " - " + formData.kriteriaSk
    );
    const newFile = folderSemester.createFile(fileBlob);
    const fileUrl = newFile.getUrl();

    // 5. Masukkan Data ke Spreadsheet
    // Urutan Kolom: A=Tanggal, B=NamaSD, C=Tahun, D=Semester, E=NoSK, F=TglSK, G=Kriteria, H=Link, I=UserInput
    const rowData = [
      new Date(),             
      formData.namaSd,        
      formData.tahunAjaran,   
      formData.semester,      
      formData.nomorSk,       
      formData.tanggalSk,     
      formData.kriteriaSk,    
      fileUrl,                
      namaLengkapFinal,       // <--- NAMA LENGKAP HASIL PENCARIAN
      "Diproses",             
      "", "", "", "", ""      
    ];

    sheetSK.appendRow(rowData);
    return { success: true, message: "Dokumen berhasil disimpan atas nama: " + namaLengkapFinal };
    
  } catch (e) {
    return { success: false, message: "Error Server: " + e.toString() };
  }
}

/**
 * FUNGSI BANTUAN: Handle Folder Drive
 */
function getSubFolder_(parent, folderName) {
  const folders = parent.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parent.createFolder(folderName);
  }
}

function getDaftarSK() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheet = ss.getSheetByName("Unggah_SK");
    const data = sheet.getDataRange().getValues();
    
    // Hapus header
    if (data.length > 0) data.shift();
    
    // Kita format data di sini agar HTML terima bersih
    return data.map((row, index) => {
      return {
        rowBaris: index + 2, // Untuk ID Hapus/Edit
        
        // DATA UTAMA
        namaSd:    String(row[1]), 
        tahun:     String(row[2]),
        semester:  String(row[3]),
        noSk:      String(row[4]),
        // Format Tanggal SK jadi String (dd-MM-yyyy)
        tglSk:     formatDate_(row[5]), 
        kriteria:  String(row[6]),
        fileUrl:   String(row[7]),
        status:    String(row[9]),
        
        // DATA TAMBAHAN
        // Format Tanggal Unggah jadi String
        tglUnggah: formatDate_(row[0]), 
        userInput: String(row[8]),
        tglUpdate: formatDate_(row[10]), // Kolom K
        userUpdate:String(row[11]),      // Kolom L
        tglVerval: formatDate_(row[12]), // Kolom M
        verifikator:String(row[13]),     // Kolom N
        keterangan: String(row[14])      // Kolom O
      };
    }).reverse(); // Yang baru di atas
    
  } catch (e) {
    // Log error di server agar ketahuan
    console.error("Error getDaftarSK: " + e.toString()); 
    return []; 
  }
}

// FUNGSI BANTUAN FORMAT TANGGAL (PENTING AGAR DATA MUNCUL)
function formatDate_(dateObj) {
  if (!dateObj || dateObj === "") return "-";
  try {
    // Ubah objek tanggal jadi teks "05-01-2026"
    return Utilities.formatDate(new Date(dateObj), "Asia/Jakarta", "dd-MM-yyyy");
  } catch (e) {
    return String(dateObj); // Kalau gagal, kembalikan aslinya
  }
}

function hapusDataSK(rowBaris) {
  /* ... (Fungsi hapus tetap sama seperti sebelumnya) ... */
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SK_DATA);
    const sheet = ss.getSheetByName("Unggah_SK");
    sheet.deleteRow(parseInt(rowBaris));
    return { success: true, message: "Data berhasil dihapus!" };
  } catch (e) {
    return { success: false, message: "Gagal: " + e.toString() };
  }
}