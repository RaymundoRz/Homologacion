// Script para crear archivos de prueba Excel
const XLSX = require('xlsx');

console.log("🔧 CREANDO ARCHIVOS DE PRUEBA");
console.log("=============================");

// Función para crear workbook
function createWorkbook(data, filename) {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  XLSX.writeFile(wb, filename);
  console.log(`✅ Archivo creado: ${filename}`);
}

// ARCHIVO BASE (datos "correctos")
const baseData = [
  ["Tipo", "Clase", "Versiones", "Preciobase", "Preciobase2"],
  [1, "Acura", "", "", ""],
  [2, "", "MDX", "", ""],
  [3, "", "", "2025 MDX", ""],
  [4, "SUV", "MDX A-Spec", "85000", "82000"],
  [4, "SUV", "MDX Type S", "95000", "92000"],
  [2, "", "TLX", "", ""],
  [3, "", "", "2024 TLX", ""],
  [4, "Sedan", "TLX A-Spec", "45000", "42000"],
  [4, "Sedan", "TLX Type S", "55000", "52000"]
];

// ARCHIVO NUEVO (con errores específicos)
const newData = [
  ["Tipo", "Clase", "Versiones", "Preciobase", "Preciobase2"],
  [1, "Acura", "", "", ""],
  [2, "", "MDX", "", ""],
  [3, "", "", "2025 MDX", ""],
  [4, "SUV", "MDX A-Spec", "85000", "82000"],
  [4, "SUV", "MDX Type S", "95000", "92000"],
  // ERROR 1: MDX duplicado
  [2, "", "MDX", "", ""],
  [3, "", "", "2025 MDX", ""],
  [4, "SUV", "MDX A-Spec", "85000", "82000"],
  // ERROR 2: Nombre truncado
  [2, "", "5rpe S", "", ""],
  [3, "", "", "2024 5rpe S", ""],
  [4, "SUV", "5rpe S A-Spec", "75000", "72000"],
  // ERROR 3: Precio inválido (Preciobase <= Preciobase2)
  [2, "", "RDX", "", ""],
  [3, "", "", "2024 RDX", ""],
  [4, "SUV", "RDX A-Spec", "45000", "48000"], // 45000 <= 48000 = ERROR
  // ERROR 4: Clase faltante para Tipo 4
  [2, "", "ILX", "", ""],
  [3, "", "", "2023 ILX", ""],
  [4, "", "ILX A-Spec", "35000", "32000"], // Clase vacía = ERROR
  // DATOS CORRECTOS para comparar
  [2, "", "TLX", "", ""],
  [3, "", "", "2024 TLX", ""],
  [4, "Sedan", "TLX A-Spec", "45000", "42000"],
  [4, "Sedan", "TLX Type S", "55000", "52000"]
];

console.log("\n📊 ESTRUCTURA DE ARCHIVOS:");
console.log("==========================");

console.log("\n📁 test_base.xlsx (Archivo Base - CORRECTO):");
console.log("- 10 filas de datos");
console.log("- Estructura correcta");
console.log("- Sin errores conocidos");

console.log("\n📁 test_new.xlsx (Archivo Nuevo - CON ERRORES):");
console.log("- 22 filas de datos");
console.log("- ERROR 1: MDX duplicado (filas 6-8)");
console.log("- ERROR 2: Nombre truncado '5rpe S' (filas 9-11)");
console.log("- ERROR 3: Precio inválido 45000 <= 48000 (fila 15)");
console.log("- ERROR 4: Clase faltante para Tipo 4 (fila 18)");
console.log("- Datos correctos para comparar (filas 19-22)");

// Crear archivos
try {
  createWorkbook(baseData, "test_base.xlsx");
  createWorkbook(newData, "test_new.xlsx");
  
  console.log("\n✅ ARCHIVOS DE PRUEBA CREADOS EXITOSAMENTE");
  console.log("==========================================");
  console.log("Ahora puedes ejecutar: node debug_comparison_diagnostic.cjs");
  console.log("para diagnosticar exactamente qué está pasando con la comparación.");
  
} catch (error) {
  console.error("❌ Error creando archivos:", error);
}
