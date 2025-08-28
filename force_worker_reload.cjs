const fs = require('fs');
const path = require('path');

console.log('🧹 === FORZANDO RECARGA DEL WORKER ===\n');

// Verificar que el worker existe
const workerPath = path.join(__dirname, 'public', 'comparisonWorker.js');
if (!fs.existsSync(workerPath)) {
  console.error('❌ Worker no encontrado en:', workerPath);
  process.exit(1);
}

// Leer el worker para verificar la versión
const workerContent = fs.readFileSync(workerPath, 'utf8');

// Verificar si es la versión v16
if (workerContent.includes('v16 - SIN COMPARACIÓN DE PRECIOS ENTRE ARCHIVOS')) {
  console.log('✅ Worker v16 encontrado correctamente');
} else {
  console.error('❌ Worker NO es la versión v16');
  console.log('📋 Contenido del worker:');
  console.log(workerContent.substring(0, 500) + '...');
  process.exit(1);
}

// Crear un archivo de timestamp para forzar recarga
const timestampFile = path.join(__dirname, 'public', 'worker_timestamp.txt');
const timestamp = new Date().toISOString();
fs.writeFileSync(timestampFile, timestamp);

console.log('📝 Timestamp creado:', timestamp);
console.log('🔄 Worker listo para recarga forzada');

// Instrucciones para el usuario
console.log('\n📋 INSTRUCCIONES PARA EL USUARIO:');
console.log('1. Cierra completamente la aplicación Electron');
console.log('2. Borra el cache del navegador (Ctrl+Shift+Delete)');
console.log('3. Vuelve a abrir la aplicación');
console.log('4. Sube el archivo real y haz la comparación');
console.log('5. Verifica en la consola que aparezca:');
console.log('   🚨🚨🚨 WORKER v16 CARGADO CORRECTAMENTE 🚨🚨🚨');
console.log('   🚨🚨🚨 WORKER v16 EJECUTADO CORRECTAMENTE 🚨🚨🚨');

console.log('\n✅ Script completado');


