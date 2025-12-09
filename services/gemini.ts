import { InfogramResult } from "../types";
import pako from 'pako';

const processFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
};

const compressBase64 = (base64Data: string): string => {
  try {
    // Convert base64 to binary string
    const binaryData = atob(base64Data);
    
    // Convert binary string to Uint8Array
    const uint8Array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      uint8Array[i] = binaryData.charCodeAt(i);
    }
    
    // Compress with gzip
    const compressed = pako.gzip(uint8Array);
    
    // Convert compressed data back to base64
    const binaryString = String.fromCharCode.apply(null, Array.from(compressed));
    const compressedBase64 = btoa(binaryString);
    
    const originalSize = base64Data.length;
    const compressedSize = compressedBase64.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`Compression: ${originalSize} → ${compressedSize} bytes (${compressionRatio}% reduction)`);
    
    return compressedBase64;
  } catch (error) {
    console.error('Compression failed, using uncompressed:', error);
    return base64Data;
  }
};

export const generateInfograma = async (file: File): Promise<InfogramResult> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api/generate-infogram';
  
  let base64Data = await processFileToBase64(file);
  
  // Compress the PDF data
  base64Data = compressBase64(base64Data);
  
  // Determine mime type
  const mimeType = file.type || 'application/pdf';
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData: base64Data,
        mimeType: mimeType,
        isCompressed: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const result: InfogramResult = await response.json();
    return result;

  } catch (error: any) {
    console.error("Error calling infogram generation API:", error);
    throw new Error(error.message || 'Error al generar el infograma. Por favor intentá de nuevo.');
  }
};
