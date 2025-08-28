/*  public/comparisonWorker_v18.js (v18 - SOLO CORRECCIÓN CORRUPCIÓN 2025-08-27)
   -----------------------------------------------------------
   - Versión v18 para corregir solo corrupción de datos
   - MANTIENE TODA LA LÓGICA ORIGINAL DE VERSIONES
   - Solo cambia la forma de leer archivos (base64)
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
  console.log(`🔧 VERSIÓN WORKER: v18 - SOLO CORRECCIÓN CORRUPCIÓN - SIN COMPARACIÓN DE PRECIOS`);
  console.log(`🚨🚨🚨 WORKER v18 CARGADO CORRECTAMENTE - VERSIÓN SIN COMPARACIÓN DE PRECIOS 🚨🚨🚨`);
  
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
  console.log('🚨 WORKER v18 CARGADO - VERSIÓN SIN COMPARACIÓN DE PRECIOS');
  console.log('🚨 BUSCAR ESTE MENSAJE EN LA CONSOLA DEL NAVEGADOR');
  
  // Sobrescribir console.log temporalmente para capturar todos los logs
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    
    // Guardar en archivo
    saveLog(message);
    
    // Mantener log original
    originalLog.apply(console, args);
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
  normalized = normalized.replace(/\s+/g, " ");          // espacios múltiples
  normalized = normalized.replace(/[^\w\s]/g, "");       // caracteres especiales
  return normalized;
};

const getKey = (row) => {
  if (!Array.isArray(row) || row.length < 3) return "invalid|invalid|invalid";
  const tipo = String(row[0] || "").trim();
  const version = String(row[2] || "").trim();
  return `${tipo}|${version}`;
};

/* =========================================================
 * MANEJADOR PRINCIPAL DEL WORKER
 * =======================================================*/
