// src/utils/memoryManager.ts
// Sistema de gestión de memoria optimizado

import { logger } from './logger';

export interface MemoryStats {
  totalMemory: number;
  usedMemory: number;
  freeMemory: number;
  memoryUsage: number;
}

export class MemoryManager {
  private static instance: MemoryManager;
  private largeObjects: Map<string, any> = new Map();
  private cleanupCallbacks: (() => void)[] = [];

  private constructor() {
    // Configurar limpieza automática
    this.setupAutoCleanup();
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  // Registrar un objeto grande para seguimiento
  registerLargeObject(key: string, object: any): void {
    this.largeObjects.set(key, object);
    logger.debug(`Objeto grande registrado: ${key}`);
  }

  // Liberar un objeto grande
  releaseLargeObject(key: string): boolean {
    const wasReleased = this.largeObjects.delete(key);
    if (wasReleased) {
      logger.debug(`Objeto grande liberado: ${key}`);
    }
    return wasReleased;
  }

  // Liberar todos los objetos grandes
  releaseAllLargeObjects(): void {
    const count = this.largeObjects.size;
    this.largeObjects.clear();
    logger.info(`Liberados ${count} objetos grandes`);
  }

  // Registrar callback de limpieza
  registerCleanupCallback(callback: () => void): void {
    this.cleanupCallbacks.push(callback);
  }

  // Ejecutar limpieza manual
  performCleanup(): void {
    logger.info('Iniciando limpieza de memoria...');
    
    // Ejecutar callbacks de limpieza
    this.cleanupCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        logger.error('Error en callback de limpieza', error);
      }
    });

    // Liberar objetos grandes
    this.releaseAllLargeObjects();

    // Forzar garbage collection si está disponible (solo en desarrollo)
    if (process.env.NODE_ENV === 'development' && (window as any).gc) {
      try {
        (window as any).gc();
        logger.debug('Garbage collection forzado');
      } catch (error) {
        logger.warn('No se pudo forzar garbage collection');
      }
    }

    logger.success('Limpieza de memoria completada');
  }

  // Obtener estadísticas de memoria
  getMemoryStats(): MemoryStats {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        totalMemory: memory.totalJSHeapSize,
        usedMemory: memory.usedJSHeapSize,
        freeMemory: memory.totalJSHeapSize - memory.usedJSHeapSize,
        memoryUsage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      };
    }

    // Fallback si no hay información de memoria disponible
    return {
      totalMemory: 0,
      usedMemory: 0,
      freeMemory: 0,
      memoryUsage: 0
    };
  }

  // Verificar si la memoria está en niveles críticos
  isMemoryCritical(): boolean {
    const stats = this.getMemoryStats();
    return stats.memoryUsage > 80; // Más del 80% de uso
  }

  // Configurar limpieza automática
  private setupAutoCleanup(): void {
    // Limpiar cuando la página pierde el foco
    window.addEventListener('blur', () => {
      if (this.isMemoryCritical()) {
        logger.warn('Memoria crítica detectada, iniciando limpieza automática');
        this.performCleanup();
      }
    });

    // Limpiar cuando se detecta mucha actividad de memoria
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        if (this.isMemoryCritical()) {
          logger.warn('Limpieza automática por uso crítico de memoria');
          this.performCleanup();
        }
      }, 30000); // Verificar cada 30 segundos
    }
  }

  // Limpiar datos de archivos específicos
  cleanupFileData(): void {
    logger.info('Limpiando datos de archivos...');
    
    // Liberar objetos relacionados con archivos
    const fileKeys = Array.from(this.largeObjects.keys()).filter(key => 
      key.includes('file') || key.includes('content') || key.includes('data')
    );
    
    fileKeys.forEach(key => this.releaseLargeObject(key));
    
    logger.success(`Datos de archivos limpiados: ${fileKeys.length} objetos liberados`);
  }

  // Limpiar datos de comparación
  cleanupComparisonData(): void {
    logger.info('Limpiando datos de comparación...');
    
    // Liberar objetos relacionados con comparación
    const comparisonKeys = Array.from(this.largeObjects.keys()).filter(key => 
      key.includes('comparison') || key.includes('diff') || key.includes('worker')
    );
    
    comparisonKeys.forEach(key => this.releaseLargeObject(key));
    
    logger.success(`Datos de comparación limpiados: ${comparisonKeys.length} objetos liberados`);
  }
}

// Exportar instancia singleton
export const memoryManager = MemoryManager.getInstance();

// Funciones de utilidad para limpieza específica
export const cleanupFileUpload = (): void => {
  memoryManager.cleanupFileData();
};

export const cleanupComparison = (): void => {
  memoryManager.cleanupComparisonData();
};

export const performFullCleanup = (): void => {
  memoryManager.performCleanup();
};
