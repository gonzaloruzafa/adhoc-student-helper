import { InfogramResult } from "../types";

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

export const generateInfograma = async (file: File): Promise<InfogramResult> => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api/generate-infogram';
  
  const base64Data = await processFileToBase64(file);
  
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
