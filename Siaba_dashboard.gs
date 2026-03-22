/* ======================================================================
   DASHBOARD SIABA: V2 CLEAN & OPTIMIZED
   ====================================================================== */

// 1. CONFIG ID DATABASE TERPUSAT
var DASH_DB_ID = {
  CUTI:  "1UYG80gGxuC19ieaVBzJaUV8bhlS2q5gExr0-Yl7upKo",
  DINAS: "1I_2yUFGXnBJTCSW6oaT3D482YCs8TIRkKgQVBbvpa1M",
  LUPA:  "160IjN8aiDAgDYXjgDLStS4nCZLKn3Ny-dq3BOFAfDrU",
  SALAH: "1TZGrMiTuyvh2Xbo44RhJuWlQnOC5LzClsgIoNKtRFkY",
  REKAP: "1tQsQY1-Ny1ie66GOZPTLtvZ7BiYCgFdNrX-AVGCtaHA"
};

// 2. HELPER PARSER TANGGAL (Ringan & Cepat)
function dashParseDateIso(v) {
  if(!v) return null;
  if(v instanceof Date) return v;
  var s = String(v).trim().replace(/'/g,'');
  var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(m) return new Date(m[3], m[2]-1, m[1]);
  return new Date(s);
}

// 3. API: AMBIL DATA METRIK & TREN PER MODUL
function getSiabaMetric(type) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "metric_v2_final_" + type;
  var cached = cache.get(cacheKey);
  if (cached) return cached;

  var now = new Date();
  var curYear = now.getFullYear();
  var curMonth = now.getMonth();

  var config = {};
  if (type == 'cuti')  config = { id: DASH_DB_ID.CUTI,  tab: "Form Cuti",        idxTgl: 4, idxStat: 10 };
  if (type == 'dinas') config = { id: DASH_DB_ID.DINAS, tab: "Perjalanan_Dinas", idxTgl: 3, idxStat: 9 };
  if (type == 'lupa')  config = { id: DASH_DB_ID.LUPA,  tab: "Lupa_Presensi",    idxTgl: 3, idxStat: 10 };
  if (type == 'salah') config = { id: DASH_DB_ID.SALAH, tab: "Salah_Presensi",   idxTgl: 3, idxStat: 8 };

  var res = {
    type: type,
    total: 0, 
    bulanIni: 0,
    proses: 0, revisi: 0, setuju: 0, tolak: 0, 
    trend: { 
      proses: new Array(12).fill(0),
      revisi: new Array(12).fill(0),
      setuju: new Array(12).fill(0),
      tolak:  new Array(12).fill(0)
    }
  };

  try {
    var ss = SpreadsheetApp.openById(config.id);
    var sh = ss.getSheetByName(config.tab);
    if (sh) {
      var data = sh.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var tgl = dashParseDateIso(row[config.idxTgl]);
        
        if (!tgl || tgl.getFullYear() !== curYear) continue;

        var bln = tgl.getMonth();
        var st = String(row[config.idxStat]||"").toLowerCase();

        res.total++;
        if (bln === curMonth) res.bulanIni++;

        if (st.includes("setuju") || st.includes("ok") || st.includes("disetujui") || st.includes("acc")) {
          res.setuju++; res.trend.setuju[bln]++;
        } else if (st.includes("tolak") || st.includes("tidak")) {
          res.tolak++; res.trend.tolak[bln]++;
        } else if (st.includes("revisi") || st.includes("ubah")) {
          res.revisi++; res.trend.revisi[bln]++;
        } else {
          res.proses++; res.trend.proses[bln]++;
        }
      }
    }
  } catch (e) { res.error = e.message; }

  var json = JSON.stringify(res);
  cache.put(cacheKey, json, 120); 
  return json;
}

// 4. API: AMBIL DATA GRAFIK KEDISIPLINAN (Dari File Rekap)
function getSiabaChartTrend() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("chart_trend_v2_final");
  if (cached) return cached;

  var curYear = new Date().getFullYear();
  var res = {
    labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"],
    terlambat: new Array(12).fill(0),
    pulangAwal: new Array(12).fill(0)
  };

  try {
    var ss = SpreadsheetApp.openById(DASH_DB_ID.REKAP);
    ["Rekap_Terlambat", "Rekap_Pulang_Awal"].forEach(function(nm) {
      var sh = ss.getSheetByName(nm);
      if (sh) {
        var data = sh.getDataRange().getDisplayValues();
        var key = nm.includes("Terlambat") ? "terlambat" : "pulangAwal";
        for (var i = 2; i < data.length; i++) {
          if (String(data[i][0]).trim() == curYear) {
            for (var m = 0; m < 12; m++) {
              res[key][m] += (parseInt(data[i][4 + (m * 2)]) || 0);
            }
          }
        }
      }
    });
  } catch (e) {}

  var json = JSON.stringify(res);
  cache.put("chart_trend_v2_final", json, 300);
  return json;
}