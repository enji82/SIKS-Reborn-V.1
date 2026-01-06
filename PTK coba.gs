function getPtkKeadaanPaudData() {
    try {
        // Memanggil helper dengan kunci yang baru kita buat di code.gs
        const data = getDataFromSheet('PTK_PAUD_KEADAAN');
        
        if (!data || data.length < 2) {
            return { headers: [], rows: [], filterConfigs: [] };
        }
        
        const headers = data[0];
        const dataRows = data.slice(1);
        
        // Cari index kolom 'Jenjang' untuk filter
        const jenjangIndex = headers.indexOf('Jenjang');

        const processedRows = dataRows.map(row => {
            const rowObject = {};
            headers.forEach((h, i) => rowObject[h] = row[i]);
            // Simpan data jenjang khusus untuk filtering
            rowObject['_filterJenjang'] = (jenjangIndex !== -1) ? row[jenjangIndex] : '';
            return rowObject;
        });

        return { 
            headers: headers, 
            rows: processedRows,
            // Konfigurasi Filter agar Dropdown Jenjang berfungsi
            filterConfigs: [{ id: 'filterJenjang', dataColumn: '_filterJenjang' }]
        };
    } catch (e) {
        return handleError('getPtkKeadaanPaudData', e);
    }
}
 
function getPtkKeadaanSdData() {
  try {
    return getDataFromSheet('PTK_SD_KEADAAN');
  } catch (e) {
    return handleError('getKeadaanPtkSdData', e);
  }
}

function getPtkJumlahBulananPaudData() {
  try {
    // 1. Ambil Data dari Spreadsheet (Menggunakan Helper)
    const data = getDataFromSheet('PTK_PAUD_JUMLAH_BULANAN');
    
    // Cek Data Kosong
    if (!data || data.length < 2) {
      return { headers: [], rows: [] };
    }
    
    const headers = data[0];
    const dataRows = data.slice(1);

    // 2. Mapping Data ke Object
    const processedRows = dataRows.map(row => {
        const rowObject = {};
        headers.forEach((h, i) => {
            // Pastikan data tidak undefined
            rowObject[h] = (row[i] === undefined) ? "" : row[i];
        });
        return rowObject;
    });

    // 3. Kembalikan ke Frontend
    return {
        headers: headers,
        rows: processedRows
    };

  } catch (e) {
    return handleError('getPtkJumlahBulananPaudData', e);
  }
}

function getPtkDaftarPaudData() {
  try {
    const data = getDataFromSheet('PTK_PAUD_DB');
    if (!data || data.length < 2) {
      return { headers: [], rows: [] };
    }
    
    // Header Asli (A-Q)
    const originalHeaders = [
        "Nama Lengkap", "Nama Lembaga", "Jenjang", "Status", "NIP/NIY", 
        "Pangkat, Gol./Ruang", "NUPTK", "Jabatan", "TMT", "L/P", 
        "Tempat Lahir", "Tanggal Lahir", "Pendidikan", "Jurusan", 
        "Tahun Lulus", "Serdik", "Dapodik"
    ];
    
    // Header Final (+ Pensiun)
    const finalHeaders = [...originalHeaders, "Pensiun"];

    // Mapping Data
    let processedRows = data.slice(1).map(row => {
        const rowObject = {};
        
        // Data Asli
        originalHeaders.forEach((headerName, index) => {
            rowObject[headerName] = (row[index] === undefined) ? "" : row[index];
        });

        // Hitung Pensiun
        const tglLahirRaw = row[11]; 
        const jabatanRaw = row[7];
        rowObject["Pensiun"] = hitungTanggalPensiun(tglLahirRaw, jabatanRaw);

        return rowObject;
    });

    // --- BARU: SORTING ABJAD BERDASARKAN NAMA LENGKAP ---
    processedRows.sort((a, b) => {
        const nameA = String(a["Nama Lengkap"]).toLowerCase();
        const nameB = String(b["Nama Lengkap"]).toLowerCase();
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    return {
        headers: finalHeaders,
        rows: processedRows
    };

  } catch (e) {
    return handleError('getPtkDaftarPaudData', e);
  }
}

// --- HELPER: RUMUS PENSIUN ---
function hitungTanggalPensiun(tglLahir, jabatan) {
  // 1. Cek jika Tanggal Lahir Kosong
  if (!tglLahir || tglLahir === "") return "";

  // 2. Parsing Tanggal Lahir
  // Google Sheet biasanya mengembalikan Object Date. Jika string, perlu diparse.
  let dob = new Date(tglLahir);
  if (isNaN(dob.getTime())) return ""; // Jika format tanggal invalid

  // 3. Tentukan Batas Usia (Rule: Guru/Kepsek = 60, Lainnya = 58)
  let limitTahun = 58;
  const job = String(jabatan).toLowerCase();
  if (job.includes("kepala sekolah") || job.includes("guru")) {
      limitTahun = 60;
  }

  // 4. Hitung Tanggal Pensiun
  // Aturan: Tanggal 1 bulan berikutnya setelah ulang tahun ke-60/58
  let tahunPensiun = dob.getFullYear() + limitTahun;
  let bulanLahir = dob.getMonth(); // 0 = Januari, 11 = Desember
  
  // Set ke Tanggal 1, Bulan Berikutnya (bulanLahir + 1)
  // Javascript otomatis menangani pergantian tahun jika bulan > 11
  let tglPensiun = new Date(tahunPensiun, bulanLahir + 1, 1);

  // 5. Format Output ke String Indonesia (dd-MM-yyyy)
  return Utilities.formatDate(tglPensiun, Session.getScriptTimeZone(), "dd-MM-yyyy");
}

function getKelolaPtkPaudData() {
  try {
    const config = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    if (!sheet || sheet.getLastRow() < 2) return { headers: [], rows: [] };

    // 1. Ambil data mentah (untuk tanggal) dan data tampilan (untuk string)
    const allData = sheet.getDataRange().getValues();
    const allDisplayData = sheet.getDataRange().getDisplayValues();

    // 2. Bersihkan header (ini penting untuk 'Dapodik')
    const headers = allDisplayData[0].map(h => String(h).trim());
    const dataRows = allData.slice(1);
    const displayRows = allDisplayData.slice(1);

    const updateIndex = headers.indexOf('Update');
    const dateInputIndex = headers.indexOf('Tanggal Input');
    const parseDate = (value) => value instanceof Date && !isNaN(value) ? value.getTime() : 0;

    // 3. Gabungkan data dengan indeks baris aslinya
    const indexedData = dataRows.map((row, index) => ({
      originalRowIndex: index + 2,
      rowData: row,
      displayRow: displayRows[index]
    }));

    // 4. Urutkan berdasarkan Update (terbaru) lalu Tanggal Input (terbaru)
    indexedData.sort((a, b) => {
    // 1. Dapatkan tanggal mentah untuk baris A
    const updateA = parseDate(a.rowData[updateIndex]);
    const dateInputA = parseDate(a.rowData[dateInputIndex]);
    // 2. Tentukan tanggal terbaru untuk baris A (mana yang lebih besar)
    const newestDateA = Math.max(updateA, dateInputA);

    // 3. Dapatkan tanggal mentah untuk baris B
    const updateB = parseDate(b.rowData[updateIndex]);
    const dateInputB = parseDate(b.rowData[dateInputIndex]);
    // 4. Tentukan tanggal terbaru untuk baris B
    const newestDateB = Math.max(updateB, dateInputB);

    // 5. Urutkan berdasarkan tanggal terbaru (dari besar ke kecil)
    return newestDateB - newestDateA;
      });

    // 5. Susun ulang data menjadi objek yang rapi
    const finalData = indexedData.map(item => {
      const rowDataObject = {
        _rowIndex: item.originalRowIndex,
        _source: 'PAUD',
      };

      headers.forEach((header, i) => {
         // Pastikan Tanggal Input (Q) dan Update (R) diformat dengan benar
         if (header === 'Tanggal Input' || header === 'Update') {
            const rawDate = item.rowData[i];
            if (rawDate instanceof Date) {
               rowDataObject[header] = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss");
            } else {
               rowDataObject[header] = item.displayRow[i] || ""; // Fallback
            }
         } else {
            rowDataObject[header] = item.displayRow[i] || ""; // Gunakan display value untuk string
         }
      });
      return rowDataObject;
    });

    // 6. Kirim SEMUA header, biarkan javascript yang memilih
    return { headers: headers, rows: finalData }; 
  } catch (e) {
    return handleError('getKelolaPtkPaudData', e);
  }
}

function getPtkPaudDataByRow(rowIndex) {
  try {
    const config = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    if (!sheet) throw new Error("Sheet tidak ditemukan.");

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
    const values = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const displayValues = sheet.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0];
    
    const rowData = {};
    headers.forEach((header, i) => {
      if (header === 'TMT' && values[i] instanceof Date) {
        rowData[header] = Utilities.formatDate(values[i], "UTC", "yyyy-MM-dd");
      } else {
        rowData[header] = displayValues[i];
      }
    });
    return rowData;
  } catch (e) {
    return handleError('getPtkPaudDataByRow', e);
  }
}

function updatePtkPaudData(formData) {
  try {
    const config = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    if (!sheet) throw new Error("Sheet tidak ditemukan.");

    const rowIndex = formData.rowIndex;
    if (!rowIndex) throw new Error("Row index tidak ditemukan.");

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
    const range = sheet.getRange(rowIndex, 1, 1, headers.length);
    const oldValues = range.getValues()[0];

    formData['Update'] = new Date();

    const newRowValues = headers.map((header, index) => {
      // Cek apakah data baru ada di formData
      if (formData.hasOwnProperty(header)) {

        // --- ▼▼▼ TAKTIK BARU UNTUK TMT ▼▼▼ ---
        if (header === 'TMT' && formData[header]) {
          // formData[header] adalah string "yyyy-mm-dd"
          return new Date(formData[header]);
        }
        // --- ▲▲▲ AKHIR TAKTIK ▲▲▲ ---

        return formData[header]; // Ambil data baru
      }
      return oldValues[index]; // Jika tidak ada, pertahankan data lama
    });

    range.setValues([newRowValues]); // 1. Simpan datanya

    // --- ▼▼▼ MISI FORMATTING (BARU) ▼▼▼ ---
    const tmtIndex = headers.indexOf('TMT');
    if (tmtIndex !== -1) {
      // 2. Terapkan format "dd-mm-yyyy" ke sel yang baru di-update
      sheet.getRange(rowIndex, tmtIndex + 1).setNumberFormat("dd-MM-yyyy");
    }
    // --- ▲▲▲ AKHIR MISI ▲▲▲ ---

    return "Data PTK berhasil diperbarui.";
  } catch (e) {
    throw new Error(`Gagal memperbarui data: ${e.message}`);
  }
}

function getNewPtkPaudOptions() {
  const cacheKey = 'ptk_paud_form_options_v1';
  // Kita bungkus fungsi aslinya dengan getCachedData
  return getCachedData(cacheKey, function() {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.FORM_OPTIONS_DB.id);
      const sheet = ss.getSheetByName("Form PAUD");
      if (!sheet) throw new Error("Sheet 'Form PAUD' tidak ditemukan.");

      const lastRow = sheet.getLastRow();
      const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();

      const jenjangOptions = [...new Set(data.map(row => row[0]).filter(Boolean))].sort();
      const statusOptions = [...new Set(data.map(row => row[2]).filter(Boolean))].sort();
      const jabatanOptions = [...new Set(data.map(row => row[3]).filter(Boolean))].sort();
      
      const lembagaMap = {};
      data.forEach(row => {
        const jenjang = row[0];
        const lembaga = row[1];
        if (jenjang && lembaga) {
          if (!lembagaMap[jenjang]) lembagaMap[jenjang] = [];
          if (!lembagaMap[jenjang].includes(lembaga)) lembagaMap[jenjang].push(lembaga);
        }
      });
      for (const jenjang in lembagaMap) {
        lembagaMap[jenjang].sort();
      }

      return {
        'Jenjang': jenjangOptions,
        'Nama Lembaga': lembagaMap,
        'Status': statusOptions,
        'Jabatan': jabatanOptions
      };
    } catch (e) {
      // Ini penting agar App Script tidak menyimpan cache error
      throw new Error(`Gagal mengambil opsi PTK PAUD: ${e.message}`); 
    }
  });
}

