const XLSX = require('xlsx');

function analyzeIntegraDifferences() {
  console.log("🔍 Analizando diferencias específicas en INTEGRA...");
  
  try {
    // Cargar archivos
    const baseWB = XLSX.readFile("Guía Libro Azul Julio 25.xls");
    const refWB = XLSX.readFile("GuiaEBC_Marzo2025 v1.xlsx");
    
    const baseRaw = XLSX.utils.sheet_to_json(
      baseWB.Sheets[baseWB.SheetNames[0]],
      { header: 1, defval: "", blankrows: false }
    );
    
    const refRaw = XLSX.utils.sheet_to_json(
      refWB.Sheets[refWB.SheetNames[0]],
      { header: 1, defval: "", blankrows: false }
    );
    
    // Funciones del worker
    const normalizeCell = (value) => {
      if (value === null || value === undefined) return "";
      let normalized = String(value).toLowerCase().trim();
      normalized = normalized.replace(/[\$,]/g, "");
      normalized = normalized.replace(/\s+/g, " ").trim();
      const num = parseFloat(normalized);
      return !isNaN(num) && num.toString() === normalized ? num.toString() : normalized;
    };
    
    const getKey = (row) => {
      if (!Array.isArray(row) || row.length === 0) return "invalid|invalid|invalid";
      const type = normalizeCell(row[0]);
      const rawYear = normalizeCell(row[row.length - 1]);
      const year = rawYear && rawYear !== "0" ? rawYear : "_";
      const version = row[2] ? String(row[2]).trim().replace(/\s+/g, " ").toLowerCase() : "";
      return `${type}|${year}|${version}`;
    };
    
    function parseYearAndNote(text) {
      const strText = String(text || "").trim();
      const match = strText.match(/\b(19|20)\d{2}\b/);
      if (!match) return { year: 0, note: strText };
      const year = Number(match[0]);
      const note = strText.replace(match[0], "").trim();
      return { year, note };
    }
    
    function preprocessDataWithYear(data) {
      if (!Array.isArray(data) || data.length === 0) return [];
      let currentYear = 0;
      const processed = [];
      const header = Array.isArray(data[0]) ? [...data[0], "AñoContexto"] : ["AñoContexto"];
      processed.push(header);
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row) || row.length < 3) continue;
        
        const tipo = Number(row[0]);
        if (tipo === 3 && row[2] != null) {
          const { year } = parseYearAndNote(row[2]);
          if (year) currentYear = year;
        }
        if (tipo === 4 && currentYear === 0) {
          const { year: inlineYear } = parseYearAndNote(row[2]);
          if (inlineYear) currentYear = inlineYear;
        }
        processed.push([...row, currentYear]);
      }
      return processed;
    }
    
    function normalizeData(data) {
      if (!Array.isArray(data) || data.length === 0) return data;
      const header = data[0];
      if (!Array.isArray(header)) return data;
      const tempIdx = header.findIndex((c) => String(c).toLowerCase().includes("temp"));
      if (tempIdx === -1) return data;
      return data.map((row) => Array.isArray(row) ? row.filter((_, i) => i !== tempIdx) : row);
    }
    
    // Procesar datos
    const cleanCurrent = normalizeData(preprocessDataWithYear(baseRaw));
    const cleanReference = normalizeData(preprocessDataWithYear(refRaw));
    
    // Buscar filas de INTEGRA específicamente
    console.log("\n🔍 Buscando filas de INTEGRA...");
    
    const integraBaseRows = [];
    const integraRefRows = [];
    
    // Buscar en archivo base
    for (let i = 1; i < cleanCurrent.length; i++) {
      const row = cleanCurrent[i];
      if (Array.isArray(row) && row[1] && String(row[1]).toLowerCase().includes("integra")) {
        integraBaseRows.push({ index: i, row: row, key: getKey(row) });
      }
    }
    
    // Buscar en archivo nuevo
    for (let i = 1; i < cleanReference.length; i++) {
      const row = cleanReference[i];
      if (Array.isArray(row) && row[1] && String(row[1]).toLowerCase().includes("integra")) {
        integraRefRows.push({ index: i, row: row, key: getKey(row) });
      }
    }
    
    console.log(`📊 Filas INTEGRA en base: ${integraBaseRows.length}`);
    console.log(`📊 Filas INTEGRA en nuevo: ${integraRefRows.length}`);
    
    // Mostrar las primeras filas de INTEGRA
    console.log("\n📋 PRIMERAS 10 FILAS INTEGRA - ARCHIVO BASE:");
    integraBaseRows.slice(0, 10).forEach((item, idx) => {
      console.log(`  ${idx + 1}. Fila ${item.index}: [${item.row.join(" | ")}]`);
      console.log(`     Key: "${item.key}"`);
    });
    
    console.log("\n📋 PRIMERAS 10 FILAS INTEGRA - ARCHIVO NUEVO:");
    integraRefRows.slice(0, 10).forEach((item, idx) => {
      console.log(`  ${idx + 1}. Fila ${item.index}: [${item.row.join(" | ")}]`);
      console.log(`     Key: "${item.key}"`);
    });
    
    // Comparar filas específicas
    console.log("\n🔍 COMPARANDO FILAS ESPECÍFICAS:");
    
    for (let i = 0; i < Math.min(integraBaseRows.length, integraRefRows.length); i++) {
      const baseItem = integraBaseRows[i];
      const refItem = integraRefRows[i];
      
      console.log(`\n📊 Comparando fila ${i + 1}:`);
      console.log(`  Base: [${baseItem.row.join(" | ")}]`);
      console.log(`  Nuevo: [${refItem.row.join(" | ")}]`);
      
      // Comparar cada columna
      for (let col = 0; col < 5; col++) {
        const baseVal = normalizeCell(baseItem.row[col]);
        const refVal = normalizeCell(refItem.row[col]);
        
        if (baseVal !== refVal) {
          console.log(`  🔴 DIFERENCIA en col ${col}: base="${baseVal}" vs nuevo="${refVal}"`);
        } else {
          console.log(`  ✅ IGUAL en col ${col}: "${baseVal}"`);
        }
      }
    }
    
    // Verificar si hay problemas con la normalización
    console.log("\n🔍 VERIFICANDO NORMALIZACIÓN:");
    const testValues = ["2025 INTEGRA", "2025 INTEGRA ", " 2025 INTEGRA", "2025  INTEGRA"];
    testValues.forEach(val => {
      const normalized = normalizeCell(val);
      console.log(`  "${val}" -> "${normalized}"`);
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

analyzeIntegraDifferences(); 