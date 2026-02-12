// fe-petnet/src/utils/imageCompression.ts

/**
 * Comprime una imagen optimizada para PNG/JPEG
 */
export const compressImage = (
  file: File,
  maxWidth: number = 800,
  quality: number = 0.7
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Redimensionar manteniendo aspect ratio
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener el contexto del canvas'));
          return;
        }
        
        // Configurar calidad según formato
        let outputQuality = quality;
        
        // Para PNG, reducir calidad más agresivamente
        if (file.type === 'image/png') {
          outputQuality = 0.6; // PNG necesita más compresión
        }
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a Base64 con compresión optimizada
        try {
          const compressedBase64 = canvas.toDataURL(file.type, outputQuality);
          resolve(compressedBase64);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Error al cargar la imagen'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * Calcula el tamaño estimado de una imagen Base64 en MB
 */
export const getBase64Size = (base64String: string): number => {
  if (!base64String) return 0;
  const base64Length = base64String.length - (base64String.indexOf(',') + 1);
  const sizeInBytes = (base64Length * 3) / 4;
  return sizeInBytes / (1024 * 1024); // Convertir a MB
};

/**
 * Valida el tamaño de la imagen Base64
 */
export const validateBase64Size = (
  base64String: string,
  maxSizeMB: number = 5
): boolean => {
  const sizeMB = getBase64Size(base64String);
  return sizeMB <= maxSizeMB;
};

/**
 * Optimiza Base64 si es necesario
 */
export const optimizeBase64 = (base64String: string): string => {
  // Si la imagen es muy grande, mostrar advertencia
  if (getBase64Size(base64String) > 3) {
    console.warn('Imagen muy grande, considere usar una imagen más pequeña');
  }
  return base64String;
};