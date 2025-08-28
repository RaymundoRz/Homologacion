const XLSX = require('xlsx');

console.log('🔍 ANÁLISIS DETALLADO DE LA LÓGICA DE COMPARACIÓN...');

// Función para normalizar celdas (EXACTA COMO EN EL WORKER)
const normalizeCell = (value) => {
  if (value === null || value === undefined) return "";
  let normalized = String(value).toLowerCase().trim();
  normalized = normalized.replace(/[\$,]/g, "");
  normalized = normalized.replace(/\s+/g, " ").trim();
  const num = parseFloat(normalized);
  return !isNaN(num) && num.toString() === normalized ? num.toString() : normalized;
};

// Función para obtener clave (EXACTA COMO EN EL WORKER)
const getKey = (row) => {
  if (!Array.isArray(row) || row.length === 0) return "invalid|invalid|invalid";

  const type    = normalizeCell(row[0]);
  const rawYear = normalizeCell(row[row.length - 1]);    // siempre última col
  const year    = rawYear && rawYear !== "0" ? rawYear : "_";
  const version = row[2]
    ? String(row[2]).trim().replace(/\s+/g, " ").toLowerCase()
    : "";

  return `${type}|${year}|${version}`;
};

// Función para procesar datos con año (EXACTA COMO EN EL WORKER)
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
      const yearMatch = row[2].match(/(\d{4})/);
      if (yearMatch) currentYear = Number(yearMatch[1]);
    }

    if (tipo === 4 && currentYear === 0) {
      const yearMatch = row[2] ? row[2].match(/(\d{4})/) : null;
      if (yearMatch) currentYear = Number(yearMatch[1]);
    }

    processed.push([...row, currentYear]);
  }
  return processed;
}

// Función para normalizar datos (EXACTA COMO EN EL WORKER)
function normalizeData(data) {
  if (!Array.isArray(data) || data.length === 0) return data;
  const header = data[0];
  if (!Array.isArray(header)) return data;
  const tempIdx = header.findIndex((c) => String(c).toLowerCase().includes("temp"));
  if (tempIdx === -1) return data;

  return data.map((row) =>
    Array.isArray(row) ? row.filter((_, i) => i !== tempIdx) : row
  );
}

