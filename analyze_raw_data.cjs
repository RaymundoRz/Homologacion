const XLSX = require('xlsx');

console.log('🔍 ANALIZANDO DATOS EN CRUDO - PRIMERAS 2 MARCAS...');

try {
  const workbook = XLSX.readFile('GuiaEBC_Marzo2025 v1.xlsx');
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
    const tipo = row[0];
    const texto = row[2] || '';
    
    if (tipo === 1) {
      marcas.push({ nombre: texto, fila: i });
      if (marcas.length >= 2) break;
    }
  }

  console.log('\n🏷️ PRIMERAS 2 MARCAS EN DATOS CRUDOS:');
  marcas.forEach((marca, index) => {
    console.log(`${index + 1}. ${marca.nombre} (fila ${marca.fila})`);
  });

  // Analizar cada marca
  marcas.forEach((marca, marcaIndex) => {
    console.log(`\n🔍 ANÁLISIS DE ${marca.nombre} (DATOS CRUDOS):`);
    
    // Buscar filas Tipo 3 hasta la siguiente marca
    const startRow = marca.fila;
    const endRow = marcas[marcaIndex + 1] ? marcas[marcaIndex + 1].fila : worksheet.length;
    
    const tipo3Rows = [];
    for (let i = startRow; i < endRow; i++) {
      const row = worksheet[i];
      const tipo = row[0];
      const texto = row[2] || '';
      
      if (tipo === 3) {
        tipo3Rows.push({
          fila: i,
          texto: texto,
          frase: row[3] || '',
          tieneFrase: (row[3] || '').includes('Unidades')
        });
      }
    }
    
    console.log(`  - Filas Tipo 3: ${tipo3Rows.length}`);
    tipo3Rows.forEach((row, index) => {
      console.log(`    ${index + 1}. "${row.texto}", Frase: "${row.frase}" ${row.tieneFrase ? '❌ TIENE FRASE' : '✅ SIN FRASE'}`);
    });

    // Contar cuántas tienen frases
    const conFrases = tipo3Rows.filter(row => row.tieneFrase);
    console.log(`  - Con frases: ${conFrases.length}`);
    console.log(`  - Sin frases: ${tipo3Rows.length - conFrases.length}`);
  });

  // Mostrar también las primeras filas para entender la estructura
  console.log(`\n📋 PRIMERAS 20 FILAS DEL ARCHIVO CRUDO:`);
  for (let i = 0; i < Math.min(20, worksheet.length); i++) {
    const row = worksheet[i];
    console.log(`${i}: Tipo ${row[0]}, "${row[2]}", "${row[3]}"`);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} 