const XLSX = require('xlsx');

console.log('🔍 VERIFICANDO POSIBLES PROBLEMAS DE CACHE Y DATOS RESIDUALES...');

// Función para simular exactamente el mismo procesamiento que hace la aplicación
function processNewData(worksheet) {
  if (!worksheet || worksheet.length === 0) return [];

  console.log(`🔄 processNewData iniciado con ${worksheet.length} filas`);
  
  const result = [worksheet[0]]; // Preservar header
  let filaOriginal = 1;

  for (let i = 1; i < worksheet.length; i++, filaOriginal++) {
    const currentRow = worksheet[i];
    const tipo = Number(currentRow[0]);
    const prevRow = result[result.length - 1];
    const prevTipo = Number(prevRow?.[0]);

    const estaEnPrimeras10Filas = filaOriginal < 10;
    const esMarcaOMod = tipo === 1 || tipo === 2;
    const prevNoEsCero = prevTipo !== 0;

    if (!estaEnPrimeras10Filas && esMarcaOMod && prevNoEsCero) {
      result.push([0, ...Array(currentRow.length - 1).fill('')]);
    }

    if (!(tipo === 0 && filaOriginal >= 10)) {
      result.push(currentRow);
    } else {
      result.push(currentRow);
    }
  }

  // Simular reorderAll (solo primera marca)
  const reordered = reorderAll(result);
  const formatted = formatVehicleData(reordered);

  return formatted;
}

// Función para reordenar años en una sección
function reorderYearsInSection(sectionRows) {
  const yearBlocks = [];
  let currentYearBlock = null;
  const result = [];

  // Primera pasada: Agrupar por año
  for (let i = 0; i < sectionRows.length; i++) {
    const row = sectionRows[i];
    const tipo = Number(row[0]);

    if (tipo === 3) {
      const versionText = row[2] || "";
      const yearMatch = versionText.match(/(\d{4})/);
      const year = yearMatch ? Number(yearMatch[1]) : 0;
      
      const existingBlock = yearBlocks.find(block => block.year === year);
      
      if (existingBlock) {
        existingBlock.rows.push(row);
      } else {
        if (currentYearBlock) yearBlocks.push(currentYearBlock);
        currentYearBlock = { year, rows: [row] };
      }
    } else if (tipo === 4 && currentYearBlock) {
      currentYearBlock.rows.push(row);
    }
  }
  if (currentYearBlock) yearBlocks.push(currentYearBlock);

  // Ordenar por año (descendente)
  yearBlocks.sort((a, b) => b.year - a.year);

  if (sectionRows.length > 0 && Number(sectionRows[0][0]) === 2) {
    result.push(sectionRows[0]);
  }
  
  // Segunda pasada: Procesar cada bloque
  yearBlocks.forEach((yearBlock) => {
    const tipo3Rows = yearBlock.rows.filter(row => Number(row[0]) === 3);
    const versionRows = yearBlock.rows.filter(row => Number(row[0]) === 4);
    
    // Procesar cada fila Tipo 3
    tipo3Rows.forEach((tipo3Row) => {
      const text = tipo3Row[2] || "";
      
      // Detectar frases en row[2] (datos crudos)
      const hasNewUnits = text.includes('Unidades Nuevas');
      const hasUsedUnits = text.includes('Unidades Usadas');
      
      if (hasNewUnits || hasUsedUnits) {
        // Extraer año y modelo del texto original
        const yearMatch = text.match(/(\d{4})\s+([^-]+)/);
        const year = yearMatch ? yearMatch[1] : '';
        const model = yearMatch ? yearMatch[2].trim() : '';
        
        // Crear nueva fila con la frase movida a row[3]
        const newRow = [...tipo3Row];
        newRow[2] = `${year} ${model}`.trim();
        newRow[3] = hasNewUnits ? 'Unidades Nuevas' : 'Unidades Usadas';
        
        result.push(newRow);
        
        // Agregar las versiones correspondientes
        for (const versionRow of versionRows) {
          result.push(versionRow);
        }
      } else {
        // No tiene frases - mantener estructura original
        result.push([...tipo3Row]);
        
        // Agregar las versiones correspondientes
        for (const versionRow of versionRows) {
          result.push(versionRow);
        }
      }
    });
  });
  
  return result;
}

// Función para reordenar todo (solo primera marca)
function reorderAll(worksheet) {
  if (!worksheet || worksheet.length === 0) return [];
  const header = worksheet[0];
  const dataRows = worksheet.slice(1);
  const result = [header];

  let currentSection = [];
  let inSection = false;
  let firstSectionProcessed = false;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const tipo = Number(row[0]);

    if (tipo === 2) {
      if (inSection && currentSection.length > 0) {
        const reordered = reorderYearsInSection(currentSection);
        result.push(...reordered);
        firstSectionProcessed = true;
        break; // Solo procesar la primera sección
      }
      
      currentSection = [row];
      inSection = true;
    } else if (inSection) {
      currentSection.push(row);
    } else {
      result.push(row);
    }
  }

  if (!firstSectionProcessed && inSection && currentSection.length > 0) {
    const reordered = reorderYearsInSection(currentSection);
    result.push(...reordered);
  }

  return result;
}

