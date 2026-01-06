function getPaudSchoolLists() {
  const cacheKey = 'paud_school_lists_final_v4'; // Kunci cache baru
  return getCachedData(cacheKey, function() {
    
    // 1. Menggunakan kunci DROPDOWN_DATA (sesuai ID: 1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA)
    const config = SPREADSHEET_CONFIG.DROPDOWN_DATA; 
    
    if (!config || !config.id) {
        throw new Error("Konfigurasi ID Spreadsheet (DROPDOWN_DATA) tidak ditemukan.");
    }

    const ss = SpreadsheetApp.openById(config.id);
    if (!ss) {
        throw new Error("Gagal membuka Spreadsheet. Periksa ID atau izin akses.");
    }
    
    // 2. Gunakan nama Sheet yang benar: Form PAUD
    const sheet = ss.getSheetByName('Form PAUD');
    if (!sheet) {
        throw new Error("Sheet 'Form PAUD' tidak ditemukan di Spreadsheet Dropdown Data.");
    }
    
    if (sheet.getLastRow() < 2) {
        return { "KB": [], "TK": [] };
    }

    // 3. Ambil data Jenjang (Kolom A) dan Nama Lembaga (Kolom B)
    // Ambil data mulai dari baris 2, kolom 1 (A) sepanjang 2 kolom (A & B)
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();
    
    const lists = { "KB": [], "TK": [] };

    data.forEach(row => {
        const jenjang = String(row[0]).trim();
        const namaLembaga = String(row[1]).trim();
        
        if (jenjang && namaLembaga) {
            // Hanya tambahkan ke array yang sudah didefinisikan (KB atau TK)
            if (lists.hasOwnProperty(jenjang) && !lists[jenjang].includes(namaLembaga)) {
                lists[jenjang].push(namaLembaga);
            }
        }
    });
    
    // Urutkan Nama Lembaga
    lists["KB"].sort();
    lists["TK"].sort();

    return lists;
  });
}

function getSdSchoolLists() {
  try {
    // 1. Buka spreadsheet yang benar menggunakan DROPDOWN_DATA
    const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.DROPDOWN_DATA.id);
    // 2. Akses sheet "Nama SDNS"
    const sheet = ss.getSheetByName("Nama SDNS");

    if (!sheet || sheet.getLastRow() < 2) {
      return { SDN: [], SDS: [] }; // Kembalikan array kosong jika sheet tidak ada/kosong
    }

    // 3. Ambil semua data dari baris kedua sampai akhir
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues();

    const lists = {
      "SDN": [],
      "SDS": []
    };

    // 4. Loop melalui data dan pisahkan berdasarkan status di kolom A
    data.forEach(row => {
      const status = row[0]; // Kolom A (Negeri/Swasta)
      const namaSekolah = row[1]; // Kolom B (Nama SD)

      if (status === "Negeri" && namaSekolah) {
        lists.SDN.push(namaSekolah);
      } else if (status === "Swasta" && namaSekolah) {
        lists.SDS.push(namaSekolah);
      }
    });

    // Urutkan hasilnya
    lists.SDN.sort();
    lists.SDS.sort();

    return lists;

  } catch (e) {
    return handleError('getSdSchoolLists', e);
  }
}

function processLapbulFormPaud(formData) {
  try {
    const jenjang = formData.jenjang;
    let FOLDER_ID_LAPBUL;
    if (jenjang === 'KB') {
      FOLDER_ID_LAPBUL = FOLDER_CONFIG.LAPBUL_KB;
    } else if (jenjang === 'TK') {
      FOLDER_ID_LAPBUL = FOLDER_CONFIG.LAPBUL_TK;
    } else {
      throw new Error("Jenjang tidak valid: " + jenjang);
    }
    
    const mainFolder = DriveApp.getFolderById(FOLDER_ID_LAPBUL);
    const tahunFolder = getOrCreateFolder(mainFolder, formData.tahun);
    const bulanFolder = getOrCreateFolder(tahunFolder, formData.laporanBulan);

    const fileData = formData.fileData;
    const decodedData = Utilities.base64Decode(fileData.data);
    const blob = Utilities.newBlob(decodedData, fileData.mimeType, fileData.fileName);
    const newFileName = `${formData.namaSekolah} - Lapbul ${formData.laporanBulan} ${formData.tahun}.pdf`;
    const newFile = bulanFolder.createFile(blob).setName(newFileName);
    const fileUrl = newFile.getUrl();

    const config = SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_PAUD;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);

    const newRow = [
      new Date(),
      formData.laporanBulan, formData.tahun, formData.npsn, formData.statusSekolah, formData.jumlahRombel, formData.jenjang, formData.namaSekolah,
      formData.murid_0_1_L, formData.murid_0_1_P, formData.murid_1_2_L, formData.murid_1_2_P,
      formData.murid_2_3_L, formData.murid_2_3_P, formData.murid_3_4_L, formData.murid_3_4_P,
      formData.murid_4_5_L, formData.murid_4_5_P, formData.murid_5_6_L, formData.murid_5_6_P,
      formData.murid_6_up_L, formData.murid_6_up_P, formData.kelompok_A_L, formData.kelompok_A_P,
      formData.kelompok_B_L, formData.kelompok_B_P, formData.kepsek_ASN, formData.kepsek_Non_ASN,
      formData.guru_PNS, formData.guru_PPPK, formData.guru_GTY, formData.guru_GTT,
      formData.tendik_Penjaga, formData.tendik_TAS, formData.tendik_Pustakawan, formData.tendik_Lainnya,
      fileUrl
    ];
    sheet.appendRow(newRow);

    return "Sukses! Laporan Bulan PAUD berhasil dikirim.";
  } catch (e) {  
    return handleError('processLapbulFormPaud', e);
  }
}

