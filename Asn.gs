/**
 * ==========================================
 * MODUL SKP (SASARAN KINERJA PEGAWAI)
 * ==========================================
 */

/**
 * Mengambil Opsi Pegawai untuk Form SKP
 * Sumber: Spreadsheet SIABA_SKP_SOURCE sheet "Daftar ASN"
 * Kolom: A(NIP), B(Nama), C(Unit Kerja)
 */
function getSiabaSkpOptions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_SOURCE);
    const sheet = ss.getSheetByName("Daftar ASN");
    
    if (!sheet || sheet.getLastRow() < 2) return [];

    // Ambil data A2:C
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();

    // Map ke object: A=NIP, B=Nama, C=Unit
    return data.map(row => ({
      nip: String(row[0]).trim(),  // Kolom A
      nama: String(row[1]).trim(), // Kolom B
      unit: String(row[2]).trim()  // Kolom C
    })).filter(item => item.unit && item.nama);

  } catch (e) {
    return handleError('getSiabaSkpOptions', e);
  }
}

/**
 * Memproses Form Unggah SKP
 * Simpan ke: Spreadsheet SIABA_SKP_DB
 * File ke: Folder SKP -> Folder Tahun
 */
function submitSiabaSkpForm(formData) {
  try {
    // 1. Validasi Folder Utama
    const folderId = FOLDER_CONFIG.SIABA_SKP_DOCS;
    if (!folderId || folderId.includes("GANTI")) {
        throw new Error("ID Folder SKP belum dikonfigurasi.");
    }
    const mainFolder = DriveApp.getFolderById(folderId);

    // 2. Manajemen Folder (Berdasarkan Tahun) - BARU
    // Fungsi getOrCreateFolder sudah ada di kode global Anda
    const targetFolder = getOrCreateFolder(mainFolder, String(formData.tahun));

    // 3. Simpan File
    const fileData = formData.fileData;
    const decodedData = Utilities.base64Decode(fileData.data);
    const blob = Utilities.newBlob(decodedData, fileData.mimeType, fileData.fileName);
    
    // Nama File: SKP_Tahun_Nama
    const safeNama = formData.namaAsn.replace(/[^a-zA-Z0-9 ]/g, '');
    const newFileName = `SKP_${formData.tahun}_${safeNama}.pdf`;
    
    // Simpan di folder TAHUN, bukan main folder
    const file = targetFolder.createFile(blob).setName(newFileName);
    const fileUrl = file.getUrl();

    // 4. Simpan Data ke Spreadsheet
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_DB);
    const sheetName = String(formData.tahun);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(["Timestamp", "Unit Kerja", "Nama ASN", "NIP", "Status", "Tahun", "File SKP"]);
    }
    
    const newRow = [
      new Date(),             
      formData.unitKerja,     
      formData.namaAsn,       
      "'" + formData.nip,     
      formData.status,        
      formData.tahun,         
      fileUrl                 
    ];

    sheet.appendRow(newRow);
    
    return "Data SKP berhasil diunggah.";

  } catch (e) {
    return handleError('submitSiabaSkpForm', e);
  }
}

/**
 * ==========================================
 * MODUL KELOLA DATA SKP
 * ==========================================
 */

/**
 * Mengambil Daftar Tahun (Nama Sheet) dari DB SKP
 */
function getSiabaSkpYearList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_DB);
    const sheets = ss.getSheets();
    const years = [];
    
    // Ambil semua nama sheet yang berupa angka (Tahun)
    sheets.forEach(s => {
      const name = s.getName();
      if (/^\d{4}$/.test(name)) { // Regex cek 4 digit angka
        years.push(name);
      }
    });
    
    // Urutkan Descending (Terbaru di atas)
    return years.sort().reverse();
  } catch (e) {
    return handleError('getSiabaSkpYearList', e);
  }
}

/**
 * Mengambil Data SKP berdasarkan Tahun (Nama Sheet)
 */
