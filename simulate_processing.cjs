const XLSX = require('xlsx');

console.log('🔍 SIMULANDO PROCESAMIENTO EXACTO DE LA APLICACIÓN (SOLO PRIMERA MARCA)...');

// Función para parsear año y nota
function parseYearAndNote(text) {
  const match = text.match(/\b(19|20)\d{2}\b/);
  if (!match) return { year: 0, note: text.trim() };
  const year = Number(match[0]);
  const note = text.replace(match[0], "").trim();
  return { year, note };
}

// Función para obtener prioridad de nota
function getNotePriority(note) {
  if (note.includes('Unidades Nuevas')) return 3;
  if (note.includes('Unidades Usadas')) return 2;
  if (note.includes('Usadas')) return 1;
  return 0;
}

// Función para ajustar columna Tipo
function adjustTipoColumn(rows) {
  const adjusted = [];
  for (let i = 0; i < rows.length; i++) {
    const row = [...rows[i]];
    if (i === 0) {
      adjusted.push(row);
      continue;
    }
    
    const tipo = Number(row[0]);
    if (tipo === 3) {
      const versionText = row[2] || '';
      const { year, note } = parseYearAndNote(versionText);
      if (year > 0 && note) {
        row[0] = 3;
      }
    }
    adjusted.push(row);
  }
  return adjusted;
}

// Función para reordenar años en una sección (EXACTA COMO EN LA APP)
function reorderYearsInSection(sectionRows) {
  const yearBlocks = [];
  let currentYearBlock = null;
  const result = [];
  
  console.log(`🔍 reorderYearsInSection - Datos de entrada:`);
  console.log(`📊 Total de filas en la sección: ${sectionRows.length}`);
  sectionRows.forEach((row, index) => {
    console.log(`  Fila ${index}: Tipo ${row[0]}, "${row[2]}", "${row[3]}"`);
  });

  // Primera pasada: Agrupar por año y detectar patrones
  for (let i = 0; i < sectionRows.length; i++) {
    const row = sectionRows[i];
    const tipo = Number(row[0]);

    if (tipo === 3) {
      const versionText = row[2] || "";
      
      // Extraer año del texto
      const yearMatch = versionText.match(/(\d{4})/);
      const year = yearMatch ? Number(yearMatch[1]) : 0;
      
      console.log(`🔍 Procesando Tipo 3: "${versionText}" -> Año: ${year}`);
      
      // Verificar si ya existe un bloque para este año
      const existingBlock = yearBlocks.find(block => block.year === year);
      
      if (existingBlock) {
        existingBlock.rows.push(row);
        console.log(`📝 Agregando fila adicional para año ${year}: "${row[2]}"`);
      } else {
        if (currentYearBlock) yearBlocks.push(currentYearBlock);
        currentYearBlock = { year, rows: [row] };
        console.log(`🆕 Creando nuevo bloque para año ${year}: "${row[2]}"`);
      }
    } else if (tipo === 4 && currentYearBlock) {
      currentYearBlock.rows.push(row);
      console.log(`📝 Agregando Tipo 4 al bloque ${currentYearBlock.year}: "${row[2]}"`);
    }
  }
  if (currentYearBlock) yearBlocks.push(currentYearBlock);

  // Ordenar por año (descendente)
  yearBlocks.sort((a, b) => b.year - a.year);

  if (sectionRows.length > 0 && Number(sectionRows[0][0]) === 2) {
    result.push(sectionRows[0]);
  }
  
  // Segunda pasada: Procesar cada bloque de año
  console.log(`🔍 Procesando sección: ${sectionRows[0]?.[2] || 'desconocido'}`);
  console.log(`📊 Total de bloques de año: ${yearBlocks.length}`);
  
  yearBlocks.forEach((yearBlock, index) => {
    const modelName = sectionRows[0]?.[2] || "";
    
    console.log(`📅 Procesando bloque ${index + 1}: Año ${yearBlock.year}, Modelo: ${modelName}`);
    console.log(`🔍 Filas en este bloque:`);
    yearBlock.rows.forEach((row, rowIndex) => {
      console.log(`  ${rowIndex}: Tipo ${row[0]}, "${row[2]}", "${row[3]}"`);
    });
    
    // Procesar cada fila Tipo 3 individualmente
    const tipo3Rows = yearBlock.rows.filter(row => Number(row[0]) === 3);
    const versionRows = yearBlock.rows.filter(row => Number(row[0]) === 4);
    
    console.log(`📊 Análisis del bloque ${yearBlock.year}:`);
    console.log(`  - Filas Tipo 3: ${tipo3Rows.length}`);
    console.log(`  - Filas Tipo 4: ${versionRows.length}`);
    
    // Procesar cada fila Tipo 3
    tipo3Rows.forEach((tipo3Row, tipo3Index) => {
      const text = tipo3Row[2] || "";
      console.log(`🔍 Procesando Tipo 3 ${tipo3Index + 1}: "${text}"`);
      
      // CORRECCIÓN: Detectar frases en row[2] (datos crudos) y extraerlas
      const hasNewUnits = text.includes('Unidades Nuevas');
      const hasUsedUnits = text.includes('Unidades Usadas');
      
      console.log(`🔍 Detección de frases en row[2]:`);
      console.log(`  - Tiene "Unidades Nuevas": ${hasNewUnits}`);
      console.log(`  - Tiene "Unidades Usadas": ${hasUsedUnits}`);
      
      if (hasNewUnits || hasUsedUnits) {
        // Extraer año y modelo del texto original
        const yearMatch = text.match(/(\d{4})\s+([^-]+)/);
        const year = yearMatch ? yearMatch[1] : '';
        const model = yearMatch ? yearMatch[2].trim() : '';
        
        console.log(`🔍 Extraído: Año "${year}", Modelo "${model}"`);
        
        // Crear nueva fila con la frase movida a row[3]
        const newRow = [...tipo3Row];
        newRow[2] = `${year} ${model}`.trim(); // Solo año y modelo
        newRow[3] = hasNewUnits ? 'Unidades Nuevas' : 'Unidades Usadas'; // Frase en columna 3
        
        console.log(`✅ Creando fila procesada: "${newRow[2]}", Frase: "${newRow[3]}"`);
        result.push(newRow);
        
        // Agregar las versiones correspondientes
        console.log(`📝 Agregando ${versionRows.length} versiones para esta fila`);
        for (const versionRow of versionRows) {
          result.push(versionRow);
        }
      } else {
        // No tiene frases - mantener estructura original
        console.log(`⏭️ Sin frases detectadas - manteniendo estructura original`);
        result.push([...tipo3Row]); // Copiar fila sin modificar
        
        // Agregar las versiones correspondientes
        console.log(`📝 Agregando ${versionRows.length} versiones para esta fila`);
        for (const versionRow of versionRows) {
          result.push(versionRow);
        }
      }
    });
  });
  
  console.log(`📋 Resultado final: ${result.length} filas`);
  console.log(`🔍 Primeras 10 filas del resultado:`);
  result.slice(0, 10).forEach((row, index) => {
    console.log(`  ${index + 1}: Tipo ${row[0]}, "${row[2]}", "${row[3]}"`);
  });
  
  return result;
}