function processLapbulFormSd(formData) {
  // CATATAN: Variabel 'formData' ini berisi SEMUA data formulir
  // ditambah objek file data (formData.fileData) dari client-side JS.
  try {
    const mainFolder = DriveApp.getFolderById(FOLDER_CONFIG.LAPBUL_SD);

    // Menggunakan nama properti yang dikirim dari JavaScript
    const tahunFolder = getOrCreateFolder(mainFolder, formData.Tahun);
    const bulanFolder = getOrCreateFolder(tahunFolder, formData.Bulan);
    
    const fileData = formData.fileData;
    const decodedData = Utilities.base64Decode(fileData.data);
    const blob = Utilities.newBlob(decodedData, fileData.mimeType, fileData.fileName);
    
    // Menggunakan nama properti yang benar untuk nama file
    const newFileName = `${formData['Nama Sekolah']} - Lapbul ${formData.Bulan} ${formData.Tahun}.pdf`;
    
    const newFile = bulanFolder.createFile(blob).setName(newFileName);
    const fileUrl = newFile.getUrl();
    const config = SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_SD;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    
    // Ambil Peta Data (SD_FORM_INDEX_MAP) sebagai "Kebenaran"
    const headersMap = SD_FORM_INDEX_MAP;
    // Ambil nilai helper
    const getValue = (key) => formData[key] || 0;
    
    const newRow = headersMap.map(headerName => {
        // Cek Pengecualian
        if (headerName === 'Tanggal Unggah') return new Date();
        if (headerName === 'Jenjang') return "SD"; 
        if (headerName === 'Dokumen') return fileUrl;
        if (headerName === 'Update') return ""; 
    
        // Jika nama header ada di formData, ambil nilainya
        if (formData.hasOwnProperty(headerName)) {
            return getValue(headerName);
        }
        
        // Jika tidak ada (misal: header lama yang sudah tidak dipakai), isi 0
        return 0; 
    });

    sheet.appendRow(newRow);
    
    // Return Sukses
    return "Sukses! Laporan Bulan SD berhasil dikirim.";
    
  } catch (e) {
    // ⚠️ INI ADALAH PERBAIKAN KRITIS UNTUK MENGHENTIKAN 'MACET'
    // Kita log errornya, lalu melempar error agar google.script.run 
    // di browser segera mengaktifkan .withFailureHandler()
    Logger.log(`Error di processLapbulFormSd: ${e.message} - Stack: ${e.stack}`);
    
    // Baris ini akan mengirim error ke browser dan menghentikan macet.
    throw new Error(`Gagal mengirim laporan: ${e.message}`);
  }
}

// Kolom mapping untuk Paud dan SD
const LAPBUL_COLUMNS = {
    // ... (Mapping kolom PAUD dan SD tetap sama di sini)
    'PAUD': {
        'Tanggal Unggah': 0, 'Bulan': 1, 'Tahun': 2, 'Status': 4, 'Jenjang': 6, 'Nama Sekolah': 7, 'Rombel': 5, 'Dokumen': 36
    },
    'SD': {
        'Tanggal Unggah': 0, 'Bulan': 1, 'Tahun': 2, 'Status': 3, 'Nama Sekolah': 4, 'Rombel': 6, 'Dokumen': 7, 'Jenjang': 217
    }
};