function getSiabaSkpData(year, unitFilter) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_DB);
    const sheet = ss.getSheetByName(String(year));
    
    if (!sheet) return { units: [], rows: [] }; // Sheet tahun tsb belum ada

    if (sheet.getLastRow() < 2) return { units: [], rows: [] };

    // Ambil Semua Data (A - J) -> 10 Kolom
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getDisplayValues();
    
    const rows = [];
    const unitsSet = new Set();

    // Mapping Index:
    // A(0)=Tgl, B(1)=Unit, C(2)=Nama, D(3)=NIP, E(4)=Status, 
    // F(5)=Tahun, G(6)=File, H(7)=Cek, I(8)=Ket, J(9)=Update
    
    data.forEach((row, index) => {
        const rowUnit = String(row[1] || "").trim(); // Kolom B
        if (rowUnit) unitsSet.add(rowUnit);

        if (unitFilter === "Semua" || rowUnit === unitFilter) {
            // Format Status (Kolom H / Index 7)
            let statusRaw = String(row[7] || "").trim().toUpperCase();
            let statusText = "Diproses";
            if (statusRaw === "V") statusText = "Diterima";
            else if (statusRaw === "X") statusText = "Ditolak";
            else if (statusRaw === "R") statusText = "Revisi";

            rows.push({
                _rowIndex: index + 2, // 1-based row index (header=1)
                _sheetName: String(year), // Penting untuk Edit/Hapus
                tgl: row[0],          // A
                nama: row[2],         // C
                nip: row[3],          // D
                statusPeg: row[4],    // E (Status Pegawai)
                tahun: row[5],        // F
                fileUrl: row[6],      // G
                statusCek: statusText,// H (Converted)
                ket: row[8],          // I
                update: row[9]        // J
            });
        }
    });

    // Sorting: Terbaru (Berdasarkan Tgl Aju / Col A)
    rows.sort((a, b) => {
        return new Date(b.tgl) - new Date(a.tgl);
    });

    return {
        units: Array.from(unitsSet).sort(),
        rows: rows
    };

  } catch (e) {
    return handleError('getSiabaSkpData', e);
  }
}

/**
 * Hapus Data SKP
 */
function deleteSiabaSkpData(sheetName, rowIndex, deleteCode) {
   try {
    const todayCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(deleteCode).trim() !== todayCode) throw new Error("Kode Hapus salah.");

    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_DB);
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) throw new Error("Sheet tidak ditemukan.");

    // Hapus File Fisik (Kolom G / Index 7)
    const fileUrl = sheet.getRange(rowIndex, 7).getValue(); 
    if (fileUrl && String(fileUrl).includes("drive.google.com")) {
        try {
            const fileId = String(fileUrl).match(/[-\w]{25,}/);
            if (fileId) DriveApp.getFileById(fileId[0]).setTrashed(true);
        } catch(e) {}
    }
    
    sheet.deleteRow(rowIndex);
    return "Data berhasil dihapus.";
  } catch (e) {
    return handleError('deleteSiabaSkpData', e);
  }
}

/**
 * Mengambil Data SKP untuk Edit
 * @param {String} sheetName - Nama sheet (Tahun asal)
 * @param {Number} rowIndex - Indeks baris (1-based)
 */
function getSiabaSkpEditData(sheetName, rowIndex) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_DB);
    const sheet = ss.getSheetByName(String(sheetName));
    
    if (!sheet) throw new Error("Sheet tahun " + sheetName + " tidak ditemukan.");

    // Ambil data baris (A-G) -> 7 Kolom (Sesuai struktur database SKP)
    // A=Timestamp, B=Unit, C=Nama, D=NIP, E=Status, F=Tahun, G=File
    const rowData = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];
    
    return {
        sheetName: sheetName, // Tahun Asal
        rowIndex: rowIndex,
        unitKerja: rowData[1],
        namaAsn: rowData[2],
        nip: String(rowData[3]).replace(/'/g, ''),
        status: rowData[4],
        tahun: rowData[5],
        fileUrl: rowData[6]
    };

  } catch (e) {
    return handleError('getSiabaSkpEditData', e);
  }
}

/**
 * Update Data SKP
 * Fitur: Pindah Sheet & Folder jika Tahun Berubah, Update Timestamp, Update Status Revisi
 */
