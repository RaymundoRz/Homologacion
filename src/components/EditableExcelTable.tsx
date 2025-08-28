import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Button,
  Menu,
  MenuItem,
  Slider
} from '@mui/material';
import { Warning as WarningIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface EditableExcelTableProps {
  headers: any[]; 
  data: any[][];
  allData: any[][];
  onDataChange: (rows: any[][]) => void;
  validationErrors?: { rowIndex: number; messages: string[] }[];
}

const EditableExcelTable: React.FC<EditableExcelTableProps> = ({
  headers,
  data,
  allData,
  onDataChange,
  validationErrors = []
}) => {
  // Estados para controlar el tamaño de las celdas
  const [rowHeight, setRowHeight] = useState<number>(40);
  const [columnWidth, setColumnWidth] = useState<number>(250);
  const [modelColumnWidth, setModelColumnWidth] = useState<number>(400);

  if (!data || data.length === 0) return <p>No hay datos para mostrar</p>;

  // Estados y funciones para el menú contextual
  const [contextMenu, setContextMenu] = React.useState<{
    mouseX: number;
    mouseY: number;
    rowIndex: number;
  } | null>(null);

  // LIMITAR A SOLO 5 COLUMNAS: Tipo, Clase, Versiones, Preciobase, Preciobase2
  const limitedHeaders = ["Tipo", "Clase", "Versiones", "Preciobase", "Preciobase2"];
  const limitedData = data.map(row => row.slice(0, 5));

  const handleContextMenu = (event: React.MouseEvent, rowIndex: number) => {
    event.preventDefault();
    setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, rowIndex });
  };

  const handleAddRow = (insertIndex: number) => {
    // Determinar el tipo de fila basado en la fila anterior
    let rowType = '';
    if (insertIndex > 0 && limitedData[insertIndex]) {
      const prevRowType = limitedData[insertIndex][0];
      rowType = ['2', '3', '4'].includes(String(prevRowType)) ? prevRowType : '4';
    }
    
    // Crear nueva fila con exactamente 5 columnas
    const newRow = Array(5).fill('');
    if (rowType) newRow[0] = rowType;
    
    // Insertar la nueva fila
    const newData = [
      ...limitedData.slice(0, insertIndex + 1),
      newRow,
      ...limitedData.slice(insertIndex + 1)
    ];
    
    // Actualizar el estado con las 5 columnas
    onDataChange(newData);
  };

  // Obtener los índices de las columnas clave (basado en limitedHeaders)
  const header = limitedHeaders.map(h => String(h).toLowerCase());
  const tipoIndex = header.findIndex(col => col.includes('tipo'));
  const precioBaseIndex = header.findIndex(col => col.includes('preciobase'));
  const precioBase2Index = header.findIndex(col => col.includes('preciobase2'));

  const handleCellChange = (rowIndex: number, colIndex: number, value: any) => {
    const updatedData = [...limitedData];
    updatedData[rowIndex][colIndex] = value;
    onDataChange(updatedData);
  };

  const formatPrices = (rows: any[][]): any[][] => {
    return rows.map((row) => {
      const newRow = [...row];
      [precioBaseIndex, precioBase2Index].forEach((index) => {
        const value = newRow[index];
        if (!isNaN(value) && value !== '' && value != null) {
          const parsed = parseFloat(value);
          if (!isNaN(parsed)) {
            newRow[index] = parsed.toLocaleString("en-US");
          }
        }
      });
      return newRow;
    });
  };
  

  // Función para descargar el Excel final omitiendo la columna "Temp"
  const handleDownloadExcel = () => {
    if (!allData.length) return alert('No hay datos para exportar');

    // 1) Definir headers fijos con solo las columnas necesarias
    const exportHeaders = ["Tipo", "Clase", "Versiones", "Preciobase", "Preciobase2"];

    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 EXPORT: Headers finales:`, exportHeaders);
      console.log(`📋 EXPORT: Número de headers: ${exportHeaders.length}`);
    }

    // 2) Procesar las filas para usar solo las 5 columnas necesarias
    const exportRows = formatPrices(
      allData
        .slice(1)
        .map(row => row.slice(0, 5)) // Usar allData en lugar de limitedData
    );

    // 3) Crear el array final con headers + datos
    const aoa = [exportHeaders, ...exportRows];

    if (process.env.NODE_ENV === 'development') {
      const tipo3RowsInAoa = aoa.slice(1).filter(row => row[0] === 3);
      console.log(`🔍 EXPORT: ${tipo3RowsInAoa.length} filas Tipo 3 en aoa final`);
    }

    // 4) Crea y descarga el Excel
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    const now = new Date();
    const monthNames = [
      "Enero","Febrero","Marzo","Abril","Mayo","Junio",
      "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
    ];
    const month = monthNames[now.getMonth()];
    const fileName = `Guía Libro Azul ${month} ${String(now.getFullYear()).slice(-2)}.xls`;

    XLSX.writeFile(wb, fileName);
  };


  return (
    <div onContextMenu={(e) => e.preventDefault()}>
      
      {/* Controles de tamaño de celdas */}
      <Paper sx={{ p: 2, mb: 2 }}>
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
              min={30}
              max={80}
              step={5}
              marks={[
                { value: 30, label: '30' },
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
              setRowHeight(40);
              setColumnWidth(250);
              setModelColumnWidth(400);
            }}
          >
            🔄 Reset
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} style={{ maxHeight: 400, overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
            {limitedHeaders.map((h, colIndex) => (
              <TableCell 
                key={colIndex}
                style={{
                  width: colIndex === 2 ? modelColumnWidth : columnWidth,
                  height: rowHeight
                }}
              >
                {h}
              </TableCell>
            ))}
            </TableRow>
          </TableHead>
          <TableBody>
          {limitedData.map((row, rowIndex) => {
              const actualRowIndex = rowIndex; // ya que la cabecera es la fila 0
              // Filtrar los errores que correspondan a esta fila.
              const rowErrors = validationErrors
                .filter(e => e.rowIndex === actualRowIndex)
                .flatMap(e => e.messages);
              // Determina si esta fila es de versiones (tipo 4)
              const isVersionRow = tipoIndex !== -1 && parseInt(row[tipoIndex]) === 4;

              return (
                <TableRow
                  key={actualRowIndex}
                  onContextMenu={(e) => handleContextMenu(e, actualRowIndex)}
                >
                  {row.slice(0, limitedHeaders.length).map((cell, colIndex) => {
                    // Define si tiene error basado en la validación
                    let hasError = false;
                    const colName = header[colIndex];
                    if (isVersionRow) {
                      if (
                        colName.includes('preciobase') &&
                        (cell === '' || cell == null)
                      ) {
                        hasError = true;
                      }
                      if (colName.includes('preciobase2') && precioBaseIndex !== -1) {
                        const precioBase = parseFloat(row[precioBaseIndex]);
                        const precioBase2 = parseFloat(cell);
                        if (
                          !isNaN(precioBase) &&
                          !isNaN(precioBase2) &&
                          precioBase2 >= precioBase
                        ) {
                          hasError = true;
                        }
                      }
                    }
                    return (
                      <TableCell
                        key={colIndex}
                        style={{
                          backgroundColor: hasError ? '#ffebee' : 'inherit',
                          padding: '8px',
                          height: rowHeight,
                          width: colIndex === 2 ? modelColumnWidth : columnWidth
                        }}
                      >
                        <input
                          value={
                            cell === null || cell === undefined ? '' : cell
                          }
                          onChange={(e) =>
                            handleCellChange(actualRowIndex, colIndex, e.target.value)
                          }
                          style={{
                            border: hasError ? '2px solid red' : '1px solid #ddd',
                            width: '100%',
                            padding: '4px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {/* Botón para descargar el Excel final */}
      <Box display="flex" justifyContent="center" mt={2}>
        <Button variant="contained" color="primary" onClick={handleDownloadExcel}>
          Descargar Excel Final
        </Button>
      </Box>
      {/* Menú contextual para insertar fila */}
      <Menu
  open={Boolean(contextMenu)}
  onClose={() => setContextMenu(null)}
  anchorReference="anchorPosition"
  anchorPosition={
    contextMenu
      ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
      : undefined
  }
  // 1) Este zIndex va en el propio Popover (no solo en el Paper)
  sx={{ zIndex: 2000 }}
  // 2) Y de paso dejas también el PaperProps por si acaso
  PaperProps={{
    style: { zIndex: 2000 }
  }}
>
  <MenuItem onClick={() => contextMenu && handleAddRow(contextMenu.rowIndex)}>
    Insertar fila aquí
  </MenuItem>
</Menu>

    </div>
  );
};

export default EditableExcelTable;