function getLapbulRiwayatData() {
    try {
        const configPaud = SPREADSHEET_CONFIG.LAPBUL_RIWAYAT.PAUD;
        const configSd = SPREADSHEET_CONFIG.LAPBUL_RIWAYAT.SD;

        // Buka Spreadsheet menggunakan ID dari config
        const paudSS = SpreadsheetApp.openById(configPaud.id);
        const sdSS = SpreadsheetApp.openById(configSd.id);
        
        if (!paudSS) throw new Error(`Gagal membuka Spreadsheet PAUD (ID: ${configPaud.id}).`);
        if (!sdSS) throw new Error(`Gagal membuka Spreadsheet SD (ID: ${configSd.id}).`);

        const paudSheet = paudSS.getSheetByName(configPaud.sheet);
        const sdSheet = sdSS.getSheetByName(configSd.sheet);
        
        if (!paudSheet) throw new Error(`Sheet '${configPaud.sheet}' tidak ditemukan di SS PAUD.`);
        if (!sdSheet) throw new Error(`Sheet '${configSd.sheet}' tidak ditemukan di SS SD.`);
        
        // Header Akhir hanya berisi 8 kolom data (tanpa Aksi)
        const desiredHeaders = ["Nama Sekolah", "Jenjang", "Status", "Bulan", "Tahun", "Rombel", "Dokumen", "Tanggal Unggah"];
        let combinedData = [];
        const parseDateForSort = (date) => (date instanceof Date && !isNaN(date)) ? date.getTime() : 0;
        
        const processSheetData = (sheet, sourceKey) => {
            if (sheet.getLastRow() < 2) return;
            
            const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
            const values = dataRange.getValues(); 
            const map = LAPBUL_COLUMNS[sourceKey];
            
            values.forEach((row, index) => {
                if (!row[map['Tanggal Unggah']]) return; 

                const rowObject = {
                    _rowIndex: index + 2,
                    _source: sourceKey
                };
                
                rowObject['Nama Sekolah'] = row[map['Nama Sekolah']] || '-';
                rowObject['Jenjang'] = sourceKey === 'SD' ? (row[map['Jenjang']] || 'SD') : (row[map['Jenjang']] || '-');
                rowObject['Status'] = row[map['Status']] || '-';
                rowObject['Bulan'] = row[map['Bulan']] || '-';
                rowObject['Tahun'] = String(row[map['Tahun']] || '-');
                rowObject['Rombel'] = row[map['Rombel']] || '-';
                rowObject['Dokumen'] = row[map['Dokumen']] || ''; // URL Dokumen
                rowObject['Tanggal Unggah'] = row[map['Tanggal Unggah']];
                
                combinedData.push(rowObject);
            });
        };

        processSheetData(paudSheet, 'PAUD');
        processSheetData(sdSheet, 'SD');
        
        if (combinedData.length === 0) {
            // Hanya kirim headers yang dibutuhkan jika tidak ada data
            return { headers: desiredHeaders, rows: [], status: 'no_data' };
        }

        combinedData.sort((a, b) => parseDateForSort(b['Tanggal Unggah']) - parseDateForSort(a['Tanggal Unggah']));
        
        const ssTimezone = paudSS.getSpreadsheetTimeZone();
        const finalRows = combinedData.map(row => {
            const dateValue = row['Tanggal Unggah'];
            // Format Tanggal Unggah
            row['Tanggal Unggah'] = (dateValue instanceof Date && !isNaN(dateValue)) ? 
                                    Utilities.formatDate(dateValue, ssTimezone, "dd/MM/yyyy HH:mm:ss") : 
                                    (row['Tanggal Unggah'] || '-');
            
            // Hapus penambahan kolom "Aksi"
            // row['Aksi'] tidak lagi ditambahkan
            
            return row;
        });

        // HANYA kirim desiredHeaders (tanpa "Aksi")
        return { 
            headers: desiredHeaders, 
            rows: finalRows
        };

    } catch (e) {
        Logger.log("ERROR di getLapbulRiwayatData: " + e.message);
        return { error: `Gagal memuat data riwayat: ${e.message}` };
    }
}

function _getLimitedSheetData(sheetId, sheetName, startRow, numColumns) {
    try {
        const ss = SpreadsheetApp.openById(sheetId);
        if (!ss) return [];
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet || sheet.getLastRow() < startRow) return [];
        
        // Ambil data dari baris tertentu hingga akhir, sebanyak numColumns (16 kolom = A sampai P)
        if (sheet.getLastRow() < startRow) return [];
        
        const dataRange = sheet.getRange(startRow, 1, sheet.getLastRow() - startRow + 1, numColumns); 
        return dataRange.getDisplayValues();
    } catch (e) {
        Logger.log(`Error accessing data for ID ${sheetId}, sheet ${sheetName}: ${e.message}`);
        return [];
    }
}