// Función para reordenar todo (MODIFICADA PARA SOLO PRIMERA MARCA)
function reorderAll(worksheet) {
  if (!worksheet || worksheet.length === 0) return [];
  const header = worksheet[0];
  const dataRows = worksheet.slice(1);
  const result = [header];

  let currentSection = [];
  let inSection = false;
  let firstSectionProcessed = false;

  console.log(`🔄 reorderAll iniciado con ${dataRows.length} filas de datos`);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const tipo = Number(row[0]);

    if (tipo === 2) {
      // Procesar la sección anterior si existe
      if (inSection && currentSection.length > 0) {
        const sectionName = currentSection[0]?.[2] || 'desconocido';
        console.log(`📦 Procesando sección: ${sectionName} con ${currentSection.length} filas`);
        
        const reordered = reorderYearsInSection(currentSection);
        result.push(...reordered);
        firstSectionProcessed = true;
        
        // SOLO PROCESAR LA PRIMERA SECCIÓN Y SALIR
        console.log(`✅ Primera sección procesada, terminando...`);
        break;
      }
      
      // Iniciar nueva sección
      currentSection = [row];
      inSection = true;
    } else if (inSection) {
      currentSection.push(row);
    } else {
      // Preservar otras filas que están fuera de secciones
      result.push(row);
    }
  }

  // Procesar la última sección si existe y no se ha procesado ninguna
  if (!firstSectionProcessed && inSection && currentSection.length > 0) {
    console.log(`📦 Procesando única sección: ${currentSection[0]?.[2] || 'desconocido'} con ${currentSection.length} filas`);
    const reordered = reorderYearsInSection(currentSection);
    result.push(...reordered);
  }

  console.log(`✅ reorderAll completado: ${result.length} filas totales`);
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
      
      console.log(`🔍 formatVehicleData - Fila ${i} final: "${row[2]}", Frase existente: "${existingPhrase}", Tiene frase: ${hasPhrase}`);
      
      if (year && currentModel) {
        row[2] = `${year} ${currentModel}`.trim();
      }
      
      // Mantener frase existente si la tiene, sino dejar vacío
      row[3] = hasPhrase ? existingPhrase : '';
      
      console.log(`🔍 formatVehicleData - Fila ${i} final: "${row[2]}", Frase asignada: "${row[3]}"`);
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

