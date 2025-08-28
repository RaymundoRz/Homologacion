# 🚗 Sistema de Homologación de Vehículos

## 📋 Descripción

Sistema de homologación para comparar y validar archivos Excel de vehículos, específicamente diseñado para la industria automotriz. Permite detectar diferencias en precios, versiones, y validar la estructura de datos entre archivos base y de referencia.

## ✨ Características Principales

- **Comparación Inteligente**: Detecta diferencias en precios, versiones y estructura de datos
- **Normalización Robusta**: Maneja múltiples formatos de precios (ES/EN, miles, decimales)
- **Validación de Años**: Contexto de años para evitar ambigüedades en versiones
- **Fallback Inteligente**: Sistema de respaldo para encontrar coincidencias por versión
- **Interfaz Moderna**: Aplicación Electron con React y Material-UI
- **Logs Detallados**: Sistema completo de logging para debugging

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React + TypeScript + Material-UI
- **Desktop**: Electron
- **Procesamiento**: Web Workers + XLSX.js
- **Estilos**: CSS3 + Responsive Design

## 🚀 Instalación

### Prerrequisitos
- Node.js (v16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone https://github.com/RaymundoRz/Homologacion.git
cd Homologacion
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Ejecutar en modo desarrollo**
```bash
npm run dev
```

4. **Construir para producción**
```bash
npm run build
```

## 📁 Estructura del Proyecto

```
homologacionLibro/
├── src/
│   ├── assets/
│   │   ├── ComparisonView.tsx      # Componente principal de comparación
│   │   └── ComparisonViewer.tsx    # Visualizador de resultados
│   ├── components/
│   │   └── ResizableModal.tsx      # Modal redimensionable
│   └── App.css                     # Estilos globales
├── public/
│   └── comparisonWorker.js         # Worker para procesamiento de Excel
├── package.json
└── README.md
```

## 🔧 Funcionalidades

### Comparación de Archivos Excel
- Carga de archivos base y de referencia
- Procesamiento en background con Web Workers
- Detección de diferencias en tiempo real

### Normalización de Precios
- Soporte para formatos ES/EN (1.234,56 vs 1,234.56)
- Manejo de puntos de miles (1.234.567)
- Preservación de signos negativos
- Conversión a centavos para comparación precisa

### Validación de Datos
- Detección de duplicados
- Validación de estructura de precios
- Contexto de años para versiones
- Fallback por versión cuando no hay match exacto

### Interfaz de Usuario
- Modales redimensionables y arrastrables
- Indicador de modales minimizados
- Paginación de resultados
- Logs en tiempo real

## 📊 Formato de Archivos

### Estructura Esperada
Los archivos Excel deben contener las siguientes columnas:
1. **Tipo** - Categoría del vehículo
2. **Clase** - Clasificación (A-E)
3. **Versiones** - Nombre del modelo/versión
4. **Preciobase** - Precio principal
5. **Preciobase2** - Precio secundario

### Validaciones
- Preciobase debe ser mayor o igual a Preciobase2
- Las celdas vacías se marcan como inválidas
- Se detectan duplicados en versiones
- Se valida el contexto de años

## 🐛 Debugging

El sistema incluye un sistema completo de logging:
- Logs en consola del navegador
- Logs guardados en archivo
- Captura de console.log, console.warn y console.error
- Información detallada de cada diferencia encontrada

## 📝 Licencia

Este proyecto es privado y está destinado para uso interno de la empresa.

## 👥 Contribución

Para contribuir al proyecto:
1. Crear una rama para tu feature
2. Hacer los cambios necesarios
3. Crear un Pull Request
4. Esperar la revisión y aprobación

## 📞 Soporte

Para soporte técnico o preguntas sobre el proyecto, contactar al equipo de desarrollo.
