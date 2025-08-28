// src/utils/verification.ts
// Script de verificación para comprobar que todas las funcionalidades estén funcionando

import { logger } from './logger';

export interface VerificationResult {
  success: boolean;
  message: string;
  details?: any;
}

export class SystemVerification {
  private static instance: SystemVerification;

  private constructor() {}

  static getInstance(): SystemVerification {
    if (!SystemVerification.instance) {
      SystemVerification.instance = new SystemVerification();
    }
    return SystemVerification.instance;
  }

  // Verificar que todas las funciones de procesamiento estén disponibles
  verifyProcessingFunctions(): VerificationResult {
    try {
      // Verificar que las funciones globales estén disponibles
      const requiredFunctions = [
        'parseYearAndNote',
        'getNotePriority', 
        'adjustTipoColumn',
        'reorderYearsInSection',
        'reorderAll',
        'formatVehicleData',
        'processNewData'
      ];

      const missingFunctions = requiredFunctions.filter(funcName => 
        typeof (window as any)[funcName] !== 'function'
      );

      if (missingFunctions.length > 0) {
        return {
          success: false,
          message: `Funciones de procesamiento faltantes: ${missingFunctions.join(', ')}`,
          details: { missingFunctions }
        };
      }

      return {
        success: true,
        message: 'Todas las funciones de procesamiento están disponibles'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error verificando funciones de procesamiento',
        details: { error }
      };
    }
  }

  // Verificar que el worker esté funcionando
  verifyWorker(): Promise<VerificationResult> {
    return new Promise((resolve) => {
      try {
        const worker = new Worker('/comparisonWorker.js');
        
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve({
            success: false,
            message: 'Worker no respondió en el tiempo esperado'
          });
        }, 5000);

        worker.onmessage = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          
          if (event.data && typeof event.data === 'object') {
            resolve({
              success: true,
              message: 'Worker funcionando correctamente'
            });
          } else {
            resolve({
              success: false,
              message: 'Worker devolvió respuesta inesperada',
              details: { response: event.data }
            });
          }
        };

        worker.onerror = (error) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve({
            success: false,
            message: 'Error en worker',
            details: { error }
          });
        };

        // Enviar mensaje de prueba
        worker.postMessage({
          currentFileContent: 'test',
          referenceFileContent: 'test'
        });

      } catch (error) {
        resolve({
          success: false,
          message: 'Error creando worker',
          details: { error }
        });
      }
    });
  }

  // Verificar que los sistemas de utilidades estén funcionando
  verifyUtilities(): VerificationResult {
    try {
      // Verificar logger
      if (!logger || typeof logger.debug !== 'function') {
        return {
          success: false,
          message: 'Sistema de logging no disponible'
        };
      }

      // Verificar que las funciones de validación estén disponibles
      const validationFunctions = ['validateFile', 'validateData'];
      const missingValidation = validationFunctions.filter(funcName => 
        typeof (window as any)[funcName] !== 'function'
      );

      if (missingValidation.length > 0) {
        return {
          success: false,
          message: `Funciones de validación faltantes: ${missingValidation.join(', ')}`
        };
      }

      return {
        success: true,
        message: 'Sistemas de utilidades funcionando correctamente'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error verificando utilidades',
        details: { error }
      };
    }
  }

  // Verificar que los componentes React estén disponibles
  verifyComponents(): VerificationResult {
    try {
      // Verificar que los componentes principales estén disponibles
      const requiredComponents = [
        'ComparisonView',
        'ComparisonViewer',
        'EditableExcelTable',
        'DataModal'
      ];

      const missingComponents = requiredComponents.filter(compName => 
        typeof (window as any)[compName] !== 'function'
      );

      if (missingComponents.length > 0) {
        return {
          success: false,
          message: `Componentes faltantes: ${missingComponents.join(', ')}`,
          details: { missingComponents }
        };
      }

      return {
        success: true,
        message: 'Todos los componentes están disponibles'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Error verificando componentes',
        details: { error }
      };
    }
  }

  // Verificación completa del sistema
  async verifyCompleteSystem(): Promise<VerificationResult[]> {
    logger.info('Iniciando verificación completa del sistema...');

    const results: VerificationResult[] = [];

    // Verificar funciones de procesamiento
    results.push(this.verifyProcessingFunctions());

    // Verificar worker
    results.push(await this.verifyWorker());

    // Verificar utilidades
    results.push(this.verifyUtilities());

    // Verificar componentes
    results.push(this.verifyComponents());

    // Resumen
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    logger.info(`Verificación completada: ${successCount}/${totalCount} verificaciones exitosas`);

    if (successCount === totalCount) {
      logger.success('✅ Sistema completamente funcional');
    } else {
      logger.warn(`⚠️ ${totalCount - successCount} problemas detectados`);
      results.filter(r => !r.success).forEach(result => {
        logger.error(`❌ ${result.message}`, result.details);
      });
    }

    return results;
  }
}

// Exportar instancia singleton
export const systemVerification = SystemVerification.getInstance();

// Función de conveniencia para verificación rápida
export const quickVerify = async (): Promise<boolean> => {
  const results = await systemVerification.verifyCompleteSystem();
  return results.every(result => result.success);
};