function updateSiabaSkpData(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_DB);
    const oldSheetName = String(formData.oldSheetName); // Tahun Lama
    const newSheetName = String(formData.tahun);        // Tahun Baru
    const rowIndex = parseInt(formData.rowIndex);
    
    const oldSheet = ss.getSheetByName(oldSheetName);
    if (!oldSheet) throw new Error("Sheet lama tidak ditemukan.");

    // 1. Siapkan Data File (Baru atau Lama)
    let fileUrl = formData.existingFileUrl;
    const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.SIABA_SKP_DOCS);
    
    // Helper: Pindah/Simpan File ke Folder Tahun Baru
    const handleFileStorage = (targetYear, isNewUpload) => {
        const targetFolder = getOrCreateFolder(mainFolder, String(targetYear));
        
        // Skenario A: Upload File Baru
        if (isNewUpload && formData.fileData && formData.fileData.data) {
             // Hapus file lama jika ada
             if (fileUrl && String(fileUrl).includes("drive.google.com")) {
                 try {
                    const oldId = String(fileUrl).match(/[-\w]{25,}/)[0];
                    DriveApp.getFileById(oldId).setTrashed(true);
                 } catch(e){}
             }

             const decoded = Utilities.base64Decode(formData.fileData.data);
             const blob = Utilities.newBlob(decoded, formData.fileData.mimeType, formData.fileData.fileName);
             const safeNama = String(formData.namaAsn).replace(/[^a-zA-Z0-9 ]/g, '');
             const newName = `SKP_${targetYear}_${safeNama}.pdf`;
             
             const newFile = targetFolder.createFile(blob).setName(newName);
             return newFile.getUrl();
        }
        
        // Skenario B: File Tetap, Tapi Tahun Berubah (Pindah Folder)
        else if (oldSheetName !== newSheetName && fileUrl && String(fileUrl).includes("drive.google.com")) {
             try {
                const oldId = String(fileUrl).match(/[-\w]{25,}/)[0];
                const fileObj = DriveApp.getFileById(oldId);
                
                // Pindah folder (Add to new, Remove from old parents)
                fileObj.moveTo(targetFolder);
                
                // Rename file agar tahunnya sesuai
                const safeNama = String(formData.namaAsn).replace(/[^a-zA-Z0-9 ]/g, '');
                fileObj.setName(`SKP_${targetYear}_${safeNama}.pdf`);
                
                return fileObj.getUrl();
             } catch(e) {
                return fileUrl; // Fallback jika gagal pindah
             }
        }
        
        return fileUrl;
    };

    // Eksekusi Logic File
    const isNewUpload = (formData.fileData && formData.fileData.data);
    fileUrl = handleFileStorage(newSheetName, isNewUpload);

    // 2. Siapkan Data Baris Baru
    // A=Tgl, B=Unit, C=Nama, D=NIP, E=Status, F=Tahun, G=File, H=Cek, I=Ket, J=Update
    const oldData = oldSheet.getRange(rowIndex, 1, 1, 10).getValues()[0];
    
    // PERBAIKAN: Status Cek (Kolom H) dipaksa menjadi "R" (Revisi)
    const statusCek = "R"; 
    
    const ket = oldData[8]; // Keterangan (I) tetap sama atau bisa dikosongkan jika perlu

    const dataRow = [
        oldData[0],           // A: Timestamp Awal (Tetap)
        formData.unitKerja,   // B
        formData.namaAsn,     // C
        "'" + formData.nip,   // D
        formData.status,      // E
        newSheetName,         // F
        fileUrl,              // G
        statusCek,            // H: "R" (REVISI)
        ket,                  // I
        new Date()            // J: UPDATE TIMESTAMP
    ];

    // 3. Simpan Data
    
    // KASUS 1: TAHUN BERUBAH (Pindah Sheet)
    if (oldSheetName !== newSheetName) {
        // Hapus dari sheet lama
        oldSheet.deleteRow(rowIndex);
        
        // Masukkan ke sheet baru
        let newSheet = ss.getSheetByName(newSheetName);
        if (!newSheet) {
            newSheet = ss.insertSheet(newSheetName);
            newSheet.appendRow(["Timestamp", "Unit Kerja", "Nama ASN", "NIP", "Status", "Tahun", "File SKP", "Cek", "Keterangan", "Update"]);
        }
        newSheet.appendRow(dataRow);
    } 
    
    // KASUS 2: TAHUN TETAP (Update di tempat)
    else {
        // Update Range A-J (10 Kolom)
        oldSheet.getRange(rowIndex, 1, 1, 10).setValues([dataRow]);
    }

    return "Data SKP berhasil diperbarui.";

  } catch (e) {
    return handleError('updateSiabaSkpData', e);
  }
}

