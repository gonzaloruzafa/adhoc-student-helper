import { InfogramResult } from "../types";
import { extractTextFromPDF, extractPDFAsBase64 } from "../utils/pdfExtract";
import pako from 'pako';

const compressBase64 = (base64Data: string): string => {
  try {
    const binaryData = atob(base64Data);
    const uint8Array = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      uint8Array[i] = binaryData.charCodeAt(i);
    }
    
    const compressed = pako.gzip(uint8Array);
    const binaryString = String.fromCharCode.apply(null, Array.from(compressed));
    const compressedBase64 = btoa(binaryString);
    
    const originalSize = base64Data.length;
    const compressedSize = compressedBase64.length;
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
    
    console.log(`Compression: ${(originalSize / 1024).toFixed(0)}KB → ${(compressedSize / 1024).toFixed(0)}KB (${compressionRatio}% reduction)`);
    
    return compressedBase64;
  } catch (error) {
    console.error('Compression failed:', error);
    throw new Error('Error comprimiendo PDF');
  }
};

export const generateInfograma = async (file: File): Promise<InfogramResult> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api/generate-infogram';
  
  try {
    console.log(`Procesando PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Intentar extraer texto primero
    let pdfText = '';
    try {
      console.log('Extrayendo texto del PDF...');
      pdfText = await extractTextFromPDF(file);
      console.log(`Texto extraído: ${pdfText.length} caracteres`);
    } catch (textError) {
      console.warn('No se pudo extraer texto, usaremos PDF completo:', textError);
      pdfText = '';
    }

    // Obtener PDF en base64 (para imágenes)
    console.log('Extrayendo PDF completo (para preservar imágenes)...');
    let pdfBase64 = await extractPDFAsBase64(file);
    
    // Comprimir
    console.log('Comprimiendo PDF...');
    pdfBase64 = compressBase64(pdfBase64);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfText: pdfText,
        pdfBase64: pdfBase64,
        fileName: file.name,
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
