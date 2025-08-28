// src/components/ResizableModal.tsx - VERSIÓN OPTIMIZADA
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography
} from '@mui/material';
import {
  Close as CloseIcon,
  Remove as MinimizeIcon,
  CropSquare as MaximizeIcon,
  Crop169 as RestoreIcon
} from '@mui/icons-material';

interface ResizableModalProps {
  title: string;
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  /** Si es true, permite cerrar al hacer click en el fondo (backdrop). Por defecto: false */
  closeOnBackdropClick?: boolean;
  /** Callback cuando el modal se activa (se hace clic en él) */
  onActivate?: () => void;
  initialWidth?: number;
  initialHeight?: number;
  initialX?: number;
  initialY?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  zIndex?: number;
}

const ResizableModal: React.FC<ResizableModalProps> = ({
  title,
  children,
  open,
  onClose,
  onMinimize,
  closeOnBackdropClick = false,
  onActivate,
  initialWidth = 600,
  initialHeight = 500,
  initialX,
  initialY,
  minWidth = 350,
  minHeight = 250,
  maxWidth = window.innerWidth * 0.9,
  maxHeight = window.innerHeight * 0.9,
  zIndex = 1300
}) => {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const [originalSize, setOriginalSize] = useState({ width: initialWidth, height: initialHeight });
  const [originalPosition, setOriginalPosition] = useState({ x: 50, y: 50 });
  const [isInteracting, setIsInteracting] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  // Posicionar la ventana al abrir
  useEffect(() => {
    if (open) {
      let x, y;
      if (initialX !== undefined && initialY !== undefined) {
        // Usar posición específica si se proporciona
        x = initialX;
        y = initialY;
      } else {
        // Centrar por defecto
        x = (window.innerWidth - initialWidth) / 2;
        y = (window.innerHeight - initialHeight) / 2;
      }
      setPosition({ x, y });
      setSize({ width: initialWidth, height: initialHeight });
      setIsMaximized(false);
    }
  }, [open, initialWidth, initialHeight, initialX, initialY]);

  // Manejar maximizar/restaurar
  const handleMaximize = () => {
    if (isMaximized) {
      setSize(originalSize);
      setPosition(originalPosition);
      setIsMaximized(false);
    } else {
      setOriginalSize(size);
      setOriginalPosition(position);
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
  };

  // Manejar minimizar
  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    }
  };

  // Iniciar arrastre
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      e.stopPropagation();
      e.preventDefault();
      e.nativeEvent.stopImmediatePropagation();
      setIsDragging(true);
      setIsInteracting(true);
      const rect = modalRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    }
  };

  // Manejar arrastre y redimensionamiento
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isMaximized) {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Permitir mover fuera del área visible (como Windows)
        // Solo limitar para que no se pierda completamente
        const minVisibleX = -size.width + 50; // Dejar al menos 50px visible
        const minVisibleY = -size.height + 50; // Dejar al menos 50px visible
        const maxX = window.innerWidth - 50; // Dejar al menos 50px visible
        const maxY = window.innerHeight - 50; // Dejar al menos 50px visible
        
        setPosition({
          x: Math.max(minVisibleX, Math.min(newX, maxX)),
          y: Math.max(minVisibleY, Math.min(newY, maxY))
        });
      }

      if (isResizing && !isMaximized) {
        const newSize = { ...size };
        const newPosition = { ...position };

        if (resizeDirection.includes('e')) {
          const newWidth = e.clientX - position.x;
          if (newWidth >= minWidth && newWidth <= maxWidth) {
            newSize.width = newWidth;
          }
        }

        if (resizeDirection.includes('w')) {
          const newWidth = position.x + size.width - e.clientX;
          if (newWidth >= minWidth && newWidth <= maxWidth) {
            newSize.width = newWidth;
            newPosition.x = e.clientX;
          }
        }

        if (resizeDirection.includes('s')) {
          const newHeight = e.clientY - position.y;
          if (newHeight >= minHeight && newHeight <= maxHeight) {
            newSize.height = newHeight;
          }
        }

        if (resizeDirection.includes('n')) {
          const newHeight = position.y + size.height - e.clientY;
          if (newHeight >= minHeight && newHeight <= maxHeight) {
            newSize.height = newHeight;
            newPosition.y = e.clientY;
          }
        }

        setSize(newSize);
        setPosition(newPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeDirection('');
      // Aumentar el delay para evitar cierre accidental después de redimensionar
      setTimeout(() => {
        setIsInteracting(false);
      }, 200);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, size, position, resizeDirection, minWidth, minHeight, maxWidth, maxHeight, isMaximized]);

  // Iniciar redimensionamiento
  const handleResizeStart = (direction: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    setIsResizing(true);
    setIsInteracting(true);
    setResizeDirection(direction);
  };

  // Activar modal al hacer clic en cualquier parte
  const handleModalClick = () => {
    setIsActive(true);
    if (onActivate) {
      onActivate();
    }
  };

  // Activar modal solo al hacer clic en la barra de título
  const handleTitleBarClick = () => {
    setIsActive(true);
    if (onActivate) {
      onActivate();
    }
  };

    if (!open) return null;

  return (
    <>
      {/* Modal sin backdrop - completamente independiente */}
      <Paper
        ref={modalRef}
        sx={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'default',
          border: isActive ? '2px solid #4CAF50' : '1px solid #333', // Borde verde cuando está activo
          borderRadius: isMaximized ? 0 : '4px',
          backgroundColor: '#1e1e1e',
          zIndex: zIndex, // Forzar z-index en el Paper
          pointerEvents: 'auto', // Restaurar eventos de clic en el modal
          boxShadow: isActive ? '0 0 20px rgba(76, 175, 80, 0.3)' : '0 4px 12px rgba(0,0,0,0.5)' // Sombra verde cuando está activo
        }}
        style={{
          zIndex: zIndex + ' !important' // Forzar z-index con !important
        }}
        onMouseDown={handleMouseDown}
        onClick={handleModalClick} // Activar al hacer clic en cualquier parte
      >
                 {/* Barra de título */}
         <Box
           data-modal-title="true"
           sx={{
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'space-between',
             backgroundColor: '#2c2c2c',
             color: 'white',
             padding: '8px 16px',
             cursor: 'grab',
             userSelect: 'none',
             borderBottom: '1px solid #333'
           }}
           onMouseDown={handleMouseDown}
           onClick={handleTitleBarClick}
         >
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={handleMinimize}
              sx={{ 
                color: 'white', 
                width: 32,
                height: 32,
                padding: 0
              }}
            >
              <MinimizeIcon sx={{ fontSize: 16 }} />
            </IconButton>
            
            <IconButton
              size="small"
              onClick={handleMaximize}
              sx={{ 
                color: 'white', 
                width: 32,
                height: 32,
                padding: 0
              }}
            >
              {isMaximized ? 
                <RestoreIcon sx={{ fontSize: 16 }} /> : 
                <MaximizeIcon sx={{ fontSize: 16 }} />
              }
            </IconButton>
            
            <IconButton
              size="small"
              onClick={onClose}
              sx={{ 
                color: 'white', 
                width: 32,
                height: 32,
                padding: 0
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        {/* Contenido */}
        <Box
          sx={{
            flex: 1,
            overflow: 'auto',
            padding: 2,
            backgroundColor: '#1e1e1e',
            color: 'white'
          }}
        >
          {children}
        </Box>

        {/* Bordes de redimensionamiento - SOLO cuando no está maximizada */}
        {!isMaximized && (
          <>
            {/* Borde derecho */}
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                top: 0,
                width: '4px',
                height: '100%',
                cursor: 'e-resize'
              }}
              onMouseDown={handleResizeStart('e')}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Borde izquierdo */}
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '4px',
                height: '100%',
                cursor: 'w-resize'
              }}
              onMouseDown={handleResizeStart('w')}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Borde inferior */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '100%',
                height: '4px',
                cursor: 's-resize'
              }}
              onMouseDown={handleResizeStart('s')}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Borde superior */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '4px',
                cursor: 'n-resize'
              }}
              onMouseDown={handleResizeStart('n')}
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Esquinas */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '8px',
                height: '8px',
                cursor: 'se-resize'
              }}
              onMouseDown={handleResizeStart('se')}
              onClick={(e) => e.stopPropagation()}
            />
            
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '8px',
                height: '8px',
                cursor: 'sw-resize'
              }}
              onMouseDown={handleResizeStart('sw')}
              onClick={(e) => e.stopPropagation()}
            />
            
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '8px',
                height: '8px',
                cursor: 'ne-resize'
              }}
              onMouseDown={handleResizeStart('ne')}
              onClick={(e) => e.stopPropagation()}
            />
            
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '8px',
                height: '8px',
                cursor: 'nw-resize'
              }}
              onMouseDown={handleResizeStart('nw')}
              onClick={(e) => e.stopPropagation()}
            />
          </>
        )}
      </Paper>
    </>
  );
};

export default ResizableModal;
