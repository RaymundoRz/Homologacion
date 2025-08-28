const XLSX = require('xlsx');

function inspectFileStructure() {
  console.log("🔍 Inspeccionando estructura de archivos...");
  
  try {
    // Cargar archivos
    const baseWB = XLSX.readFile("Guía Libro Azul Julio 25.xls");
    const refWB = XLSX.readFile("GuiaEBC_Marzo2025 v1.xlsx");
    
    console.log("\n📊 ARCHIVO BASE:");
    console.log(`  Hojas: ${baseWB.SheetNames.join(", ")}`);
    
    const baseSheet = baseWB.Sheets[baseWB.SheetNames[0]];
    const baseRange = XLSX.utils.decode_range(baseSheet['!ref']);
    console.log(`  Rango: ${baseSheet['!ref']}`);
    console.log(`  Filas: ${baseRange.e.r + 1}`);
    console.log(`  Columnas: ${baseRange.e.c + 1}`);
    
    // Mostrar primeras 10 filas
    const baseRaw = XLSX.utils.sheet_to_json(baseSheet, { header: 1, defval: "", blankrows: false });
    console.log("\n📋 PRIMERAS 10 FILAS DEL ARCHIVO BASE:");
    baseRaw.slice(0, 10).forEach((row, idx) => {
      console.log(`  ${idx + 1}: [${Array.isArray(row) ? row.join(" | ") : row}]`);
    });
    
    console.log("\n📊 ARCHIVO NUEVO:");
    console.log(`  Hojas: ${refWB.SheetNames.join(", ")}`);
    
    const refSheet = refWB.Sheets[refWB.SheetNames[0]];
    const refRange = XLSX.utils.decode_range(refSheet['!ref']);
    console.log(`  Rango: ${refSheet['!ref']}`);
    console.log(`  Filas: ${refRange.e.r + 1}`);
    console.log(`  Columnas: ${refRange.e.c + 1}`);
    
    // Mostrar primeras 10 filas
    const refRaw = XLSX.utils.sheet_to_json(refSheet, { header: 1, defval: "", blankrows: false });
    console.log("\n📋 PRIMERAS 10 FILAS DEL ARCHIVO NUEVO:");
    refRaw.slice(0, 10).forEach((row, idx) => {
      console.log(`  ${idx + 1}: [${Array.isArray(row) ? row.join(" | ") : row}]`);
    });
    
    // Buscar patrones en los datos
    console.log("\n🔍 BUSCANDO PATRONES:");
    
    // Buscar en archivo base
    const basePatterns = new Set();
    for (let i = 1; i < Math.min(100, baseRaw.length); i++) {
      const row = baseRaw[i];
      if (Array.isArray(row) && row.length > 1) {
        const tipo = row[0];
        const clase = row[1];
        if (tipo && clase) {
          basePatterns.add(`Tipo: ${tipo}, Clase: ${clase}`);
        }
      }
    }
    
    // Buscar en archivo nuevo
    const refPatterns = new Set();
    for (let i = 1; i < Math.min(100, refRaw.length); i++) {
      const row = refRaw[i];
      if (Array.isArray(row) && row.length > 1) {
        const tipo = row[0];
        const clase = row[1];
        if (tipo && clase) {
          refPatterns.add(`Tipo: ${tipo}, Clase: ${clase}`);
        }
      }
    }
    
    console.log("\n📊 PATRONES EN ARCHIVO BASE (primeras 100 filas):");
    Array.from(basePatterns).slice(0, 10).forEach(pattern => {
      console.log(`  - ${pattern}`);
    });
    
    console.log("\n📊 PATRONES EN ARCHIVO NUEVO (primeras 100 filas):");
    Array.from(refPatterns).slice(0, 10).forEach(pattern => {
      console.log(`  - ${pattern}`);
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

inspectFileStructure(); 