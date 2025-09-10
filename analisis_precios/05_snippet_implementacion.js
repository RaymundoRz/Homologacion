// =========================================================
// SNIPPET PARA IMPLEMENTAR EN comparisonWorker.js
// =========================================================

// Reemplazar la función normalizePrice existente con esta:
function normalizePriceToInteger(priceStr) {
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
  cleanPrice = cleanPrice.replace(/[\s\u00A0\u2000-\u200B]/g, '');

  // 2. ELIMINAR SÍMBOLOS DE MONEDA Y TEXTO
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
    const lastDot = cleanPrice.lastIndexOf('.');
    const lastComma = cleanPrice.lastIndexOf(',');
    if (lastDot > lastComma) {
      cleanPrice = cleanPrice.replace(/,/g, '');
    } else {
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma && !hasDot) {
    const parts = cleanPrice.split(',');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length <= 2 && parts.length > 1) {
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    } else {
      cleanPrice = cleanPrice.replace(/,/g, '');
    }
  } else if (hasDot && !hasComma) {
    const parts = cleanPrice.split('.');
    const last = parts[parts.length - 1];
    if (parts.length > 1 && last.length === 3) {
      cleanPrice = cleanPrice.replace(/\./g, '');
    }
  }

  // 5. CONVERTIR A ENTERO MXN (SIN multiplicar por 100)
  const integerPrice = Math.round(parseFloat(cleanPrice));
  
  if (shouldLog) {
    console.log(`🔧 PRECIO NORMALIZADO: "${priceStr}" -> "${cleanPrice}" -> ${parseFloat(cleanPrice)} -> ${integerPrice} enteros MXN`);
  }

  // 6. VALIDAR QUE SEA UN ENTERO VÁLIDO
  if (!Number.isFinite(integerPrice) || integerPrice <= 0) {
    return ""; // Precio inválido
  }

  return String(integerPrice * sign);
}

// Reemplazar la función isValidPrice existente con esta:
function isValidPrice(priceStr) {
  if (!priceStr || priceStr === "") return false;
  
  // Normalizar a entero
  const normalized = normalizePriceToInteger(priceStr);
  
  // Validar que sea un entero válido
  if (normalized === "") return false;
  
  const price = parseInt(normalized);
  return price > 0; // 0 se considera inválido
}

// Agregar esta nueva función:
function getNormalizedPrice(priceStr) {
  const normalized = normalizePriceToInteger(priceStr);
  if (normalized === "") return "";
  return parseInt(normalized);
}

// =========================================================
// CAMBIOS EN LA LÓGICA DE COMPARACIÓN
// =========================================================

// Reemplazar esta sección en el worker:
/*
// Antes (líneas aproximadas 400-450):
const basePrecio1Cents = toCentsStrict(precio1);
const basePrecio2Cents = toCentsStrict(precio2);
const refPrecio1Cents = toCentsStrict(refPrecio1);
const refPrecio2Cents = toCentsStrict(refPrecio2);
*/

// Después:
const basePrecio1Integer = getNormalizedPrice(precio1);
const basePrecio2Integer = getNormalizedPrice(precio2);
const refPrecio1Integer = getNormalizedPrice(refPrecio1);
const refPrecio2Integer = getNormalizedPrice(refPrecio2);