self.onmessage = function(event) {
  try {
    console.log("Worker v18: Mensaje recibido", event.data);
    
    const { hasXLSX, hasCurrent, hasReference, currentData, referenceData } = event.data;
    
    if (!hasXLSX || !hasCurrent || !hasReference) {
      throw new Error("Datos incompletos para la comparación");
    }

    console.log("Worker v18: Iniciando procesamiento...");
    
    /* ------------ 1. Procesar archivo base ------------ */
    console.log("Worker v18: Procesando archivo base...");
    console.log("Worker v18: currentData type:", typeof currentData);
    console.log("Worker v18: currentData length:", currentData?.length);
    console.log("Worker v18: currentData[0]:", currentData?.[0]);
    console.log("Worker v18: currentData[1]:", currentData?.[1]);
    
    // Convertir base64 a datos binarios
    let currentDataBinary;
    try {
      const binaryString = atob(currentData);
      currentDataBinary = binaryString;
      console.log("Worker v18: Datos base64 convertidos correctamente");
    } catch (error) {
      console.error("Worker v18: Error convirtiendo base64:", error);
      throw new Error("Error convirtiendo datos base64 del archivo base");
    }
    
    // Leer el archivo Excel
    let currentWorkbook;
    try {
      currentWorkbook = XLSX.read(currentDataBinary, { type: 'binary' });
      console.log("Worker v18: Archivo base leído correctamente");
    } catch (error) {
      console.error("Worker v18: Error leyendo archivo base:", error);
      throw new Error("Error leyendo archivo base Excel");
    }
    
    // Convertir a array de arrays
    const currentSheetName = currentWorkbook.SheetNames[0];
    const currentSheet = currentWorkbook.Sheets[currentSheetName];
    const currentDataArray = XLSX.utils.sheet_to_json(currentSheet, { header: 1 });
    
    console.log("Worker v18: currentDataArray length:", currentDataArray?.length);
    console.log("Worker v18: currentDataArray[0]:", currentDataArray?.[0]);
    console.log("Worker v18: currentDataArray[1]:", currentDataArray?.[1]);
    
    let cleanCurrent = normalizeData(currentDataArray);
    console.log(`Worker v18: Archivo base leído, hojas: ${cleanCurrent.length} filas`);
    console.log("Worker v18: cleanCurrent[0]:", cleanCurrent?.[0]);
    console.log("Worker v18: cleanCurrent[1]:", cleanCurrent?.[1]);
    
    /* ------------ 2. Procesar archivo de referencia ------------ */
    console.log("Worker v18: Procesando archivo de referencia...");
    console.log("Worker v18: referenceData type:", typeof referenceData);
    console.log("Worker v18: referenceData length:", referenceData?.length);
    console.log("Worker v18: referenceData[0]:", referenceData?.[0]);
    console.log("Worker v18: referenceData[1]:", referenceData?.[1]);
    
    // Convertir base64 a datos binarios
    let referenceDataBinary;
    try {
      const binaryString = atob(referenceData);
      referenceDataBinary = binaryString;
      console.log("Worker v18: Datos base64 de referencia convertidos correctamente");
    } catch (error) {
      console.error("Worker v18: Error convirtiendo base64 de referencia:", error);
      throw new Error("Error convirtiendo datos base64 del archivo de referencia");
    }
    
    // Leer el archivo Excel
    let referenceWorkbook;
    try {
      referenceWorkbook = XLSX.read(referenceDataBinary, { type: 'binary' });
      console.log("Worker v18: Archivo de referencia leído correctamente");
    } catch (error) {
      console.error("Worker v18: Error leyendo archivo de referencia:", error);
      throw new Error("Error leyendo archivo de referencia Excel");
    }
    
    // Convertir a array de arrays
    const referenceSheetName = referenceWorkbook.SheetNames[0];
    const referenceSheet = referenceWorkbook.Sheets[referenceSheetName];
    const referenceDataArray = XLSX.utils.sheet_to_json(referenceSheet, { header: 1 });
    
    console.log("Worker v18: referenceDataArray length:", referenceDataArray?.length);
    console.log("Worker v18: referenceDataArray[0]:", referenceDataArray?.[0]);
    console.log("Worker v18: referenceDataArray[1]:", referenceDataArray?.[1]);
    
    let cleanReference = normalizeData(referenceDataArray);
    console.log(`Worker v18: Archivo referencia leído, hojas: ${cleanReference.length} filas`);
    console.log("Worker v18: cleanReference[0]:", cleanReference?.[0]);
    console.log("Worker v18: cleanReference[1]:", cleanReference?.[1]);
    
    /* ------------ 3. Crear mapa de referencia ------------ */
    const referenceVersions = new Map();
    for (let i = 1; i < cleanReference.length; i++) {
      const refRow = cleanReference[i];
      if (!Array.isArray(refRow)) continue;
      
      const key = getKey(refRow);
      if (key !== "invalid|invalid|invalid") {
        referenceVersions.set(key, refRow);
      }
    }
    
    console.log(`Worker v18: Mapa de referencia creado con ${referenceVersions.size} elementos`);
    
    /* ------------ 4. Detectar diferencias ------------ */
    console.log("Worker v18: Iniciando comparación...");
    const differenceSet = new Set();
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

      const refRow = referenceVersions.get(key);

      // Si no hay coincidencia exacta, marcar como diferente
      if (!refRow) {
        console.log(`*** Row ${i - 1}: NO match para key="${key}"`);
        // Si no hay coincidencia, marcar como diferente
        differenceSet.add(`${i - 1}:2`); // Solo columna 2 (nombres de modelos)
        continue;
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
      
      if (precio1 !== "" && precio2 !== "" && precio1 !== "0" && precio2 !== "0") {
        const precio1Num = parseFloat(precio1);
        const precio2Num = parseFloat(precio2);
        
        if (!isNaN(precio1Num) && !isNaN(precio2Num) && precio1Num <= precio2Num) {
          console.log(`🔴 PRECIO INVÁLIDO: ${precio1Num} <= ${precio2Num} en Row ${i - 1}`);
          differenceSet.add(`${i - 1}:3`);  // Preciobase
          differenceSet.add(`${i - 1}:4`);  // Preciobase2
        }
      }

      // 5. COMPARAR PRECIOS ENTRE ARCHIVOS - ELIMINADO COMPLETAMENTE
      // Los precios NO se comparan entre archivos, solo se validan internamente
      // La comparación entre archivos solo se hace para detectar diferencias en nombres de modelos
    }

    /* ------------ 4. Enviar resultado ---------------- */
    console.log(`Worker v18: Comparación completada. Filas: ${cleanCurrent.length}, Diferencias: ${differenceSet.size}`);
    console.log("Worker v18: Enviando resultado al componente principal...");
    console.log("Worker v18: displayData[0]:", cleanCurrent?.[0]);
    console.log("Worker v18: displayData[1]:", cleanCurrent?.[1]);
    console.log("Worker v18: differences:", Array.from(differenceSet));
    
    self.postMessage({
      displayData: cleanCurrent, // Enviar datos del archivo BASE
      differences: Array.from(differenceSet),
    });
    console.log("Worker v18: Resultado enviado exitosamente");
    console.log("🚨🚨🚨 WORKER v18 EJECUTADO CORRECTAMENTE - SIN COMPARACIÓN DE PRECIOS 🚨🚨🚨");
  } catch (err) {
    console.error("Worker v18 error:", err);
    console.error("Worker v18 error stack:", err.stack);
    const errorMessage = err && err.message ? err.message : 
                        (typeof err === 'string' ? err : 'Error desconocido en el worker');
    console.error("Worker v18: Enviando error al componente principal:", errorMessage);
    self.postMessage({ error: `Worker Error: ${errorMessage}` });
  } finally {
    cleanCurrent = null;
    differenceSet = null;
    referenceVersions = null;
  }
};