/**
 * Mengambil Data Daftar Pengiriman SKP (Dinamis)
 * Sumber: Sheet "Daftar Kirim"
 * Kolom: B sampai Terakhir
 * Filter: Unit Kerja (Kolom A)
 */
function getSiabaSkpDaftarKirimData(unitFilter) {
  try {
    // Gunakan ID Spreadsheet SKP yang sudah ada
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_SKP_DB);
    const sheet = ss.getSheetByName("Daftar Kirim");
    
    if (!sheet || sheet.getLastRow() < 2) {
        return { units: [], headers: [], rows: [] };
    }

    const range = sheet.getDataRange();
    const values = range.getDisplayValues();
    
    // Baris 1: Header
    // Ambil Header mulai dari Kolom B (Index 1) sampai akhir
    const allHeaders = values[0];
    const displayHeaders = allHeaders.slice(1); // Hapus Kolom A (Unit Kerja)

    // Cari Index Kolom "Nama ASN" untuk sorting (di dalam displayHeaders)
    // Jika header di spreadsheet adalah "Nama ASN", di array slice index-nya bergeser -1 dari aslinya
    // Kita cari text "Nama ASN" atau "Nama"
    let sortIndex = 0; // Default sort kolom pertama (Kolom B)
    for(let i=0; i<displayHeaders.length; i++) {
        if(displayHeaders[i].toLowerCase().includes("nama")) {
            sortIndex = i;
            break;
        }
    }

    const rows = [];
    const unitsSet = new Set();

    // Data mulai baris 2
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rowUnit = String(row[0] || "").trim(); // Kolom A
        
        if (rowUnit) unitsSet.add(rowUnit);

        if (unitFilter === "Semua" || rowUnit === unitFilter) {
            // Ambil data mulai Kolom B (Index 1) sampai akhir
            rows.push(row.slice(1));
        }
    }

    // Sorting Abjad berdasarkan Nama ASN (sortIndex)
    rows.sort((a, b) => String(a[sortIndex]).localeCompare(String(b[sortIndex])));

    return {
        units: Array.from(unitsSet).sort(),
        headers: displayHeaders,
        rows: rows
    };

  } catch (e) {
    return handleError('getSiabaSkpDaftarKirimData', e);
  }
}

/* ==========================================
 * 2. SUB-MODUL: PAK (PENETAPAN ANGKA KREDIT)
 * ========================================== */

/**
 * Mengambil Opsi untuk Form PAK (Unit, Nama, NIP, Pangkat, Jabatan)
 * Sumber: Spreadsheet SIABA_PNS_DB
 */
function getSiabaPakOptions() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PNS_DB);
    
    // 1. Ambil Data Pegawai (Sheet "Database PNS")
    const sheetPns = ss.getSheetByName("Database PNS");
    let pnsData = [];
    if (sheetPns && sheetPns.getLastRow() > 1) {
        // A=Unit, B=Nama, C=NIP
        const raw = sheetPns.getRange(2, 1, sheetPns.getLastRow()-1, 3).getValues();
        pnsData = raw.map(r => ({
            unit: String(r[0]).trim(),
            nama: String(r[1]).trim(),
            nip: String(r[2]).trim()
        })).filter(x => x.unit && x.nama);
    }

    // 2. Ambil Data Pangkat (Sheet "Pangkat")
    const sheetPangkat = ss.getSheetByName("Pangkat");
    let pangkatList = [];
    if (sheetPangkat && sheetPangkat.getLastRow() > 1) {
        // Kolom A
        const raw = sheetPangkat.getRange(2, 1, sheetPangkat.getLastRow()-1, 1).getValues();
        pangkatList = raw.flat().map(String).filter(String);
    }

    // 3. Ambil Data Jabatan (Sheet "Jabatan PNS")
    const sheetJabatan = ss.getSheetByName("Jabatan PNS");
    let jabatanList = [];
    if (sheetJabatan && sheetJabatan.getLastRow() > 1) {
        // Asumsi Kolom A
        const raw = sheetJabatan.getRange(2, 1, sheetJabatan.getLastRow()-1, 1).getValues();
        jabatanList = raw.flat().map(String).filter(String);
    }

    return {
        pns: pnsData,
        pangkat: pangkatList,
        jabatan: jabatanList
    };

  } catch (e) {
    return handleError('getSiabaPakOptions', e);
  }
}

