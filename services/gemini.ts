import { InfogramResult } from "../types";
import { extractTextFromPDF } from "../utils/pdfExtract";

export const generateInfograma = async (file: File): Promise<InfogramResult> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api/generate-infogram';
  
  try {
    console.log(`Procesando PDF: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Extraer texto del PDF en el cliente
    console.log('Extrayendo texto del PDF...');
    const pdfText = await extractTextFromPDF(file);
    console.log(`Texto extraído: ${pdfText.length} caracteres`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pdfText: pdfText,
        fileName: file.name,
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