// Función para formatear datos de vehículos
function formatVehicleData(data) {
  const formattedData = [];
  let currentModel = '';
  if (data.length > 0) formattedData.push(data[0]);

  for (let i = 1; i < data.length; i++) {
    const row = [...data[i]];
    const rowType = Number(row[0]) || 0;

    if (rowType === 2) {
      if (typeof row[2] === 'string' && row[2].trim() !== '') {
        currentModel = row[2].trim();
      } else {
        currentModel = '';
      }
      formattedData.push(row);
    } else if (rowType === 3) {
      const versionText = row[2] || '';
      const yearMatch = versionText.match(/(20\d{2})/);
      const year = yearMatch ? yearMatch[1] : '';
      
      // SOLO PRESERVAR frases existentes en row[3], NO asignar nuevas
      const existingPhrase = row[3] || '';
      const hasPhrase = existingPhrase.includes('Unidades');
      
      if (year && currentModel) {
        row[2] = `${year} ${currentModel}`.trim();
      }
      
      // Mantener frase existente si la tiene, sino dejar vacío
      row[3] = hasPhrase ? existingPhrase : '';
      
      formattedData.push(row);
    } else if (rowType === 4) {
      if (row.length > 3 && typeof row[3] === 'string') {
        row[3] = row[3].replace(/Lista/gi, '').trim();
      }
      formattedData.push(row);
    } else {
      formattedData.push(row);
    }
  }
  return formattedData;
}

// VERIFICACIÓN PRINCIPAL
try {
  console.log('🔍 CARGANDO ARCHIVO GuiaEBC_Marzo2025 v1.xlsx...');
  
  const workbook = XLSX.readFile('GuiaEBC_Marzo2025 v1.xlsx');
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });

  console.log(`📊 DATOS ORIGINALES: ${worksheet.length} filas`);

  // Verificar ACURA/ILX en datos originales
  console.log(`\n🔍 VERIFICACIÓN ACURA/ILX EN DATOS ORIGINALES:`);
  const acuraOriginalRows = [];
  for (let i = 1; i < worksheet.length; i++) {
    const row = worksheet[i];
    const texto = String(row[2] || '');
    
    if (texto.includes('ACURA') || texto.includes('ILX')) {
      acuraOriginalRows.push({
        fila: i,
        tipo: row[0],
        texto: texto,
        frase: row[3] || ''
      });
    }
  }

  console.log(`📊 Total filas ACURA/ILX originales: ${acuraOriginalRows.length}`);
  acuraOriginalRows.forEach((row, index) => {
    console.log(`  ${index + 1}. Fila ${row.fila}: Tipo ${row.tipo}, "${row.texto}", Frase: "${row.frase}"`);
  });

  // Verificar si hay frases en datos originales
  const conFrasesOriginales = acuraOriginalRows.filter(row => row.frase.includes('Unidades'));
  console.log(`\n❌ FILAS CON FRASES EN DATOS ORIGINALES: ${conFrasesOriginales.length}`);
  if (conFrasesOriginales.length > 0) {
    console.log("🚨 PROBLEMA: Los datos originales ya contienen frases incorrectas");
    conFrasesOriginales.forEach((row, index) => {
      console.log(`  ${index + 1}. "${row.texto}" -> "${row.frase}"`);
    });
  } else {
    console.log("✅ Datos originales sin frases incorrectas - CORRECTO");
  }

  // SIMULAR PROCESAMIENTO
  console.log(`\n🔄 SIMULANDO PROCESAMIENTO...`);
  const processedData = processNewData(worksheet);

  // Verificar resultado final
  console.log(`\n🔍 VERIFICACIÓN RESULTADO FINAL:`);
  const acuraProcessedRows = [];
  for (let i = 1; i < processedData.length; i++) {
    const row = processedData[i];
    const texto = String(row[2] || '');
    
    if (texto.includes('ACURA') || texto.includes('ILX')) {
      acuraProcessedRows.push({
        fila: i,
        tipo: row[0],
        texto: texto,
        frase: row[3] || ''
      });
    }
  }

  console.log(`📊 Total filas ACURA/ILX procesadas: ${acuraProcessedRows.length}`);
  acuraProcessedRows.forEach((row, index) => {
    console.log(`  ${index + 1}. Fila ${row.fila}: Tipo ${row.tipo}, "${row.texto}", Frase: "${row.frase}"`);
  });

  // Verificar frases incorrectas en resultado
  const conFrasesIncorrectas = acuraProcessedRows.filter(row => row.frase.includes('Unidades'));
  console.log(`\n❌ FILAS CON FRASES INCORRECTAS EN RESULTADO: ${conFrasesIncorrectas.length}`);
  if (conFrasesIncorrectas.length > 0) {
    console.log("🚨 PROBLEMA: El procesamiento está agregando frases incorrectas");
    conFrasesIncorrectas.forEach((row, index) => {
      console.log(`  ${index + 1}. "${row.texto}" -> "${row.frase}"`);
    });
  } else {
    console.log("✅ Resultado sin frases incorrectas - CORRECTO");
  }

  console.log(`\n📊 RESUMEN FINAL:`);
  console.log(`  - Datos originales con frases: ${conFrasesOriginales.length}`);
  console.log(`  - Resultado con frases incorrectas: ${conFrasesIncorrectas.length}`);
  
  if (conFrasesOriginales.length > 0) {
    console.log("🚨 CONCLUSIÓN: El problema está en los datos originales");
  } else if (conFrasesIncorrectas.length > 0) {
    console.log("🚨 CONCLUSIÓN: El problema está en el procesamiento");
  } else {
    console.log("✅ CONCLUSIÓN: Todo está correcto");
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} 