/**
 * Memproses Form Unggah PAK
 * Update: Timestamp (A), Unit Kerja (B)
 */
function submitSiabaPakForm(formData) {
  try {
    const folderId = FOLDER_CONFIG.SIABA_PAK_DOCS;
    const mainFolder = DriveApp.getFolderById(folderId);
    
    const targetFolder = getOrCreateFolder(mainFolder, String(formData.tahun));

    const fileData = formData.fileData;
    const decoded = Utilities.base64Decode(fileData.data);
    const blob = Utilities.newBlob(decoded, fileData.mimeType, fileData.fileName);
    
    const safeNama = String(formData.namaAsn).replace(/[^a-zA-Z0-9 ]/g, '');
    const newFileName = `PAK_${safeNama}_${formData.tahun}.pdf`;
    
    const file = targetFolder.createFile(blob).setName(newFileName);
    const fileUrl = file.getUrl();

    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PAK_DB);
    const sheetName = String(formData.tahun);
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Header: A=Timestamp, B=Unit (DITUKAR)
      sheet.appendRow([
          "Timestamp", "Unit Kerja", "Nama ASN", "NIP", "Pangkat/Gol", 
          "TMT KP", "Jabatan", "Tahun PAK", "Angka Kredit", "File", "ID", "Update"
      ]);
    }

    const formatDate = (d) => {
        if (!d) return "";
        const p = d.split('-'); 
        return `${p[2]}-${p[1]}-${p[0]}`;
    };

    const idPak = "PAK" + new Date().getTime();

    const newRow = [
        new Date(),              // A: Timestamp (POSISI BARU)
        formData.unitKerja,      // B: Unit Kerja (POSISI BARU)
        formData.namaAsn,        // C
        "'" + formData.nip,      // D
        formData.pangkat,        // E
        formatDate(formData.tmt),// F
        formData.jabatan,        // G
        formData.tahun,          // H
        formData.kredit,         // I
        fileUrl,                 // J
        idPak,                   // K
        ""                       // L
    ];

    sheet.appendRow(newRow);
    
    return "Data PAK berhasil diunggah.";

  } catch (e) {
    return handleError('submitSiabaPakForm', e);
  }
}

/* ==========================================
 * MODUL KELOLA DATA PAK
 * ========================================== */

/**
 * Mengambil Daftar Tahun PAK (Nama Sheet) dari sheet "ID Sheet"
 */
function getSiabaPakYearList() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PAK_DB);
    const sheet = ss.getSheetByName("ID Sheet"); // Nama sheet helper di DB PAK
    
    // Asumsi di sheet "ID Sheet" kolom A berisi daftar nama sheet tahun yang valid
    if (!sheet || sheet.getLastRow() < 2) return [];

    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    const years = data.map(r => String(r[0]).trim()).filter(y => y !== "");
    
    // Urutkan Unik
    return [...new Set(years)];
  } catch (e) {
    return handleError('getSiabaPakYearList', e);
  }
}

/**
 * Mengambil Data PAK berdasarkan Tahun (Nama Sheet)
 * Filter Unit Kerja (Kolom B)
 * FIX: Sorting menggunakan Raw Date Object
 */
