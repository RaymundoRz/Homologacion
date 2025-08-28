/*  public/comparisonWorker.js (v11-fix + fallback 2025-04-21)
   -----------------------------------------------------------
   - normaliza mejor las celdas
   - añade año de contexto robusto
   - usa '_' cuando falta año
   - incluye Map secundario sin año (mapByVersion) y fallback
   --------------------------------------------------------- */

/* =========================================================
 * CARGA DE XLSX EN EL WORKER
 * =======================================================*/
try {
  importScripts(
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
  );
  // Log de versión del worker para confirmar carga
  console.log(`Worker cargado en: ${new Date().toISOString()}`);
  console.log(`🔧 VERSIÓN WORKER: v16 - CON NORMALIZACIÓN ROBUSTA Y FALLBACK`);
  console.log(`🚨 WORKER ACTUALIZADO - BUSCAR ESTE MENSAJE EN CONSOLA`);
  console.log(`🚨🚨🚨 WORKER v16 CARGADO CORRECTAMENTE - VERSIÓN CON NORMALIZACIÓN ROBUSTA Y FALLBACK 🚨🚨🚨`);
  
  // Función temporal para guardar logs en archivo
  function saveLog(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    // Enviar log al componente principal para guardarlo
    self.postMessage({ 
      type: 'LOG', 
      message: logEntry,
      timestamp: timestamp
    });
  }
  
  // Log directo para confirmar que el worker se cargó
  console.log('🚨 WORKER CARGADO - VERSIÓN v16 CON NORMALIZACIÓN ROBUSTA Y FALLBACK');
  console.log('🚨 BUSCAR ESTE MENSAJE EN LA CONSOLA DEL NAVEGADOR');
  
  // Sobrescribir console.log, console.warn y console.error para capturar todos los logs
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.log = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Guardar en archivo
    saveLog(`[LOG] ${message}`);
    
    // Mantener log original
    originalLog.apply(console, args);
  };
  
  console.warn = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Guardar en archivo
    saveLog(`[WARN] ${message}`);
    
    // Mantener log original
    originalWarn.apply(console, args);
  };
  
  console.error = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Guardar en archivo
    saveLog(`[ERROR] ${message}`);
    
    // Mantener log original
    originalError.apply(console, args);
  };
} catch (e) {
  console.error("Worker: Error al importar XLSX", e);
  self.postMessage({
    error: "No se pudo cargar la librería XLSX en el worker.",
  });
  self.close();
}

/* =========================================================
 * UTILIDADES
 * =======================================================*/
function parseYearAndNote(text) {
  const strText = String(text || "").trim();
  const match   = strText.match(/\b(19|20)\d{2}\b/);
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

  return data.map((row) =>
    Array.isArray(row) ? row.filter((_, i) => i !== tempIdx) : row
  );
}

const normalizeCell = (value) => {
  if (value === null || value === undefined) return "";
  let normalized = String(value).toLowerCase().trim();   // trim antes
  normalized = normalized.replace(/[\$,]/g, "");
  normalized = normalized.replace(/\s+/g, " ").trim();   // trim después
  const num = parseFloat(normalized);
  return !isNaN(num) && num.toString() === normalized ? num.toString() : normalized;
};

