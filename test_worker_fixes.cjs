// Script para probar las correcciones del worker
const fs = require('fs');
const XLSX = require('xlsx');

console.log("🧪 PROBANDO CORRECCIONES DEL WORKER");
console.log("===================================");

// Simular las funciones del worker corregido
function normalizeCell(value) {
  if (value === null || value === undefined) return "";
  let normalized = String(value).toLowerCase().trim();
  normalized = normalized.replace(/[\$,]/g, "");
  normalized = normalized.replace(/\s+/g, " ").trim();
  const num = parseFloat(normalized);
  return !isNaN(num) && num.toString() === normalized ? num.toString() : normalized;
}

function getKey(row) {
  if (!Array.isArray(row) || row.length === 0) return "invalid|invalid|invalid";

  const type    = normalizeCell(row[0]);
  const rawYear = normalizeCell(row[row.length - 1]);
  const year    = rawYear && rawYear !== "0" && rawYear !== "" ? rawYear : "_";
  
  const version = row[2] ? String(row[2]).trim() : ""; // Columna 2 para modelos
  const uniqueKey = `${type}|${year}|${version}`;
  
  if (version.includes('MDX') || version.includes('5rpe')) {
    console.log(`🔑 Key generada: "${uniqueKey}" -> Modelo: "${version}"`);
  }
  
  return uniqueKey;
}

function detectErrors(data, filename) {
  console.log(`\n🔍 DETECTANDO ERRORES EN ${filename}:`);
  console.log("=" .repeat(50));
  
  const seenKeys = new Set();
  const errors = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row) || row.length < 5) continue;
    
    const tipo = String(row[0] || "");
    const modelo = String(row[2] || ""); // Columna 2 para modelos
    const clase = String(row[1] || "");  // Columna 1 para clase
    const precio1 = String(row[3] || "");
    const precio2 = String(row[4] || "");
    
    const key = getKey(row);
    
    // 1. Detectar duplicados
    if (seenKeys.has(key)) {
      errors.push(`Fila ${i}: DUPLICADO - "${modelo}" (Key: ${key})`);
    }
    seenKeys.add(key);
    
    // 2. Detectar nombres truncados
    if (modelo.includes("5rpe S") || modelo.includes("5pe S")) {
      errors.push(`Fila ${i}: NOMBRE TRUNCADO - "${modelo}"`);
    }
    
    // 3. Detectar clase faltante para Tipo 4
    if (tipo === "4" && clase === "") {
      errors.push(`Fila ${i}: CLASE FALTANTE PARA TIPO 4 - "${modelo}"`);
    }
    
    // 4. Detectar precios inválidos
    if (precio1 && precio2 && precio1 !== "0" && precio2 !== "0") {
      const p1 = parseFloat(precio1);
      const p2 = parseFloat(precio2);
      if (!isNaN(p1) && !isNaN(p2) && p1 <= p2) {
        errors.push(`Fila ${i}: PRECIO INVÁLIDO - ${p1} <= ${p2} - "${modelo}"`);
      }
    }
  }
  
  if (errors.length === 0) {
    console.log("✅ No se detectaron errores");
  } else {
    console.log(`❌ ${errors.length} errores detectados:`);
    errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return errors;
}

// Función principal
function main() {
  try {
    // Leer archivos de prueba
    const baseData = XLSX.readFile('test_base.xlsx');
    const newData = XLSX.readFile('test_new.xlsx');
    
    const baseSheet = XLSX.utils.sheet_to_json(baseData.Sheets[baseData.SheetNames[0]], { header: 1, defval: '', blankrows: false });
    const newSheet = XLSX.utils.sheet_to_json(newData.Sheets[newData.SheetNames[0]], { header: 1, defval: '', blankrows: false });
    
    console.log(`📁 Archivos cargados: test_base.xlsx (${baseSheet.length} filas), test_new.xlsx (${newSheet.length} filas)`);
    
    // Probar detección de errores
    const baseErrors = detectErrors(baseSheet, 'ARCHIVO BASE');
    const newErrors = detectErrors(newSheet, 'ARCHIVO NUEVO');
    
    // Resumen
    console.log("\n📊 RESUMEN DE PRUEBAS:");
    console.log("=" .repeat(50));
    console.log(`Archivo Base: ${baseErrors.length} errores (esperado: 0)`);
    console.log(`Archivo Nuevo: ${newErrors.length} errores (esperado: 4)`);
    
    // Verificar que se detectaron los errores esperados
    const expectedErrors = [
      'DUPLICADO',
      'NOMBRE TRUNCADO', 
      'PRECIO INVÁLIDO',
      'CLASE FALTANTE'
    ];
    
    const detectedErrorTypes = newErrors.map(e => {
      if (e.includes('DUPLICADO')) return 'DUPLICADO';
      if (e.includes('NOMBRE TRUNCADO')) return 'NOMBRE TRUNCADO';
      if (e.includes('PRECIO INVÁLIDO')) return 'PRECIO INVÁLIDO';
      if (e.includes('CLASE FALTANTE')) return 'CLASE FALTANTE';
      return 'OTRO';
    });
    
    console.log("\n✅ VERIFICACIÓN DE ERRORES ESPERADOS:");
    expectedErrors.forEach(expected => {
      const detected = detectedErrorTypes.includes(expected);
      console.log(`${detected ? '✅' : '❌'} ${expected}: ${detected ? 'DETECTADO' : 'NO DETECTADO'}`);
    });
    
    console.log("\n🎯 RESULTADO:");
    if (baseErrors.length === 0 && newErrors.length >= 3) {
      console.log("✅ CORRECCIONES FUNCIONANDO CORRECTAMENTE");
    } else {
      console.log("❌ AÚN HAY PROBLEMAS QUE CORREGIR");
    }
    
  } catch (error) {
    console.error("❌ Error en prueba:", error);
  }
}

main();
