# 🔬 SALIDA JSON QUE PRODUCE XLSX.utils.sheet_to_json

## Configuración Usada
```javascript
const data = XLSX.utils.sheet_to_json(worksheet, { 
  header: 1, 
  defval: '', 
  blankrows: false 
});
```

## Estructura de Datos que Entrega XLSX

### Primera Fila (Header)
```javascript
[
  "Tipo",
  "Clase", 
  "Versiones",
  "Preciobase",
  "Preciobase2"
]
```

### Filas de Datos (Ejemplos Reales)
```javascript
// Fila 4 - MDX A-Spec
[
  4,           // Tipo (number)
  "SUV",       // Clase (string)
  "MDX A-Spec", // Versión (string)
  "85000",     // Precio1 (string)
  "82000"      // Precio2 (string)
]

// Fila 5 - MDX Type S
[
  4,           // Tipo (number)
  "SUV",       // Clase (string)
  "MDX Type S", // Versión (string)
  "95000",     // Precio1 (string)
  "92000"      // Precio2 (string)
]

// Fila 8 - TLX A-Spec
[
  4,           // Tipo (number)
  "Sedan",     // Clase (string)
  "TLX A-Spec", // Versión (string)
  "45000",     // Precio1 (string)
  "42000"      // Precio2 (string)
]

// Fila 17 - ILX A-Spec (con clase vacía)
[
  4,           // Tipo (number)
  "",          // Clase (string vacía)
  "ILX A-Spec", // Versión (string)
  "35000",     // Precio1 (string)
  "32000"      // Precio2 (string)
]
```

## Análisis de Tipos de Datos

### Comportamiento de XLSX
- **Tipo**: Se convierte a `number` (4)
- **Clase**: Se mantiene como `string` ("SUV", "Sedan", "")
- **Versión**: Se mantiene como `string` ("MDX A-Spec", "TLX Type S")
- **Precio1**: Se mantiene como `string` ("85000", "95000")
- **Precio2**: Se mantiene como `string` ("82000", "92000")

### Casos Especiales
- **Celdas vacías**: Se convierten a `""` (string vacío)
- **Números**: Los precios se mantienen como strings, no se convierten a numbers
- **Texto**: Se mantiene como string
- **Valores nulos**: Se convierten a `""` (string vacío)

## Implicaciones para el Worker

### Ventajas
1. **Consistencia**: Todos los precios son strings, fácil de procesar
2. **Sin conversión automática**: XLSX no convierte números a floats
3. **Preservación de formato**: Mantiene el formato original del Excel

### Consideraciones
1. **Validación necesaria**: Hay que validar que los strings sean números válidos
2. **Normalización requerida**: Aunque son strings limpios, hay que normalizar
3. **Manejo de vacíos**: Las celdas vacías se convierten a strings vacíos

## Conclusión

**XLSX está entregando los datos exactamente como los necesitas:**
- Precios como strings de números enteros
- Sin conversión automática a floats
- Formato consistente y predecible
- Fácil de procesar y normalizar



