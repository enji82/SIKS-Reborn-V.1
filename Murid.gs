function getMuridPaudKelasUsiaData() {
  const cacheKey = 'murid_paud_kelas_usia_v1';
  return getCachedData(cacheKey, () => {
    try {
      return getDataFromSheet('MURID_PAUD_KELAS');
    } catch (e) {
      throw new Error(`Gagal memuat data Murid PAUD Kelas Usia: ${e.message}`);
    }
  });
}

function getMuridPaudJenisKelaminData() {
  const cacheKey = 'murid_paud_jk_v1';
  return getCachedData(cacheKey, () => {
    try {
      return getDataFromSheet('MURID_PAUD_JK');
    } catch (e) {
      throw new Error(`Gagal memuat data Murid PAUD JK: ${e.message}`);
    }
  });
}

function getMuridPaudJumlahBulananData() {
  try {
    // 1. Panggil fungsi getDataFromSheet, yang sudah mengambil data mentah 2D Array
    // dari SPREADSHEET_CONFIG.MURID_PAUD_BULANAN
    const allData = getDataFromSheet('MURID_PAUD_BULANAN'); 
    
    // 2. Langsung kembalikan data mentah tersebut (termasuk 2 baris header)
    return allData; 
    
  } catch (e) {
    // 3. Tangani error jika terjadi
    return handleError('getMuridPaudJumlahBulananData', e);
  }
}

function getMuridSdKelasData() {
  try {
    // 1. Panggil fungsi getDataFromSheet, yang mengambil data mentah 2D Array
    const allData = getDataFromSheet('MURID_SD_KELAS'); 
    
    // 2. Langsung kembalikan data mentah tersebut (termasuk header)
    return allData; 
    
  } catch (e) {
    // 3. Tangani error jika terjadi
    return handleError('getMuridSdKelasData', e);
  }
}

function getMuridSdRombelData() {
  try {
    // 1. Ambil data mentah (2D Array)
    const allData = getDataFromSheet('MURID_SD_ROMBEL'); 
    
    // 2. Langsung kembalikan data mentah tersebut (termasuk 2 baris header)
    return allData; 
    
  } catch (e) {
    // 3. Tangani error jika terjadi
    return handleError('getMuridSdRombelData', e);
  }
}

function getMuridSdJenisKelaminData() {
  try {
    // 1. Ambil data mentah (2D Array)
    const allData = getDataFromSheet('MURID_SD_JK'); 
    
    // 2. Langsung kembalikan data mentah tersebut (termasuk 2 baris header)
    return allData; 
    
  } catch (e) {
    // 3. Tangani error jika terjadi
    return handleError('getMuridSdJenisKelaminData', e);
  }
}

function getMuridSdAgamaData() {
  try {
    // 1. Ambil data mentah (2D Array)
    const allData = getDataFromSheet('MURID_SD_AGAMA'); 
    
    // 2. Langsung kembalikan data mentah tersebut (termasuk 2 baris header)
    return allData; 
    
  } catch (e) {
    // 3. Tangani error jika terjadi
    return handleError('getMuridSdAgamaData', e);
  }
}

function getMuridSdJumlahBulananData() {
  try {
    // 1. Ambil data mentah (2D Array)
    const allData = getDataFromSheet('MURID_SD_BULANAN'); 
    
    // 2. Langsung kembalikan data mentah tersebut (termasuk 2 baris header)
    return allData; 
    
  } catch (e) {
    // 3. Tangani error jika terjadi
    return handleError('getMuridSdJumlahBulananData', e);
  }
}