function addNewPtkPaud(formData) {
  try {
    const config = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    if (!sheet) throw new Error("Sheet tidak ditemukan.");

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).trim());

    const newRow = headers.map(header => {
      if (header === 'Tanggal Input') return new Date();

      // --- ▼▼▼ TAKTIK BARU UNTUK TMT ▼▼▼ ---
      if (header === 'TMT' && formData[header]) {
        // formData[header] adalah string "yyyy-mm-dd"
        // new Date(...) akan mengkonversinya ke Objek Date
        return new Date(formData[header]); 
      }
      // --- ▲▲▲ AKHIR TAKTIK ▲▲▲ ---

      return formData[header] || "";
    });

    sheet.appendRow(newRow); // 1. Simpan datanya

    // --- ▼▼▼ MISI FORMATTING (BARU) ▼▼▼ ---
    const lastRow = sheet.getLastRow();
    const tmtIndex = headers.indexOf('TMT');
    if (tmtIndex !== -1) {
      // 2. Terapkan format "dd-mm-yyyy" ke sel yang baru ditambahkan
      sheet.getRange(lastRow, tmtIndex + 1).setNumberFormat("dd-MM-yyyy");
    }
    // --- ▲▲▲ AKHIR MISI ▲▲▲ ---

    return "Data PTK baru berhasil disimpan.";
  } catch (e) {
    throw new Error(`Gagal menyimpan data: ${e.message}`);
  }
}

