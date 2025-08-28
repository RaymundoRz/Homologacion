const XLSX = require('xlsx');

console.log('🔍 ANALIZANDO ARCHIVO BASE...');

try {
  // Intentar con el nombre exacto del archivo
  const workbook = XLSX.readFile('Guía Libro Azul Marzo 25.xls');
  const sheetName = workbook.SheetNames[0];
  const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { 
    header: 1, 
    defval: '', 
    blankrows: false 
  });

  console.log(`📊 DATOS DEL ARCHIVO BASE: ${worksheet.length} filas`);

  // Buscar específicamente las filas de ACURA/ILX en el archivo base
  console.log(`\n🔍 FILAS ACURA/ILX EN ARCHIVO BASE:`);
  for (let i = 1; i < worksheet.length; i++) {
    const row = worksheet[i];
    const texto = row[2] || '';
    
    if (texto.includes('ACURA') || texto.includes('ILX')) {
      console.log(`Fila ${i}: Tipo ${row[0]}, "${texto}", Frase: "${row[3]}"`);
    }
  }

  // Mostrar las primeras filas para entender la estructura
  console.log(`\n📋 PRIMERAS 20 FILAS DEL ARCHIVO BASE:`);
  for (let i = 0; i < Math.min(20, worksheet.length); i++) {
    const row = worksheet[i];
    console.log(`${i}: Tipo ${row[0]}, "${row[2]}", "${row[3]}"`);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.error('Detalles del error:', error);
} 