function getSiabaPakData(year, unitFilter) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PAK_DB);
    const sheet = ss.getSheetByName(String(year));
    
    if (!sheet || sheet.getLastRow() < 2) return { units: [], rows: [] };

    const range = sheet.getRange(2, 1, sheet.getLastRow() - 1, 14);
    
    // Ambil 2 Versi Data:
    const rawValues = range.getValues();        // Untuk Sorting (Date Object Asli)
    const displayValues = range.getDisplayValues(); // Untuk Tampilan (Teks Terformat)
    
    const rows = [];
    const unitsSet = new Set();

    // Loop menggunakan index
    for (let i = 0; i < rawValues.length; i++) {
        const raw = rawValues[i];
        const disp = displayValues[i];
        
        // Kolom A=0 (Timestamp), B=1 (Unit), ... N=13 (Update)
        const rowUnit = String(disp[1] || "").trim(); 
        if (rowUnit) unitsSet.add(rowUnit);

        if (unitFilter === "Semua" || rowUnit === unitFilter) {
            // Status
            let statusRaw = String(disp[11] || "").trim().toUpperCase();
            let statusText = "Diproses";
            if (statusRaw === "V") statusText = "Diterima";
            else if (statusRaw === "X") statusText = "Ditolak";
            else if (statusRaw === "R") statusText = "Revisi";

            rows.push({
                // Data Metadata
                _rowIndex: i + 2,
                _sheetName: String(year),
                
                // Data Tampilan (String)
                time: disp[0],        // A: Tgl Unggah
                unit: disp[1],        // B: Unit
                nama: disp[2],        // C: Nama
                nip: disp[3],         // D: NIP
                pangkat: disp[4],     // E: Pangkat
                tmt: disp[5],         // F: TMT
                jabatan: disp[6],     // G: Jabatan
                tahun: disp[7],       // H: Tahun
                kredit: disp[8],      // I: Kredit
                fileUrl: disp[9],     // J: File
                id: disp[10],         // K: ID
                statusCek: statusText,// L: Status
                ket: disp[12],        // M: Ket
                update: disp[13],     // N: Update
                
                // Data Sorting (Objek Date Asli dari Raw)
                _sortTime: raw[0],    // A
                _sortUpdate: raw[13]  // N
            });
        }
    }

    // Sorting: Terbaru (Bandingkan Timestamp vs Update)
    rows.sort((a, b) => {
        // Konversi ke timestamp number, jika kosong/bukan date jadi 0
        const timeA = (a._sortTime instanceof Date) ? a._sortTime.getTime() : 0;
        const updateA = (a._sortUpdate instanceof Date) ? a._sortUpdate.getTime() : 0;
        const maxA = Math.max(timeA, updateA); // Ambil waktu terakhir aktivitas A

        const timeB = (b._sortTime instanceof Date) ? b._sortTime.getTime() : 0;
        const updateB = (b._sortUpdate instanceof Date) ? b._sortUpdate.getTime() : 0;
        const maxB = Math.max(timeB, updateB); // Ambil waktu terakhir aktivitas B

        return maxB - maxA; // Descending (Besar ke Kecil)
    });

    // Bersihkan data sorting sebelum dikirim ke client (opsional, untuk efisiensi)
    const cleanRows = rows.map(r => {
        delete r._sortTime;
        delete r._sortUpdate;
        return r;
    });

    return {
        units: Array.from(unitsSet).sort(),
        rows: cleanRows
    };

  } catch (e) {
    return handleError('getSiabaPakData', e);
  }
}

/**
 * Hapus Data PAK
 */
function deleteSiabaPakData(sheetName, rowIndex, deleteCode) {
   try {
    const todayCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(deleteCode).trim() !== todayCode) throw new Error("Kode Hapus salah.");

    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PAK_DB);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet tidak ditemukan.");

    // Hapus File Fisik (Kolom J / Index 10) -> Index 9 (0-based) + 1 = 10
    const fileUrl = sheet.getRange(rowIndex, 10).getValue(); 
    if (fileUrl && String(fileUrl).includes("drive.google.com")) {
        try {
            const fileId = String(fileUrl).match(/[-\w]{25,}/);
            if (fileId) DriveApp.getFileById(fileId[0]).setTrashed(true);
        } catch(e) {}
    }
    
    sheet.deleteRow(rowIndex);
    return "Data berhasil dihapus.";
  } catch (e) {
    return handleError('deleteSiabaPakData', e);
  }
}

/**
 * Mengambil Data PAK untuk Edit (VERSI FIX MAPPING UNIT KERJA)
 * Sumber: Sheet sesuai Tahun (sheetName)
 * ID: Kolom K (Index 10)
 */