function deletePtkPaudData(rowIndex, deleteCode, alasan) {
  try {
    // 1. Validasi Kode Hapus
    const todayCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(deleteCode).trim() !== todayCode) throw new Error("Kode Hapus salah.");
    if (!alasan || String(alasan).trim() === "") throw new Error("Alasan tidak boleh kosong.");

    // 2. Buka kedua sheet (Sumber dan Target)
    const configSumber = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const configTarget = SPREADSHEET_CONFIG.PTK_PAUD_TIDAK_AKTIF;
    const ss = SpreadsheetApp.openById(configSumber.id); // Asumsi ID-nya sama
    
    const sheetSumber = ss.getSheetByName(configSumber.sheet);
    const sheetTarget = ss.getSheetByName(configTarget.sheet);
    if (!sheetSumber || !sheetTarget) throw new Error("Sheet 'PTK PAUD' atau 'PTK PAUD Tidak Aktif' tidak ditemukan.");

    // 3. Ambil Headers dari kedua sheet (bersihkan spasi)
    const headersSumber = sheetSumber.getRange(1, 1, 1, sheetSumber.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim());
    const headersTarget = sheetTarget.getRange(1, 1, 1, sheetTarget.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim());

    // 4. Ambil data baris yang akan 'dihapus' (mentah, untuk menjaga format tanggal)
    const dataBarisSumber = sheetSumber.getRange(rowIndex, 1, 1, headersSumber.length).getValues()[0];

    // 5. Bangun baris baru untuk sheet "Tidak Aktif" (ini adalah 1D array, [data1, data2, ...])
    const barisBaruTarget = headersTarget.map(headerTarget => {
        if (headerTarget === 'Alasan') {
            return alasan; // Masukkan alasan
        }
        if (headerTarget === 'Update') {
            return new Date(); // Masukkan waktu pemindahan
        }
        
        // Cari data yang cocok dari sheet sumber
        const indexDiSumber = headersSumber.indexOf(headerTarget);
        if (indexDiSumber !== -1) {
            return dataBarisSumber[indexDiSumber]; // Salin data
        }
        return ""; // Kolom ada di target tapi tidak di sumber
    });

    // --- ▼▼▼ INI ADALAH PERBAIKAN UTAMA ▼▼▼ ---

    // 6. Buat baris kosong di Bawah Header (di Baris 2)
    sheetTarget.insertRowAfter(1); 

    // 7. Ambil range baris baru (Baris 2) dan isi datanya
    // (setValues MENGHARUSKAN 2D array, jadi kita bungkus [barisBaruTarget])
    sheetTarget.getRange(2, 1, 1, barisBaruTarget.length).setValues([barisBaruTarget]);

    // 8. (Opsional tapi Direkomendasikan) Format Ulang Tanggal di Baris 2
    const tmtIndex = headersTarget.indexOf('TMT');
    const tglInputIndex = headersTarget.indexOf('Tanggal Input');
    const updateIndex = headersTarget.indexOf('Update');
    
    if (tmtIndex !== -1) sheetTarget.getRange(2, tmtIndex + 1).setNumberFormat("dd-MM-yyyy");
    if (tglInputIndex !== -1) sheetTarget.getRange(2, tglInputIndex + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    if (updateIndex !== -1) sheetTarget.getRange(2, updateIndex + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");

    // --- ▲▲▲ AKHIR PERBAIKAN ▲▲▲ ---

    // 9. Hapus baris asli dari sheet "PTK PAUD"
    sheetSumber.deleteRow(rowIndex);
    
    return "Data PTK berhasil dinonaktifkan dan dipindah ke arsip.";
  } catch (e) {
    // Kirim pesan error yang spesifik ke client
    return handleError('deletePtkPaudData', e);
  }
}

function getPtkJumlahBulananSdData() {
  try {
    return getDataFromSheet('PTK_SD_JUMLAH_BULANAN');
  } catch (e) {
    return handleError('getPtkJumlahBulananSdData', e);
  }
}

function getDaftarPtkSdnData() {
  try {
    const config = SPREADSHEET_CONFIG.PTK_SD_DB;
    return SpreadsheetApp.openById(config.id).getSheetByName("PTK SDN").getDataRange().getDisplayValues();
  } catch (e) {
    return handleError('getDaftarPtkSdnData', e);
  }
}

function getDaftarPtkSdsData() {
  try {
    const config = SPREADSHEET_CONFIG.PTK_SD_DB;
    return SpreadsheetApp.openById(config.id).getSheetByName("PTK SDS").getDataRange().getDisplayValues();
  } catch (e) {
    return handleError('getDaftarPtkSdsData', e);
  }
}

function getKelolaPtkSdData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.PTK_SD_DB.id);
    const sdnSheet = ss.getSheetByName("PTK SDN");
    const sdsSheet = ss.getSheetByName("PTK SDS");
    let combinedData = [];
    let allHeaders = []; 

    const parseDate = (value) => value instanceof Date && !isNaN(value) ? value.getTime() : 0;

    // Fungsi untuk memproses satu sheet
    const processSheet = (sheet, sourceName) => {
      if (!sheet || sheet.getLastRow() < 2) return;
      
      const range = sheet.getDataRange();
      const rawValues = range.getValues();
      const displayValues = range.getDisplayValues();

      const headers = displayValues[0].map(h => String(h).trim());
      if (allHeaders.length === 0) {
        // HANYA ambil header yang dibutuhkan oleh klien (untuk Kelola)
        allHeaders = ["Nama", "Unit Kerja", "Status", "NIP/NIY", "Jabatan", "Aksi", "Input", "Update"]; 
      }
      
      // Temukan semua indeks kolom yang kita butuhkan
      const updateIndex = headers.indexOf('Update');
      const inputIndex = headers.indexOf('Input');
      const namaIndex = headers.indexOf('Nama');
      const unitKerjaIndex = headers.indexOf('Unit Kerja');
      const statusIndex = headers.indexOf('Status'); // Status Kepegawaian
      const jabatanIndex = headers.indexOf('Jabatan');
      const nipIndex = headers.indexOf('NIP'); 
      const niyIndex = headers.indexOf('NIY');
      
      const dataRows = displayValues.slice(1);
      const rawRows = rawValues.slice(1);

      dataRows.forEach((row, index) => {
        if (!row[namaIndex] || !row[statusIndex]) return; 
        
        const rawRow = rawRows[index];
        const statusSekolah = (sourceName === 'SDN') ? 'Negeri' : 'Swasta'; // <-- KUNCI PERBAIKAN

        const rowObject = {
          _rowIndex: index + 2,
          _source: sourceName,
        };

        const dateUpdate = parseDate(rawRow[updateIndex]);
        const dateInput = parseDate(rawRow[inputIndex]);
        rowObject._sortDate = Math.max(dateUpdate, dateInput);

        // Isi data objek
        rowObject['Nama'] = row[namaIndex] || "";
        rowObject['Unit Kerja'] = row[unitKerjaIndex] || "";
        rowObject['Status Kepegawaian'] = row[statusIndex] || ""; // Simpan status kepegawaian sebagai kolom terpisah
        rowObject['Status'] = statusSekolah; // <-- KUNCI: Status SEKOLAH yang dipakai filter
        rowObject['Jabatan'] = row[jabatanIndex] || "";
        rowObject['Input'] = row[inputIndex] || "";
        rowObject['Update'] = row[updateIndex] || "";
        
        // Buat kolom 'NIP/NIY' gabungan
        if (nipIndex !== -1) {
            rowObject['NIP/NIY'] = row[nipIndex] || "";
        } else if (niyIndex !== -1) { 
            rowObject['NIP/NIY'] = row[niyIndex] || "";
        } else {
            rowObject['NIP/NIY'] = ""; 
        }
        
        combinedData.push(rowObject);
      });
    };

    processSheet(sdnSheet, 'SDN');
    processSheet(sdsSheet, 'SDS');
    
    combinedData.sort((a, b) => b._sortDate - a._sortDate);

    const desiredHeaders = [
        "Nama", "Unit Kerja", "Status", "NIP/NIY", "Jabatan", "Aksi", "Input", "Update"
    ];

    return { headers: desiredHeaders, rows: combinedData };

  } catch (e) {
    return handleError('getKelolaPtkSdData', e);
  }
}

function getNewPtkSdOptions() {
  const cacheKey = 'ptk_sd_form_options_v1';
  // Kita bungkus fungsi aslinya dengan getCachedData
  return getCachedData(cacheKey, function() {
    try {
      const ssOptions = SpreadsheetApp.openById(SPREADSHEET_CONFIG.FORM_OPTIONS_DB.id);
      const ssDropdown = SpreadsheetApp.openById(SPREADSHEET_IDS.DROPDOWN_DATA); 

      // --- 1. Ambil Unit Kerja ---
      const sheetSDNS = ssDropdown.getSheetByName("Nama SDNS");
      const unitKerjaNegeri = [];
      const unitKerjaSwasta = [];

      if (sheetSDNS && sheetSDNS.getLastRow() > 1) {
          const data = sheetSDNS.getRange(2, 1, sheetSDNS.getLastRow() - 1, 2).getDisplayValues();
          data.forEach(row => {
              const status = row[0];
              const namaSekolah = row[1];
              if (status === "Negeri" && namaSekolah) {
                  unitKerjaNegeri.push(namaSekolah);
              } else if (status === "Swasta" && namaSekolah) {
                unitKerjaSwasta.push(namaSekolah);
              }
          });
      }

      // --- 2. Ambil data PANGKAT dari ssOptions ---
      const getValuesFromOptionsDB = (sheetName, colLetter = 'A') => {
        const sheet = ssOptions.getSheetByName(sheetName);
        if (!sheet) {
          Logger.log(`Peringatan: Sheet '${sheetName}' tidak ditemukan di FORM_OPTIONS_DB.`);
          return [];
        }
        return sheet.getRange(colLetter + '2:' + colLetter + sheet.getLastRow())
                    .getValues()
                    .flat()
                    .filter(value => String(value).trim() !== '');
      };
      
      return {
        'Unit Kerja Negeri': unitKerjaNegeri, 
        'Unit Kerja Swasta': unitKerjaSwasta, 
        'Pangkat PNS': getValuesFromOptionsDB('Form SD', 'D'),
        'Pangkat PPPK': getValuesFromOptionsDB('Form SD', 'E'),
        'Pangkat PPPK PW': getValuesFromOptionsDB('Form SD', 'F'),
      };
    } catch (e) {
      // Ini penting agar App Script tidak menyimpan cache error
      throw new Error(`Gagal mengambil opsi PTK SD: ${e.message}`);
    }
  });
}

