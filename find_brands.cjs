const XLSX = require('xlsx');

function findBrands() {
  console.log("🔍 Buscando todas las marcas en los archivos...");
  
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
    
    // Buscar marcas en archivo base
    const baseBrands = new Set();
    for (let i = 1; i < baseRaw.length; i++) {
      const row = baseRaw[i];
      if (Array.isArray(row) && row[1] && String(row[1]).trim()) {
        const brand = String(row[1]).trim().toUpperCase();
        if (brand && brand !== "") {
          baseBrands.add(brand);
        }
      }
    }
    
    // Buscar marcas en archivo nuevo
    const refBrands = new Set();
    for (let i = 1; i < refRaw.length; i++) {
      const row = refRaw[i];
      if (Array.isArray(row) && row[1] && String(row[1]).trim()) {
        const brand = String(row[1]).trim().toUpperCase();
        if (brand && brand !== "") {
          refBrands.add(brand);
        }
      }
    }
    
    console.log("\n📊 MARCAS EN ARCHIVO BASE:");
    Array.from(baseBrands).sort().forEach(brand => {
      console.log(`  - ${brand}`);
    });
    
    console.log("\n📊 MARCAS EN ARCHIVO NUEVO:");
    Array.from(refBrands).sort().forEach(brand => {
      console.log(`  - ${brand}`);
    });
    
    // Buscar diferencias
    const onlyInBase = Array.from(baseBrands).filter(b => !refBrands.has(b));
    const onlyInNew = Array.from(refBrands).filter(b => !baseBrands.has(b));
    
    console.log("\n🔍 DIFERENCIAS:");
    if (onlyInBase.length > 0) {
      console.log("  Solo en archivo base:");
      onlyInBase.forEach(brand => console.log(`    - ${brand}`));
    }
    
    if (onlyInNew.length > 0) {
      console.log("  Solo en archivo nuevo:");
      onlyInNew.forEach(brand => console.log(`    - ${brand}`));
    }
    
    // Buscar marcas similares
    console.log("\n🔍 BUSCANDO MARCAS SIMILARES:");
    const allBrands = new Set([...baseBrands, ...refBrands]);
    
    allBrands.forEach(brand => {
      const baseHas = baseBrands.has(brand);
      const refHas = refBrands.has(brand);
      
      if (baseHas && refHas) {
        console.log(`  ✅ ${brand} - En ambos archivos`);
      } else if (baseHas) {
        console.log(`  🔴 ${brand} - Solo en base`);
      } else {
        console.log(`  🟢 ${brand} - Solo en nuevo`);
      }
    });
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

findBrands(); 