const getSheetDataSecure = (sheet) => {
    // Jika hanya ada header atau sheet kosong, kembalikan null
    if (!sheet || sheet.getLastRow() < 2) return null;
    
    // Panggilan RPC (getValues dan getDisplayValues) hanya dilakukan di sini.
    const range = sheet.getDataRange();
    const displayValues = range.getDisplayValues(); 
    const rawValues = range.getValues(); // Mengambil Date Object mentah

    return {
        display: displayValues, 
        raw: rawValues,
        // Membersihkan header dari spasi ekstra (.trim()) untuk mapping yang akurat
        headers: displayValues[0].map(h => String(h).trim()) 
    };
};

const getCleanedDisplayValue = (displayRow, keyIndex) => {
    // Jika index tidak valid, kembalikan null
    if (keyIndex < 0) return null;
    // Mengambil nilai, mengubahnya ke String, dan menghapus spasi di awal/akhir (.trim())
    return String(displayRow[keyIndex] || '').trim();
};

function getLapbulStatusData() {
    try {
        const configPaud = SPREADSHEET_CONFIG.LAPBUL_STATUS.PAUD;
        const configSd = SPREADSHEET_CONFIG.LAPBUL_STATUS.SD;
        
        let rawCombinedData = [];
        
        // 1. Fetch data PAUD
        const dataPAUD = _getLimitedSheetData(configPaud.id, configPaud.sheet, START_ROW, NUM_COLUMNS_TO_FETCH);
        if (dataPAUD) rawCombinedData.push(...dataPAUD);
        
        // 2. Fetch data SD
        const dataSD = _getLimitedSheetData(configSd.id, configSd.sheet, START_ROW, NUM_COLUMNS_TO_FETCH);
        if (dataSD) rawCombinedData.push(...dataSD);
        
        if (rawCombinedData.length === 0) {
             return { headers: LAPBUL_STATUS_HEADERS, rows: [] }; 
        }

        const rows = rawCombinedData.map(row => {
            const rowObject = {};
            LAPBUL_STATUS_HEADERS.forEach((headerKey, i) => {
                rowObject[headerKey] = String(row[i] || '-'); 
            });
            return rowObject;
        })
        .filter(row => row['Nama Sekolah'] && row['Nama Sekolah'] !== '-');

        return { headers: LAPBUL_STATUS_HEADERS, rows: rows };

    } catch (e) {
        Logger.log(`Error in getLapbulStatusData (Outer Catch): ${e.toString()}`);
        return { error: `Gagal memuat data status: ${e.message}. Coba cek kembali ID Spreadsheet.` };
    }
}

function getLapbulStatusFilterData() {
    const dataResult = getLapbulStatusData();
    if (dataResult.error) return dataResult;
    
    const rows = dataResult.rows;
    if (rows.length === 0) {
         return { Tahun: [], Jenjang: [], NamaSekolah: {} };
    }

    const uniqueTahun = new Set();
    const sekolahByJenjang = {};
    const allJenjang = new Set();
    
    rows.forEach(row => {
        const tahun = row['Tahun'];
        const jenjang = row['Jenjang'];
        const sekolah = row['Nama Sekolah'];
        
        if (tahun && tahun !== '-') { uniqueTahun.add(tahun); }
        
        if (jenjang && jenjang !== '-') {
            allJenjang.add(jenjang);
            if (!sekolahByJenjang[jenjang]) { sekolahByJenjang[jenjang] = new Set(); }
        }

        if (jenjang && jenjang !== '-' && sekolah && sekolah !== '-') {
            if (sekolahByJenjang[jenjang]) {
                sekolahByJenjang[jenjang].add(sekolah);
            }
        }
    });

    const sortedTahun = Array.from(uniqueTahun).sort((a, b) => b.localeCompare(a));
    const sortedJenjang = Array.from(allJenjang).sort();
    
    const finalSekolah = {};
    sortedJenjang.forEach(jenjang => {
        finalSekolah[jenjang] = Array.from(sekolahByJenjang[jenjang]).sort();
    });

    return {
        Tahun: sortedTahun,
        Jenjang: sortedJenjang,
        NamaSekolah: finalSekolah
    };
}

