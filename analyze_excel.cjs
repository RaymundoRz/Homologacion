const XLSX = require('xlsx');

console.log('🔍 ANALIZANDO PRIMERAS 2 MARCAS...');

try {
  const workbook = XLSX.readFile('Guía Libro Azul Julio 25.xls');
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });

  console.log(`📊 DATOS ORIGINALES: ${worksheet.length} filas`);

  // Encontrar las primeras 2 marcas (Tipo 1)
  const marcas = [];
  for (let i = 1; i < worksheet.length; i++) {
    const row = worksheet[i];
    if (row[0] === 1) {
      marcas.push({ nombre: row[2], fila: i });
      if (marcas.length >= 2) break;
    }
  }

  console.log('\n🏷️ PRIMERAS 2 MARCAS:');
  marcas.forEach((marca, index) => {
    console.log(`${index + 1}. ${marca.nombre} (fila ${marca.fila})`);
  });

  // Analizar filas Tipo 3 de las primeras 2 marcas
  marcas.forEach((marca, marcaIndex) => {
    console.log(`\n🔍 ANÁLISIS DE ${marca.nombre}:`);
    
    // Buscar filas Tipo 3 hasta la siguiente marca
    const startRow = marca.fila;
    const endRow = marcas[marcaIndex + 1] ? marcas[marcaIndex + 1].fila : worksheet.length;
    
    const tipo3Rows = [];
    for (let i = startRow; i < endRow; i++) {
      const row = worksheet[i];
      if (row[0] === 3) {
        tipo3Rows.push({ texto: row[2], frase: row[3], fila: i });
      }
    }
    
    console.log(`  - Filas Tipo 3: ${tipo3Rows.length}`);
    tipo3Rows.forEach((row, index) => {
      console.log(`    ${index + 1}. "${row.texto}", Frase: "${row.frase}"`);
    });
  });

} catch (error) {
  console.error('❌ Error:', error.message);
} 