// Función principal de procesamiento (EXACTA COMO EN LA APP)
function processNewData(worksheet) {
  if (!worksheet || worksheet.length === 0) return [];

  console.log(`🔄 processNewData iniciado con ${worksheet.length} filas`);
  
  // === LOGS ANTES DE PROCESAMIENTO BÁSICO ===
  const tipo1BeforeBasic = worksheet.slice(1).filter(row => Number(row[0]) === 1).length;
  const tipo2BeforeBasic = worksheet.slice(1).filter(row => Number(row[0]) === 2).length;
  console.log(`📊 Antes de procesamiento básico - Tipo 1: ${tipo1BeforeBasic}, Tipo 2: ${tipo2BeforeBasic}`);

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
      console.log(`✅ Insertando cero antes de fila original ${filaOriginal + 1} (Tipo ${tipo})`);
      result.push([0, ...Array(currentRow.length - 1).fill('')]);
    }

    if (!(tipo === 0 && filaOriginal >= 10)) {
      result.push(currentRow);
    } else {
      console.log(`⚠️ Omitido cero ya existente en fila original ${filaOriginal + 1}`);
      result.push(currentRow);
    }
  }

  const tipo1AfterBasic = result.slice(1).filter(row => Number(row[0]) === 1).length;
  const tipo2AfterBasic = result.slice(1).filter(row => Number(row[0]) === 2).length;
  console.log(`📊 Después de procesamiento básico - Tipo 1: ${tipo1AfterBasic}, Tipo 2: ${tipo2AfterBasic}`);

  const reordered = reorderAll(result);
  
  const tipo1AfterReorder = reordered.slice(1).filter(row => Number(row[0]) === 1).length;
  const tipo2AfterReorder = reordered.slice(1).filter(row => Number(row[0]) === 2).length;
  console.log(`📊 Después de reordering - Tipo 1: ${tipo1AfterReorder}, Tipo 2: ${tipo2AfterReorder}`);
  
  const tipo3RowsAfterReorder = reordered.slice(1).filter(row => Number(row[0]) === 3);
  console.log(`🔍 VERIFICACIÓN POST-REORDERING: ${tipo3RowsAfterReorder.length} filas Tipo 3`);
  tipo3RowsAfterReorder.slice(0, 5).forEach((row, index) => {
    console.log(`🔍 Fila Tipo 3 ${index + 1} POST-REORDERING: "${row[2]}", Frase: "${row[3]}"`);
  });
  
  const formatted = formatVehicleData(reordered);
  
  const tipo3RowsAfterFormat = formatted.slice(1).filter(row => Number(row[0]) === 3);
  console.log(`🔍 VERIFICACIÓN POST-FORMAT: ${tipo3RowsAfterFormat.length} filas Tipo 3`);
  tipo3RowsAfterFormat.slice(0, 5).forEach((row, index) => {
    console.log(`🔍 Fila Tipo 3 ${index + 1} POST-FORMAT: "${row[2]}", Frase: "${row[3]}"`);
  });

  return formatted;
}

// SIMULACIÓN PRINCIPAL
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

  // Buscar específicamente ACURA/ILX en datos originales
  console.log(`\n🔍 FILAS ACURA/ILX EN DATOS ORIGINALES:`);
  for (let i = 1; i < worksheet.length; i++) {
    const row = worksheet[i];
    const texto = String(row[2] || '');
    
    if (texto.includes('ACURA') || texto.includes('ILX')) {
      console.log(`Fila ${i}: Tipo ${row[0]}, "${texto}", Frase: "${row[3]}"`);
    }
  }

  // SIMULAR PROCESAMIENTO EXACTO DE LA APLICACIÓN
  console.log(`\n🔄 INICIANDO PROCESAMIENTO SIMULADO...`);
  const processedData = processNewData(worksheet);

  // VERIFICAR RESULTADO FINAL
  console.log(`\n🔍 RESULTADO FINAL - FILAS ACURA/ILX:`);
  for (let i = 1; i < processedData.length; i++) {
    const row = processedData[i];
    const texto = String(row[2] || '');
    
    if (texto.includes('ACURA') || texto.includes('ILX')) {
      console.log(`Fila ${i}: Tipo ${row[0]}, "${texto}", Frase: "${row[3]}"`);
    }
  }

  // Contar filas con frases incorrectas
  const acuraILXRows = [];
  for (let i = 1; i < processedData.length; i++) {
    const row = processedData[i];
    const texto = String(row[2] || '');
    
    if (texto.includes('ACURA') || texto.includes('ILX')) {
      acuraILXRows.push({
        fila: i,
        texto: texto,
        frase: row[3] || '',
        tieneFrase: (row[3] || '').includes('Unidades')
      });
    }
  }

  console.log(`\n📊 RESUMEN FINAL:`);
  console.log(`  - Total filas ACURA/ILX: ${acuraILXRows.length}`);
  console.log(`  - Con frases incorrectas: ${acuraILXRows.filter(row => row.tieneFrase).length}`);
  console.log(`  - Sin frases (correcto): ${acuraILXRows.filter(row => !row.tieneFrase).length}`);

} catch (error) {
  console.error('❌ Error:', error.message);
} 