// GANTI FUNGSI 'addNewPtkSd' YANG LAMA DENGAN INI
function addNewPtkSd(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.PTK_SD_DB.id); // 1HlyL...
    let sheet;
    
    // 1. Tentukan sheet target berdasarkan 'statusSekolah'
    if (formData.statusSekolah === 'Negeri') {
      sheet = ss.getSheetByName("PTK SDN");
    } else if (formData.statusSekolah === 'Swasta') {
      sheet = ss.getSheetByName("PTK SDS");
    } else {
      throw new Error("Status Sekolah (Negeri/Swasta) tidak valid.");
    }

    if (!sheet) throw new Error(`Sheet untuk status '${formData.statusSekolah}' tidak ditemukan.`);
    
    // 2. Ambil header dari sheet target
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
    
    // 3. Tambahkan data meta
    formData['Input'] = new Date();
    
    // 4. Bangun baris baru berdasarkan header
    const newRow = headers.map(header => {
      let value = formData[header]; // Ambil data dari form

      // Aturan Khusus
      if (header === 'NUPTK' && value) {
        return "'" + value; // Simpan NUPTK sebagai Teks
      }
      if (header === 'TMT' && value) {
        return new Date(value); // Konversi string "yyyy-mm-dd" ke Objek Tanggal
      }
      
      // Jika data tidak ada di form (misal: 'Gol. Inpassing' di form Negeri)
      if (value === undefined) {
         return ""; // Isi dengan string kosong
      }

      return value;
    });
    
    // 5. Tambahkan baris ke sheet
    sheet.appendRow(newRow);
    
    // 6. Format ulang sel Tanggal
    const lastRow = sheet.getLastRow();
    const tmtIndex = headers.indexOf('TMT');
    if (tmtIndex !== -1) {
      sheet.getRange(lastRow, tmtIndex + 1).setNumberFormat("dd-MM-yyyy");
    }

    return "Data PTK baru berhasil disimpan.";
  } catch (e) {
    throw new Error(`Gagal menyimpan data: ${e.message}`);
  }
}

function getPtkSdDataByRow(rowIndex, source) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.PTK_SD_DB.id);
    let sheet;
    if (source === 'SDN') {
      sheet = ss.getSheetByName("PTK SDN");
    } else if (source === 'SDS') {
      sheet = ss.getSheetByName("PTK SDS");
    } else {
      throw new Error("Sumber data tidak valid.");
    }
    if (!sheet) throw new Error(`Sheet '${source}' tidak ditemukan.`);

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
    const values = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const displayValues = sheet.getRange(rowIndex, 1, 1, headers.length).getDisplayValues()[0];
    
    const rowData = {};
    headers.forEach((header, i) => {
      if ((header === 'TMT' || header === 'TMT CPNS' || header === 'TMT PNS') && values[i] instanceof Date) {
        rowData[header] = Utilities.formatDate(values[i], "UTC", "yyyy-MM-dd");
      } else {
        rowData[header] = displayValues[i];
      }
    });
    return rowData;
  } catch (e) {
    return handleError('getPtkSdDataByRow', e);
  }
}

function updatePtkSdData(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.PTK_SD_DB.id);
    let sheet;
    const source = formData.source;
    if (source === 'SDN') {
      sheet = ss.getSheetByName("PTK SDN");
    } else if (source === 'SDS') {
      sheet = ss.getSheetByName("PTK SDS");
    } else {
      throw new Error("Sumber data tidak valid.");
    }

    if (!sheet) throw new Error(`Sheet '${source}' tidak ditemukan.`);
    const rowIndex = formData.rowIndex;
    if (!rowIndex) throw new Error("Nomor baris (rowIndex) tidak ditemukan.");

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.trim());
    const range = sheet.getRange(rowIndex, 1, 1, headers.length);
    const oldValues = range.getValues()[0]; // Ambil nilai mentah (termasuk Date objects)

    formData['Update'] = new Date(); // Tambahkan stempel waktu update

    const newRowValues = headers.map((header, index) => {
      // Cek jika data baru ada di formData
      if (formData.hasOwnProperty(header)) {
        
        let value = formData[header];
        
        // --- PERBAIKAN LOGIKA PENYIMPANAN ---
        // 1. Ubah string tanggal "yyyy-mm-dd" kembali ke Objek Date
        if (header === 'TMT' && value) {
          return new Date(value); 
        }
        // 2. Tambahkan petik (') untuk NUPTK
        if (header === 'NUPTK' && value) {
          return "'" + value;
        }
        // 3. Jika input Pangkat/Gol untuk Non ASN (yang di-disabled)
        if (header === 'Pangkat, Gol./Ruang' && value === '— Tidak Perlu Diisi —') {
            return ""; // Simpan sebagai string kosong
        }
        
        return value; // Ambil data baru
      }
      
      // Jika tidak ada di formData (karena disabled, dll), pertahankan data lama
      return oldValues[index]; 
    });
    
    range.setValues([newRowValues]); // 1. Simpan datanya

    // 2. Format Ulang Tanggal
    const tmtIndex = headers.indexOf('TMT');
    if (tmtIndex !== -1) {
      sheet.getRange(rowIndex, tmtIndex + 1).setNumberFormat("dd-MM-yyyy");
    }

    return "Data PTK berhasil diperbarui.";
  } catch (e) {
    throw new Error(`Gagal memperbarui data: ${e.message}`);
  }
}

function getKebutuhanGuruData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_IDS.SD_DATA); // ID "1u4tNL3uqt5xHITXYwHnytK6Kul9Siam-vNYuzmdZB4s"
    
    // 1. Ambil data Negeri
    const sheetSdn = ss.getSheetByName("Kebutuhan Guru SDN");
    if (!sheetSdn) throw new Error("Sheet 'Kebutuhan Guru SDN' tidak ditemukan.");
    // Kita gunakan getDisplayValues() agar angka yang kosong terbaca '-' atau string
    const dataSdn = sheetSdn.getDataRange().getDisplayValues(); 

    // 2. Ambil data Swasta
    const sheetSds = ss.getSheetByName("Kebutuhan Guru SDS");
    if (!sheetSds) throw new Error("Sheet 'Kebutuhan Guru SDS' tidak ditemukan.");
    const dataSds = sheetSds.getDataRange().getDisplayValues();

    // 3. Kembalikan keduanya dalam satu objek
    return { 
      negeri: dataSdn, 
      swasta: dataSds 
    };
    
  } catch (e) {
    return handleError('getKebutuhanGuruData', e);
  }
}

