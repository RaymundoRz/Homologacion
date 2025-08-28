// src/utils/logger.ts
// Sistema de logging centralizado para el proyecto

interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  private isDevelopment: boolean;
  private currentLevel: number;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.currentLevel = this.isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.ERROR;
  }

  private shouldLog(level: number): boolean {
    return this.isDevelopment && level >= this.currentLevel;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(`🔍 ${message}`, data || '');
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(`ℹ️ ${message}`, data || '');
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.WARN)) {
      console.warn(`⚠️ ${message}`, data || '');
    }
  }

  error(message: string, error?: any): void {
    console.error(`❌ ${message}`, error || '');
  }

  success(message: string, data?: any): void {
    if (this.shouldLog(LOG_LEVELS.INFO)) {
      console.log(`✅ ${message}`, data || '');
    }
  }

  // Métodos específicos para el proyecto
  fileUpload(type: string, fileName: string, fileSize: number): void {
    this.info(`Cargando archivo: ${type} - ${fileName} (${fileSize} bytes)`);
  }

  processing(stage: string, data?: any): void {
    this.debug(`Procesando ${stage}`, data);
  }

  comparison(result: { filas: number; diferencias: number }): void {
    this.success(`Comparación completada: ${result.filas} filas, ${result.diferencias} diferencias`);
  }

  worker(action: string): void {
    this.debug(`Worker: ${action}`);
  }
}

// Exportar una instancia singleton
export const logger = new Logger();

// Exportar tipos para uso en otros archivos
export type { LogLevel };
