const XLSX = require('xlsx');
const fs = require('fs');

console.log('🔍 ANALIZANDO ARCHIVO EXCEL...');

try {
  // Leer el archivo Excel
  const workbook = XLSX.readFile('Guía Libro Azul Julio 25.xls');
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });

  console.log(`📊 DATOS ORIGINALES:`);
  console.log(`  - Total filas: ${worksheet.length}`);
  console.log(`  - Headers: ${worksheet[0]?.join(', ')}`);

  // Analizar filas Tipo 3 (años/modelos)
  const tipo3Rows = worksheet.slice(1).filter(row => row[0] === 3);
  console.log(`\n🔍 FILAS TIPO 3 (AÑOS/MODELOS):`);
  console.log(`  - Total: ${tipo3Rows.length}`);

  // Buscar ACURA específicamente
  const acuraRows = tipo3Rows.filter(row => {
    const text = row[2] || '';
    return text.includes('ACURA') || text.includes('ILX');
  });
  console.log(`\n🔍 FILAS ACURA/ILX:`);
  console.log(`  - Total: ${acuraRows.length}`);
  acuraRows.slice(0, 10).forEach((row, index) => {
    console.log(`  ${index + 1}. "${row[2]}", "${row[3]}"`);
  });

  // Buscar INTEGRA específicamente
  const integraRows = tipo3Rows.filter(row => {
    const text = row[2] || '';
    return text.includes('INTEGRA');
  });
  console.log(`\n🔍 FILAS INTEGRA:`);
  console.log(`  - Total: ${integraRows.length}`);
  integraRows.slice(0, 10).forEach((row, index) => {
    console.log(`  ${index + 1}. "${row[2]}", "${row[3]}"`);
  });

  // Buscar MDX específicamente
  const mdxRows = tipo3Rows.filter(row => {
    const text = row[2] || '';
    return text.includes('MDX');
  });
  console.log(`\n🔍 FILAS MDX:`);
  console.log(`  - Total: ${mdxRows.length}`);
  mdxRows.slice(0, 10).forEach((row, index) => {
    console.log(`  ${index + 1}. "${row[2]}", "${row[3]}"`);
  });

  // Analizar frases en general
  const rowsWithPhrases = tipo3Rows.filter(row => {
    const text = row[2] || '';
    return text.includes('Unidades Nuevas') || text.includes('Unidades Usadas');
  });
  console.log(`\n🔍 FILAS CON FRASES:`);
  console.log(`  - Total: ${rowsWithPhrases.length}`);
  rowsWithPhrases.slice(0, 10).forEach((row, index) => {
    console.log(`  ${index + 1}. "${row[2]}", "${row[3]}"`);
  });

  // Analizar estructura de columnas
  console.log(`\n📋 ESTRUCTURA DE COLUMNAS:`);
  console.log(`  - Headers: ${worksheet[0]?.length} columnas`);
  worksheet[0]?.forEach((header, index) => {
    console.log(`    ${index}: "${header}"`);
  });

  // Mostrar primeras filas para entender estructura
  console.log(`\n📋 PRIMERAS 10 FILAS:`);
  worksheet.slice(0, 10).forEach((row, index) => {
    console.log(`  ${index}: [${row.slice(0, 5).map(cell => `"${cell}"`).join(', ')}]`);
  });

} catch (error) {
  console.error('❌ Error al analizar el archivo:', error);
} 