function deletePtkSdData(rowIndex, source, deleteCode, alasan) {
  try {
    // 1. Validasi Kode Hapus
    const todayCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(deleteCode).trim() !== todayCode) throw new Error("Kode Hapus salah.");
    if (!alasan || String(alasan).trim() === "") throw new Error("Alasan tidak boleh kosong.");

    // 2. Buka Spreadsheet (ID yang sama untuk semua sheet PTK SD)
    const config = SPREADSHEET_CONFIG.PTK_SD_DB; //
    const ss = SpreadsheetApp.openById(config.id);
    
    // 3. Tentukan Sheet Sumber berdasarkan 'source'
    let sheetSumber;
    if (source === 'SDN') {
      sheetSumber = ss.getSheetByName("PTK SDN");
    } else if (source === 'SDS') {
      sheetSumber = ss.getSheetByName("PTK SDS");
    } else {
      throw new Error("Sumber data tidak valid: " + source);
    }
    
    // 4. Tentukan Sheet Target
    const sheetTarget = ss.getSheetByName("PTK Tidak Aktif");
    
    if (!sheetSumber || !sheetTarget) throw new Error("Sheet 'PTK SDN/SDS' atau 'PTK Tidak Aktif' tidak ditemukan.");

    // 5. Ambil Headers dari kedua sheet (bersihkan spasi)
    const headersSumber = sheetSumber.getRange(1, 1, 1, sheetSumber.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim());
    const headersTarget = sheetTarget.getRange(1, 1, 1, sheetTarget.getLastColumn()).getDisplayValues()[0].map(h => String(h).trim());

    // 6. Ambil data baris yang akan 'dihapus' (mentah, untuk menjaga format tanggal)
    const dataBarisSumber = sheetSumber.getRange(rowIndex, 1, 1, headersSumber.length).getValues()[0];

    // 7. Bangun baris baru untuk sheet "Tidak Aktif"
    const barisBaruTarget = headersTarget.map(headerTarget => {
        if (headerTarget === 'Alasan') {
            return alasan; // Masukkan alasan
        }
        if (headerTarget === 'Update') {
            return new Date(); // Masukkan waktu pemindahan
        }
        
        // Cari data yang cocok dari sheet sumber
        const indexDiSumber = headersSumber.indexOf(headerTarget);
        if (indexDiSumber !== -1) {
            return dataBarisSumber[indexDiSumber]; // Salin data
        }
        return ""; // Kolom ada di target tapi tidak di sumber
    });

    // 8. Tambahkan baris baru ke sheet target (di baris 2, di bawah header)
    sheetTarget.insertRowAfter(1);
    sheetTarget.getRange(2, 1, 1, barisBaruTarget.length).setValues([barisBaruTarget]);

    // 9. (Opsional tapi Direkomendasikan) Format Ulang Tanggal di Baris 2
    const tmtIndex = headersTarget.indexOf('TMT');
    const tglInputIndex = headersTarget.indexOf('Input'); // Ganti 'Tanggal Input' jika namanya beda
    const updateIndex = headersTarget.indexOf('Update');
    
    if (tmtIndex !== -1) sheetTarget.getRange(2, tmtIndex + 1).setNumberFormat("dd-MM-yyyy");
    if (tglInputIndex !== -1) sheetTarget.getRange(2, tglInputIndex + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
    if (updateIndex !== -1) sheetTarget.getRange(2, updateIndex + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");

    // 10. Hapus baris asli dari sheet sumber ("PTK SDN" atau "PTK SDS")
    sheetSumber.deleteRow(rowIndex);
    
    return "Data PTK berhasil dinonaktifkan dan dipindah ke arsip.";
  } catch (e) {
    // Kirim pesan error yang spesifik ke client
    return handleError('deletePtkSdData', e);
  }
}

// --- 1. GET DATA (DINAMIS SESUAI SHEET) ---
function getKelolaPtkData(jenjang) {
  try {
    const configName = (jenjang === 'SD') ? 'PTK_SD_DB' : 'PTK_PAUD_DB';
    const data = getDataFromSheet(configName);
    
    if (!data || data.length < 2) return { headers: [], rows: [] };

    // BACA HEADER DARI SPREADSHEET LANGSUNG (BARIS 1)
    // Ini menjamin kolom PAUD dan SD tampil apa adanya sesuai Excel
    const headers = data[0]; 
    
    // Tentukan Batas Kolom Data (Tanpa Metadata System)
    // PAUD = 17 Kolom (A-Q), SD = 19 Kolom (A-S)
    const maxCol = (jenjang === 'SD') ? 19 : 17; 
    
    const finalHeaders = headers.slice(0, maxCol);

    const rows = data.slice(1).map((r, i) => {
        let obj = { _rowIndex: i + 2 }; 
        finalHeaders.forEach((h, k) => {
            obj[h] = r[k] || "";
        });
        return obj;
    });

    return { headers: finalHeaders, rows: rows };
  } catch (e) { return handleError('getKelolaPtkData', e); }
}

// --- 2. SIMPAN DATA (PERCABANGAN LOGIKA) ---
function simpanPtk(form) {
  try {
    const targetJenjang = form.targetJenjang || 'PAUD'; 
    const configName = (targetJenjang === 'SD') ? 'PTK_SD_DB' : 'PTK_PAUD_DB';
    
    const ssConfig = SPREADSHEET_CONFIG[configName];
    const ss = SpreadsheetApp.openById(ssConfig.id);
    const sheet = ss.getSheetByName(ssConfig.sheet);
    
    const userEmail = Session.getActiveUser().getEmail();
    const timestamp = new Date();
    
    let dataRow = [];
    let metaColIndex = 0; // Posisi kolom Metadata (Tgl Input dll)

    // === LOGIKA PAUD (17 KOLOM) ===
    if (targetJenjang === 'PAUD') {
        metaColIndex = 18; // Kolom R (index 18 jika start 1)
        dataRow = [
          form.namaLengkap,   // A
          form.namaSekolah,   // B (Di form kita pakai namaSekolah utk menampung Nama Lembaga)
          form.jenjang,       // C
          form.status,        // D
          form.nip,           // E (NIP/NIY)
          form.pangkat,       // F
          form.nuptk,         // G
          form.jabatan,       // H
          form.tmt,           // I
          form.gender,        // J
          form.tempatLahir,   // K
          form.tanggalLahir,  // L
          form.pendidikan,    // M
          form.jurusan,       // N
          form.tahunLulus,    // O
          form.serdik,        // P
          form.dapodik        // Q
        ];
    } 
    // === LOGIKA SD (19 KOLOM - STRUKTUR BARU) ===
    else {
        metaColIndex = 20; // Kolom T (karena data sampai S/19)
        dataRow = [
          form.namaLengkap,   // A
          form.status,        // B
          form.tmt,           // C
          form.nip,           // D
          form.namaSekolah,   // E
          form.pangkat,       // F
          form.jabatan,       // G
          form.tugas,         // H
          form.gender,        // I
          form.tempatLahir,   // J
          form.tanggalLahir,  // K
          form.agama,         // L
          form.pendidikan,    // M
          form.jurusan,       // N
          form.tahunLulus,    // O
          form.nuptk,         // P
          form.dapodik,       // Q
          form.serdik,        // R
          form.tugasTambahan  // S
        ];
    }

    // --- EKSEKUSI SIMPAN ---
    if (form.rowId && form.rowId !== "") {
      // EDIT
      const rowIndex = parseInt(form.rowId);
      // Ambil meta lama
      const oldMeta = sheet.getRange(rowIndex, metaColIndex, 1, 2).getValues()[0]; 
      
      const finalRow = [ ...dataRow, oldMeta[0], oldMeta[1], timestamp, userEmail ];
      
      // Hitung total kolom (Data + 4 Meta)
      const totalCol = dataRow.length + 4;
      sheet.getRange(rowIndex, 1, 1, totalCol).setValues([finalRow]);
      
      return { success: true, message: `Data ${targetJenjang} diperbarui.` };
    } else {
      // BARU
      const finalRow = [ ...dataRow, timestamp, userEmail, "", "" ];
      sheet.appendRow(finalRow);
      return { success: true, message: `Data ${targetJenjang} disimpan.` };
    }
  } catch (e) { return handleError('simpanPtk', e); }
}

// --- 2. SIMPAN DATA (BARU & EDIT) ---
function simpanPtkPaud(form) {
  try {
    const ssConfig = SPREADSHEET_CONFIG['PTK_PAUD_DB'];
    const ss = SpreadsheetApp.openById(ssConfig.id);
    const sheet = ss.getSheetByName(ssConfig.sheet);
    
    const userEmail = Session.getActiveUser().getEmail();
    const timestamp = new Date();

    // Susun Array Data (Urutan A - Q Harus Pas!)
    // Pastikan 'name' di form HTML sama dengan kunci di sini
    const dataRow = [
      form.namaLengkap,   // A
      form.namaLembaga,   // B
      form.jenjang,       // C
      form.status,        // D
      form.nipNiy,        // E
      form.pangkat,       // F
      form.nuptk,         // G
      form.jabatan,       // H
      form.tmt,           // I
      form.gender,        // J
      form.tempatLahir,   // K
      form.tanggalLahir,  // L (Format yyyy-mm-dd dari input date)
      form.pendidikan,    // M
      form.jurusan,       // N
      form.tahunLulus,    // O
      form.serdik,        // P
      form.dapodik        // Q
    ];

    if (form.rowId && form.rowId !== "") {
      // --- MODE EDIT ---
      const rowIndex = parseInt(form.rowId);
      
      // Ambil data lama dulu untuk mempertahankan "Tanggal Input" & "Input By" (Kolom R & S)
      // Kolom R ada di indeks 18 (jika hitung dari 1) -> getRange(row, 18, 1, 2)
      const oldMeta = sheet.getRange(rowIndex, 18, 1, 2).getValues()[0];
      
      // Gabungkan: Data Baru (A-Q) + Meta Lama (R-S) + Meta Update Baru (T-U)
      const finalRow = [
          ...dataRow, 
          oldMeta[0],   // Tgl Input (Tetap)
          oldMeta[1],   // Input By (Tetap)
          timestamp,    // Tgl Update (Baru)
          userEmail     // Update By (Baru)
      ];
      
      // Simpan ke baris yg sesuai (Kolom 1 s/d 21)
      sheet.getRange(rowIndex, 1, 1, 21).setValues([finalRow]);
      return { success: true, message: "Data berhasil diperbarui." };

    } else {
      // --- MODE TAMBAH BARU ---
      // Gabungkan: Data Baru + Meta Input + Meta Update (Kosong)
      const finalRow = [
          ...dataRow,
          timestamp,    // Tgl Input
          userEmail,    // Input By
          "",           // Tgl Update
          ""            // Update By
      ];
      sheet.appendRow(finalRow);
      return { success: true, message: "Data baru berhasil disimpan." };
    }

  } catch (e) { return handleError('simpanPtkPaud', e); }
}

// --- 3. HAPUS DATA ---
function hapusPtkPaud(rowIndex) {
  try {
    const ssConfig = SPREADSHEET_CONFIG['PTK_PAUD_DB'];
    const ss = SpreadsheetApp.openById(ssConfig.id);
    const sheet = ss.getSheetByName(ssConfig.sheet);
    
    sheet.deleteRow(parseInt(rowIndex));
    return { success: true, message: "Data berhasil dihapus." };
  } catch (e) { return handleError('hapusPtkPaud', e); }
}

// --- 1. HELPER: CARI NAMA USER ASLI DARI DATABASE USER ---
function getRealUserName() {
  try {
    const email = Session.getActiveUser().getEmail();
    
    // Buka Spreadsheet Database User sesuai Config Anda
    const ss = SpreadsheetApp.openById(SPREADSHEET_CONFIG.ID_UTAMA);
    const sheet = ss.getSheetByName(SPREADSHEET_CONFIG.SHEET_USERS);
    
    // Ambil semua data
    const data = sheet.getDataRange().getValues();
    
    // Asumsi: 
    // Baris 1 = Header
    // Kolom A (Index 0) = Email/Username
    // Kolom C (Index 2) = Nama Lengkap (Sesuaikan index ini jika kolom Nama ada di urutan lain)
    
    // Cari baris yang emailnya cocok (skip header)
    const userRow = data.slice(1).find(row => row[0] === email);
    
    // Jika ketemu, kembalikan Nama (Kolom C/Index 2). Jika tidak, kembalikan Email.
    return userRow ? userRow[2] : email; 
  } catch (e) {
    // Jika ada error (misal sheet tidak ketemu), fallback ke email
    return Session.getActiveUser().getEmail();
  }
}

// --- HELPER: CARI INDEX KOLOM BERDASARKAN NAMA HEADER ---
function getColIndex(headers, name) {
  return headers.indexOf(name);
}

// ==========================================================
// 1. GET DATA (MAPPING KOLOM A - V SECARA PASTI)
// ==========================================================
function getKelolaPaudData() {
  try {
    const config = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    if (!sheet || sheet.getLastRow() < 2) return { headers: [], rows: [] };

    // Baca A2 sampai V-Terakhir (22 Kolom)
    // A=0 ... Q=16 | R=17(Input), S=18(InputBy), T=19(Upd), U=20(UpdBy), V=21(Ket)
    const dataRange = sheet.getRange(2, 1, sheet.getLastRow() - 1, 22);
    const dataValues = dataRange.getValues();
    
    // Helper Format
    const toISO = (val) => (val instanceof Date) ? Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm:ss") : val;
    const toDateOnly = (val) => (val instanceof Date) ? Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd") : String(val).split(' ')[0];
    const getTs = (val) => (val instanceof Date) ? val.getTime() : 0;

    const mappedRows = dataValues.map((r, i) => ({
        _rowIndex: i + 2,
        // Data Utama (A-Q)
        "Nama Lengkap": r[0], "Nama Lembaga": r[1], "Jenjang": r[2], "Status": r[3],
        "NIP/NIY": r[4], "Pangkat": r[5], "NUPTK": r[6], "Jabatan": r[7],
        "TMT": toDateOnly(r[8]), "L/P": r[9], "Tempat Lahir": r[10], "Tanggal Lahir": toDateOnly(r[11]),
        "Pendidikan": r[12], "Jurusan": r[13], "Tahun Lulus": r[14], "Serdik": r[15], "Dapodik": r[16],

        // Metadata Input (R & S) -> Khusus Tambah Data
        "Tanggal Input": toISO(r[17]),
        "Input By": r[18],

        // Metadata Update (T & U) -> Khusus Edit Data / Mutasi
        "Tanggal Update": toISO(r[19]),
        "Update By": r[20],

        // Keterangan (V) -> Khusus Mutasi Internal
        "Keterangan": r[21] || "" 
    }));

    // Sorting: Terbaru di Atas (Cek Tgl Update, kalau kosong cek Tgl Input)
    mappedRows.sort((a, b) => {
        const rowA = dataValues[a._rowIndex - 2];
        const rowB = dataValues[b._rowIndex - 2];
        const tA = Math.max(getTs(rowA[19]), getTs(rowA[17])); // Max(Col T, Col R)
        const tB = Math.max(getTs(rowB[19]), getTs(rowB[17]));
        return tB - tA;
    });

    // Header untuk Frontend
    const headers = [
        "Nama Lengkap","Nama Lembaga","Jenjang","Status","Jabatan",
        "TMT","Tanggal Lahir","Tanggal Input","Input By","Tanggal Update","Update By","Keterangan"
    ];

    return { headers: headers, rows: mappedRows };

  } catch (e) { return handleError('getKelolaPaudData', e); }
}

// ==========================================================
// 2. SIMPAN DATA (TAMBAH vs EDIT)
// ==========================================================
function simpanPaud(form) {
  try {
    const config = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const sheet = SpreadsheetApp.openById(config.id).getSheetByName(config.sheet);
    if (!sheet) throw new Error("Sheet tidak ditemukan.");

    const userName = form.userPenginput || "Admin"; 
    const timestamp = new Date();
    
    // Siapkan Data Utama A-Q (17 Kolom)
    const dataMain = [
      form.namaLengkap, form.namaLembaga, form.jenjang, form.status, form.nip,
      form.pangkat, form.nuptk, form.jabatan, form.tmt ? new Date(form.tmt) : "", 
      form.gender, form.tempatLahir, form.tanggalLahir ? new Date(form.tanggalLahir) : "",
      form.pendidikan, form.jurusan, form.tahunLulus, form.serdik, form.dapodik
    ];

    if (form.rowId && form.rowId !== "") {
      // --- MODE EDIT (Update Col T & U) ---
      // Jangan sentuh Col R (Input), S (InputBy), V (Keterangan)
      const rowIndex = parseInt(form.rowId);
      
      // 1. Update Data Utama (A-Q)
      sheet.getRange(rowIndex, 1, 1, 17).setValues([dataMain]);

      // 2. Update Metadata Edit (T & U)
      sheet.getRange(rowIndex, 20).setValue(timestamp).setNumberFormat("dd/MM/yyyy HH:mm:ss"); // T
      sheet.getRange(rowIndex, 21).setValue(userName); // U

      return { success: true, message: "Data berhasil diperbarui." };

    } else {
      // --- MODE TAMBAH (Isi Col R & S) ---
      // Format Baris: [Data A-Q] + [Tgl Input (R)] + [Input By (S)] + [Kosong (T)] + [Kosong (U)] + [Kosong (V)]
      const newRow = [
          ...dataMain, 
          timestamp,  // R: Tanggal Input
          userName,   // S: Input By
          "",         // T: Tanggal Update (KOSONGKAN)
          "",         // U: Update By (KOSONGKAN)
          ""          // V: Keterangan (KOSONGKAN)
      ];
      
      sheet.appendRow(newRow);
      
      // Format Cell Tanggal (Opsional)
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow, 18).setNumberFormat("dd/MM/yyyy HH:mm:ss"); // Format Col R

      return { success: true, message: "Data berhasil disimpan." };
    }
  } catch (e) { return handleError('simpanPaud', e); }
}

