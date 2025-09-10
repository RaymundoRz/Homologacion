/* =========================================================
 * CONFIGURACIÓN DEL SISTEMA DE DIAGNÓSTICO
 * =======================================================*/

// Configuración del sistema de diagnóstico
const DIAGNOSTIC_CONFIG = {
  // Activar/desactivar diagnóstico
  enabled: true, // REACTIVADO - LA COMPARACIÓN YA FUNCIONA
  
  // Nivel de detalle del diagnóstico
  detailLevel: 'FULL', // 'MINIMAL', 'STANDARD', 'FULL'
  
  // Verificaciones específicas a ejecutar
  checks: {
    dataStructure: true,
    processingFlow: true,
    priceIntegrity: true,
    ebcTransformations: true,
    comparisonResults: true
  },
  
  // Límites para reportes
  limits: {
    maxIdenticalPrices: 10, // Máximo de precios idénticos a mostrar
    maxDifferentPrices: 5,  // Máximo de precios diferentes a mostrar
    maxStructuralDifferences: 20 // Máximo de diferencias estructurales
  },
  
  // Configuración de logging
  logging: {
    consoleOutput: true,
    detailedLogs: true,
    saveToFile: false // No implementado aún
  }
};

// Función para activar diagnóstico
function enableDiagnostic() {
  DIAGNOSTIC_CONFIG.enabled = true;
  console.log('🔍 Diagnóstico ACTIVADO');
}

// Función para desactivar diagnóstico
function disableDiagnostic() {
  DIAGNOSTIC_CONFIG.enabled = false;
  console.log('🔍 Diagnóstico DESACTIVADO');
}

// Función para configurar nivel de detalle
function setDiagnosticLevel(level) {
  if (['MINIMAL', 'STANDARD', 'FULL'].includes(level)) {
    DIAGNOSTIC_CONFIG.detailLevel = level;
    console.log(`🔍 Nivel de diagnóstico: ${level}`);
  } else {
    console.error('❌ Nivel inválido. Use: MINIMAL, STANDARD, FULL');
  }
}

// Función para activar/desactivar verificaciones específicas
function toggleCheck(checkName, enabled) {
  if (DIAGNOSTIC_CONFIG.checks.hasOwnProperty(checkName)) {
    DIAGNOSTIC_CONFIG.checks[checkName] = enabled;
    console.log(`🔍 Verificación ${checkName}: ${enabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
  } else {
    console.error(`❌ Verificación ${checkName} no encontrada`);
  }
}

// Exportar configuración
if (typeof self !== 'undefined') {
  // En Web Worker
  self.DIAGNOSTIC_CONFIG = DIAGNOSTIC_CONFIG;
  self.enableDiagnostic = enableDiagnostic;
  self.disableDiagnostic = disableDiagnostic;
  self.setDiagnosticLevel = setDiagnosticLevel;
  self.toggleCheck = toggleCheck;
} else if (typeof window !== 'undefined') {
  // En navegador
  window.DIAGNOSTIC_CONFIG = DIAGNOSTIC_CONFIG;
  window.enableDiagnostic = enableDiagnostic;
  window.disableDiagnostic = disableDiagnostic;
  window.setDiagnosticLevel = setDiagnosticLevel;
  window.toggleCheck = toggleCheck;
}

console.log('🔍 Configuración de diagnóstico cargada');
