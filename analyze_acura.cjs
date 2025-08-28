const XLSX = require('xlsx');

console.log('🔍 ANALIZANDO ESPECÍFICAMENTE ACURA/ILX...');

try {
  const workbook = XLSX.readFile('Guía Libro Azul Julio 25.xls');
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });

  console.log(`📊 DATOS ORIGINALES: ${worksheet.length} filas`);

  // Buscar específicamente ACURA e ILX
  const acuraILXRows = [];
  
  for (let i = 1; i < worksheet.length; i++) {
    const row = worksheet[i];
    const tipo = row[0];
    const texto = row[2] || '';
    
    // Buscar filas que contengan ACURA o ILX
    if (texto.includes('ACURA') || texto.includes('ILX')) {
      acuraILXRows.push({
        fila: i,
        tipo: tipo,
        texto: texto,
        frase: row[3] || '',
        tieneFrase: (row[3] || '').includes('Unidades')
      });
    }
  }

  console.log(`\n🔍 FILAS ACURA/ILX ENCONTRADAS: ${acuraILXRows.length}`);
  
  acuraILXRows.forEach((row, index) => {
    console.log(`${index + 1}. Fila ${row.fila}: Tipo ${row.tipo}, "${row.texto}", Frase: "${row.frase}" ${row.tieneFrase ? '❌ TIENE FRASE INCORRECTA' : '✅ SIN FRASE'}`);
  });

  // Contar cuántas tienen frases incorrectamente
  const conFrasesIncorrectas = acuraILXRows.filter(row => row.tieneFrase);
  console.log(`\n❌ FILAS CON FRASES INCORRECTAS: ${conFrasesIncorrectas.length}`);
  
  if (conFrasesIncorrectas.length > 0) {
    console.log('🔍 DETALLE DE FRASES INCORRECTAS:');
    conFrasesIncorrectas.forEach((row, index) => {
      console.log(`${index + 1}. "${row.texto}" -> "${row.frase}"`);
    });
  }

  // Mostrar también las primeras filas del archivo para entender la estructura
  console.log(`\n📋 PRIMERAS 20 FILAS DEL ARCHIVO:`);
  for (let i = 0; i < Math.min(20, worksheet.length); i++) {
    const row = worksheet[i];
    console.log(`${i}: Tipo ${row[0]}, "${row[2]}", "${row[3]}"`);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
} 