function getPtkKeadaanPaudData() {
    try {
        const data = getDataFromSheet('PTK_PAUD_KEADAAN');
        if (!data || data.length < 2) {
            return { headers: [], rows: [], filterConfigs: [] };
        }
        
        const headers = data[0];
        const dataRows = data.slice(1);
        const jenjangIndex = headers.indexOf('Jenjang');

        const processedRows = dataRows.map(row => {
            const rowObject = {};
            headers.forEach((h, i) => rowObject[h] = row[i]);
            rowObject['_filterJenjang'] = row[jenjangIndex];
            return rowObject;
        });

        return { 
            headers: headers, 
            rows: processedRows,
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
    const allData = getDataFromSheet('PTK_PAUD_JUMLAH_BULANAN');
    if (!allData || allData.length < 2) {
      return { headers: [], rows: [], filterConfigs: [] };
    }
    
    const headers = allData[0];
    const dataRows = allData.slice(1);

    const jenjangIndex = headers.indexOf('Jenjang');
    const tahunIndex = headers.indexOf('Tahun');
    const bulanIndex = headers.indexOf('Bulan');
    
    const processedRows = dataRows.map(row => {
        const rowObject = {};
        headers.forEach((h, i) => rowObject[h] = row[i]);
        rowObject['_filterJenjang'] = row[jenjangIndex];
        rowObject['_filterTahun'] = row[tahunIndex];
        rowObject['_filterBulan'] = row[bulanIndex];
        return rowObject;
    });

    return {
        headers: headers,
        rows: processedRows,
        filterConfigs: [
            { id: 'filterTahun', dataColumn: '_filterTahun', sortReverse: true },
            { id: 'filterBulan', dataColumn: '_filterBulan', specialSort: 'bulan' },
            { id: 'filterJenjang', dataColumn: '_filterJenjang' },
            { id: 'filterNamaLembaga', dataColumn: 'Nama Lembaga', dependsOn: 'filterJenjang', dependencyColumn: '_filterJenjang' }
        ]
    };
  } catch (e) {
    return handleError('getPtkJumlahBulananPaudData', e);
  }
}

function getDaftarPtkPaudData() {
  try {
    const allData = getDataFromSheet('PTK_PAUD_DB');
    if (!allData || allData.length < 2) {
        return { headers: [], rows: [], filterConfigs: [] };
    }
    
    // Perbaikan 1: Membersihkan spasi dari semua header
    const headers = allData[0].map(h => String(h).trim());
    const dataRows = allData.slice(1);

    // Perbaikan 2: Menemukan indeks untuk SEMUA 6 filter
    const jenjangIndex = headers.indexOf('Jenjang');
    const lembagaIndex = headers.indexOf('Nama Lembaga');
    const statusIndex = headers.indexOf('Status');
    const pendidikanIndex = headers.indexOf('Pendidikan');
    const serdikIndex = headers.indexOf('Serdik');
    const dapodikIndex = headers.indexOf('Dapodik'); // <-- TARGET KITA

    // --- JEBAKAN LOG DIMULAI ---
    // Log ini akan mencatat apa yang dilihat server TEPAT SETELAH membersihkan spasi
    Logger.log("--- JEBAKAN LOG: getDaftarPtkPaudData ---");
    Logger.log("Header yang Ditemukan (setelah .trim()): " + JSON.stringify(headers));
    Logger.log("Indeks 'Dapodik' (Harusnya BUKAN -1): " + dapodikIndex);
    // --- AKHIR JEBAKAN LOG ---
    
    const processedRows = dataRows.map((row, i) => { // 'i' ditambahkan untuk index
        const rowObject = {};
        // Perbaikan 3: Loop ini menyalin SEMUA data
        headers.forEach((h, i) => {
          rowObject[h] = row[i];
        });
        
        // Perbaikan 4: Membuat data untuk SEMUA 6 filter
        rowObject['_filterJenjang'] = row[jenjangIndex];
        rowObject['_filterNamaLembaga'] = row[lembagaIndex];
        rowObject['_filterStatus'] = row[statusIndex];
        rowObject['_filterPendidikan'] = row[pendidikanIndex];
        rowObject['_filterSerdik'] = row[serdikIndex];
        rowObject['_filterDapodik'] = row[dapodikIndex]; // <-- TARGET KITA
        
        // --- JEBAKAN LOG 2: Catat data baris pertama ---
        if (i === 0) { // Hanya log baris data pertama
            Logger.log("Data Baris Pertama (Mentah): " + JSON.stringify(row));
            Logger.log("Data Baris Pertama (Diproses): " + JSON.stringify(rowObject));
            Logger.log("Nilai _filterDapodik (Harusnya 'Ya'/'Tidak'): " + rowObject['_filterDapodik']);
        }
        // --- AKHIR JEBAKAN LOG 2 ---

        return rowObject;
    });

    // (Urutkan data)
    processedRows.sort((a,b) => (a['Nama'] || "").localeCompare(b['Nama'] || ""));

    // (Kirim kembali header asli dari sheet)
    return {
        headers: headers,
        rows: processedRows,
        filterConfigs: [
            { id: 'filterJenjang', dataColumn: '_filterJenjang' },
            { id: 'filterNamaLembaga', dataColumn: '_filterNamaLembaga', dependsOn: 'filterJenjang', dependencyColumn: '_filterJenjang' },
            { id: 'filterStatus', dataColumn: '_filterStatus' },
            { id: 'filterPendidikan', dataColumn: '_filterPendidikan' },
            { id: 'filterSerdik', dataColumn: '_filterSerdik' },
            { id: 'filterDapodik', dataColumn: '_filterDapodik' }
        ]
    };

  } catch (e) {
    Logger.log("--- ERROR DI DALAM getDaftarPtkPaudData ---"); // Log error tambahan
    Logger.log(e);
    return handleError('getDaftarPtkPaudData', e);
  }
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