// ==========================================================
// 3. PROSES MUTASI (FIX FINAL: PISAH UPDATE BY & KETERANGAN)
// ==========================================================
function prosesMutasiPaud(form) {
  try {
    // 1. Validasi Kode Admin
    const todayCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(form.kodeAdmin).trim() !== todayCode) throw new Error("Kode Konfirmasi Admin salah.");

    const configDb = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    const ss = SpreadsheetApp.openById(configDb.id);
    const sheetDb = ss.getSheetByName(configDb.sheet);
    if (!sheetDb) throw new Error("Sheet Database tidak ditemukan.");

    const rowIndex = parseInt(form.rowIdMutasi);
    const user = form.userMutasi || "Admin";
    const timestamp = new Date();
    
    // Format Waktu & TMT
    const timeString = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd-MM-yyyy HH:mm");
    
    // Pastikan TMT formatnya dd-MM-yyyy
    let tmtIndo = form.tmtMutasi;
    if (tmtIndo.includes('-') && tmtIndo.split('-')[0].length === 4) {
        const p = tmtIndo.split('-');
        tmtIndo = `${p[2]}-${p[1]}-${p[0]}`;
    }

    // Ambil Nama Lembaga Lama (LANGSUNG DARI KOLOM B / Index Baris ke-2)
    const namaLembagaLama = sheetDb.getRange("B" + rowIndex).getValue();

    if (form.jenisTindakan === 'pindah') {
        // ===============================================
        // A. MUTASI INTERNAL (UPDATE DB UTAMA)
        // ===============================================
        
        // 1. Update Nama Lembaga (Kolom B)
        sheetDb.getRange("B" + rowIndex).setValue(form.lembagaBaru);
        
        // 2. Update Metadata Update (Kolom T & U)
        // PENTING: Kolom U (Update By) HANYA diisi Nama User
        sheetDb.getRange("T" + rowIndex).setValue(timestamp).setNumberFormat("dd/MM/yyyy HH:mm:ss");
        sheetDb.getRange("U" + rowIndex).setValue(user); 

        // 3. Isi Keterangan Mutasi (Kolom V)
        // Format: Pindah dari ... | TMT ... | By ... | Pada ...
        const infoMutasi = `Pindah dari ${namaLembagaLama} | TMT ${tmtIndo} | By ${user} | Pada ${timeString}`;
        sheetDb.getRange("V" + rowIndex).setValue(infoMutasi);

        return { success: true, message: `Berhasil pindah ke ${form.lembagaBaru}.` };

    } else {
        // ===============================================
        // B. NONAKTIFKAN (PINDAH KE SHEET MUTASI)
        // ===============================================
        
        let sheetMutasi = ss.getSheetByName("PTK_PAUD_MUTASI");
        // Jika belum ada, buat sheet baru
        if (!sheetMutasi) {
            sheetMutasi = ss.insertSheet("PTK_PAUD_MUTASI");
            // Header A-W
            const h = [
                "Nama Lengkap","Nama Lembaga","Jenjang","Status","NIP/NIY","Pangkat, Gol./Ruang","NUPTK","Jabatan",
                "TMT","L/P","Tempat Lahir","Tanggal Lahir","Pendidikan","Jurusan","Tahun Lulus","Serdik","Dapodik",
                "Tanggal Input","Input by","Tanggal Update","Update by",
                "Jenis Mutasi","Keterangan" // Kolom V & W
            ];
            sheetMutasi.appendRow(h);
        }

        // 1. Ambil Data Lama (A-U / 21 Kolom)
        const oldData = sheetDb.getRange(rowIndex, 1, 1, 21).getValues()[0];

        // 2. Siapkan Array Baris Baru
        let archiveRow = [...oldData];
        
        // Update Metadata T & U di array (Hanya User, bukan keterangan)
        archiveRow[19] = timestamp; // T
        archiveRow[20] = user;      // U

        // 3. Isi Kolom V (Jenis Mutasi)
        archiveRow[21] = form.alasanMutasi;

        // 4. Isi Kolom W (Keterangan Lengkap)
        // Format: TMT ... | By ... | Pada ... | Ket ...
        const detail = `TMT ${tmtIndo} | By ${user} | Pada ${timeString} | Ket. ${form.keteranganMutasi || '-'}`;
        archiveRow[22] = detail; 

        // 5. Simpan ke Sheet Mutasi
        sheetMutasi.appendRow(archiveRow);
        
        // Format Tanggal (Kolom T / 20)
        const lastRow = sheetMutasi.getLastRow();
        sheetMutasi.getRange(lastRow, 20).setNumberFormat("dd/MM/yyyy HH:mm:ss");

        // 6. Hapus dari DB Utama
        sheetDb.deleteRow(rowIndex);

        return { success: true, message: "Data berhasil dinonaktifkan." };
    }

  } catch (e) { return handleError('prosesMutasiPaud', e); }
}

