import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Header } from './components/Header';
import FileUpload from './components/FileUpload';
import ResultView from './components/ResultView';
import { generateInfograma } from './services/gemini';
import { logInfogramGeneration } from './services/supabase';
import { InfogramResult } from './types';

enum AppState {
  IDLE = 'idle',
  GENERATING = 'generating',
  SUCCESS = 'success',
  ERROR = 'error'
}

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [result, setResult] = useState<InfogramResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    setAppState(AppState.GENERATING);
    setError(null);
    setCurrentFileName(file.name);
    
    try {
      const data = await generateInfograma(file);
      setResult(data);
      
      // Log to Supabase (no bloqueante - si falla, solo se loguea)
      try {
        await logInfogramGeneration({
          file_name: file.name,
          title: data.title,
          summary: data.summary,
          difficulty: data.difficulty,
          infogram_data: JSON.stringify(data),
          sketch_image_data: data.handDrawnSketch.imageData
        });
      } catch (logError) {
        console.error('Error logging to Supabase (non-blocking):', logError);
      }
      
      setAppState(AppState.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Hubo un error al generar el infograma. Por favor, probá de nuevo.");
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setResult(null);
    setError(null);
    setCurrentFileName('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Hero Section (only visible when IDLE) */}
          {appState === AppState.IDLE && (
            <div className="text-center mb-12">
              <span className="inline-block px-4 py-1.5 rounded-full bg-adhoc-lavender/20 text-adhoc-violet font-bold text-xs uppercase tracking-wider mb-4">
                Potenciado por IA
              </span>
              <h1 className="text-4xl md:text-5xl font-display font-medium text-gray-900 mb-6 leading-tight">
                Infogramas educativos para <br/>
                <span className="text-adhoc-violet">entender cualquier tema</span>
              </h1>
              <p className="text-lg text-gray-500 font-sans max-w-2xl mx-auto mb-8">
                Subí tu PDF (apuntes, papers, libros) y recibí un infograma visual y didáctico para estudiar mejor.
              </p>
            </div>
          )}

          {/* Interaction Area */}
          <div className="transition-all duration-500">
            {appState === AppState.IDLE && (
              <FileUpload onFileSelect={handleFileSelect} />
            )}

            {appState === AppState.GENERATING && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-adhoc-violet blur-xl opacity-20 rounded-full animate-pulse"></div>
                  <Loader2 className="w-16 h-16 text-adhoc-violet animate-spin relative z-10" />
                </div>
                <h3 className="text-2xl font-display text-gray-800 mb-2">Generando tu infograma...</h3>
                <p className="text-gray-500 font-sans animate-pulse">
                  Nuestros algoritmos están procesando el contenido y creando un resumen visual.
                </p>
              </div>
            )}

            {appState === AppState.ERROR && (
              <div className="bg-white rounded-xl shadow-lg border border-red-200 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">❌</span>
                  </div>
                  <h3 className="text-xl font-display text-gray-800 mb-2">Error al generar el infograma</h3>
                  <p className="text-gray-600 font-sans mb-6">{error}</p>
                  <button
                    onClick={handleReset}
                    className="px-6 py-3 bg-adhoc-violet text-white font-sans font-medium rounded-lg hover:bg-adhoc-violet/90 transition-colors"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              </div>
            )}

            {appState === AppState.SUCCESS && result && (
              <ResultView result={result} onReset={handleReset} />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p className="font-sans text-sm text-gray-500">
            <a 
              href="https://www.adhoc.inc" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-adhoc-violet hover:text-adhoc-coral transition-colors font-medium"
            >
              Conocé más sobre la tecnología de Adhoc →
            </a>
          </p>
          <p className="font-sans text-sm text-gray-400">
            © {new Date().getFullYear()} Adhoc S.A. - Soluciones Tecnológicas. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
