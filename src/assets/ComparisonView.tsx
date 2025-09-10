// src/assets/ComparisonView.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import "../App.css"; // Asegúrate que la ruta a App.css sea correcta
import * as XLSX from "xlsx"; // Necesario para parseo en hilo principal (para modalData)
import { Button, CircularProgress, Typography, Box, Alert } from "@mui/material"; 
// Otros imports que necesites para PDF, Ventanas Flotantes, etc.
import pdfjsLib from "./pdfWorker"; // Ajusta ruta si es necesario
import FloatingWindow from "./FloatingWindow.jsx"; // Ajusta ruta si es necesario
import DataModal from '../components/DataModal';
import EditableExcelTable from '../components/EditableExcelTable'; 
import { ComparisonViewer } from '../components/ComparisonViewer'; // El viewer simplificado
import ResizableModal from '../components/ResizableModal';
import { Pagination } from '@mui/material';

/* ============================================================
   LÓGICA DE TRANSFORMACIÓN (para Archivo Nuevo)
   ============================================================ */

// 1. Extrae el año y texto restante de una cadena
function parseYearAndNote(text: string): { year: number; note: string } {
  const match = text.match(/\b(19|20)\d{2}\b/);
  if (!match) return { year: 0, note: text.trim() };
  const year = Number(match[0]);
  const note = text.replace(match[0], "").trim();
  return { year, note };
}

// 2. Prioridad para ordenar condiciones
function getNotePriority(note: string): number {
  const lower = note.toLowerCase();
  if (lower.includes("nueva")) return 1;
  if (lower.includes("usada")) return 2;
  return 3;
}

// 3. Corrige ceros incorrectos y mantiene solo los correctos
/** Los ceros deben estar ANTES de marcas (tipo 1) o modelos (tipo 2)
 *  Patrones correctos: 3,4,4,0,1,2,3,4 o 4,4,4,0,2,3,4
 *  REGLAS:
 *  - NO agregar ceros en las primeras 10 filas
 *  - NO crear secuencias incorrectas como 1,0,2
 *  - ELIMINAR ceros incorrectos que ya existen
 */
function adjustTipoColumn(rows: any[][]): any[][] {
  const result: any[][] = [];
  
  if (process.env.NODE_ENV === 'development') {
    console.log("🔧 Ajustando ceros...");
  }
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const tipo = Number(row[0]);
    
    // REGLA 1: NO agregar ceros en las primeras 10 filas
    if (i < 10) {
      result.push(row);
      continue;
    }
    
    // Si es un cero, verificar si es correcto o incorrecto
    if (tipo === 0) {
      const nextRow = i + 1 < rows.length ? rows[i + 1] : null;
      const nextTipo = nextRow ? Number(nextRow[0]) : null;
      const prevRow = result.length > 0 ? result[result.length - 1] : null;
      const prevTipo = prevRow ? Number(prevRow[0]) : null;
      
      // REGLA ESPECIAL: NO permitir secuencia 1,0,2
      if (prevTipo === 1 && nextTipo === 2) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🚫 Eliminando cero incorrecto en fila ${i}: secuencia 1,0,2 no permitida`);
        }
        continue;
      }
      
      // Si el cero está antes de tipo 1 o tipo 2, es correcto
      if (nextTipo === 1 || nextTipo === 2) {
        result.push(row);
      }
      continue;
    }
    
    // Si es tipo 1 (marca) o tipo 2 (modelo), verificar si necesita cero antes
    if (tipo === 1 || tipo === 2) {
      const prevRow = result.length > 0 ? result[result.length - 1] : null;
      const prevTipo = prevRow ? Number(prevRow[0]) : null;
      
      // REGLA 2: NO crear secuencias incorrectas como 1,0,2
      if (tipo === 2 && prevTipo === 1) {
        result.push(row);
        continue;
      }
      
      // Si la fila anterior NO es un cero, insertar uno
      if (prevTipo !== 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Insertando cero antes de tipo ${tipo} en fila ${i}`);
        }
        result.push([0, ...Array(row.length - 1).fill('')]);
      }
    }
    
    // Agregar la fila actual
    result.push(row);
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Ajuste de ceros completado: ${result.length} filas`);
  }
  return result;
}




// 4. Reordena años y condiciones dentro de una sección
function reorderYearsInSection(sectionRows: any[][]): any[][] {
  const yearBlocks: { year: number; rows: any[][] }[] = [];
  let currentYearBlock: { year: number; rows: any[][] } | null = null;
  const result: any[][] = [];
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Reordenando sección: ${sectionRows.length} filas`);
  }

  // Primera pasada: Agrupar por año y detectar patrones
  for (let i = 0; i < sectionRows.length; i++) {
    const row = sectionRows[i];
    const tipo = Number(row[0]);

    if (tipo === 3) {
      const versionText = row[2] || "";
      
      // Extraer año del texto
      const yearMatch = versionText.match(/(\d{4})/);
      const year = yearMatch ? Number(yearMatch[1]) : 0;
      
      // Verificar si ya existe un bloque para este año
      const existingBlock = yearBlocks.find(block => block.year === year);
      
      if (existingBlock) {
        // Si ya existe, agregar a ese bloque (para detectar múltiples Tipo 3 del mismo año)
        existingBlock.rows.push(row);
      } else {
        // Si no existe, crear nuevo bloque
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
  
  // Segunda pasada: Procesar cada bloque de año
  yearBlocks.forEach((yearBlock, index) => {
    const modelName = sectionRows[0]?.[2] || "";
    
    // Procesar cada fila Tipo 3 individualmente
    const tipo3Rows = yearBlock.rows.filter(row => Number(row[0]) === 3);
    const versionRows = yearBlock.rows.filter(row => Number(row[0]) === 4);
    
    // Procesar cada fila Tipo 3
    tipo3Rows.forEach((tipo3Row, tipo3Index) => {
      const text = tipo3Row[2] || "";
      
      // CORRECCIÓN: Detectar frases en row[2] (datos crudos) y extraerlas
      const hasNewUnits = text.includes('Unidades Nuevas');
      const hasUsedUnits = text.includes('Unidades Usadas');
      
      if (hasNewUnits || hasUsedUnits) {
        // Extraer año y modelo del texto original
        const yearMatch = text.match(/(\d{4})\s+([^-]+)/);
        const year = yearMatch ? yearMatch[1] : '';
        const model = yearMatch ? yearMatch[2].trim() : '';
        
        // Crear nueva fila con la frase movida a row[3]
        const newRow = [...tipo3Row];
        newRow[2] = `${year} ${model}`.trim(); // Solo año y modelo
        newRow[3] = hasNewUnits ? 'Unidades Nuevas' : 'Unidades Usadas'; // Frase en columna 3
        
        result.push(newRow);
        
        // Agregar las versiones correspondientes
        for (const versionRow of versionRows) {
          result.push(versionRow);
        }
      } else {
        // No tiene frases - mantener estructura original
        result.push([...tipo3Row]); // Copiar fila sin modificar
        
        // Agregar las versiones correspondientes
        for (const versionRow of versionRows) {
          result.push(versionRow);
        }
      }
    });
  });
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Reordenamiento completado: ${result.length} filas`);
  }
  
  return result;
}

// 5. Aplica reordenamiento a todo el archivo
function reorderAll(worksheet: any[][]): any[][] {
  if (!worksheet || worksheet.length === 0) return [];
  const header = worksheet[0];
  const dataRows = worksheet.slice(1);
  const result: any[][] = [header];

  let currentSection: any[][] = [];
  let inSection = false;

  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 Reordenando archivo: ${dataRows.length} filas de datos`);
  }

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const tipo = Number(row[0]);

    if (tipo === 2) {
      // Procesar la sección anterior si existe
      if (inSection && currentSection.length > 0) {
        const sectionName = currentSection[0]?.[2] || 'desconocido';
        const reordered = reorderYearsInSection(currentSection);
        result.push(...reordered);
        inSection = false;
        currentSection = [];
      }
      // Iniciar nueva sección con el Tipo 2
      currentSection = [row];
      inSection = true;
    } else if (tipo === 1) {
      // Procesar la sección anterior si existe
      if (inSection && currentSection.length > 0) {
        const reordered = reorderYearsInSection(currentSection);
        result.push(...reordered);
        inSection = false;
        currentSection = [];
      }
      // Agregar la fila tipo 1 (marca) directamente
      result.push(row);
    } else if (inSection) {
      // Agregar a la sección actual
      currentSection.push(row);
    } else {
      // Preservar otras filas que están fuera de secciones
      result.push(row);
    }
  }

  // Procesar la última sección si existe
  if (inSection && currentSection.length > 0) {
    const reordered = reorderYearsInSection(currentSection);
    result.push(...reordered);
  }

  if (process.env.NODE_ENV === 'development') {
    console.log(`✅ Reordenamiento de archivo completado: ${result.length} filas totales`);
  }
  return result;
}