function getSiabaPakEditData(sheetName, idPak) {
  Logger.log("[DEBUG] Mencari PAK di sheet: " + sheetName + ", ID: " + idPak);
  
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PAK_DB);
    
    // Gunakan sheetName yang dikirim (misal "2024" atau "Konvensional")
    const sheet = ss.getSheetByName(String(sheetName));
    
    if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan di Database PAK.");

    // Cari ID di Kolom K (Index 10)
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) throw new Error("Sheet kosong.");

    // Ambil Kolom K (Index 11 di getRange karena 1-based)
    const idList = sheet.getRange(2, 11, lastRow - 1, 1).getDisplayValues().flat(); 
    
    let rowIndex = -1;
    const targetId = String(idPak).trim();

    // Loop Manual
    for (let i = 0; i < idList.length; i++) {
        if (String(idList[i]).trim() === targetId) {
            rowIndex = i + 2; // +2 karena mulai baris 2
            break;
        }
    }

    if (rowIndex < 1) {
        throw new Error("Data dengan ID '" + idPak + "' tidak ditemukan di sheet " + sheetName);
    }

    // Ambil Baris Data (A - L) -> 12 Kolom
    // Index Array: 0=A, 1=B, 2=C, ...
    const rowData = sheet.getRange(rowIndex, 1, 1, 12).getValues()[0];
    
    // Helper Safe String
    const getStr = (v) => (v === undefined || v === null) ? "" : String(v).trim();

    // Helper Date
    const toInputDate = (val) => {
        if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
        const s = String(val);
        if (s.includes('-') && s.split('-')[0].length === 2) { // DD-MM-YYYY
             const p = s.split('-');
             return `${p[2]}-${p[1]}-${p[0]}`;
        }
        return "";
    };

    // MAPPING (SESUAI UPDATE TERAKHIR):
    // A (0) = Timestamp
    // B (1) = Unit Kerja <--- INI YANG KITA BUTUHKAN
    // C (2) = Nama ASN
    // D (3) = NIP
    // ...
    
    const result = {
        sheetName: sheetName,
        rowIndex: rowIndex,
        id: idPak,
        
        unitKerja: getStr(rowData[1]),     // PERBAIKAN: Ambil dari Index 1 (Kolom B)
        
        namaAsn:   getStr(rowData[2]),     // C
        nip:       getStr(rowData[3]).replace(/'/g, ''), // D
        pangkat:   getStr(rowData[4]),     // E
        tmt:       toInputDate(rowData[5]), // F
        jabatan:   getStr(rowData[6]),     // G
        tahun:     getStr(rowData[7]),     // H
        kredit:    getStr(rowData[8]),     // I
        fileUrl:   getStr(rowData[9])      // J
    };
    
    return result;

  } catch (e) {
    Logger.log("[ERROR] " + e.message);
    return handleError('getSiabaPakEditData', e);
  }
}

/**
 * Update Data PAK
 * Fitur: Pindah Sheet/Folder jika Tahun Berubah, Update Status R, Update Timestamp
 */