// ==========================================
// BAGIAN 2: KHUSUS SD (19 Kolom)
// ==========================================
function getKelolaSdData() {
  const data = getDataFromSheet('PTK_SD_DB'); // Config SD
  if (!data || data.length < 2) return { headers: [], rows: [] };

  // Ambil 19 Kolom
  const headers = data[0].slice(0, 19); 
  const rows = data.slice(1).map((r, i) => {
      let obj = { _rowIndex: i + 2 };
      headers.forEach((h, k) => obj[h] = r[k] || "");
      return obj;
  });
  return { headers: headers, rows: rows };
}

function simpanSd(form) {
  try {
    const ssConfig = SPREADSHEET_CONFIG['PTK_SD_DB']; // Langsung tembak SD
    const ss = SpreadsheetApp.openById(ssConfig.id);
    const sheet = ss.getSheetByName(ssConfig.sheet);
    
    const userEmail = Session.getActiveUser().getEmail();
    const timestamp = new Date();

    // MAPPING 19 KOLOM (SESUAI URUTAN SPREADSHEET SD)
    const dataRow = [
      form.namaLengkap, form.status, form.tmt, form.nip, form.namaSekolah,
      form.pangkat, form.jabatan, form.tugas, form.gender, form.tempatLahir,
      form.tanggalLahir, form.agama, form.pendidikan, form.jurusan, form.tahunLulus,
      form.nuptk, form.dapodik, form.serdik, form.tugasTambahan
    ];

    if (form.rowId) { // EDIT
      const rowIndex = parseInt(form.rowId);
      const oldMeta = sheet.getRange(rowIndex, 20, 1, 2).getValues()[0]; // Meta di kolom 20,21
      const finalRow = [...dataRow, oldMeta[0], oldMeta[1], timestamp, userEmail];
      sheet.getRange(rowIndex, 1, 1, 23).setValues([finalRow]);
      return { success: true, message: "Data SD diperbarui." };
    } else { // BARU
      const finalRow = [...dataRow, timestamp, userEmail, "", ""];
      sheet.appendRow(finalRow);
      return { success: true, message: "Data SD disimpan." };
    }
  } catch (e) { return handleError('simpanSd', e); }
}

