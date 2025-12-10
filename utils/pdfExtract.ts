import * as pdfjsLib from 'pdfjs-dist';

// Crear un worker inline usando Blob
let workerInitialized = false;

async function initializeWorker() {
  if (workerInitialized) return;
  
  try {
    // Intenta cargar el worker desde el CDN como fallback
    const workerUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    
    // Test si funciona
    const response = await fetch(workerUrl, { method: 'HEAD' });
    if (response.ok) {
      console.log('Worker loaded from CDN');
      workerInitialized = true;
      return;
    }
  } catch (e) {
    console.log('CDN worker unavailable, using fallback');
  }

  // Fallback: usar inline worker
  try {
    const workerBlob = new Blob(
      [`importScripts('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js');`],
      { type: 'application/javascript' }
    );
    const workerUrl = URL.createObjectURL(workerBlob);
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
    console.log('Worker loaded from Blob');
    workerInitialized = true;
  } catch (e) {
    console.log('Could not create inline worker');
  }
}

export async function extractTextFromPDF(file: File): Promise<string> {
  // Inicializar worker si no está hecho
  await initializeWorker();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const maxPages = Math.min(pdf.numPages, 50); // Límite a 50 páginas máximo
    
    console.log(`Extrayendo texto de ${maxPages} páginas...`);
    
    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += `\n--- Página ${pageNum} ---\n${pageText}`;
      
      // Log progress cada 10 páginas
      if (pageNum % 10 === 0) {
        console.log(`Procesadas ${pageNum} páginas...`);
      }
    }
    
    console.log(`Extracción completada. Total de caracteres: ${fullText.length}`);
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('No se pudo procesar el PDF. Intentá con otro archivo.');
  }
}

export async function extractPDFAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = (error) => reject(error);
  });
}