const parseDateForSort = (dateStr) => {
    // KUNCI PERBAIKAN: Cek jika dateStr kosong (null, undefined, atau string kosong)
    if (!dateStr) return 0;
    
    if (dateStr instanceof Date && !isNaN(dateStr)) return dateStr.getTime();
    
    // Hanya jalankan .match jika dateStr adalah string
    if (typeof dateStr === 'string') {
        const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s(\d{2}):(\d{2}):(\d{2})/);
        if (parts) {
            return new Date(parts[3], parts[2] - 1, parts[1], parts[4], parts[5], parts[6]).getTime();
        }
        const dateOnlyParts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (dateOnlyParts) {
            return new Date(dateOnlyParts[3], dateOnlyParts[2] - 1, dateOnlyParts[1]).getTime();
        }
    }
    return 0;
};

// GANTI FUNGSI HELPER INI (baris 86)
const formatDate = (cell) => {
    // KUNCI PERBAIKAN: Cek jika cell adalah Date object yang valid
    if (cell instanceof Date && !isNaN(cell)) {
        return Utilities.formatDate(cell, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
    }
    // Jika tidak valid (null, "", dll.), kembalikan string '-'
    return cell || '-'; 
};

const mapSheet = (sheet, source, timeZone) => {
    const sheetData = getSheetDataSecure(sheet);
    if (!sheetData) return [];

    const { display, raw } = sheetData;
    const mapping = COLUMNS_MAP[source]; 
    if (!mapping) return [];
    const getCleanedDisplayValue = (displayRow, keyIndex) => {
        if (keyIndex === undefined || keyIndex < 0) return null;
        return String(displayRow[keyIndex] || '').trim();
    };
    
    // Proses setiap baris data (mulai dari baris ke-2 / index 1)
    return display.slice(1).map((displayRow, index) => { 
        const rowIndex = index + 2; 

        const namaSekolahIndex = mapping["Nama Sekolah"];
        const tanggalUnggahIndex = mapping["Tanggal Unggah"];

        if (namaSekolahIndex === undefined || tanggalUnggahIndex === undefined) return null; 

        const dateUnggahRaw = raw[rowIndex - 1][tanggalUnggahIndex]; 
        const dateUpdateRaw = mapping["Update"] !== undefined ? raw[rowIndex - 1][mapping["Update"]] : null;

        if (!dateUnggahRaw) return null; 
        
        // ========================================================
        // === KODE BARU DITAMBAHKAN DI SINI ===
        // 1. Ambil nilai waktu (angka) dari Tanggal Unggah
        const dateUnggah = (dateUnggahRaw instanceof Date && !isNaN(dateUnggahRaw)) ? dateUnggahRaw.getTime() : 0;
        // 2. Ambil nilai waktu (angka) dari Update
        const dateUpdate = (dateUpdateRaw instanceof Date && !isNaN(dateUpdateRaw)) ? dateUpdateRaw.getTime() : 0;
        // ========================================================
        
        const rowObject = {
            _rowIndex: rowIndex,
            _source: source,
            
            // ========================================================
            // === KODE BARU DITAMBAHKAN DI SINI ===
            // 3. Buat kolom _sortDate berisi tanggal terbaru (terbesar)
            _sortDate: Math.max(dateUnggah, dateUpdate),
            // ========================================================
            
            // Urutan key di sini MENENTUKAN Urutan Kolom (Harus sesuai FINAL_HEADERS)
            "Nama Sekolah": getCleanedDisplayValue(displayRow, mapping["Nama Sekolah"]) || '-',
            "Jenjang": getCleanedDisplayValue(displayRow, mapping["Jenjang"]) || (source === 'SD' ? 'SD' : 'PAUD'),
            "Status": getCleanedDisplayValue(displayRow, mapping["Status"]) || '-',
            "Bulan": getCleanedDisplayValue(displayRow, mapping["Bulan"]) || '-',
            "Tahun": getCleanedDisplayValue(displayRow, mapping["Tahun"]) || '-',
            "Dokumen": getCleanedDisplayValue(displayRow, mapping["Dokumen"]) || '',
            // Aksi tidak memiliki kolom di spreadsheet, hanya di rendering
            "Tanggal Unggah": (dateUnggahRaw instanceof Date) ?
 Utilities.formatDate(dateUnggahRaw, timeZone, "dd/MM/yyyy HH:mm:ss") : '-',
            "Update": (dateUpdateRaw instanceof Date) ?
 Utilities.formatDate(dateUpdateRaw, timeZone, "dd/MM/yyyy HH:mm:ss") : '-',
        };
        
        return rowObject;
    }).filter(row => row !== null && row["Nama Sekolah"] !== '-'); 
};

function getLapbulKelolaData() {
    try {
        // --- HAPUS LOG "TES v4" DARI SINI ---

        const PAUD_CONFIG = SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_PAUD;
        const SD_CONFIG = SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_SD;
        
        const PAUD_SS = SpreadsheetApp.openById(PAUD_CONFIG.id);
        const SD_SS = SpreadsheetApp.openById(SD_CONFIG.id);
        if (!PAUD_SS || !SD_SS) throw new Error("Gagal mengakses satu atau lebih Spreadsheet input data (periksa ID dan izin).");
        
        const PAUD_SHEET = PAUD_SS.getSheetByName(PAUD_CONFIG.sheet);
        const SD_SHEET = SD_SS.getSheetByName(SD_CONFIG.sheet);

        if (!PAUD_SHEET || !SD_SHEET) {
            // --- HAPUS LOG "ERROR" DARI SINI ---
            throw new Error("Satu atau lebih Sheet input data tidak ditemukan (nama sheet salah).");
        }
        
        const PAUD_TIME_ZONE = PAUD_SS.getSpreadsheetTimeZone();
        const SD_TIME_ZONE = SD_SS.getSpreadsheetTimeZone();
        
        const FINAL_HEADERS = [
            "Nama Sekolah", "Jenjang", "Status", "Bulan", "Tahun", 
            "Dokumen", "Aksi", "Tanggal Unggah", "Update"
        ];
        
        let combinedData = [];

        combinedData.push(...mapSheet(PAUD_SHEET, 'PAUD', PAUD_TIME_ZONE));
        combinedData.push(...mapSheet(SD_SHEET, 'SD', SD_TIME_ZONE));
        
        // --- HAPUS SEMUA LOG "SEBELUM SORT" DAN "SETELAH SORT" DARI SINI ---

        // Ini adalah baris KUNCI
        combinedData.sort((a, b) => b._sortDate - a._sortDate);
        
        // --- HAPUS LOG "TES v4 SELESAI" DARI SINI ---

        return { headers: FINAL_HEADERS, rows: combinedData };

    } catch (e) {
        // --- GANTI LOG "FATAL Error" MENJADI Logger.log YANG ASLI ---
        Logger.log('Error in getLapbulKelolaData: ' + e.message + ' Stack: ' + e.stack);
        return handleError('getLapbulKelolaData', e);
    }
}

function getLapbulDataByRow(rowIndex, source) {
    try {
        let configKey = source === 'PAUD' ?
            'LAPBUL_FORM_RESPONSES_PAUD' : 'LAPBUL_FORM_RESPONSES_SD';
        const config = SPREADSHEET_CONFIG[configKey];

        if (!config) throw new Error("Konfigurasi sumber data tidak ditemukan.");

        const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
        if (!sheet) throw new Error(`Sheet '${config.sheet}' tidak ditemukan.`);
        
        const lastCol = sheet.getLastColumn();
        // Ambil nilai tampilan (display values) dari seluruh baris
        const values = sheet.getRange(rowIndex, 1, 1, lastCol).getDisplayValues()[0];
        
        const rowData = {};
        
        if (source === 'PAUD') {
            const paudMap = PAUD_FORM_INDEX_MAP;
            while (values.length < paudMap.length) {
                values.push('');
            }
            paudMap.forEach((inputName, index) => {
                rowData[inputName] = values[index];
            });
            
            rowData.rowIndex = rowIndex;
            rowData.source = source;
            return rowData;

        // ===============================================
        // ===== PERBAIKAN UTAMA: BLOK "else if" UNTUK SD =====
        // ===============================================
        } else if (source === 'SD') {
            const sdMap = SD_FORM_INDEX_MAP;
            // Perluas array values jika kurang dari map
            while (values.length < sdMap.length) {
                values.push('');
            }
            
            // Map data berdasarkan index ke nama input HTML yang benar
            sdMap.forEach((inputName, index) => {
                // Pastikan inputName tidak kosong (untuk keamanan)
                if(inputName) {
                  rowData[inputName] = values[index];
                }
            });

            // Ambil kolom 'Update' secara terpisah jika ada
            // (Berdasarkan config, 'Update' ada di index 191)
            const updateIndex = 214; // Sesuaikan jika perlu
            if(values.length > updateIndex) {
               // Cek nama header 'Update' di map (jika ada)
               const updateHeaderName = sdMap[updateIndex];
               if(updateHeaderName) {
                 rowData[updateHeaderName] = values[updateIndex];
               }
            }

            // Tambahkan metadata
            rowData.rowIndex = rowIndex;
            rowData.source = source;
            return rowData;
            
        } else {
             // Fallback jika source tidak dikenal (logika lama Anda)
             const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.trim());
             headers.forEach((header, i) => {
                rowData[header] = values[i];
             });
             rowData.rowIndex = rowIndex;
             rowData.source = source;
             return rowData;
        }

    } catch (e) {
        return handleError('getLapbulDataByRow', e);
    }
}