function updateSiabaPakData(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PAK_DB);
    const oldSheetName = String(formData.oldSheetName);
    const newSheetName = String(formData.tahun);
    const rowIndex = parseInt(formData.rowIndex);
    
    const oldSheet = ss.getSheetByName(oldSheetName);
    if (!oldSheet) throw new Error("Sheet lama tidak ditemukan.");

    // 1. Handle File
    let fileUrl = formData.existingFileUrl;
    const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.SIABA_PAK_DOCS);
    
    const handleFileStorage = (targetYear, isNewUpload) => {
        const targetFolder = getOrCreateFolder(mainFolder, String(targetYear));
        const safeNama = String(formData.namaAsn).replace(/[^a-zA-Z0-9 ]/g, '');
        const newFileName = `PAK_${safeNama}_${targetYear}.pdf`;

        if (isNewUpload && formData.fileData && formData.fileData.data) {
             // Hapus file lama
             if (fileUrl && String(fileUrl).includes("drive.google.com")) {
                 try {
                    const oldId = String(fileUrl).match(/[-\w]{25,}/)[0];
                    DriveApp.getFileById(oldId).setTrashed(true);
                 } catch(e){}
             }
             const decoded = Utilities.base64Decode(formData.fileData.data);
             const blob = Utilities.newBlob(decoded, formData.fileData.mimeType, formData.fileData.fileName);
             
             const newFile = targetFolder.createFile(blob).setName(newFileName);
             return newFile.getUrl();
        } else if (oldSheetName !== newSheetName && fileUrl) {
             // Pindah Folder jika tahun berubah
             try {
                const oldId = String(fileUrl).match(/[-\w]{25,}/)[0];
                const fileObj = DriveApp.getFileById(oldId);
                fileObj.moveTo(targetFolder);
                fileObj.setName(newFileName);
                return fileObj.getUrl();
             } catch(e) { return fileUrl; }
        }
        return fileUrl;
    };

    const isNewUpload = (formData.fileData && formData.fileData.data);
    fileUrl = handleFileStorage(newSheetName, isNewUpload);

    // 2. Siapkan Data
    // A=Unit, B=Time, C=Nama, D=NIP, E=Pangkat, F=TMT, G=Jabatan, H=Tahun, I=Kredit, J=File, K=ID, L=Status, M=Ket, N=Update
    const oldData = oldSheet.getRange(rowIndex, 1, 1, 14).getValues()[0];
    
    // Format TMT
    const formatDate = (d) => {
        if (!d) return "";
        const p = d.split('-'); 
        return `${p[2]}-${p[1]}-${p[0]}`;
    };

    // Data Row Baru
    const dataRow = [
        formData.unitKerja,       // A
        oldData[1],               // B (Timestamp Awal)
        formData.namaAsn,         // C
        "'" + formData.nip,       // D
        formData.pangkat,         // E
        formatDate(formData.tmt), // F
        formData.jabatan,         // G
        formData.tahun,           // H
        formData.kredit,          // I
        fileUrl,                  // J
        oldData[10],              // K (ID Tetap)
        "R",                      // L (Status Revisi)
        oldData[12],              // M (Keterangan Tetap)
        new Date()                // N (Update Timestamp)
    ];

    // 3. Simpan (Pindah Sheet jika perlu)
    if (oldSheetName !== newSheetName) {
        oldSheet.deleteRow(rowIndex);
        
        let newSheet = ss.getSheetByName(newSheetName);
        if (!newSheet) {
            newSheet = ss.insertSheet(newSheetName);
            newSheet.appendRow(["Unit Kerja", "Timestamp", "Nama ASN", "NIP", "Pangkat/Gol", "TMT KP", "Jabatan", "Tahun PAK", "Angka Kredit", "File", "ID", "Status", "Keterangan", "Update"]);
        }
        newSheet.appendRow(dataRow);
    } else {
        // Update di tempat (A-N = 14 kolom)
        oldSheet.getRange(rowIndex, 1, 1, 14).setValues([dataRow]);
    }

    return "Data PAK berhasil diperbarui.";

  } catch (e) {
    return handleError('updateSiabaPakData', e);
  }
}

/**
 * Mengambil Data Daftar Pengiriman PAK (VERSI SIMPLE - PER UNIT)
 * Sumber: Sheet "Daftar Kirim"
 */
function getSiabaPakDaftarKirimData(unitFilter) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SIABA_PAK_DB);
    const sheet = ss.getSheetByName("Daftar Kirim");
    
    if (!sheet || sheet.getLastRow() < 2) {
        return { units: [], headers: [], rows: [] };
    }

    const range = sheet.getDataRange();
    const values = range.getDisplayValues();
    
    // Baris 1: Header
    const allHeaders = values[0];
    const displayHeaders = allHeaders.slice(1); // Hapus Kolom A (Unit)

    // Index untuk sorting nama (cari kolom yang mengandung 'Nama')
    let sortIndex = 0; 
    for(let i=0; i<displayHeaders.length; i++) {
        if(displayHeaders[i].toLowerCase().includes("nama")) {
            sortIndex = i; break;
        }
    }

    const rows = [];
    const unitsSet = new Set();

    // Data mulai baris 2
    for (let i = 1; i < values.length; i++) {
        const row = values[i];
        const rowUnit = String(row[0] || "").trim(); // Kolom A = Unit Kerja
        
        if (rowUnit) unitsSet.add(rowUnit);

        // Filter Ketat: Hanya ambil jika unit cocok persis
        if (unitFilter && rowUnit === String(unitFilter).trim()) {
            rows.push(row.slice(1)); // Ambil data mulai Kolom B
        }
    }

    // Sorting Abjad Nama
    rows.sort((a, b) => String(a[sortIndex]).localeCompare(String(b[sortIndex])));

    return {
        units: Array.from(unitsSet).sort(),
        headers: displayHeaders,
        rows: rows
    };

  } catch (e) {
    return handleError('getSiabaPakDaftarKirimData', e);
  }
}