// Script de diagnóstico para entender el problema de comparación
const fs = require('fs');
const XLSX = require('xlsx');

console.log("🔍 DIAGNÓSTICO DE COMPARACIÓN");
console.log("==============================");

// Función para analizar datos
function analyzeData(data, name) {
  console.log(`\n📊 ANÁLISIS DE ${name}:`);
  console.log(`Total filas: ${data.length}`);
  
  if (data.length === 0) {
    console.log("❌ No hay datos");
    return;
  }
  
  // Analizar header
  const header = data[0];
  console.log(`Header: [${header.join(', ')}]`);
  
  // Contar tipos
  const typeCounts = {};
  const modelNames = new Set();
  const duplicateModels = new Set();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    const tipo = String(row[0] || '');
    typeCounts[tipo] = (typeCounts[tipo] || 0) + 1;
    
    // Buscar nombres de modelos
    if (row[1] && String(row[1]).includes('MDX')) {
      const modelName = String(row[1]).trim();
      if (modelNames.has(modelName)) {
        duplicateModels.add(modelName);
      }
      modelNames.add(modelName);
    }
  }
  
  console.log("Distribución de tipos:");
  Object.entries(typeCounts).forEach(([tipo, count]) => {
    console.log(`  Tipo ${tipo}: ${count} filas`);
  });
  
  console.log(`Modelos MDX encontrados: ${modelNames.size}`);
  modelNames.forEach(model => {
    console.log(`  - "${model}"`);
  });
  
  if (duplicateModels.size > 0) {
    console.log("⚠️ DUPLICADOS DETECTADOS:");
    duplicateModels.forEach(model => {
      console.log(`  - "${model}"`);
    });
  }
  
  // Buscar filas problemáticas
  console.log("\n🔍 Buscando filas problemáticas:");
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length < 5) continue;
    
    const tipo = String(row[0] || '');
    const modelo = String(row[1] || '');
    const clase = String(row[2] || '');
    const precio1 = String(row[3] || '');
    const precio2 = String(row[4] || '');
    
    // Detectar problemas
    if (modelo.includes('5rpe S') || modelo.includes('5pe S')) {
      console.log(`  Fila ${i}: NOMBRE TRUNCADO - "${modelo}"`);
    }
    
    if (tipo === '4' && clase === '') {
      console.log(`  Fila ${i}: CLASE FALTANTE para Tipo 4 - "${modelo}"`);
    }
    
    if (precio1 && precio2 && precio1 !== '0' && precio2 !== '0') {
      const p1 = parseFloat(precio1);
      const p2 = parseFloat(precio2);
      if (!isNaN(p1) && !isNaN(p2) && p1 <= p2) {
        console.log(`  Fila ${i}: PRECIO INVÁLIDO - ${p1} <= ${p2} - "${modelo}"`);
      }
    }
  }
}

// Función para simular el procesamiento del worker
function simulateWorkerProcessing(data) {
  console.log("\n🔄 SIMULANDO PROCESAMIENTO DEL WORKER:");
  
  // Normalizar datos
  const normalized = data.map(row => 
    Array.isArray(row) ? row.map(cell => {
      if (cell === null || cell === undefined) return "";
      let normalized = String(cell).toLowerCase().trim();
      normalized = normalized.replace(/[\$,]/g, "");
      normalized = normalized.replace(/\s+/g, " ").trim();
      const num = parseFloat(normalized);
      return !isNaN(num) && num.toString() === normalized ? num.toString() : normalized;
    }) : row
  );
  
  console.log("✅ Datos normalizados");
  
  // Generar claves
  const keys = new Map();
  const seenKeys = new Set();
  const duplicates = new Set();
  
  for (let i = 1; i < normalized.length; i++) {
    const row = normalized[i];
    if (!Array.isArray(row) || row.length === 0) continue;
    
    const type = row[0];
    const year = row[row.length - 1] && row[row.length - 1] !== "0" ? row[row.length - 1] : "_";
    const version = row[1] ? String(row[1]).trim() : "";
    
    const key = `${type}|${year}|${version}`;
    
    if (seenKeys.has(key)) {
      duplicates.add(key);
    }
    seenKeys.add(key);
    keys.set(i, key);
    
    if (version.includes('mdx')) {
      console.log(`  Fila ${i}: Key="${key}" -> Modelo="${version}"`);
    }
  }
  
  if (duplicates.size > 0) {
    console.log("⚠️ CLAVES DUPLICADAS ENTRES ARCHIVOS:");
    duplicates.forEach(key => {
      console.log(`  - "${key}"`);
    });
  }
  
  return { normalized, keys, duplicates };
}

// Función principal
function main() {
  try {
    // Verificar si existen archivos de prueba
    const files = ['test_base.xlsx', 'test_new.xlsx'];
    const existingFiles = files.filter(f => fs.existsSync(f));
    
    if (existingFiles.length === 0) {
      console.log("❌ No se encontraron archivos de prueba");
      console.log("Por favor, coloca archivos llamados 'test_base.xlsx' y 'test_new.xlsx' en este directorio");
      return;
    }
    
    console.log(`📁 Archivos encontrados: ${existingFiles.join(', ')}`);
    
    // Leer archivos
    const baseData = existingFiles.includes('test_base.xlsx') ? 
      XLSX.readFile('test_base.xlsx') : null;
    const newData = existingFiles.includes('test_new.xlsx') ? 
      XLSX.readFile('test_new.xlsx') : null;
    
    if (baseData) {
      const baseSheet = XLSX.utils.sheet_to_json(baseData.Sheets[baseData.SheetNames[0]], { header: 1, defval: '', blankrows: false });
      analyzeData(baseSheet, 'ARCHIVO BASE');
      simulateWorkerProcessing(baseSheet);
    }
    
    if (newData) {
      const newSheet = XLSX.utils.sheet_to_json(newData.Sheets[newData.SheetNames[0]], { header: 1, defval: '', blankrows: false });
      analyzeData(newSheet, 'ARCHIVO NUEVO');
      simulateWorkerProcessing(newSheet);
    }
    
    console.log("\n✅ Diagnóstico completado");
    
  } catch (error) {
    console.error("❌ Error en diagnóstico:", error);
  }
}

main();
