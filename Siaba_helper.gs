/* ======================================================================
   FILE MASTER HELPER (Fungsi Global yang dipakai semua halaman)
   ====================================================================== */

function getDatabasePegawai() {
  // ID Spreadsheet Database Master Pegawai Boss
  var ID_DB = "160IjN8aiDAgDYXjgDLStS4nCZLKn3Ny-dq3BOFAfDrU"; 
  var SHEET_NAME = "Database";

  try {
    var ss = SpreadsheetApp.openById(ID_DB);
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    // Jika sheet tidak ditemukan, kembalikan array kosong
    if (!sheet) return [];
    
    var data = sheet.getDataRange().getDisplayValues();
    var result = [];

    // Loop mulai baris ke-2 (Index 1) untuk melewati Header Excel
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      
      // Validasi: Skip jika NIP atau Nama kosong
      if (!row[1] || !row[2]) continue; 

      result.push({
        unit: String(row[0]).trim(), // Kolom A: Unit Kerja
        nip:  String(row[1]).trim(), // Kolom B: NIP
        nama: String(row[2]).trim()  // Kolom C: Nama ASN
      });
    }
    
    // Urutkan berdasarkan Nama (A-Z) agar rapi di dropdown
    result.sort(function(a, b) {
      var nA = a.nama.toUpperCase();
      var nB = b.nama.toUpperCase();
      return (nA < nB) ? -1 : (nA > nB) ? 1 : 0;
    });

    return result;

  } catch (e) {
    console.error("Error Database Pegawai: " + e.message);
    return [];
  }
}