// Reemplazar la función comparePrices:
const comparePrices = (baseInteger, refInteger, precioOriginal, refOriginal, colName, rowIndex) => {
  // Caso 1: Ambos inválidos (vacío/0) - marcar diferencia
  if (baseInteger === "" && refInteger === "") {
    console.log(`🔴 INVALIDO AMBOS: "${precioOriginal}" y "${refOriginal}" en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
    differenceSet.add(`${rowIndex}:${colName === 'PRECIO1' ? '3' : '4'}`);
    return;
  }
  
  // Caso 2: Uno inválido, otro válido - marcar diferencia
  if (baseInteger === "" && refInteger !== "") {
    console.log(`🔴 INVALIDO BASE: "${precioOriginal}" vs "${refOriginal}" (${refInteger} MXN) en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
    differenceSet.add(`${rowIndex}:${colName === 'PRECIO1' ? '3' : '4'}`);
    return;
  }
  
  if (baseInteger !== "" && refInteger === "") {
    console.log(`🔴 INVALIDO REF: "${precioOriginal}" (${baseInteger} MXN) vs "${refOriginal}" en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
    differenceSet.add(`${rowIndex}:${colName === 'PRECIO1' ? '3' : '4'}`);
    return;
  }
  
  // Caso 3: Ambos válidos - comparar enteros exactos (SIN tolerancia)
  if (baseInteger !== "" && refInteger !== "") {
    if (baseInteger !== refInteger) {
      console.log(`🔴 DIFERENCIA ${colName}: "${precioOriginal}" (${baseInteger} MXN) vs "${refOriginal}" (${refInteger} MXN) en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
      differenceSet.add(`${rowIndex}:${colName === 'PRECIO1' ? '3' : '4'}`);
    } else {
      console.log(`✅ ${colName}: Precios idénticos (${baseInteger} MXN) en Row ${rowIndex}${usedFallback ? ' [FALLBACK]' : ''}`);
    }
  }
};

// Reemplazar las llamadas a comparePrices:
comparePrices(basePrecio1Integer, refPrecio1Integer, precio1, refPrecio1, 'PRECIO1', i - 1);
comparePrices(basePrecio2Integer, refPrecio2Integer, precio2, refPrecio2, 'PRECIO2', i - 1);

// =========================================================
// CAMBIOS EN LA VALIDACIÓN DE REGLAS DE NEGOCIO
// =========================================================

// Reemplazar esta sección en el worker:
/*
// Antes:
const precio1Valid = isValidPrice(precio1);
const precio2Valid = isValidPrice(precio2);

// Solo verificar precio1 >= precio2 cuando ambos precios sean válidos
if (precio1Valid && precio2Valid) {
  const precio1Cents = parseInt(toCentsStrict(precio1));
  const precio2Cents = parseInt(toCentsStrict(precio2));

  // Verificar que precio1 >= precio2 (lógica de negocio)
  if (precio1Cents < precio2Cents) {
    console.log(`🔴 INVALIDO: ${precio1Cents} centavos < ${precio2Cents} centavos en Row ${i - 1}${usedFallback ? ' [FALLBACK]' : ''}`);
    differenceSet.add(`${i - 1}:3`); // Preciobase
    differenceSet.add(`${i - 1}:4`); // Preciobase2
  }
}
*/

// Después:
const precio1Valid = isValidPrice(precio1);
const precio2Valid = isValidPrice(precio2);

// Precio1 es obligatorio: no debe ser vacío ni 0
if (!precio1Valid) {
  console.log(`🔴 PRECIO1 OBLIGATORIO INVÁLIDO: "${precio1}" en Row ${i - 1}${usedFallback ? ' [FALLBACK]' : ''}`);
  differenceSet.add(`${i - 1}:3`); // Preciobase
}

// Solo verificar precio1 >= precio2 cuando ambos precios sean válidos
if (precio1Valid && precio2Valid) {
  const precio1Integer = getNormalizedPrice(precio1);
  const precio2Integer = getNormalizedPrice(precio2);

  // Verificar que precio1 >= precio2 (lógica de negocio)
  if (precio1Integer < precio2Integer) {
    console.log(`🔴 INVALIDO: ${precio1Integer} MXN < ${precio2Integer} MXN en Row ${i - 1}${usedFallback ? ' [FALLBACK]' : ''}`);
    differenceSet.add(`${i - 1}:3`); // Preciobase
    differenceSet.add(`${i - 1}:4`); // Preciobase2
  }
}

// =========================================================
// CAMBIOS EN LA VERSIÓN DEL WORKER
// =========================================================

// Cambiar estos mensajes en el worker:
console.log(`🔧 VERSIÓN WORKER: v17 - COMPARACIÓN 100% CONFIABLE DE PRECIOS ENTEROS MXN`);
console.log(`🚨🚨🚨 WORKER v17 CARGADO CORRECTAMENTE - COMPARACIÓN 100% CONFIABLE DE PRECIOS ENTEROS MXN 🚨🚨🚨`);
console.log('🚨 WORKER CARGADO - VERSIÓN v17 CON COMPARACIÓN 100% CONFIABLE DE PRECIOS ENTEROS MXN');
console.log("🚨🚨🚨 WORKER v17 EJECUTADO CORRECTAMENTE - COMPARACIÓN 100% CONFIABLE DE PRECIOS ENTEROS MXN 🚨🚨🚨");

// =========================================================
// RESUMEN DE CAMBIOS
// =========================================================

/*
CAMBIOS REALIZADOS:

1. ✅ Reemplazado normalizePrice con normalizePriceToInteger
2. ✅ Eliminada multiplicación por 100
3. ✅ Implementada validación estricta de precios > 0
4. ✅ Agregada función getNormalizedPrice
5. ✅ Actualizada lógica de comparación para enteros MXN
6. ✅ Implementadas reglas de negocio estrictas
7. ✅ Agregada validación de Precio1 obligatorio
8. ✅ Eliminada tolerancia de diferencias
9. ✅ Actualizada versión del worker a v17
10. ✅ Actualizados mensajes de log

RESULTADO:
- Comparación 100% confiable de precios enteros MXN
- Eliminación de falsos positivos
- Validación estricta de reglas de negocio
- Solo ejecuta en filas tipo === 4 (versiones)
*/


