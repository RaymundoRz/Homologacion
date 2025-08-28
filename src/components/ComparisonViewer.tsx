// src/components/ComparisonViewer.tsx
import React, { useMemo, useState } from 'react'; 
import { Paper, Typography, Box, Button, Slider, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
// Imports para DataGrid
import { DataGrid, GridColDef, GridCellParams, GridRowId } from '@mui/x-data-grid'; 
import * as XLSX from 'xlsx'; // Para exportar

// Interfaz para las filas que DataGrid espera
interface GridRowModel {
    id: GridRowId; // ID único (usaremos el índice de fila 0..N)
    [key: string]: any; // Columnas dinámicas: col_0, col_1, etc. con los *valores* directos
}

interface ComparisonViewerProps {
  displayData: any[][];       // Datos BASE pre-procesados [fila][columna] (CON cabecera y AñoContexto)
  differences: Set<string>; // Set con coordenadas "fila_datos_idx:columna_original_idx"
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  displayData,    
  differences   
}) => {
  // Estados para controlar el tamaño de las celdas
  const [rowHeight, setRowHeight] = useState<number>(35);
  const [columnWidth, setColumnWidth] = useState<number>(250);
  const [modelColumnWidth, setModelColumnWidth] = useState<number>(400);
  
  // Log inicial para verificar props (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('Viewer - Props:', {
      displayDataLength: displayData?.length,
      differencesSize: differences?.size,
      differencesType: typeof differences,
      isSet: differences instanceof Set
    });
  }

  const yearColumnIndex = 5; // Índice de AñoContexto (después de quitar Temp) a ocultar

  // --- Transformar datos y definir columnas para DataGrid ---
  const { columns, rows } = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Viewer: Transformando datos para DataGrid...");
    }
    if (!displayData || displayData.length < 1 || !Array.isArray(displayData[0])) {
      console.warn("Viewer: displayData inválido o vacío recibido por ComparisonViewer.");
      return { 
          columns: [{ field: 'error', headerName: 'Error', width: 300 }], 
          rows: [{ id: 'error_row', error: 'No hay datos base válidos para mostrar' }] 
      };
    }

    const headerRow = displayData[0];
    const dataRows = displayData.slice(1);

    // --- Definir Columnas ---
    const MAX_COLS_TO_SHOW = 5; // Mostrar columnas 0, 1, 2, 3, 4
    const cols: GridColDef[] = headerRow
        .map((colName, index) => ({ 
            field: `col_${index}`, // ID único de columna basado en índice *original*
            headerName: String(colName ?? ''), 
            width: index === 2 ? modelColumnWidth : columnWidth, // Tamaños dinámicos
            sortable: false, // Deshabilitar ordenamiento por defecto
            // Dentro de cellClassName en ComparisonViewer.tsx
cellClassName: (params: GridCellParams) => {
    const colIndexStr = params.field.split('_')[1];
    const colIndex = parseInt(colIndexStr, 10);
    if (isNaN(colIndex)) return ''; 

    // === Creación de coordenada DEBE SER ASÍ ===
    const rowIndexNum = Number(params.row.id);
    const coord = `${rowIndexNum}:${colIndex}`;    
    const hasDiff = differences ? differences.has(coord) : false; 

    // Debug: Solo para las primeras 10 celdas en desarrollo
    if (process.env.NODE_ENV === 'development' && rowIndexNum < 10 && colIndex < 5) {
        console.log(`🔍 cellClassName - Row: ${rowIndexNum}, Col: ${colIndex}, Coord: "${coord}", HasDiff: ${hasDiff}`);
    }
                
    return hasDiff ? 'difference-cell' : ''; 
},
        }))
        // === Filtro para mostrar SOLO las columnas deseadas ===
        .filter((_, index) => index < MAX_COLS_TO_SHOW); 
        
    // --- Transformar Filas ---
    const gridRows: GridRowModel[] = dataRows.map((row, rowIndex) => { 
        const rowData: GridRowModel = { id: rowIndex }; 
        if (Array.isArray(row)) {
            // Guardamos TODAS las columnas originales en el objeto rowData
            // porque cellClassName necesita el índice original 'j' para buscar.
            // DataGrid solo usará las que estén definidas en 'cols' filtradas.
            row.forEach((cellValue, colIndex) => {
                rowData[`col_${colIndex}`] = cellValue; 
            });
        } else {
             rowData['error'] = 'Fila inválida'; 
        }
        return rowData;
    });

    if (process.env.NODE_ENV === 'development') {
      console.log(`Viewer: ${gridRows.length} filas y ${cols.length} columnas definidas para DataGrid.`);
    }
    return { columns: cols, rows: gridRows };

  }, [displayData, differences]); // Dependencias del useMemo


  // --- Función de Exportación (Adaptada) ---
  const handleExport = () => {
     if (rows.length === 0) { alert("No hay datos para exportar."); return; }
     
      const headerToExport = columns.map(col => col.headerName); 
      const bodyToExport = rows.map(rowObj => {
          return columns.map(col => rowObj[col.field] ?? ''); 
      });

     const exportData = [headerToExport, ...bodyToExport];
     try {
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Comparacion_Base");
        XLSX.writeFile(wb, "diferencias_base.xlsx");
     } catch (error) { console.error("Error al exportar a Excel:", error); alert("Error al generar Excel."); }
  };

  // --- Renderizado del Componente ---
  return (
    <Box mt={2} sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}> 
      <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}> 
        Comparación (Mostrando Archivo Base) 
      </Typography>

      {/* Controles de tamaño de celdas */}
      <Paper sx={{ p: 2, mb: 2, flexShrink: 0 }}>
        <Typography variant="subtitle2" gutterBottom>
          🎛️ Controles de Tamaño de Celdas
        </Typography>
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', flexWrap: 'wrap' }}>
          
          {/* Control de altura de filas */}
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="caption">Altura de Filas: {rowHeight}px</Typography>
            <Slider
              value={rowHeight}
              onChange={(_, value) => setRowHeight(value as number)}
              min={25}
              max={80}
              step={5}
              marks={[
                { value: 25, label: '25' },
                { value: 50, label: '50' },
                { value: 80, label: '80' }
              ]}
              size="small"
            />
          </Box>

          {/* Control de ancho de columnas normales */}
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="caption">Ancho Columnas: {columnWidth}px</Typography>
            <Slider
              value={columnWidth}
              onChange={(_, value) => setColumnWidth(value as number)}
              min={150}
              max={600}
              step={25}
              marks={[
                { value: 150, label: '150' },
                { value: 300, label: '300' },
                { value: 450, label: '450' },
                { value: 600, label: '600' }
              ]}
              size="small"
            />
          </Box>

          {/* Control de ancho de columna de modelos */}
          <Box sx={{ minWidth: 200 }}>
            <Typography variant="caption">Ancho Modelos: {modelColumnWidth}px</Typography>
            <Slider
              value={modelColumnWidth}
              onChange={(_, value) => setModelColumnWidth(value as number)}
              min={300}
              max={800}
              step={50}
              marks={[
                { value: 300, label: '300' },
                { value: 500, label: '500' },
                { value: 650, label: '650' },
                { value: 800, label: '800' }
              ]}
              size="small"
            />
          </Box>

          {/* Botón de reset */}
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => {
              setRowHeight(35);
              setColumnWidth(250);
              setModelColumnWidth(400);
            }}
          >
            🔄 Reset
          </Button>
        </Box>
      </Paper>
      

      
      {/* Contenedor para DataGrid */}
      <Paper sx={{ flexGrow: 1, height: 'calc(100% - 80px)', width: '100%' }}> {/* Altura calculada */}
         {(rows && rows.length > 0 && columns && columns.length > 0 && columns[0].field !== 'error') ? (
             <DataGrid
                rows={rows} 
                columns={columns} 
                getRowId={(row) => row.id}
                density="compact" 
                rowHeight={rowHeight} 
                hideFooter // Ocultar pie para scroll infinito
              />
         ) : (
            <Typography sx={{p: 2}}>
                {displayData && displayData.length > 0 ? "Error generando filas/columnas para la tabla." : "Esperando datos de comparación..."}
            </Typography> 
         )}
      </Paper>

      {/* Botón de exportación */}
      <Button 
        variant="contained" 
        onClick={handleExport}
        sx={{ mt: 2, flexShrink: 0 }} 
        disabled={!rows || rows.length === 0} 
      >
        Exportar Diferencias Visibles
      </Button>

      {/* CSS NECESARIO en App.css o index.css:
          .difference-cell {
            background-color: #ffebee !important; 
            color: #d32f2f !important;
            font-weight: bold !important;
          } 
      */}
    </Box>
  );
};

// export default ComparisonViewer;