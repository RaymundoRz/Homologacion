const XLSX = require('xlsx');

console.log('🔍 COMPARANDO DATOS ORIGINALES VS PROCESADOS...');

try {
  const workbook = XLSX.readFile('Guía Libro Azul Julio 25.xls');
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });

  console.log(`📊 DATOS ORIGINALES: ${worksheet.length} filas`);

  // Buscar específicamente las filas de ILX en datos originales
  console.log(`\n🔍 FILAS ILX EN DATOS ORIGINALES:`);
  for (let i = 1; i < worksheet.length; i++) {
    const row = worksheet[i];
    const texto = row[2] || '';
    
    if (texto.includes('ILX')) {
      console.log(`Fila ${i}: Tipo ${row[0]}, "${texto}", Frase original: "${row[3]}"`);
    }
  }

  // Simular el procesamiento básico para ver qué pasa
  console.log(`\n🔍 SIMULANDO PROCESAMIENTO:`);
  
  // Buscar la sección ACURA
  let acuraSection = [];
  let inAcuraSection = false;
  
  for (let i = 1; i < worksheet.length; i++) {
    const row = worksheet[i];
    const tipo = Number(row[0]);
    const texto = row[2] || '';
    
    if (tipo === 1 && texto === 'ACURA') {
      inAcuraSection = true;
      acuraSection = [row];
      console.log(`🎯 Encontrada sección ACURA en fila ${i}`);
    } else if (tipo === 1 && inAcuraSection) {
      // Nueva marca, terminar sección ACURA
      break;
    } else if (inAcuraSection) {
      acuraSection.push(row);
    }
  }
  
  console.log(`📦 Sección ACURA encontrada: ${acuraSection.length} filas`);
  acuraSection.forEach((row, index) => {
    console.log(`  ${index}: Tipo ${row[0]}, "${row[2]}", "${row[3]}"`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
} 