// 6. Formatea modelos, versiones, condiciones y limpia campos
function formatVehicleData(data: any[][]): any[][] {
  const formattedData = [];
  let currentModel = '';
  if (data.length > 0) formattedData.push(data[0]);

  for (let i = 1; i < data.length; i++) {
    const row = [...data[i]];
    const rowType = Number(row[0]) || 0;

    if (rowType === 2) {
      // Si es un modelo nuevo, actualiza currentModel
      if (typeof row[2] === 'string' && row[2].trim() !== '') {
        currentModel = row[2].trim();
      } else {
        currentModel = ''; // Evita arrastrar modelos vacíos
      }
      formattedData.push(row);
    } else if (rowType === 3) {
      const versionText = row[2] || '';
      const yearMatch = versionText.match(/(20\d{2})/);
      const conditionMatch = versionText.match(/Unidades (Nuevas|Usadas)/);
      const year = yearMatch ? yearMatch[1] : '';
      
      // Verificar si ya tiene una frase asignada en el índice 3
      const existingPhrase = row[3] || '';
      
      // CORRECCIÓN: Solo preservar frases que ya están en row[3], NO asignar nuevas
      if (existingPhrase && existingPhrase.includes('Unidades')) {
        // Preservar frase existente en row[3]
      } else {
        // NO asignar nueva frase - mantener row[3] vacío
        row[3] = '';
      }
      
      // Formatear el texto del año y modelo
      if (currentModel && year) {
        row[2] = `${year} ${currentModel}`.trim();
      } else {
        row[2] = `${year} ${row[2]}`.trim(); // Usa lo que haya
      }
      
      if (row.length > 4) row[4] = '';
      
      formattedData.push(row);
    } else if (rowType === 4) {
      if (typeof row[3] === 'string') {
        row[3] = row[3].replace('Lista', '').trim();
      }
      formattedData.push(row);
    } else {
      formattedData.push(row);
    }
  }

  return formattedData;
}

// 7. PROCESO PRINCIPAL DE TRANSFORMACIÓN
function processNewData(worksheet: any[][]): any[][] {
  if (!worksheet || worksheet.length === 0) return [];

  if (process.env.NODE_ENV === 'development') {
    console.log("🔄 Procesando datos:", worksheet.length, "filas");
  }

  const newData = JSON.parse(JSON.stringify(worksheet));
  const result: any[][] = [newData[0]]; // Encabezado

  let filaOriginal = 1; // Empieza después del header

  // Regla especial: eliminar ceros solo en filas 1 y 3 (índices 1 y 3) si están en las primeras 10 filas
  const rowsToDelete = [1, 3];
  for (let i = rowsToDelete.length - 1; i >= 0; i--) {
    const idx = rowsToDelete[i];
    if (idx < 10 && newData[idx] && Number(newData[idx][0]) === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🗑️ Eliminando cero en fila ${idx + 1}`);
      }
      newData.splice(idx, 1);
    }
  }

  for (let i = 1; i < newData.length; i++, filaOriginal++) {
    const currentRow = newData[i];
    const tipo = Number(currentRow[0]);
    const prevRow = result[result.length - 1];
    const prevTipo = Number(prevRow?.[0]);

    const estaEnPrimeras10Filas = filaOriginal < 10;
    const esMarcaOMod = tipo === 1 || tipo === 2;
    const prevNoEsCero = prevTipo !== 0;

    // En filas >10, solo insertar ceros si no hay uno antes
    if (!estaEnPrimeras10Filas && esMarcaOMod && prevNoEsCero) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Insertando cero antes de fila ${filaOriginal + 1} (Tipo ${tipo})`);
      }
      result.push([0, ...Array(currentRow.length - 1).fill('')]);
    }

    // En filas >10, no eliminar ningún cero ya existente
    if (!(tipo === 0 && filaOriginal >= 10)) {
      result.push(currentRow);
    } else {
      result.push(currentRow);
    }
  }

  const reordered = reorderAll(result);            // Reordenar PRIMERO (aplicar frases)
  const formatted = formatVehicleData(reordered);  // Aplicar formatos DESPUÉS
  const withZeros = adjustTipoColumn(formatted);
  
  if (process.env.NODE_ENV === 'development') {
    console.log("✅ Procesamiento completado:", withZeros.length, "filas");
  }

  return withZeros;
}






