/* =========================================================
 * SISTEMA DE DIAGNÓSTICO INDEPENDIENTE
 * =======================================================*/
console.log('🔍 SISTEMA DE DIAGNÓSTICO CARGADO');

class DiagnosticSystem {
  constructor() {
    this.diagnostics = [];
    this.startTime = Date.now();
    this.enabled = true; // Se puede activar/desactivar
  }

  // =========================================================
  // FUNCIÓN PRINCIPAL DE DIAGNÓSTICO (SÍNCRONA)
  // =========================================================
  runFullDiagnostic(baseFileContent, referenceFileContent, comparisonResults) {
    if (!this.enabled) {
      console.log('🔍 Diagnóstico deshabilitado');
      return { enabled: false };
    }

    console.log('🔍 INICIANDO DIAGNÓSTICO COMPLETO...');
    
    try {
      // 1. Análisis de estructura de datos
      const structureAnalysis = this.analyzeDataStructure(baseFileContent, referenceFileContent);
      
      // 2. Análisis de flujo de procesamiento
      const processingAnalysis = this.analyzeProcessingFlow(baseFileContent, referenceFileContent);
      
      // 3. Verificación de integridad de precios
      const priceIntegrity = this.verifyPriceIntegrity(baseFileContent, referenceFileContent);
      
      // 4. Análisis de transformaciones EBC
      const transformationAnalysis = this.analyzeEBCTransformations(baseFileContent, referenceFileContent);
      
      // 5. Generar reporte completo
      const report = this.generateDiagnosticReport({
        structure: structureAnalysis,
        processing: processingAnalysis,
        prices: priceIntegrity,
        transformations: transformationAnalysis,
        comparisonResults: comparisonResults
      });

      // 6. Mostrar resultados
      this.displayResults(report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      return { error: error.message };
    }
  }

  // =========================================================
  // 1. ANÁLISIS DE ESTRUCTURA DE DATOS
  // =========================================================
  analyzeDataStructure(baseContent, refContent) {
    console.log('🔍 Analizando estructura de datos...');
    
    try {
      // Cargar archivos
      const baseWB = XLSX.read(baseContent, { type: 'binary' });
      const refWB = XLSX.read(refContent, { type: 'binary' });
      
      const baseSheet = XLSX.utils.sheet_to_json(baseWB.Sheets[baseWB.SheetNames[0]], { header: 1 });
      const refSheet = XLSX.utils.sheet_to_json(refWB.Sheets[refWB.SheetNames[0]], { header: 1 });
      
      const analysis = {
        base: {
          rows: baseSheet.length,
          columns: baseSheet[0]?.length || 0,
          tipo1Count: baseSheet.filter(row => Number(row[0]) === 1).length,
          tipo2Count: baseSheet.filter(row => Number(row[0]) === 2).length,
          tipo4Count: baseSheet.filter(row => Number(row[0]) === 4).length,
          precioColumns: this.analyzePriceColumns(baseSheet)
        },
        reference: {
          rows: refSheet.length,
          columns: refSheet[0]?.length || 0,
          tipo1Count: refSheet.filter(row => Number(row[0]) === 1).length,
          tipo2Count: refSheet.filter(row => Number(row[0]) === 2).length,
          tipo4Count: refSheet.filter(row => Number(row[0]) === 4).length,
          precioColumns: this.analyzePriceColumns(refSheet)
        }
      };
      
      // Detectar diferencias estructurales
      analysis.structuralDifferences = this.detectStructuralDifferences(analysis.base, analysis.reference);
      
      return analysis;
      
    } catch (error) {
      return { error: `Error analizando estructura: ${error.message}` };
    }
  }

  // =========================================================
  // 2. ANÁLISIS DE FLUJO DE PROCESAMIENTO
  // =========================================================
  analyzeProcessingFlow(baseContent, refContent) {
    console.log('🔍 Analizando flujo de procesamiento...');
    
    try {
      const baseWB = XLSX.read(baseContent, { type: 'binary' });
      const refWB = XLSX.read(refContent, { type: 'binary' });
      
      const baseSheet = XLSX.utils.sheet_to_json(baseWB.Sheets[baseWB.SheetNames[0]], { header: 1 });
      const refSheet = XLSX.utils.sheet_to_json(refWB.Sheets[refWB.SheetNames[0]], { header: 1 });
      
      const analysis = {
        baseProcessing: {
          rawRows: baseSheet.length,
          processedRows: baseSheet.length, // Asumiendo que se procesa
          transformationsApplied: ['preprocessDataWithYear', 'normalizeData']
        },
        referenceProcessing: {
          rawRows: refSheet.length,
          processedRows: refSheet.length, // Asumiendo que se procesa
          transformationsApplied: ['preprocessDataWithYear', 'processNewData', 'normalizeData']
        }
      };
      
      // Verificar si las transformaciones se aplicaron
      analysis.transformationStatus = this.verifyTransformations(baseSheet, refSheet);
      
      return analysis;
      
    } catch (error) {
      return { error: `Error analizando procesamiento: ${error.message}` };
    }
  }

  // =========================================================
  // 3. VERIFICACIÓN DE INTEGRIDAD DE PRECIOS
  // =========================================================
  verifyPriceIntegrity(baseContent, refContent) {
    console.log('🔍 Verificando integridad de precios...');
    
    try {
      const baseWB = XLSX.read(baseContent, { type: 'binary' });
      const refWB = XLSX.read(refContent, { type: 'binary' });
      
      const baseSheet = XLSX.utils.sheet_to_json(baseWB.Sheets[baseWB.SheetNames[0]], { header: 1 });
      const refSheet = XLSX.utils.sheet_to_json(refWB.Sheets[refWB.SheetNames[0]], { header: 1 });
      
      const priceAnalysis = {
        identicalPrices: [],
        differentPrices: [],
        missingPrices: [],
        invalidPrices: []
      };
      
      // Analizar precios en filas tipo 4 (versiones)
      const baseVersions = baseSheet.filter(row => Number(row[0]) === 4);
      const refVersions = refSheet.filter(row => Number(row[0]) === 4);
      
      // Comparar precios específicos
      for (let i = 0; i < Math.min(baseVersions.length, refVersions.length); i++) {
        const baseRow = baseVersions[i];
        const refRow = refVersions[i];
        
        const baseP1 = this.normalizePrice(baseRow[3]);
        const baseP2 = this.normalizePrice(baseRow[4]);
        const refP1 = this.normalizePrice(refRow[3]);
        const refP2 = this.normalizePrice(refRow[4]);
        
        const model = baseRow[2] || 'Sin modelo';
        
        // Verificar si los precios son idénticos (PROBLEMA)
        if (baseP1 === refP1 && baseP2 === refP2) {
          priceAnalysis.identicalPrices.push({
            model: model,
            baseP1: baseP1,
            baseP2: baseP2,
            refP1: refP1,
            refP2: refP2,
            row: i + 1
          });
        } else {
          priceAnalysis.differentPrices.push({
            model: model,
            baseP1: baseP1,
            baseP2: baseP2,
            refP1: refP1,
            refP2: refP2,
            row: i + 1
          });
        }
      }
      
      return priceAnalysis;
      
    } catch (error) {
      return { error: `Error verificando precios: ${error.message}` };
    }
  }

  // =========================================================
  // 4. ANÁLISIS DE TRANSFORMACIONES EBC
  // =========================================================
  analyzeEBCTransformations(baseContent, refContent) {
    console.log('🔍 Analizando transformaciones EBC...');
    
    try {
      const baseWB = XLSX.read(baseContent, { type: 'binary' });
      const refWB = XLSX.read(refContent, { type: 'binary' });
      
      const baseSheet = XLSX.utils.sheet_to_json(baseWB.Sheets[baseWB.SheetNames[0]], { header: 1 });
      const refSheet = XLSX.utils.sheet_to_json(refWB.Sheets[refWB.SheetNames[0]], { header: 1 });
      
      const analysis = {
        reorderingApplied: this.checkReordering(baseSheet, refSheet),
        formattingApplied: this.checkFormatting(baseSheet, refSheet),
        zeroInsertionApplied: this.checkZeroInsertion(baseSheet, refSheet),
        transformationsWorking: false
      };
      
      // Determinar si las transformaciones están funcionando
      analysis.transformationsWorking = analysis.reorderingApplied || 
                                       analysis.formattingApplied || 
                                       analysis.zeroInsertionApplied;
      
      return analysis;
      
    } catch (error) {
      return { error: `Error analizando transformaciones: ${error.message}` };
    }
  }

  // =========================================================
  // FUNCIONES AUXILIARES
  // =========================================================
  
  analyzePriceColumns(sheet) {
    const priceColumns = { col3: [], col4: [] };
    
    sheet.forEach((row, index) => {
      if (Number(row[0]) === 4) { // Solo filas tipo 4
        priceColumns.col3.push({ row: index, value: row[3] });
        priceColumns.col4.push({ row: index, value: row[4] });
      }
    });
    
    return priceColumns;
  }
  
  detectStructuralDifferences(base, ref) {
    const differences = [];
    
    if (base.rows !== ref.rows) {
      differences.push(`Diferencia en filas: Base=${base.rows}, Ref=${ref.rows}`);
    }
    
    if (base.tipo4Count !== ref.tipo4Count) {
      differences.push(`Diferencia en versiones: Base=${base.tipo4Count}, Ref=${ref.tipo4Count}`);
    }
    
    return differences;
  }
  
  verifyTransformations(baseSheet, refSheet) {
    // Verificar si hay diferencias que indiquen que las transformaciones se aplicaron
    const baseVersions = baseSheet.filter(row => Number(row[0]) === 4);
    const refVersions = refSheet.filter(row => Number(row[0]) === 4);
    
    if (baseVersions.length !== refVersions.length) {
      return { status: 'TRANSFORMATIONS_APPLIED', reason: 'Diferente número de versiones' };
    }
    
    // Verificar si los precios son diferentes
    let identicalCount = 0;
    for (let i = 0; i < Math.min(baseVersions.length, refVersions.length); i++) {
      if (baseVersions[i][3] === refVersions[i][3] && baseVersions[i][4] === refVersions[i][4]) {
        identicalCount++;
      }
    }
    
    if (identicalCount === baseVersions.length) {
      return { status: 'NO_TRANSFORMATIONS', reason: 'Todos los precios son idénticos' };
    } else {
      return { status: 'TRANSFORMATIONS_APPLIED', reason: `${identicalCount}/${baseVersions.length} precios idénticos` };
    }
  }
  
  normalizePrice(price) {
    if (!price) return '';
    return String(price).trim().replace(/[^\d.,-]/g, '').replace(/[.,]/g, '');
  }
  
  checkReordering(baseSheet, refSheet) {
    // Verificar si el reordenamiento se aplicó comparando el orden de las filas
    const baseVersions = baseSheet.filter(row => Number(row[0]) === 4);
    const refVersions = refSheet.filter(row => Number(row[0]) === 4);
    
    if (baseVersions.length !== refVersions.length) return true;
    
    // Comparar orden de modelos
    for (let i = 0; i < Math.min(baseVersions.length, refVersions.length); i++) {
      if (baseVersions[i][2] !== refVersions[i][2]) {
        return true; // Diferente orden
      }
    }
    
    return false;
  }
  
  checkFormatting(baseSheet, refSheet) {
    // Verificar si el formateo se aplicó
    const baseVersions = baseSheet.filter(row => Number(row[0]) === 4);
    const refVersions = refSheet.filter(row => Number(row[0]) === 4);
    
    for (let i = 0; i < Math.min(baseVersions.length, refVersions.length); i++) {
      const baseModel = String(baseVersions[i][2] || '').trim();
      const refModel = String(refVersions[i][2] || '').trim();
      
      if (baseModel !== refModel) {
        return true; // Formateo aplicado
      }
    }
    
    return false;
  }
  
  checkZeroInsertion(baseSheet, refSheet) {
    // Verificar si se insertaron filas de separación (tipo 0)
    const baseZeros = baseSheet.filter(row => Number(row[0]) === 0).length;
    const refZeros = refSheet.filter(row => Number(row[0]) === 0).length;
    
    return refZeros > baseZeros;
  }

  // =========================================================
  // GENERACIÓN DE REPORTE
  // =========================================================
  generateDiagnosticReport(analyses) {
    const report = {
      timestamp: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      summary: {
        status: 'UNKNOWN',
        criticalIssues: [],
        warnings: [],
        recommendations: []
      },
      details: analyses
    };
    
    // Determinar estado general
    if (analyses.prices?.identicalPrices?.length > 0) {
      report.summary.status = 'CRITICAL';
      report.summary.criticalIssues.push(`Se encontraron ${analyses.prices.identicalPrices.length} precios idénticos (transformaciones no aplicadas)`);
    } else if (analyses.transformations?.transformationsWorking) {
      report.summary.status = 'OK';
    } else {
      report.summary.status = 'WARNING';
      report.summary.warnings.push('Transformaciones EBC no detectadas');
    }
    
    // Generar recomendaciones
    if (report.summary.status === 'CRITICAL') {
      report.summary.recommendations.push('Verificar que processNewData() se esté ejecutando en el worker');
      report.summary.recommendations.push('Revisar logs del worker para errores de procesamiento');
    }
    
    return report;
  }

  // =========================================================
  // GENERAR DOCUMENTO COMPLETO DE DIAGNÓSTICO
  // =========================================================
  generateDiagnosticDocument(report) {
    console.log('📄 Generando documento de diagnóstico completo...');
    
    try {
      // Crear workbook de diagnóstico
      const wb = XLSX.utils.book_new();
      
      // 1. Hoja de Resumen Ejecutivo
      this.createExecutiveSummarySheet(wb, report);
      
      // 2. Hoja de Estructura de Datos
      this.createDataStructureSheet(wb, report.details.structure);
      
      // 3. Hoja de Análisis de Precios
      this.createPriceAnalysisSheet(wb, report.details.prices);
      
      // 4. Hoja de Transformaciones EBC
      this.createTransformationAnalysisSheet(wb, report.details.transformations);
      
      // 5. Hoja de Flujo de Procesamiento
      this.createProcessingFlowSheet(wb, report.details.processing);
      
      // 6. Hoja de Plan de Acción
      this.createActionPlanSheet(wb, report);
      
      // 7. Hoja de Log Completo
      this.createLogSheet(wb, report);
      
      // Generar archivo
      const fileName = `Diagnostico_Completo_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log(`✅ Documento de diagnóstico generado: ${fileName}`);
      return fileName;
      
    } catch (error) {
      console.error('❌ Error generando documento:', error);
      return null;
    }
  }

  // =========================================================
  // CREAR HOJAS DEL DOCUMENTO
  // =========================================================
  
  createExecutiveSummarySheet(wb, report) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['REPORTE DE DIAGNÓSTICO COMPLETO'],
      [''],
      ['Fecha y Hora:', new Date().toISOString()],
      ['Duración del Análisis:', `${report.duration}ms`],
      ['Estado General:', report.summary.status],
      [''],
      ['RESUMEN EJECUTIVO'],
      [''],
      ['Problemas Críticos:', report.summary.criticalIssues.length],
      ['Advertencias:', report.summary.warnings.length],
      ['Recomendaciones:', report.summary.recommendations.length],
      [''],
      ['PROBLEMAS CRÍTICOS IDENTIFICADOS:'],
      ...report.summary.criticalIssues.map(issue => ['', issue]),
      [''],
      ['ADVERTENCIAS:'],
      ...report.summary.warnings.map(warning => ['', warning]),
      [''],
      ['RECOMENDACIONES:'],
      ...report.summary.recommendations.map(rec => ['', rec])
    ]);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen_Ejecutivo');
  }
  
  createDataStructureSheet(wb, structureData) {
    if (!structureData || structureData.error) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['ANÁLISIS DE ESTRUCTURA DE DATOS'],
        [''],
        ['Error:', structureData?.error || 'Datos no disponibles']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Estructura_Datos');
      return;
    }
    
    const ws = XLSX.utils.aoa_to_sheet([
      ['ANÁLISIS DE ESTRUCTURA DE DATOS'],
      [''],
      ['ARCHIVO BASE (Libro Azul)'],
      ['Filas:', structureData.base.rows],
      ['Columnas:', structureData.base.columns],
      ['Marcas (Tipo 1):', structureData.base.tipo1Count],
      ['Modelos (Tipo 2):', structureData.base.tipo2Count],
      ['Versiones (Tipo 4):', structureData.base.tipo4Count],
      [''],
      ['ARCHIVO REFERENCIA (EBC)'],
      ['Filas:', structureData.reference.rows],
      ['Columnas:', structureData.reference.columns],
      ['Marcas (Tipo 1):', structureData.reference.tipo1Count],
      ['Modelos (Tipo 2):', structureData.reference.tipo2Count],
      ['Versiones (Tipo 4):', structureData.reference.tipo4Count],
      [''],
      ['DIFERENCIAS ESTRUCTURALES:'],
      ...structureData.structuralDifferences.map(diff => ['', diff])
    ]);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Estructura_Datos');
  }
  
  createPriceAnalysisSheet(wb, priceData) {
    if (!priceData || priceData.error) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['ANÁLISIS DE PRECIOS'],
        [''],
        ['Error:', priceData?.error || 'Datos no disponibles']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Analisis_Precios');
      return;
    }
    
    const data = [
      ['ANÁLISIS DE INTEGRIDAD DE PRECIOS'],
      [''],
      ['RESUMEN:'],
      ['Precios Idénticos (PROBLEMA):', priceData.identicalPrices.length],
      ['Precios Diferentes (CORRECTO):', priceData.differentPrices.length],
      ['Precios Faltantes:', priceData.missingPrices.length],
      ['Precios Inválidos:', priceData.invalidPrices.length],
      [''],
      ['PRECIOS IDÉNTICOS DETECTADOS (PRIMEROS 20):'],
      ['Modelo', 'Precio Base 1', 'Precio Base 2', 'Precio Ref 1', 'Precio Ref 2', 'Fila']
    ];
    
    // Agregar precios idénticos
    priceData.identicalPrices.slice(0, 20).forEach(price => {
      data.push([
        price.model,
        price.baseP1,
        price.baseP2,
        price.refP1,
        price.refP2,
        price.row
      ]);
    });
    
    if (priceData.identicalPrices.length > 20) {
      data.push(['', '', '', '', '', `... y ${priceData.identicalPrices.length - 20} más`]);
    }
    
    data.push(['']);
    data.push(['PRECIOS DIFERENTES (PRIMEROS 10):']);
    data.push(['Modelo', 'Precio Base 1', 'Precio Base 2', 'Precio Ref 1', 'Precio Ref 2', 'Fila']);
    
    // Agregar precios diferentes
    priceData.differentPrices.slice(0, 10).forEach(price => {
      data.push([
        price.model,
        price.baseP1,
        price.baseP2,
        price.refP1,
        price.refP2,
        price.row
      ]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Analisis_Precios');
  }
  
  createTransformationAnalysisSheet(wb, transformationData) {
    if (!transformationData || transformationData.error) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['ANÁLISIS DE TRANSFORMACIONES EBC'],
        [''],
        ['Error:', transformationData?.error || 'Datos no disponibles']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Transformaciones_EBC');
      return;
    }
    
    const ws = XLSX.utils.aoa_to_sheet([
      ['ANÁLISIS DE TRANSFORMACIONES EBC'],
      [''],
      ['ESTADO DE TRANSFORMACIONES:'],
      ['Reordenamiento Aplicado:', transformationData.reorderingApplied ? 'SÍ' : 'NO'],
      ['Formateo Aplicado:', transformationData.formattingApplied ? 'SÍ' : 'NO'],
      ['Inserción de Ceros Aplicada:', transformationData.zeroInsertionApplied ? 'SÍ' : 'NO'],
      [''],
      ['RESULTADO GENERAL:'],
      ['Transformaciones Funcionando:', transformationData.transformationsWorking ? 'SÍ' : 'NO'],
      [''],
      ['INTERPRETACIÓN:'],
      ['', 'Si las transformaciones NO están funcionando:'],
      ['', '- Los precios serán idénticos entre archivos'],
      ['', '- No se aplicarán reordenamientos'],
      ['', '- No se insertarán filas de separación'],
      ['', '- El archivo EBC será una copia exacta del Libro Azul'],
      [''],
      ['', 'Si las transformaciones SÍ están funcionando:'],
      ['', '- Los precios deberían ser diferentes'],
      ['', '- Se aplicarán reordenamientos'],
      ['', '- Se insertarán filas de separación'],
      ['', '- El archivo EBC tendrá transformaciones aplicadas']
    ]);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Transformaciones_EBC');
  }
  
  createProcessingFlowSheet(wb, processingData) {
    if (!processingData || processingData.error) {
      const ws = XLSX.utils.aoa_to_sheet([
        ['ANÁLISIS DE FLUJO DE PROCESAMIENTO'],
        [''],
        ['Error:', processingData?.error || 'Datos no disponibles']
      ]);
      XLSX.utils.book_append_sheet(wb, ws, 'Flujo_Procesamiento');
      return;
    }
    
    const ws = XLSX.utils.aoa_to_sheet([
      ['ANÁLISIS DE FLUJO DE PROCESAMIENTO'],
      [''],
      ['ARCHIVO BASE (Libro Azul):'],
      ['Filas Originales:', processingData.baseProcessing.rawRows],
      ['Filas Procesadas:', processingData.baseProcessing.processedRows],
      ['Transformaciones Aplicadas:', processingData.baseProcessing.transformationsApplied.join(', ')],
      [''],
      ['ARCHIVO REFERENCIA (EBC):'],
      ['Filas Originales:', processingData.referenceProcessing.rawRows],
      ['Filas Procesadas:', processingData.referenceProcessing.processedRows],
      ['Transformaciones Aplicadas:', processingData.referenceProcessing.transformationsApplied.join(', ')],
      [''],
      ['ESTADO DE TRANSFORMACIONES:'],
      ['Estado:', processingData.transformationStatus?.status || 'Desconocido'],
      ['Razón:', processingData.transformationStatus?.reason || 'No disponible'],
      [''],
      ['INTERPRETACIÓN:'],
      ['', 'Si el estado es "NO_TRANSFORMATIONS":'],
      ['', '- Las transformaciones EBC no se están aplicando'],
      ['', '- Todos los precios serán idénticos'],
      ['', '- El archivo EBC será una copia exacta'],
      [''],
      ['', 'Si el estado es "TRANSFORMATIONS_APPLIED":'],
      ['', '- Las transformaciones EBC se están aplicando'],
      ['', '- Los precios deberían ser diferentes'],
      ['', '- El archivo EBC tendrá modificaciones']
    ]);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Flujo_Procesamiento');
  }
  
  createActionPlanSheet(wb, report) {
    const data = [
      ['PLAN DE ACCIÓN PARA RESOLVER EL PROBLEMA'],
      [''],
      ['Prioridad', 'Acción', 'Descripción', 'Tiempo Est.', 'Responsable']
    ];
    
    if (report.summary.status === 'CRITICAL') {
      data.push(['ALTA', 'Verificar Worker', 'Revisar que processNewData() se ejecute en el worker', '30 min', 'Desarrollador']);
      data.push(['ALTA', 'Revisar Logs', 'Analizar logs del worker para errores', '15 min', 'Desarrollador']);
      data.push(['ALTA', 'Verificar Configuración', 'Confirmar que las transformaciones estén habilitadas', '10 min', 'Usuario']);
    } else if (report.summary.status === 'WARNING') {
      data.push(['MEDIA', 'Revisar Transformaciones', 'Verificar que todas las transformaciones se apliquen', '20 min', 'Desarrollador']);
      data.push(['MEDIA', 'Validar Datos', 'Confirmar que los datos de entrada sean correctos', '15 min', 'Usuario']);
    } else {
      data.push(['BAJA', 'Monitoreo Continuo', 'Verificar que el sistema siga funcionando correctamente', '5 min', 'Usuario']);
    }
    
    data.push(['']);
    data.push(['RECOMENDACIONES ESPECÍFICAS:']);
    report.summary.recommendations.forEach(rec => {
      data.push(['', '', rec, '', '']);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Plan_Accion');
  }
  
  createLogSheet(wb, report) {
    const data = [
      ['LOG COMPLETO DE DIAGNÓSTICO'],
      [''],
      ['Timestamp', 'Módulo', 'Función', 'Mensaje', 'Tipo']
    ];
    
    // Agregar entradas de log
    data.push([new Date().toISOString(), 'Sistema', 'DiagnosticoCompleto', 'Inicio del diagnóstico', 'INFO']);
    data.push([new Date().toISOString(), 'Sistema', 'DiagnosticoCompleto', `Estado final: ${report.summary.status}`, 'INFO']);
    
    if (report.summary.criticalIssues.length > 0) {
      report.summary.criticalIssues.forEach(issue => {
        data.push([new Date().toISOString(), 'Análisis', 'CriticalIssue', issue, 'ERROR']);
      });
    }
    
    if (report.summary.warnings.length > 0) {
      report.summary.warnings.forEach(warning => {
        data.push([new Date().toISOString(), 'Análisis', 'Warning', warning, 'WARNING']);
      });
    }
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Log_Completo');
  }

  // =========================================================
  // MOSTRAR RESULTADOS (ACTUALIZADO)
  // =========================================================
  displayResults(report) {
    console.log('🔍 ===== REPORTE DE DIAGNÓSTICO =====');
    console.log(`📊 Estado: ${report.summary.status}`);
    console.log(`⏱️ Duración: ${report.duration}ms`);
    
    if (report.summary.criticalIssues.length > 0) {
      console.log('🚨 PROBLEMAS CRÍTICOS:');
      report.summary.criticalIssues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    if (report.summary.warnings.length > 0) {
      console.log('⚠️ ADVERTENCIAS:');
      report.summary.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
    
    if (report.summary.recommendations.length > 0) {
      console.log('💡 RECOMENDACIONES:');
      report.summary.recommendations.forEach(rec => console.log(`   - ${rec}`));
    }
    
    // Mostrar detalles específicos
    if (report.details.prices?.identicalPrices?.length > 0) {
      console.log('🔍 PRECIOS IDÉNTICOS DETECTADOS:');
      report.details.prices.identicalPrices.slice(0, 5).forEach(price => {
        console.log(`   - ${price.model}: Base=${price.baseP1}, Ref=${price.refP1}`);
      });
      if (report.details.prices.identicalPrices.length > 5) {
        console.log(`   ... y ${report.details.prices.identicalPrices.length - 5} más`);
      }
    }
    
    console.log('🔍 ===== FIN REPORTE =====');
    
    // Generar documento completo
    const fileName = this.generateDiagnosticDocument(report);
    if (fileName) {
      console.log(`📄 Documento completo generado: ${fileName}`);
    }
  }
}

// =========================================================
// EXPORTAR PARA USO
// =========================================================
if (typeof self !== 'undefined') {
  // En Web Worker
  self.DiagnosticSystem = DiagnosticSystem;
} else if (typeof window !== 'undefined') {
  // En navegador
  window.DiagnosticSystem = DiagnosticSystem;
} else if (typeof module !== 'undefined') {
  // En Node.js
  module.exports = DiagnosticSystem;
}

console.log('🔍 Sistema de diagnóstico listo para usar');