// Función robusta para normalizar precios a centavos (enteros)
function normalizePrice(priceStr) {
  if (!priceStr || priceStr === "") return "";
  
  // Convertir a string y limpiar
  let cleanPrice = String(priceStr).trim();
  
  // Log para debugging de precios específicos
  const shouldLog = cleanPrice.includes('899900') || cleanPrice.includes('939900') || 
                   cleanPrice.includes('722000') || cleanPrice.includes('754000');
  
  if (shouldLog) {
    console.log(`🔧 NORMALIZANDO PRECIO ORIGINAL: "${priceStr}"`);
  }
  
  // 1. ELIMINAR TODOS LOS ESPACIOS UNICODE Y SÍMBOLOS
  // Quitar espacios no-rompibles (\u00A0), espacios de ancho cero (\u2000-\u200B), etc.
  cleanPrice = cleanPrice.replace(/[\s\u00A0\u2000-\u200B]/g, '');
  
  // 2. ELIMINAR SÍMBOLOS DE MONEDA Y TEXTO
  // Quitar $, MXN, USD, —, N/A, %, etc. Solo dejar números, puntos, comas y signo negativo
  cleanPrice = cleanPrice.replace(/[^\d.,\-]/g, '');
  
  // 3. PRESERVAR SIGNO NEGATIVO
  let sign = 1;
  if (cleanPrice.startsWith('-')) { 
    sign = -1; 
    cleanPrice = cleanPrice.slice(1); 
  }
  
  // 4. DETECCIÓN INTELIGENTE DE DECIMALES Y MILES
  const hasDot = cleanPrice.includes('.');
  const hasComma = cleanPrice.includes(',');
  
  if (hasDot && hasComma) {
    // Caso: 1.234,56 o 1,234.56 - tomar el último como decimal
    const lastDot = cleanPrice.lastIndexOf('.');
    const lastComma = cleanPrice.lastIndexOf(',');
    
    if (lastDot > lastComma) {
      // Punto es decimal: 1,234.56 -> 1234.56
      cleanPrice = cleanPrice.replace(/,/g, '');
    } else {
      // Coma es decimal: 1.234,56 -> 1234.56
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    // Solo comas: decidir por heurística
    const parts = cleanPrice.split(',');
    const lastPart = parts[parts.length - 1];
    
    if (lastPart.length <= 2 && parts.length > 1) {
      // Último tramo de 1-2 dígitos: es decimal
      // Ej: 1,234,56 -> 1234.56
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    } else {
      // Último tramo de 3+ dígitos: son miles
      // Ej: 1,234 -> 1234
      cleanPrice = cleanPrice.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    // Solo puntos: detectar si son miles (1.234.567)
    const parts = cleanPrice.split('.');
    const last = parts[parts.length - 1];
    if (parts.length > 1 && last.length === 3) {
      // Es formato de miles, eliminar todos los puntos
      cleanPrice = cleanPrice.replace(/\./g, '');
    }
  }
  
  // 5. CONVERTIR A CENTAVOS (ENTERO)
  const cents = Math.round(parseFloat(cleanPrice) * 100);
  
  if (shouldLog) {
    console.log(`🔧 PRECIO NORMALIZADO: "${priceStr}" -> "${cleanPrice}" -> ${parseFloat(cleanPrice)} -> ${cents} centavos`);
  }
  
  return Number.isFinite(cents) ? String(cents * sign) : "";
}

// Función para validar si un precio es válido antes de comparar
function isValidPrice(priceStr) {
  const norm = normalizePrice(priceStr);
  return norm !== "" && Number.isFinite(parseInt(norm, 10));
}



const getKey = (row) => {
  if (!Array.isArray(row) || row.length === 0) return "invalid|invalid|invalid";

  const type    = normalizeCell(row[0]);
  
  // IMPORTANTE: Preservar exactamente el nombre del modelo para detectar diferencias
  const version = row[2]  // Usar columna 2 (Versiones)
    ? String(row[2]).trim()  // Solo trim, sin normalizar espacios ni mayúsculas
    : "";

  // Obtener año de contexto (última columna añadida por preprocessDataWithYear)
  const maybeYear = row[row.length - 1];
  const year = (typeof maybeYear === 'number' && maybeYear > 0) ? maybeYear : '_';

  // Crear clave única usando tipo, versión y año
  const uniqueKey = `${type}|${version}|${year}`;
  
  // Log para debugging
  if (version.includes('MDX') || version.includes('5rpe')) {
    console.log(`🔑 Key generada: "${uniqueKey}" -> Modelo: "${version}", Año: "${year}"`);
  }
  
  return uniqueKey;
};

/* =========================================================
 * WORKER – MANEJADOR DE MENSAJES
 * =======================================================*/
self.onmessage = function (event) {
  console.log("Worker: Mensaje recibido", { 
    hasXLSX: !!self.XLSX, 
    hasCurrent: !!event.data.currentFileContent, 
    hasReference: !!event.data.referenceFileContent 
  });
  
  const { currentFileContent, referenceFileContent } = event.data;
  
  if (!self.XLSX) {
    console.error("Worker: XLSX no disponible");
    self.postMessage({ error: "Librería XLSX no disponible en el worker" });
    return;
  }
  
  if (!currentFileContent || !referenceFileContent) {
    console.error("Worker: Contenido de archivos faltante", { 
      current: !!currentFileContent, 
      reference: !!referenceFileContent 
    });
    self.postMessage({ error: "Contenido de archivos faltante" });
    return;
  }

  let cleanCurrent = null;
  let differenceSet = new Set();
  let referenceVersions = new Map();   // Map con año
  let mapByVersion = new Map();        // Map de fallback solo por versión

  try {
    console.log("Worker: Iniciando procesamiento...");
    
    /* ------------ 1. Procesar ARCHIVO BASE ------------ */
    console.log("Worker: Procesando archivo base...");
    
    // Lectura robusta de archivos XLSX
    const asArray = (buf) => (buf instanceof ArrayBuffer || ArrayBuffer.isView(buf));
    const baseWB = XLSX.read(asArray(currentFileContent) ? new Uint8Array(currentFileContent) : currentFileContent,
      { type: asArray(currentFileContent) ? "array" : "binary", cellStyles:false, sheetStubs:true });
    
    if (asArray(currentFileContent)) {
      console.log("Worker: Detectado ArrayBuffer/Uint8Array para archivo base");
    } else {
      console.log("Worker: Detectado binaryString para archivo base");
    }
    console.log("Worker: Archivo base leído, hojas:", baseWB.SheetNames);
    
    const baseRaw = XLSX.utils.sheet_to_json(
                     baseWB.Sheets[baseWB.SheetNames[0]],
                     { header:1, defval:"", blankrows:false });
    console.log("Worker: Datos base extraídos, filas:", baseRaw.length);
    
    // Aplicar preprocessDataWithYear para añadir contexto de año
    const baseWithYear = preprocessDataWithYear(baseRaw);
    console.log("Worker: Año de contexto añadido al archivo base");
    
    cleanCurrent  = normalizeData(baseWithYear);
    console.log("Worker: Datos base procesados, filas:", cleanCurrent.length);

    /* ------------ 2. Procesar ARCHIVO NUEVO ----------- */
    console.log("Worker: Procesando archivo de referencia...");
    
    // Lectura robusta de archivos XLSX
    const refWB = XLSX.read(asArray(referenceFileContent) ? new Uint8Array(referenceFileContent) : referenceFileContent,
      { type: asArray(referenceFileContent) ? "array" : "binary", cellStyles:false, sheetStubs:true });
    
    if (asArray(referenceFileContent)) {
      console.log("Worker: Detectado ArrayBuffer/Uint8Array para archivo referencia");
    } else {
      console.log("Worker: Detectado binaryString para archivo referencia");
    }
    console.log("Worker: Archivo referencia leído, hojas:", refWB.SheetNames);
    
    const refRaw  = XLSX.utils.sheet_to_json(
                     refWB.Sheets[refWB.SheetNames[0]],
                     { header:1, defval:"", blankrows:false });
    console.log("Worker: Datos referencia extraídos, filas:", refRaw.length);
    
    // Aplicar preprocessDataWithYear para añadir contexto de año
    const refWithYear = preprocessDataWithYear(refRaw);
    console.log("Worker: Año de contexto añadido al archivo referencia");
    
    const cleanReference = normalizeData(refWithYear);
    console.log("Worker: Datos referencia procesados, filas:", cleanReference.length);

    /* --- Poblar Map de Referencia (datos originales) --- */
    const seenKeys = new Set();               // Para detectar duplicados

    cleanReference.slice(1).forEach((row) => {
      if (!Array.isArray(row)) return;

      const key = getKey(row);                // type|version
      if (key === "invalid|invalid|invalid") return;

      // Detectar duplicados en referencia
      if (seenKeys.has(key)) {
        console.log(`⚠️ DUPLICADO EN REFERENCIA: "${key}" -> "${row[2]}"`);
      }
      seenKeys.add(key);

      referenceVersions.set(key, row);        // Map con datos originales
      
      // Crear clave de fallback solo por versión (sin año)
      const v = row[2] ? String(row[2]).trim() : "";
      const prev = mapByVersion.get(v);
      const y = row[row.length - 1] || 0;
      
      // Conservar la versión de año más reciente
      if (!prev || (prev[prev.length - 1] || 0) < y) {
        mapByVersion.set(v, row);
      }
      
      // Log para verificar las claves generadas
      if (row[2] && String(row[2]).includes("MDX")) {
        console.log(`📋 Referencia Key: "${key}" -> "${row[2]}"`);
      }
    });
    /* cleanReference = null;   <-- si quieres liberar memoria */

    /* ------------ 3. Comparar fila a fila ------------- */
    console.log("Worker: Iniciando comparación...");
    // SIMULAR COMPARACIÓN (EXACTA COMO EN EL WORKER)
    const COLS = 5; // Comparar todas las columnas (tipo, modelo, configuración, precios, cantidades)
    let totalComparisons = 0;
    let totalDifferences = 0;
    let noMatchCount = 0;
    const seenBaseKeys = new Set(); // Para detectar duplicados en base

    for (let i = 1; i < cleanCurrent.length; i++) {
      const baseRow = cleanCurrent[i];
      if (!Array.isArray(baseRow)) continue;

      /* --- Obtener fila de referencia (datos originales) --- */
      const key = getKey(baseRow);
      if (key === "invalid|invalid|invalid") continue;

      // Detectar duplicados en archivo base
      if (seenBaseKeys.has(key)) {
        console.log(`⚠️ DUPLICADO EN BASE: "${key}" -> "${baseRow[2]}" (Row ${i - 1})`);
        // Marcar como error
        differenceSet.add(`${i - 1}:2`);  // Marcar columna 2 (Versiones)
      }
      seenBaseKeys.add(key);

      // Log para verificar las claves del archivo base
      if (baseRow[2] && String(baseRow[2]).includes("MDX")) {
        console.log(`🔍 Base Key: "${key}" -> "${baseRow[2]}"`);
      }

      let refRow = referenceVersions.get(key);
      let usedFallback = false;

      // Si no hay coincidencia exacta, intentar fallback solo por versión
      if (!refRow) {
        const version = baseRow[2] ? String(baseRow[2]).trim() : "";
        
        refRow = mapByVersion.get(version);
        if (refRow) {
          console.log(`🔄 FALLBACK POR VERSIÓN: "${key}" -> "${version}" en Row ${i - 1}`);
          usedFallback = true;
        } else {
          console.log(`❌ Row ${i - 1}: NO match para key="${key}" (sin fallback disponible)`);
          // Si no hay coincidencia, marcar como diferente
          differenceSet.add(`${i - 1}:2`); // Solo columna 2 (nombres de modelos)
          continue;
        }
      }

                  /* ---- DETECCIÓN INTELIGENTE DE ERRORES ---- */
      
      // 1. Detectar duplicados REALES
      const modelName = String(baseRow[2] || "");  // CAMBIO: Usar columna 2 (Versiones)
      if (modelName.includes("MDX")) {
        // Verificar si ya existe este modelo en el archivo base
        const existingKey = getKey(baseRow);
        if (seenBaseKeys.has(existingKey)) {
          console.log(`🔴 DUPLICADO DETECTADO: "${modelName}" en Row ${i - 1}`);
          differenceSet.add(`${i - 1}:2`);  // CAMBIO: Marcar columna 2 (Versiones)
        }
      }
      
      // 2. Detectar nombres truncados REALES
      if (modelName.includes("5rpe S") || modelName.includes("5pe S")) {
        console.log(`🔴 NOMBRE TRUNCADO DETECTADO: "${modelName}" en Row ${i - 1}`);
        differenceSet.add(`${i - 1}:2`);  // CAMBIO: Marcar columna 2 (Versiones)
      }
      
      // 3. Detectar problemas de estructura (ELIMINADO - clase siempre vacía)
      // const tipo = String(baseRow[0] || "");
      // const clase = String(baseRow[2] || "");
      
      // NOTA: Clase siempre estará vacía, no es un error
      
      // 4. Detectar precios inválidos REALES
      const precio1 = String(baseRow[3] || "");
      const precio2 = String(baseRow[4] || "");
      
      // Validar que ambos precios sean válidos (celdas vacías son inválidas)
      const precio1Valid = isValidPrice(precio1);
      const precio2Valid = isValidPrice(precio2);
      
      if (precio1Valid && precio2Valid) {
        const precio1Cents = parseInt(normalizePrice(precio1));
        const precio2Cents = parseInt(normalizePrice(precio2));
        
        // Verificar que precio1 >= precio2 (lógica de negocio)
        if (precio1Cents < precio2Cents) {
          console.log(`🔴 PRECIO INVÁLIDO: ${precio1Cents} centavos < ${precio2Cents} centavos en Row ${i - 1}${usedFallback ? ' [FALLBACK]' : ''}`);
          differenceSet.add(`${i - 1}:3`);  // Preciobase
          differenceSet.add(`${i - 1}:4`);  // Preciobase2
        }
      } else if (precio1Valid && !precio2Valid) {
        console.log(`🔴 PRECIO2 INVÁLIDO: "${precio2}" en Row ${i - 1}${usedFallback ? ' [FALLBACK]' : ''}`);
        differenceSet.add(`${i - 1}:4`);  // Preciobase2
      } else if (!precio1Valid && precio2Valid) {
        console.log(`🔴 PRECIO1 INVÁLIDO: "${precio1}" en Row ${i - 1}${usedFallback ? ' [FALLBACK]' : ''}`);
        differenceSet.add(`${i - 1}:3`);  // Preciobase
      } else if (!precio1Valid && !precio2Valid) {
        console.log(`🔴 AMBOS PRECIOS INVÁLIDOS: "${precio1}" y "${precio2}" en Row ${i - 1}${usedFallback ? ' [FALLBACK]' : ''}`);
        differenceSet.add(`${i - 1}:3`);  // Preciobase
        differenceSet.add(`${i - 1}:4`);  // Preciobase2
      }

      // 5. COMPARAR PRECIOS ENTRE ARCHIVOS (ROBUSTA)
      const refPrecio1 = String(refRow[3] || "");
      const refPrecio2 = String(refRow[4] || "");
      
      // Normalizar precios a centavos
      const basePrecio1Cents = normalizePrice(precio1);
      const basePrecio2Cents = normalizePrice(precio2);
      const refPrecio1Cents = normalizePrice(refPrecio1);
      const refPrecio2Cents = normalizePrice(refPrecio2);
      
      // Comparar precios con lógica robusta
      const comparePrices = (baseCents, refCents, precioOriginal, refOriginal, colName, rowIndex) => {
        // Caso 1: Ambos vacíos - no hay diferencia
        if (baseCents === "" && refCents === "") {
          return;
        }
        
        // Caso 2: Uno vacío, otro con valor - marcar diferencia
        if (baseCents === "" && refCents !== "") {
          console.log(`🔴 DIFERENCIA ${colName}: VACÍO vs "${refOriginal}" (${refCents} centavos) en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
          differenceSet.add(`${rowIndex}:${colName === 'PRECIO1' ? '3' : '4'}`);
          return;
        }
        
        if (baseCents !== "" && refCents === "") {
          console.log(`🔴 DIFERENCIA ${colName}: "${precioOriginal}" (${baseCents} centavos) vs VACÍO en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
          differenceSet.add(`${rowIndex}:${colName === 'PRECIO1' ? '3' : '4'}`);
          return;
        }
        
        // Caso 3: Ambos con valor - comparar numéricamente
        if (baseCents !== "" && refCents !== "") {
          const baseNum = parseInt(baseCents);
          const refNum = parseInt(refCents);
          
          // Tolerancia de 1 centavo para redondeos
          const tolerance = 1;
          const difference = Math.abs(baseNum - refNum);
          
          if (difference > tolerance) {
            console.log(`🔴 DIFERENCIA ${colName}: "${precioOriginal}" (${baseCents} centavos) vs "${refOriginal}" (${refCents} centavos) - Diferencia: ${difference} centavos en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
            differenceSet.add(`${rowIndex}:${colName === 'PRECIO1' ? '3' : '4'}`);
          } else if (difference > 0) {
            console.log(`✅ ${colName}: Diferencia mínima tolerada (${difference} centavos) en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
          }
        }
      };
      
      // Comparar ambos precios
      comparePrices(basePrecio1Cents, refPrecio1Cents, precio1, refPrecio1, 'PRECIO1', i - 1);
      comparePrices(basePrecio2Cents, refPrecio2Cents, precio2, refPrecio2, 'PRECIO2', i - 1);
    }

    /* ------------ 4. Enviar resultado ---------------- */
    console.log(`Worker: Comparación completada. Filas: ${cleanCurrent.length}, Diferencias: ${differenceSet.size}`);
    console.log("Worker: Enviando resultado al componente principal...");
    self.postMessage({
      displayData: cleanCurrent, // Enviar datos del archivo BASE
      differences: Array.from(differenceSet),
    });
    console.log("Worker: Resultado enviado exitosamente");
    console.log("🚨🚨🚨 WORKER v16 EJECUTADO CORRECTAMENTE - CON NORMALIZACIÓN ROBUSTA Y FALLBACK 🚨🚨🚨");
  } catch (err) {
    console.error("Worker error:", err);
    console.error("Worker error stack:", err.stack);
    const errorMessage = err && err.message ? err.message : 
                        (typeof err === 'string' ? err : 'Error desconocido en el worker');
    console.error("Worker: Enviando error al componente principal:", errorMessage);
    self.postMessage({ error: `Worker Error: ${errorMessage}` });
  } finally {
    cleanCurrent = null;
    differenceSet = null;
    referenceVersions = null;
  }
};