// SIMULACIÓN DE LA LÓGICA DE COMPARACIÓN
try {
  console.log('🔍 CARGANDO ARCHIVOS PARA ANÁLISIS...');
  
  // Cargar archivo base
  const baseWorkbook = XLSX.readFile('Guía Libro Azul Julio 25.xls');
  const baseSheetName = baseWorkbook.SheetNames[0];
  const baseRaw = XLSX.utils.sheet_to_json(baseWorkbook.Sheets[baseSheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });
  
  // Cargar archivo nuevo
  const newWorkbook = XLSX.readFile('GuiaEBC_Marzo2025 v1.xlsx');
  const newSheetName = newWorkbook.SheetNames[0];
  const newRaw = XLSX.utils.sheet_to_json(newWorkbook.Sheets[newSheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });

  console.log(`📊 DATOS BASE: ${baseRaw.length} filas`);
  console.log(`📊 DATOS NUEVO: ${newRaw.length} filas`);

  // Procesar datos base
  const cleanBase = normalizeData(preprocessDataWithYear(baseRaw));
  console.log(`📊 DATOS BASE PROCESADOS: ${cleanBase.length} filas`);

  // Procesar datos nuevo
  const cleanNew = normalizeData(preprocessDataWithYear(newRaw));
  console.log(`📊 DATOS NUEVO PROCESADOS: ${cleanNew.length} filas`);

  // Crear map de referencia (EXACTA COMO EN EL WORKER)
  const referenceVersions = new Map();
  const mapByVersion = new Map();

  cleanNew.slice(1).forEach((row) => {
    if (!Array.isArray(row)) return;

    const kFull = getKey(row);
    if (kFull === "invalid|invalid|invalid") return;

    const kNoYear = kFull.replace(/\|[^|]*\|/, "||");

    referenceVersions.set(kFull, row);
    mapByVersion.set(kNoYear, row);
  });

  console.log(`📊 MAPA DE REFERENCIA: ${referenceVersions.size} entradas`);
  console.log(`📊 MAPA SIN AÑO: ${mapByVersion.size} entradas`);

  // SIMULAR COMPARACIÓN (EXACTA COMO EN EL WORKER)
  const COLS = 5;
  const differenceSet = new Set();
  let totalComparisons = 0;
  let totalDifferences = 0;
  let noMatchCount = 0;

  console.log(`\n🔍 INICIANDO COMPARACIÓN DETALLADA...`);

  for (let i = 1; i < cleanBase.length; i++) {
    const baseRow = cleanBase[i];
    if (!Array.isArray(baseRow)) continue;

    const keyFull = getKey(baseRow);
    if (keyFull === "invalid|invalid|invalid") continue;

    const keyNoYear = keyFull.replace(/\|[^|]*\|/, "||");

    let refRow = referenceVersions.get(keyFull);
    if (!refRow) refRow = mapByVersion.get(keyNoYear);

    if (!refRow) {
      noMatchCount++;
      console.log(`❌ Row ${i - 1}: NO match para key="${keyFull}" ni "${keyNoYear}"`);
      continue;
    }

    // Comparar columnas 0..4
    for (let j = 0; j < COLS; j++) {
      totalComparisons++;
      const baseValNorm = normalizeCell(baseRow[j]);
      const refValNorm = refRow && j < refRow.length ? normalizeCell(refRow[j]) : "";

      const isDifferent = !(baseValNorm === "" && refValNorm === "") && baseValNorm !== refValNorm;

      if (isDifferent) {
        totalDifferences++;
        differenceSet.add(`${i - 1}:${j}`);
        console.log(`🔴 DIFERENCIA: Row ${i - 1} / Col ${j} -> base:"${baseValNorm}" vs ref:"${refValNorm}"`);
      } else {
        console.log(`✅ IGUAL: Row ${i - 1} / Col ${j} -> base:"${baseValNorm}" vs ref:"${refValNorm}"`);
      }
    }
  }

  console.log(`\n📊 RESUMEN DE COMPARACIÓN:`);
  console.log(`  - Total comparaciones: ${totalComparisons}`);
  console.log(`  - Total diferencias encontradas: ${totalDifferences}`);
  console.log(`  - Filas sin match: ${noMatchCount}`);
  console.log(`  - Coordenadas únicas con diferencias: ${differenceSet.size}`);

  // Mostrar algunas diferencias específicas
  console.log(`\n🔍 PRIMERAS 10 DIFERENCIAS:`);
  const differencesArray = Array.from(differenceSet);
  differencesArray.slice(0, 10).forEach((coord, index) => {
    const [rowIndex, colIndex] = coord.split(':').map(Number);
    const baseRow = cleanBase[rowIndex + 1];
    const refRow = referenceVersions.get(getKey(baseRow)) || mapByVersion.get(getKey(baseRow).replace(/\|[^|]*\|/, "||"));
    
    if (baseRow && refRow) {
      const baseVal = baseRow[colIndex];
      const refVal = refRow[colIndex];
      console.log(`  ${index + 1}. Coord: ${coord} -> Base:"${baseVal}" vs Ref:"${refVal}"`);
    }
  });

  // Verificar si hay problemas con la normalización
  console.log(`\n🔍 ANÁLISIS DE NORMALIZACIÓN:`);
  console.log(`  - Ejemplo 1: "2020 ILX" -> "${normalizeCell("2020 ILX")}"`);
  console.log(`  - Ejemplo 2: "2020 ILX " -> "${normalizeCell("2020 ILX ")}"`);
  console.log(`  - Ejemplo 3: " 2020 ILX " -> "${normalizeCell(" 2020 ILX ")}"`);
  console.log(`  - Ejemplo 4: "2020 ILX Unidades Nuevas" -> "${normalizeCell("2020 ILX Unidades Nuevas")}"`);

  // Verificar claves generadas
  console.log(`\n🔍 ANÁLISIS DE CLAVES:`);
  const sampleBaseRows = cleanBase.slice(1, 6);
  sampleBaseRows.forEach((row, index) => {
    const key = getKey(row);
    console.log(`  ${index + 1}. Row ${index}: "${row[2]}" -> Key: "${key}"`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
} 