function updateLapbulData(formData) {
  try {
    const source = formData.source;
    const rowIndex = parseInt(formData.rowIndex);
    if (!source || isNaN(rowIndex) || rowIndex < 2) throw new Error("Informasi baris atau sumber data tidak valid.");
    
    const configKey = source === 'PAUD' ? 'LAPBUL_FORM_RESPONSES_PAUD' : 'LAPBUL_FORM_RESPONSES_SD';
    const config = SPREADSHEET_CONFIG[configKey];
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    if (!sheet) throw new Error(`Sheet target tidak ditemukan: ${config.sheet}`);

    const lastCol = sheet.getLastColumn();
    const range = sheet.getRange(1, 1, rowIndex, lastCol);
    const allValues = range.getValues();
    
    // PENTING: Ambil header yang sudah di-trim
    const fullHeaders = allValues[0].map(h => String(h).trim()); 
    const existingValues = allValues[rowIndex - 1]; // Nilai RAW dari baris target (termasuk Date)
    
    // 1. Logika Upload File Baru & Setup Metadata
    const docIndex = fullHeaders.indexOf('Dokumen');
    let fileUrl = docIndex !== -1 ?
        sheet.getRange(rowIndex, docIndex + 1).getDisplayValue() : '';
        
    if (formData.fileData && formData.fileData.data) {
         const FOLDER_ID_LAPBUL = source === 'PAUD' ? FOLDER_CONFIG.LAPBUL_KB : FOLDER_CONFIG.LAPBUL_SD; // (Asumsi PAUD -> KB, jika tidak, sesuaikan)
         const mainFolder = DriveApp.getFolderById(FOLDER_ID_LAPBUL);
         
         // Ambil nama dari formData (karena dikunci/disabled di form)
         const tahunFolderName = formData.Tahun;
         const bulanFolderName = formData.Bulan;
         const namaSekolah = formData['Nama Sekolah'];
         
         const tahunFolder = getOrCreateFolder(mainFolder, tahunFolderName);
         const bulanFolder = getOrCreateFolder(tahunFolder, bulanFolderName);
         
         const oldFileIdMatch = String(fileUrl).match(/[-\w]{25,}/);
         if (oldFileIdMatch) {
             try { DriveApp.getFileById(oldFileIdMatch[0]).setTrashed(true);
             } catch (e) { Logger.log(`Gagal menghapus file lama: ${e.message}`); }
         }
         
         const newFileName = `${namaSekolah} - Lapbul ${bulanFolderName} ${tahunFolderName}.pdf`;
         const decodedData = Utilities.base64Decode(formData.fileData.data);
         const blob = Utilities.newBlob(decodedData, formData.fileData.mimeType, newFileName);
         const newFile = bulanFolder.createFile(blob);
         fileUrl = newFile.getUrl();
    }

    // 2. Format timestamp 'Update'
    const timeZone = Session.getScriptTimeZone();
    formData.Update = Utilities.formatDate(new Date(), timeZone, "dd/MM/yyyy HH:mm:ss");
    formData.Dokumen = fileUrl; // URL dokumen
    
    // 3. Susun Baris Data Baru (Iterasi berdasarkan header)
    const newRowValues = [];
    const DATE_COLUMNS = ['Tanggal Unggah', 'Update'];
    
    for (let i = 0; i < fullHeaders.length; i++) {
        const header = fullHeaders[i];
        let value = existingValues[i]; // Default: Nilai RAW lama

        // Cek apakah data baru ada di formData dengan nama header
        // Ini adalah "perang" kita. 'header' (dari sheet) harus cocok dengan 'formData' (dari HTML)
        if (formData.hasOwnProperty(header)) {
            value = formData[header];
            
            // Jika input angka kosong, simpan sebagai 0 (bukan string kosong)
            if (typeof value === 'string' && value.trim() === '') {
                 if (!DATE_COLUMNS.includes(header) && header !== 'Dokumen') {
                     value = 0;
                 } else {
                    value = '';
                 }
            }
        } 
        
        // Paksa override untuk Update dan Dokumen
        if (header === 'Update') {
             value = formData.Update;
        } else if (header === 'Dokumen') {
             value = formData.Dokumen;
        }
        
        newRowValues.push(value);
    }

    // 4. SET NILAI
    // (Gunakan newRowValues.length untuk memastikan lebarnya cocok)
    sheet.getRange(rowIndex, 1, 1, newRowValues.length).setValues([newRowValues]);
    
    return "Data Laporan Bulan berhasil diperbarui.";
  } catch (e) {
    Logger.log(`FATAL ERROR in updateLapbulData: ${e.message} Stack: ${e.stack}`);
    return { error: `Gagal memperbarui data di server: ${e.message}. Cek Log Server untuk detail.` };
  }
}

