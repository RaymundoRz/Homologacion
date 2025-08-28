const XLSX = require('xlsx');

console.log("🔍 DEBUG: Iniciando simulación de comparación...");

// Simular datos de ejemplo basados en lo que vemos
const baseData = [
  [1, "ACURA", "", ""],
  [2, "ADX", "", ""],
  [3, "2025 ADX", "", "Unidades Nuevas"],
  [4, "5p Advance L4/1.5/T Aut", "", "899900"],
  [4, "5p A-Spec L4/1.5/T Aut", "", "939900"],
  [3, "2025 ADX", "", "Unidades Usadas"],
  [4, "5p Advance L4/1.5/T Aut", "", "722000"],
  [4, "5p A-Spec L4/1.5/T Aut", "", "754000"]
];

const refData = [
  [1, "ACURA", "", ""],
  [2, "ADX", "", ""],
  [3, "2025 ADX", "", "Unidades Nuevas"],
  [4, "5p Advance L4/1.5/T Aut", "A", "899900"],
  [4, "5p A-Spec L4/1.5/T Aut", "B", "939900"],
  [3, "2025 ADX", "", "Unidades Usadas"],
  [4, "5p Advance L4/1.5/T Aut", "A", "722000"],
  [4, "5p A-Spec L4/1.5/T Aut", "B", "754000"]
];

console.log("\n📋 DATOS BASE:");
baseData.forEach((row, i) => {
  console.log(`   Row ${i}: [${row.join(' | ')}]`);
});

console.log("\n📋 DATOS REFERENCIA:");
refData.forEach((row, i) => {
  console.log(`   Row ${i}: [${row.join(' | ')}]`);
});

// Simular la lógica de comparación
console.log("\n🔍 COMPARACIÓN CELDA POR CELDA:");

for (let i = 0; i < baseData.length; i++) {
  const baseRow = baseData[i];
  const refRow = refData[i];
  
  console.log(`\n🔍 COMPARANDO FILA ${i}:`);
  console.log(`   Base: [${baseRow.join(' | ')}]`);
  console.log(`   Ref:  [${refRow.join(' | ')}]`);
  
  for (let j = 0; j < 4; j++) {
    const baseVal = String(baseRow[j] || "");
    const refVal = String(refRow[j] || "");
    
    console.log(`   Col ${j}: base:"${baseVal}" vs ref:"${refVal}" -> ${baseVal === refVal ? 'IGUAL' : 'DIFERENTE'}`);
    
    let isError = false;
    let errorReason = "";
    
    if (j === 0) { // Columna Tipo
      if (baseVal !== refVal) {
        errorReason = `TIPO DIFERENTE: "${baseVal}" vs "${refVal}"`;
        isError = true;
      }
    } else if (j === 1) { // Columna Versiones
      if (baseVal !== refVal) {
        errorReason = `VERSIÓN DIFERENTE: "${baseVal}" vs "${refVal}"`;
        isError = true;
      }
    } else if (j === 2) { // Columna Clase
      const tipo = String(baseRow[0] || "");
      if (tipo === "4" && baseVal === "" && refVal !== "") {
        errorReason = `CLASE VACÍA PARA TIPO 4`;
        isError = true;
      }
    } else if (j === 3) { // Columna Precios
      if (baseVal === "" && refVal !== "") {
        errorReason = `PRECIO VACÍO EN BASE`;
        isError = true;
      }
    }
    
    if (isError) {
      console.log(`   🔴 ERROR Col ${j}: ${errorReason}`);
    }
  }
}

console.log("\n✅ SIMULACIÓN COMPLETADA");