// Formatea datos SÓLO para el modal de vista previa "Nuevo (Modificado)"
function formatVehicleDataForModal(data: any[][]): any[][] { 
  const formattedData = [];
  let currentModel = '';
  if (data.length > 0 && Array.isArray(data[0])) {
      formattedData.push(data[0]); 
  } else {
      return [['Error: Cabecera inválida en datos para modal']];
  }
  
  for (let i = 1; i < data.length; i++) {
    if (!Array.isArray(data[i]) || data[i].length < 3) { 
        console.warn(`Fila ${i} inválida para formatVehicleDataForModal`, data[i]);
        continue; 
    }
    const row = [...data[i]]; 
    const rowType = Number(row[0]) || 0;

    if (rowType === 2) { 
        currentModel = String(row[2] ?? ''); 
        formattedData.push(row); 
    } else if (rowType === 3) {
      const versionText = String(row[2] ?? '');
      const yearMatch = versionText.match(/(20\d{2})/);
      const conditionMatch = versionText.match(/Unidades (Nuevas|Usadas)/i); 
      const year = yearMatch ? yearMatch[1] : '';
      const condition = conditionMatch ? conditionMatch[0] : ''; 
      row[2] = `${year} ${currentModel}`.trim(); 
      row[3] = condition; 
      if(row.length > 4) row[4] = ''; 
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

// ============================================================
// === Componente Principal ComparisonView =====================
// ============================================================
function ComparisonView() {
  // Contenidos crudos leídos de los archivos
  const [newFileContent, setNewFileContent] = useState<string | ArrayBuffer | null>(null);
  const [baseFileContent, setBaseFileContent] = useState<string | ArrayBuffer | null>(null);
  
  // Estado para el modal "Nuevo Modificado"
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any[][] | null>(null); // Datos procesados para este modal

  // Datos Base procesados listos para mostrar en Comparación (recibidos del worker)
  const [comparisonDisplayData, setComparisonDisplayData] = useState<any[][] | null>(null);
  
  // Resultado (solo diferencias) del Worker
  const [processedBaseData, setProcessedBaseData] = useState<any[][] | null>(null);
  const [comparisonDifferences, setComparisonDifferences] = useState<Set<string> | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [debugExamples, setDebugExamples] = useState<any[]>([]); // Para guardar ejemplos del worker
  
  // Estados de UI generales
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [zIndices, setZIndices] = useState({ archivo: 1300, comparacion: 1301 });
  const [activeModal, setActiveModal] = useState<'archivo' | 'comparacion' | null>(null);
  const [frontModal, setFrontModal] = useState<'archivo' | 'comparacion' | null>(null);
  const [activeModals, setActiveModals] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  // Estados para otras ventanas flotantes
  const [pdfFile, setPdfFile] = useState<ArrayBuffer | null>(null); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPdfWindowOpen, setIsPdfWindowOpen] = useState(false);
  const [isPreviewWindowOpen, setIsPreviewWindowOpen] = useState(false);
  const [minimizedWindows, setMinimizedWindows] = useState<string[]>([]);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  // Efecto para cerrar la barra cuando no hay ventanas minimizadas
  useEffect(() => {
    if (minimizedWindows.length === 0) {
      setShowFloatingBar(false);
    }
  }, [minimizedWindows]);

  // Efecto para manejar el orden de los modales automáticamente
  useEffect(() => {
    if (modalOpen && isComparisonModalOpen) {
      // Si ambos están abiertos, el último en abrirse va al frente
      if (activeModal === 'archivo') {
        setZIndices({ archivo: 1400, comparacion: 1300 });
      } else if (activeModal === 'comparacion') {
        setZIndices({ archivo: 1300, comparacion: 1400 });
      }
    }
  }, [modalOpen, isComparisonModalOpen, activeModal]);

  // Efecto para establecer modal activo cuando se abre
  useEffect(() => {
    if (modalOpen && !isComparisonModalOpen) {
      setActiveModal('archivo');
      setFrontModal('archivo');
      setZIndices({ archivo: 1400, comparacion: 1300 });
    }
  }, [modalOpen, isComparisonModalOpen]);

  useEffect(() => {
    if (isComparisonModalOpen && !modalOpen) {
      setActiveModal('comparacion');
      setFrontModal('comparacion');
      setZIndices({ archivo: 1300, comparacion: 1400 });
    }
  }, [isComparisonModalOpen, modalOpen]);

  // Efecto para manejar cuando ambos modales están abiertos
  useEffect(() => {
    if (modalOpen && isComparisonModalOpen) {
      // Si ambos están abiertos, el último en activarse va al frente
      if (activeModal === 'archivo') {
        setZIndices({ archivo: 1400, comparacion: 1300 });
      } else if (activeModal === 'comparacion') {
        setZIndices({ archivo: 1300, comparacion: 1400 });
      }
    }
  }, [modalOpen, isComparisonModalOpen, activeModal]);

  // Efecto para forzar re-render cuando cambie el modal al frente
  useEffect(() => {
    console.log("🔄 Modal al frente cambiado:", frontModal);
  }, [frontModal]);

  // Indicador físico siempre visible - VERSIÓN ROBUSTA
  const minimizedIndicator = useMemo(() => (
    <div 
      className={`minimized-indicator ${minimizedWindows.length > 0 ? 'active' : 'inactive'}`}
      onClick={() => {
        if (minimizedWindows.length > 0) {
          setShowFloatingBar(prev => !prev);
        }
      }}
      title={minimizedWindows.length > 0 
        ? `${minimizedWindows.length} ventana${minimizedWindows.length > 1 ? 's' : ''} minimizada${minimizedWindows.length > 1 ? 's' : ''} - Click para abrir`
        : 'No hay ventanas minimizadas'
      }
    >
      {minimizedWindows.length > 0 ? minimizedWindows.length : '0'}
    </div>
  ), [minimizedWindows.length]);

  // Memoizar la barra flotante para evitar re-renders innecesarios
  const floatingBar = useMemo(() => {
    if (minimizedWindows.length === 0 || !showFloatingBar) return null;
    
    return (
      <div className="floating-minimized-bar">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px',
          paddingBottom: '10px',
          borderBottom: '1px solid #4CAF50'
        }}>
          <div className="floating-minimized-title" style={{ margin: 0, padding: 0, border: 'none' }}>
            📋 Ventanas Minimizadas
          </div>
          <button
            className="floating-close-button"
            onClick={() => setShowFloatingBar(false)}
            title="Cerrar barra"
          >
            ✕
          </button>
        </div>
        <div className="floating-minimized-content">
          {minimizedWindows.map((windowName, index) => (
            <button
              key={index}
              className="floating-restore-button"
              onClick={() => {
                handleRestoreWindow(windowName);
              }}
            >
              🔄 {windowName}
            </button>
          ))}
        </div>
      </div>
    );
  }, [minimizedWindows, showFloatingBar]);
  const [previewData, setPreviewData] = useState<any[][] | null>(null); // Datos raw para preview


  const workerRef = useRef<Worker | null>(null);

  const PAGE_SIZE = 100;
  const [newPage, setNewPage] = useState(1);
  const [comparePage, setComparePage] = useState(1);


  // LIMPIEZA INTELIGENTE AL INICIALIZAR LA APLICACIÓN
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🚀 Inicializando aplicación...");
    }
    
    // Solo limpiar datos de archivos, mantener configuración de UI
    setNewFileContent(null);
    setBaseFileContent(null);
    setModalData(null);
    setComparisonDisplayData(null);
    setProcessedBaseData(null);
    setComparisonDifferences(null);
    setComparisonError(null);
    setDebugExamples([]);
    setPreviewData(null);
    
    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Estados de archivos limpiados al inicializar");
    }
  }, []);

  // Limpieza del worker al desmontar
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        console.log("Terminando worker...");
        workerRef.current.terminate();
      }
    };
  }, []);

  // --- Funciones Z-index ---
  const bringArchivoFront = () => {
    console.log("🔝 Traer Archivo al frente");
    setFrontModal('archivo');
    setZIndices({ archivo: 1400, comparacion: 1300 });
    setActiveModal('archivo');
    // Mantener ambos modales activos
    setActiveModals(prev => new Set([...prev, 'archivo']));
    // Forzar re-render inmediato
    setTimeout(() => {
      setZIndices(prev => ({ ...prev }));
    }, 10);
  };
  const bringComparacionFront = () => {
    console.log("🔝 Traer Comparación al frente");
    setFrontModal('comparacion');
    setZIndices({ archivo: 1300, comparacion: 1400 });
    setActiveModal('comparacion');
    // Mantener ambos modales activos
    setActiveModals(prev => new Set([...prev, 'comparacion']));
    // Forzar re-render inmediato
    setTimeout(() => {
      setZIndices(prev => ({ ...prev }));
    }, 10);
  };
  
  // --- FUNCIÓN DE LIMPIEZA INTELIGENTE ---
  const limpiarCompletamente = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log("🧹 Limpieza inteligente iniciada");
    }
    
    // Limpiar solo datos de archivos y comparación
    setNewFileContent(null);
    setBaseFileContent(null);
    setModalData(null);
    setComparisonDisplayData(null);
    setProcessedBaseData(null);
    setComparisonDifferences(null);
    setComparisonError(null);
    setDebugExamples([]);
    setPreviewData(null);
    setPdfFile(null);
    
    // Resetear páginas
    setNewPage(1);
    setComparePage(1);
    
    // Limpiar input files
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input: any) => {
      if (input) input.value = '';
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log("✅ Limpieza inteligente completada");
    }
    
    alert("🧹 Datos limpiados correctamente");
  };
  
  // --- Funciones Ventanas Flotantes ---
  const handleClosePdfWindow = () => setIsPdfWindowOpen(false);
  const handleClosePreviewWindow = () => setIsPreviewWindowOpen(false);
   const handleMinimizeWindow = (title: string) => {
    setMinimizedWindows(prev => [...prev, title]);
    if (title === "PDF") setIsPdfWindowOpen(false);
    if (title === "Vista Previa") setIsPreviewWindowOpen(false);
    // Considera si necesitas la ventana "Nuevo" separada
  };
  const restoreWindow = (title: string) => {
    setMinimizedWindows(prev => prev.filter(t => t !== title));
    if (title === "PDF") setIsPdfWindowOpen(true);
    if (title === "Vista Previa") setIsPreviewWindowOpen(true);
    // if (title === "Nuevo") setIsNewWindowOpen(true);
  };

  const handleRestoreWindow = (windowName: string) => {
    setMinimizedWindows(prev => prev.filter(t => t !== windowName));
    if (windowName === "PDF") setIsPdfWindowOpen(true);
    if (windowName === "Vista Previa") setIsPreviewWindowOpen(true);
    if (windowName === "Archivo Nuevo") {
      setModalOpen(true);
      setActiveModal('archivo');
      setZIndices({ archivo: 1400, comparacion: 1300 });
    }
    if (windowName === "Comparación") {
      setIsComparisonModalOpen(true);
      setActiveModal('comparacion');
      setZIndices({ archivo: 1300, comparacion: 1400 });
    }
  };
  
   const renderPdf = useCallback(() => { 
    const canvas = canvasRef.current;
    if (!canvas || !pdfFile) return;
    const context = canvas.getContext('2d');
    if (!context) return;
     try {
       const loadingTask = pdfjsLib.getDocument(pdfFile); 
       loadingTask.promise.then(pdf => {
         pdf.getPage(1).then(page => {
           const viewport = page.getViewport({ scale: 1.5 });
           canvas.height = viewport.height;
           canvas.width = viewport.width;
           const renderContext = { canvasContext: context, viewport: viewport };
           page.render(renderContext);
         });
       }).catch(pdfError => {
           console.error("Error al cargar PDF:", pdfError);
           alert(`Error al cargar PDF: ${pdfError.message}`);
       });
     } catch (error) {
        console.error("Error renderizando PDF:", error);
        alert("Error inesperado al mostrar PDF.");
     }
   }, [pdfFile]); 

   useEffect(() => {
     if (isPdfWindowOpen && pdfFile && canvasRef.current) {
       renderPdf();
     }
   }, [isPdfWindowOpen, pdfFile, renderPdf]);


  // Función para cargar archivos 
 // Función para cargar archivos OPTIMIZADA
 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'new' | 'base' | 'pdf') => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (process.env.NODE_ENV === 'development') {
    console.log(`📁 Cargando archivo: ${type} - ${file.name} (${file.size} bytes)`);
  }

  // --- LIMPIEZA INTELIGENTE BASADA EN TIPO ---
  if (type === 'new') {
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 Limpiando datos para archivo nuevo");
      }
      
      // Limpiar solo estados relacionados con archivos
      setComparisonDisplayData(null); 
      setComparisonDifferences(null);
      setComparisonError(null);
      setDebugExamples([]);
      setModalData(null);
      setNewFileContent(null);
      setPreviewData(null);
      setProcessedBaseData(null);
      setNewPage(1);
      
  } else if (type === 'base') {
      if (process.env.NODE_ENV === 'development') {
        console.log("🔄 Limpiando datos para archivo base");
      }
      setBaseFileContent(null);
      setComparisonDisplayData(null);
      setComparisonDifferences(null);
      setComparisonError(null);
      setDebugExamples([]);
      setProcessedBaseData(null);
      setComparePage(1);
  }
  // --- FIN LIMPIEZA INTELIGENTE ---

  if (type === 'pdf') { 
      const reader = new FileReader();
      reader.onload = (event) => {
          if(event.target?.result instanceof ArrayBuffer) { 
              setPdfFile(event.target.result); 
          } else { console.error("FileReader no devolvió ArrayBuffer para PDF"); }
      }
      reader.onerror = (error) => console.error("Error FileReader PDF:", error);
      reader.readAsArrayBuffer(file); 
  } else { // 'new' or 'base'
      const reader = new FileReader();
      reader.onload = (event) => {
          const fileContent = event.target?.result;
          if (!fileContent || typeof fileContent !== 'string') { 
              console.error("FileReader no devolvió string binario para Excel");
              alert("Error leyendo contenido del archivo Excel.");
              return; 
          }
          


          if (type === 'new') {
              if (process.env.NODE_ENV === 'development') {
                console.log("📄 Archivo Nuevo cargado correctamente");
              }
              
              setNewFileContent(fileContent); // Guardar contenido NUEVO
              
              // Procesar SOLO para el modal de vista previa
              try {
                  if (process.env.NODE_ENV === 'development') {
                    console.log("🔄 Procesando vista previa...");
                  }
                  
                  const workbook = XLSX.read(fileContent, { type: 'binary', cellStyles:false, sheetStubs: true });
                  const sheetName = workbook.SheetNames[0];
                  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', blankrows: false }); 
                  
                  const processedPreview = processNewData(worksheet);
                  
                  setPreviewData(processedPreview);
                  setModalData(processedPreview);
                  setNewPage(1);  
                  
                  if (process.env.NODE_ENV === 'development') {
                    console.log("✅ Vista previa procesada correctamente");
                  }
              } catch (error: any) { 
                  console.error("❌ Error al procesar vista previa:", error);
                  setModalData([['Error al procesar vista previa:', error.message]]);
              }
          } else if (type === 'base') {
              if (process.env.NODE_ENV === 'development') {
                console.log("📄 Archivo Base cargado correctamente");
              }
              setBaseFileContent(fileContent); // Guardar contenido BASE
          }
      };
      reader.onerror = (error) => { console.error("Error FileReader:", error); alert("Error al leer archivo.");};
      reader.readAsBinaryString(file); 
  }
}

  // Función para INICIAR COMPARACIÓN EN WORKER (OPTIMIZADA)
  const processAndCompare = useCallback(() => {
    // 1. Validar que tenemos el contenido crudo de ambos archivos
    if (!baseFileContent || !newFileContent) {
      alert("Carga ambos archivos (Base y Nuevo) primero.");
      return;
    }

    // 2. Terminar cualquier worker anterior si estuviera activo
    if (workerRef.current && workerRef.current.readyState !== Worker.CLOSED) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Terminando worker anterior...");
        }
        workerRef.current.terminate();
    }

    // 3. Actualizar estado de UI para indicar inicio de comparación
    if (process.env.NODE_ENV === 'development') {
      console.log("🚨🚨🚨 INICIANDO COMPARACIÓN CON WORKER v16 🚨🚨🚨");
    }
    setIsComparing(true);
    setComparisonError(null);
    setProcessedBaseData(null);
    setComparisonDifferences(null);
    setDebugExamples([]); 
    setIsComparisonModalOpen(true);

    try {
        // 4. Crear el nuevo Worker v16 (VERSIÓN FUNCIONAL)
        const cacheBuster = `${Date.now()}_${Math.random()}_${Math.random()}_${Math.random()}`;
        const workerUrl = `/comparisonWorker.js?v=${cacheBuster}&force=true&nocache=true&v16=true`;
        console.log(`🚨🚨🚨 CREANDO WORKER v16 🚨🚨🚨`);
        console.log(`🚀 URL: ${workerUrl}`);
        workerRef.current = new Worker(workerUrl); 

        // 5. Definir cómo manejar los mensajes RECIBIDOS del worker
        workerRef.current.onmessage = (event) => { 
             // Verificar que event.data no sea null
             if (!event.data) {
               console.warn("Mensaje del worker sin datos:", event);
               return;
             }
             
             const { displayData, differences, error, debugExamples: examples, type, message, timestamp, data, filename } = event.data;
             
             // Capturar logs del worker
             if (type === 'LOG') {
               const logEntry = `[${timestamp}] ${message}`;
               console.log(`📝 LOG WORKER: ${message}`);
               setLogs(prev => [...prev, logEntry]);
               return;
             }

             // Descargar artefactos de diagnóstico
             if (type === 'DIAGNOSTIC_EXCEL' || type === 'DIAGNOSTIC_JSON' || type === 'ERROR_DIAGNOSTIC' || type === 'DIAGNOSTIC_DOWNLOAD') {
               console.log(`📊 RECIBIENDO DIAGNÓSTICO: ${type}`, { filename, dataLength: data?.length });
               try {
                 const blob = new Blob([data], { 
                   type: type === 'DIAGNOSTIC_EXCEL' 
                     ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                     : 'application/json' 
                 });
                 const url = URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.href = url;
                 a.download = filename || `diagnostic_${Date.now()}.${type === 'DIAGNOSTIC_EXCEL' ? 'xlsx' : 'json'}`;
                 document.body.appendChild(a);
                 a.click();
                 document.body.removeChild(a);
                 URL.revokeObjectURL(url);
                 console.log(`📊 DIAGNÓSTICO DESCARGADO: ${a.download}`);
               } catch (e) {
                 console.warn('No se pudo descargar diagnóstico:', e);
               }
               // Importante: estos mensajes no traen displayData, salimos aquí
               return;
             }
             
             setIsComparing(false);

             if (error) {
                console.error("Error recibido del worker:", error);
                setComparisonError(error);
                setProcessedBaseData(null);
                setComparisonDifferences(null);
             } else if (displayData && differences) {
                if (process.env.NODE_ENV === 'development') {
                  console.log(`✅ Comparación completada: ${displayData.length} filas, ${differences.length} diferencias`);
                  console.log(`📊 displayData sample:`, displayData.slice(0, 3));
                  console.log(`📊 differences sample:`, differences.slice(0, 10));
                }

                setComparisonDisplayData(displayData);
                setComparisonDifferences(new Set(differences));
                if (examples) setDebugExamples(examples);
                
                // Analizar diferencias específicas de precios
                console.log('🔍 ANALIZANDO DIFERENCIAS DE PRECIOS...');
                analyzePriceDifferences(displayData, differences);
                
                // Guardar logs en archivo cuando termine la comparación
                setTimeout(() => saveLogsToFile(), 1000);
             } else {
                console.warn("Mensaje inesperado del worker:", event.data);
                setComparisonError("Respuesta inesperada del worker.");
                setProcessedBaseData(null);
                setComparisonDifferences(null);
             }
             
             // Terminar el worker después de recibir el mensaje
             if (workerRef.current) {
               workerRef.current.terminate(); 
               workerRef.current = null;
             }
        };

        // 6. Definir cómo manejar ERRORES del propio worker
        workerRef.current.onerror = (error) => { 
             console.error("Error irrecuperable en Worker:", error);
             const errorMessage = error && error.message ? error.message : 
                                 (typeof error === 'string' ? error : 'Error desconocido en el worker');
             setComparisonError(`Error grave en Worker: ${errorMessage}`);
             setIsComparing(false);
             setProcessedBaseData(null); 
             setComparisonDifferences(null);
             if (workerRef.current) {
               workerRef.current.terminate();
               workerRef.current = null;
             }
        };

        // 7. Enviar los contenidos CRUDOS al worker v16
        if (process.env.NODE_ENV === 'development') {
          console.log("🚨🚨🚨 ENVIANDO DATOS AL WORKER v16 🚨🚨🚨");
        }
        workerRef.current.postMessage({
            currentFileContent: baseFileContent,
            referenceFileContent: newFileContent
        });
       
    } catch (error: any) {
        console.error("Error al crear/llamar al worker:", error);
        setComparisonError(`Error iniciando comparación: ${error.message}`);
        setIsComparing(false);
         if (workerRef.current) {
           workerRef.current.terminate(); 
           workerRef.current = null;
         }
    }
  }, [baseFileContent, newFileContent]);

  // Función para analizar diferencias de precios específicos
  const analyzePriceDifferences = (displayData: any[][], differences: string[]) => {
    console.log('🚨 === ANÁLISIS DE PRECIOS PROBLEMÁTICOS ===');
    
    const targetPrices = ['899900', '939900', '722000', '754000'];
    const priceDifferences = differences.filter(diff => diff.includes(':3') || diff.includes(':4'));
    
    console.log(`📊 Total diferencias de precios: ${priceDifferences.length}`);
    
    for (const diff of priceDifferences) {
      const [rowStr, colStr] = diff.split(':');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      
      if (row < displayData.length) {
        const rowData = displayData[row];
        if (rowData && rowData.length > col) {
          const price = String(rowData[col] || '');
          
          if (targetPrices.some(target => price.includes(target))) {
            console.log(`🚨 PRECIO PROBLEMÁTICO ENCONTRADO:`);
            console.log(`   Fila: ${row}, Columna: ${col}`);
            console.log(`   Valor: "${price}"`);
            console.log(`   Tipo: ${typeof rowData[col]}`);
            console.log(`   Longitud: ${price.length}`);
            console.log(`   Códigos ASCII: ${Array.from(price).map(c => c.charCodeAt(0)).join(', ')}`);
            console.log(`   JSON: ${JSON.stringify(rowData[col])}`);
            console.log('---');
          }
        }
      }
    }
    
    console.log('🚨 === FIN ANÁLISIS ===');
  };

  // Función para guardar logs en archivo
  const saveLogsToFile = () => {
    if (logs.length > 0) {
      const logContent = logs.join('\n');
      
      // Mostrar logs en consola para análisis inmediato
      console.log('📋 === LOGS COMPLETOS DE COMPARACIÓN ===');
      console.log(logContent);
      console.log('📋 === FIN DE LOGS ===');
      
      // Descargar archivo
      const blob = new Blob([logContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparison_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`📁 Archivo de logs descargado: ${logs.length} entradas`);
      setLogs([]); // Limpiar logs después de guardar
    }
  };

  // === LOGS DE DESARROLLO ===
  if (process.env.NODE_ENV === 'development') {
    console.log('🚨🚨🚨 APLICACIÓN REINICIADA - VERIFICANDO ESTADO 🚨🚨🚨');
    console.log('--- Estado de la aplicación ---');
    console.log('Archivos cargados:', {
      nuevo: !!newFileContent,
      base: !!baseFileContent,
      pdf: !!pdfFile
    });
    console.log('Estado de comparación:', {
      comparando: isComparing,
      error: comparisonError,
      datos: comparisonDisplayData ? `${comparisonDisplayData.length} filas` : 'sin datos',
      diferencias: comparisonDifferences ? `${comparisonDifferences.size} diferencias` : 'sin diferencias'
    });
  }

// Datos paginados para modal "Archivo Nuevo"
// 1) Asegúrate de que modalData no sea null y tenga al menos una fila de encabezado
const allNewData = modalData || [];
const newHeader = ["Tipo", "Clase", "Versiones", "Preciobase", "Preciobase2"];  // Forzar header de 5 columnas
const newDataRows = allNewData.slice(1);           // resto de filas

// 2) Calcula cuántas páginas necesitas
const newTotalPages = Math.ceil(newDataRows.length / PAGE_SIZE);

// 3) Saca sólo las rows de la página actual
const currentNewRows = newDataRows.slice(
  (newPage - 1) * PAGE_SIZE,
  newPage * PAGE_SIZE
);

// Logs para verificar paginación (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  console.log(`📊 Paginación: ${newDataRows.length} filas, página ${newPage}/${newTotalPages}, mostrando ${currentNewRows.length} filas`);
}


