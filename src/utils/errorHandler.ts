// src/utils/errorHandler.ts
// Sistema centralizado de manejo de errores

import { logger } from './logger';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: AppError[] = [];

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Manejar errores de archivos
  handleFileError(error: any, context: string): AppError {
    const appError: AppError = {
      code: 'FILE_ERROR',
      message: `Error al procesar archivo: ${error.message || 'Error desconocido'}`,
      details: { context, originalError: error },
      timestamp: new Date()
    };

    this.logError(appError);
    return appError;
  }

  // Manejar errores de worker
  handleWorkerError(error: any): AppError {
    const appError: AppError = {
      code: 'WORKER_ERROR',
      message: `Error en worker: ${error.message || 'Error desconocido'}`,
      details: { originalError: error },
      timestamp: new Date()
    };

    this.logError(appError);
    return appError;
  }

  // Manejar errores de procesamiento de datos
  handleProcessingError(error: any, stage: string): AppError {
    const appError: AppError = {
      code: 'PROCESSING_ERROR',
      message: `Error en procesamiento (${stage}): ${error.message || 'Error desconocido'}`,
      details: { stage, originalError: error },
      timestamp: new Date()
    };

    this.logError(appError);
    return appError;
  }

  // Manejar errores de validación
  handleValidationError(message: string, data?: any): AppError {
    const appError: AppError = {
      code: 'VALIDATION_ERROR',
      message,
      details: data,
      timestamp: new Date()
    };

    this.logError(appError);
    return appError;
  }

  // Log del error
  private logError(error: AppError): void {
    logger.error(error.message, {
      code: error.code,
      details: error.details,
      timestamp: error.timestamp
    });
    this.errors.push(error);
  }

  // Obtener todos los errores
  getErrors(): AppError[] {
    return [...this.errors];
  }

  // Limpiar errores
  clearErrors(): void {
    this.errors = [];
  }

  // Obtener errores por código
  getErrorsByCode(code: string): AppError[] {
    return this.errors.filter(error => error.code === code);
  }

  // Verificar si hay errores
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  // Obtener el último error
  getLastError(): AppError | null {
    return this.errors.length > 0 ? this.errors[this.errors.length - 1] : null;
  }
}

// Exportar instancia singleton
export const errorHandler = ErrorHandler.getInstance();

// Funciones de utilidad para validación
export const validateFile = (file: File): boolean => {
  if (!file) {
    errorHandler.handleValidationError('No se seleccionó ningún archivo');
    return false;
  }

  const validExtensions = ['.xlsx', '.xls', '.pdf'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validExtensions.includes(fileExtension)) {
    errorHandler.handleValidationError(`Tipo de archivo no válido: ${fileExtension}`);
    return false;
  }

  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    errorHandler.handleValidationError(`Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    return false;
  }

  return true;
};

export const validateData = (data: any[][]): boolean => {
  if (!Array.isArray(data) || data.length === 0) {
    errorHandler.handleValidationError('Datos inválidos o vacíos');
    return false;
  }

  if (!Array.isArray(data[0])) {
    errorHandler.handleValidationError('Estructura de datos inválida');
    return false;
  }

  return true;
};
