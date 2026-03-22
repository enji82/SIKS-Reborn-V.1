function paksaIzin() {
  // Kita pakai fungsi DriveApp karena izinnya lebih kuat & memicu popup
  var files = DriveApp.getFiles();
  console.log("Izin Drive OK");

  var ss = SpreadsheetApp.create("Tes Spreadsheet Baru");
  console.log("Izin Spreadsheet OK. ID Baru: " + ss.getId());
}