function deleteLapbulData(rowIndex, source, deleteCode) {
  try {
    const today = new Date();
    const todayCode = Utilities.formatDate(today, Session.getScriptTimeZone(), "yyyyMMdd");
    
    if (String(deleteCode).trim() !== todayCode) {
      throw new Error("Kode Hapus salah.");
    }

    let sheet;
    if (source === 'PAUD') {
      sheet = SpreadsheetApp.openById(SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_PAUD.id).getSheetByName(SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_PAUD.sheet);
    } else if (source === 'SD') {
      sheet = SpreadsheetApp.openById(SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_SD.id).getSheetByName(SPREADSHEET_CONFIG.LAPBUL_FORM_RESPONSES_SD.sheet);
    } else {
      throw new Error("Sumber data tidak valid.");
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const docIndex = headers.findIndex(h => h.trim().toLowerCase() === 'dokumen');
    if (docIndex !== -1) {
        const fileUrl = sheet.getRange(rowIndex, docIndex + 1).getValue();
        if (fileUrl && typeof fileUrl === 'string') {
            const fileId = fileUrl.match(/[-\w]{25,}/);
            if (fileId) {
                try {
                    DriveApp.getFileById(fileId[0]).setTrashed(true);
                } catch (err) {
                    Logger.log(`Gagal menghapus file Laporan Bulan dengan ID ${fileId[0]}: ${err.message}`);
                }
            }
        }
    }
    
    sheet.deleteRow(rowIndex);
    return "Data Laporan Bulan dan file terkait berhasil dihapus.";
  } catch (e) {
    return handleError("deleteLapbulData", e);
  }
}

function getLapbulInfo() {
  const cacheKey = 'lapbul_info_v2'; // Ubah kunci cache agar selalu memuat data baru
  return getCachedData(cacheKey, function() {
    try {
      // Menggunakan SPREADSHEET_CONFIG.DROPDOWN_DATA (ID: 1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA)
      const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.DROPDOWN_DATA.id);
      const sheet = ss.getSheetByName('Informasi');
      
      if (!sheet || sheet.getLastRow() < 2) {
        return []; // Kembalikan array kosong jika sheet tidak valid atau hanya header
      }

      const lastRow = sheet.getLastRow();
      // Ambil data dari A2 sampai baris terakhir
      const range = sheet.getRange('A2:A' + lastRow);
      const values = range.getValues()
                          .flat()
                          .filter(item => String(item).trim() !== ''); // Filter baris kosong
      
      // Jika Anda ingin mengambil data dari kolom B, gunakan range 'B2:B' + lastRow. 
      // Saya asumsikan Anda ingin kolom A (Informasi Umum) di sini.

      return values;
    } catch (e) {
      Logger.log(`Error in getLapbulInfo fetch: ${e.message}`);
      return []; // Kembalikan array kosong untuk menghindari error di client
    }
  });
}

function getUnduhFormatInfo() {
  const cacheKey = 'unduh_format_info_v1';
  return getCachedData(cacheKey, function() {
    try {
      const ss = SpreadsheetApp.openById("1wiDKez4rL5UYnpP2-OZjYowvmt1nRx-fIMy9trJlhBA");
      const sheet = ss.getSheetByName('Informasi');
      if (!sheet || sheet.getLastRow() < 2) return [];
      const range = sheet.getRange('B2:B' + sheet.getLastRow());
      return range.getDisplayValues().flat().filter(item => String(item).trim() !== '');
    } catch (e) {
      return handleError('getUnduhFormatInfo', e);
    }
  });
}

function getLapbulArsipFolderIds() {
  try {
    return {
      'KB': FOLDER_CONFIG.LAPBUL_KB,
      'TK': FOLDER_CONFIG.LAPBUL_TK,
      'SD': FOLDER_CONFIG.LAPBUL_SD
    };
  } catch (e) {
    return handleError('getLapbulArsipFolderIds', e);
  }
}