// Datos paginados para modal "Comparación" (usando datos del archivo base)
const allCompareData = comparisonDisplayData || []; // Estos son los datos del archivo base del worker
const compareHeader = allCompareData[0] || [];
const compareDataRows = allCompareData.slice(1);

const compareTotalPages = Math.ceil(compareDataRows.length / PAGE_SIZE);
const currentCompareRows = compareDataRows.slice(
  (comparePage - 1) * PAGE_SIZE,
  comparePage * PAGE_SIZE
);

const comparePageData = [compareHeader, ...currentCompareRows];


  // Reinyecta sólo las filas de la página dentro de modalData,
  // sin borrar el resto de páginas:
  const handleNewModalChange = (updatedPageRows: any[][]) => {
    if (!modalData) return;
    
    const header = modalData[0];
    const allRows = modalData.slice(1);
    const start = (newPage - 1) * PAGE_SIZE;
    const cloned = [...allRows];
    
    if (process.env.NODE_ENV === 'development') {
      const tipo3RowsInitial = cloned.filter(row => row[0] === 3);
      console.log(`🔍 Actualizando ${tipo3RowsInitial.length} filas Tipo 3`);
    }
    
    // Actualizar filas preservando frases
    for (let i = 0; i < updatedPageRows.length; i++) {
      const originalRow = cloned[start + i];
      const updatedRow = updatedPageRows[i];
      
      // Preservar las frases del índice 3 si existen
      if (originalRow && originalRow[3] && updatedRow) {
        updatedRow[3] = originalRow[3];
        if (process.env.NODE_ENV === 'development') {
          console.log(`🔍 Preservando frase en fila ${start + i}: "${originalRow[3]}"`);
        }
      }
      
      cloned[start + i] = updatedRow;
    }
    
    setModalData([header, ...cloned]);
    
    if (process.env.NODE_ENV === 'development') {
      const tipo3RowsFinal = cloned.filter(row => row[0] === 3);
      console.log(`✅ Actualización completada: ${tipo3RowsFinal.length} filas Tipo 3`);
    }
  };



  // --- Renderizado del Componente ---
  return (
    <div className="admin-container">
      {/* Navbar */}
      <nav className="navbar">
        <h1>Administrador de Datos</h1>
        <div className="navbar-buttons">
          <Button variant="contained">Configuración</Button>
          <Button variant="contained">Ayuda</Button>
        </div>
      </nav>


      {/* Main Content */}
      <div className="main-content">
        <div className="upload-section">
          <h3>Cargar Archivos</h3>
          {/* Inputs */}
          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'new')} />
          <p>Subir Archivo Nuevo</p>
          <input type="file" accept=".xlsx, .xls" onChange={(e) => handleFileUpload(e, 'base')} />
          <p>Subir Archivo Base</p>
          {/* PDF Input */}
          <input type="file" accept=".pdf" onChange={(e) => handleFileUpload(e, 'pdf')} />
          <p>Subir PDF</p>
          
          {/* Botón Ver Modal Nuevo */}
           <Button 
            variant="outlined" 
            onClick={() => { setModalOpen(true); bringArchivoFront(); }} // Traer al frente al abrir
            style={{ marginTop: '20px' }}
            disabled={!modalData} 
          >
            Ver Archivo Nuevo (Procesado)
          </Button>

          {/* Botón Iniciar Comparación */}
          <Button 
            variant="contained" 
            onClick={() => { processAndCompare(); bringComparacionFront(); }} // Traer al frente al abrir
            style={{ marginTop: '20px', marginLeft: '10px' }}
            disabled={!baseFileContent || !newFileContent || isComparing} 
          >
            {isComparing ? `Comparando...` : 'Comparar Archivos'}
          </Button>
          {isComparing && <CircularProgress size={24} style={{ marginLeft: 10 }} />} 

          {/* Botones extras */}
           <Button variant="outlined" onClick={() => setIsPreviewWindowOpen(true)} style={{ marginTop: '20px', marginLeft: '10px'  }} disabled={!previewData}>
              Vista Previa (Raw)
           </Button>
           <Button variant="outlined" onClick={() => setIsPdfWindowOpen(true)} style={{ marginTop: '20px', marginLeft: '10px'  }} disabled={!pdfFile}>
              Abrir PDF
           </Button>

          {/* Botón de Limpieza Completa */}
          <Button 
            variant="contained" 
            color="warning"
            onClick={limpiarCompletamente} 
            style={{ marginTop: '20px', marginLeft: '10px' }}
          >
            🧹 Limpiar Todo
          </Button>

          {/* Botón de Verificación del Sistema */}
          <Button 
            variant="contained" 
            color="info"
            onClick={async () => {
              try {
                const { systemVerification } = await import('../utils/verification');
                const results = await systemVerification.verifyCompleteSystem();
                const allSuccess = results.every(r => r.success);
                alert(allSuccess ? 
                  '✅ Sistema completamente funcional' : 
                  `⚠️ ${results.filter(r => !r.success).length} problemas detectados. Revisa la consola.`
                );
              } catch (error) {
                console.error('Error en verificación:', error);
                alert('❌ Error al verificar el sistema');
              }
            }} 
            style={{ marginTop: '20px', marginLeft: '10px' }}
          >
            🔍 Verificar Sistema
          </Button>

          {/* Información de Controles - VERSIÓN OPTIMIZADA */}
          <Box sx={{ 
            mt: 2, 
            p: 1, 
            backgroundColor: '#f5f5f5', 
            borderRadius: '4px',
            border: '1px solid #ddd'
          }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              <strong>Controles:</strong> Arrastrar (barra título) | Redimensionar (bordes) | Minimizar/Restaurar (botones)
            </Typography>
          </Box>

        </div>
      </div>

      {/* Indicador de Ventanas Minimizadas - FUERA DEL CONTENEDOR PRINCIPAL */}
      {minimizedIndicator}

      {/* Barra Flotante Lateral - FUERA DEL CONTENEDOR PRINCIPAL */}
      {floatingBar}
      
      {/* Barra y Ventanas Flotantes */}
       <div className="floating-windows-container">
          {/* Visor PDF */}
          <FloatingWindow
            title="Visor de PDF"
            isOpen={isPdfWindowOpen}
            onClose={handleClosePdfWindow}
            onMinimize={() => handleMinimizeWindow("PDF")}
          >
            <canvas ref={canvasRef} />
          </FloatingWindow>
          {/* Vista Previa Raw */}
           <FloatingWindow
            title="Vista Previa Archivo Nuevo (Raw)"
            isOpen={isPreviewWindowOpen}
            onClose={handleClosePreviewWindow}
            onMinimize={() => handleMinimizeWindow("Vista Previa")}
          >
            {previewData ? (
              <div style={{ padding: '10px', height: 400, width: '100%' }}>
                 {/* Asegúrate que EditableExcelTable maneje bien null/undefined o array vacío */}
                 <EditableExcelTable data={previewData || []} onDataChange={setPreviewData} /> 
              </div>
            ) : ( <p>No hay datos para mostrar</p> )}
          </FloatingWindow>
           {/* Otras Floating Windows si las tienes */}
       </div>

{/* === MODAL "ARCHIVO NUEVO (PROCESADO)" REDIMENSIONABLE === */}
<ResizableModal
  key={`archivo-${activeModals.has('archivo') ? 'active' : 'inactive'}`}
  open={modalOpen}
  onClose={() => setModalOpen(false)}
  onMinimize={() => {
    setModalOpen(false);
    setMinimizedWindows(prev => [...prev, "Archivo Nuevo"]);
  }}
  onActivate={() => bringArchivoFront()}
  title="Archivo Nuevo (Procesado para Vista)"
  initialWidth={600}
  initialHeight={500}
  initialX={50}
  initialY={50}
  minWidth={400}
  minHeight={300}
  zIndex={1300} // Z-index fijo para permitir interacción simultánea
>
  <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    {modalData ? (
      <>
        {/* Área de la tabla con scroll */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <EditableExcelTable
            headers={newHeader}
            data={currentNewRows}
            allData={modalData!}
            onDataChange={handleNewModalChange}
          />
        </Box>

        {/* Control de paginación */}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={newTotalPages}
            page={newPage}
            onChange={(_, p) => setNewPage(p)}
            size="small"
          />
        </Box>
      </>
    ) : (
      <Box sx={{ p: 2 }}>
        Carga un archivo nuevo para ver datos procesados.
      </Box>
    )}
  </Box>
</ResizableModal>

{/* === MODAL DE COMPARACIÓN REDIMENSIONABLE === */}
<ResizableModal
  key={`comparacion-${activeModals.has('comparacion') ? 'active' : 'inactive'}`}
  open={isComparisonModalOpen}
  onClose={() => setIsComparisonModalOpen(false)}
  onMinimize={() => {
    setIsComparisonModalOpen(false);
    setMinimizedWindows(prev => [...prev, "Comparación"]);
  }}
  onActivate={() => bringComparacionFront()}
  title={isComparing ? "Comparando..." : comparisonError ? "Error" : "Comparación (Base vs Nuevo)"}
  initialWidth={600}
  initialHeight={500}
  initialX={670}
  initialY={50}
  minWidth={400}
  minHeight={300}
  zIndex={1301} // Z-index fijo diferente para permitir interacción simultánea
>
  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
    {isComparing && (
      <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Procesando y comparando datos...</Typography>
      </Box>
    )}
    {comparisonError && <Alert severity="error">{comparisonError}</Alert>}

    {/* CONTENEDOR PRINCIPAL DE LA TABLA */}
    {!isComparing && !comparisonError && comparisonDisplayData && comparisonDifferences && (
      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <Box sx={{ overflowX: 'auto', minWidth: 'max-content' }}>
          <ComparisonViewer
            displayData={comparePageData}
            differences={comparisonDifferences}
          />
        </Box>
      </Box>
    )}

    {/* paginación */}
    {!isComparing && !comparisonError && comparisonDisplayData && (
      <Box sx={{ pt: 1, display: 'flex', justifyContent: 'center' }}>
        <Pagination
          count={compareTotalPages}
          page={comparePage}
          onChange={(_, p) => setComparePage(p)}
          size="small"
        />
      </Box>
    )}
  </Box>
</ResizableModal>



    </div>
  );
}

// <<< ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ AL FINAL Y NO ESTÉ COMENTADA >>>
export default ComparisonView;