function hapusSd(rowIndex) {
    const ssConfig = SPREADSHEET_CONFIG['PTK_SD_DB'];
    const ss = SpreadsheetApp.openById(ssConfig.id);
    ss.getSheetByName(ssConfig.sheet).deleteRow(parseInt(rowIndex));
    return { success: true, message: "Data SD dihapus." };
}

// --- AMBIL LIST LEMBAGA (Untuk Dropdown) ---
function getLembagaList() {
  try {
    const data = getDataFromSheet('PTK_PAUD_DB');
    if (!data || data.length < 2) return [];

    // Ambil Kolom B (Nama Lembaga) dan C (Jenjang)
    // Map menjadi object { nama: "TK A", jenjang: "TK" }
    let list = data.slice(1).map(r => ({
       nama: r[1],
       jenjang: r[2]
    }));

    // Hapus Duplikat & Sortir Abjad
    // Kita gunakan Map untuk filter unik berdasarkan nama
    const uniqueList = Array.from(new Set(list.map(a => JSON.stringify(a))))
        .map(a => JSON.parse(a))
        .sort((a, b) => a.nama.localeCompare(b.nama));

    return uniqueList;
  } catch (e) { return []; }
}

// --- 3. PROSES MUTASI / NONAKTIFKAN PTK ---
function prosesMutasiPaud(form) {
  try {
    // 1. Validasi Kode Konfirmasi (Format: YYYYMMDD hari ini)
    const todayCode = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
    if (String(form.kodeAdmin).trim() !== todayCode) {
       throw new Error("Kode Konfirmasi Admin salah.");
    }

    const configDb = SPREADSHEET_CONFIG.PTK_PAUD_DB;
    // Asumsi: Sheet Mutasi ada di Spreadsheet yang sama, jika beda sesuaikan ID-nya
    const configMutasi = { id: configDb.id, sheet: "PTK_PAUD_MUTASI" }; 
    
    const ss = SpreadsheetApp.openById(configDb.id);
    const sheetDb = ss.getSheetByName(configDb.sheet);
    if (!sheetDb) throw new Error("Sheet Database tidak ditemukan.");

    const rowIndex = parseInt(form.rowIdMutasi);
    const user = form.userMutasi || "Admin";
    const timestamp = new Date();
    
    // Ambil Data Lama (Baris yang akan dimutasi)
    // Kita ambil seluruh baris berdasarkan index
    const lastCol = sheetDb.getLastColumn();
    const headers = sheetDb.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h).trim());
    const rowData = sheetDb.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

    // --- LOGIKA CABANG BERDASARKAN JENIS TINDAKAN ---
    
    if (form.jenisTindakan === 'pindah') {
        // ==========================================
        // KASUS A: PINDAH LEMBAGA (UPDATE DB UTAMA)
        // ==========================================
        
        // Cari index kolom yang perlu diupdate
        const idxLembaga = headers.findIndex(h => h.toLowerCase() === 'nama lembaga');
        const idxUpdate = headers.findIndex(h => h.toLowerCase().includes('update') && !h.toLowerCase().includes('by'));
        const idxUpdateBy = headers.findIndex(h => h.toLowerCase() === 'update by');
        
        // Simpan nama lembaga lama untuk catatan (Opsional, jika ada kolom Keterangan/Riwayat)
        const oldSchool = rowData[idxLembaga]; 

        // Update Cell
        if(idxLembaga > -1) sheetDb.getRange(rowIndex, idxLembaga + 1).setValue(form.lembagaBaru);
        if(idxUpdate > -1) sheetDb.getRange(rowIndex, idxUpdate + 1).setValue(timestamp); // Tgl Update
        if(idxUpdateBy > -1) sheetDb.getRange(rowIndex, idxUpdateBy + 1).setValue(user + " (Pindah dr " + oldSchool + ")"); // Update By + History

        // Format Tanggal Update
        if(idxUpdate > -1) sheetDb.getRange(rowIndex, idxUpdate + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");

        return { success: true, message: "Berhasil: PTK dipindahkan ke " + form.lembagaBaru };

    } else {
        // ==========================================
        // KASUS B: NONAKTIFKAN (PINDAH KE SHEET MUTASI)
        // ==========================================
        
        const sheetMutasi = ss.getSheetByName(configMutasi.sheet);
        if (!sheetMutasi) throw new Error("Sheet 'PTK_PAUD_MUTASI' tidak ditemukan. Harap buat sheet tersebut terlebih dahulu.");

        // Siapkan Data untuk Arsip
        // Kita copy data lama, lalu tambahkan info mutasi di kolom tambahan
        // Asumsi: Sheet Mutasi punya header sama + Kolom 'Jenis Mutasi' + 'Keterangan'
        
        // 1. Copy array data lama
        let archiveRow = [...rowData]; 
        
        // 2. Update Metadata di array sebelum disimpan (Update By = User yang memutasi)
        const idxUpdate = headers.findIndex(h => h.toLowerCase().includes('update') && !h.toLowerCase().includes('by'));
        const idxUpdateBy = headers.findIndex(h => h.toLowerCase() === 'update by');
        if(idxUpdate > -1) archiveRow[idxUpdate] = timestamp;
        if(idxUpdateBy > -1) archiveRow[idxUpdateBy] = user;

        // 3. Tambahkan Info Mutasi (Append di kolom paling belakang)
        // Pastikan di sheet Mutasi sudah Anda siapkan header tambahannya
        archiveRow.push(form.alasanMutasi); // Jenis Mutasi (Resign/Pensiun/dll)
        archiveRow.push("TMT: " + form.tmtMutasi + " | Ket: " + form.keteranganMutasi); // Keterangan Lengkap

        // 4. Simpan ke Sheet Mutasi
        sheetMutasi.appendRow(archiveRow);
        
        // 5. Format Tanggal di Sheet Mutasi (Opsional, baris terakhir)
        const lastRowM = sheetMutasi.getLastRow();
        if(idxUpdate > -1) sheetMutasi.getRange(lastRowM, idxUpdate + 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");

        // 6. HAPUS DARI DATABASE UTAMA
        sheetDb.deleteRow(rowIndex);

        return { success: true, message: "Berhasil: Data PTK telah dinonaktifkan (Arsip)." };
    }

  } catch (e) { return handleError('prosesMutasiPaud', e); }
}
