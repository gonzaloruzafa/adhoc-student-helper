import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div
        className={`relative p-12 text-center transition-colors ${
          dragActive
            ? 'bg-adhoc-lavender/20 border-adhoc-violet'
            : 'bg-white'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,application/pdf"
          onChange={handleChange}
        />
        
        <div className="space-y-6">
          <div className="relative inline-block">
            <div className={`absolute inset-0 blur-xl opacity-20 rounded-full ${dragActive ? 'bg-adhoc-violet animate-pulse' : 'bg-gray-400'}`}></div>
            {dragActive ? (
              <FileText className="w-20 h-20 text-adhoc-violet relative z-10" />
            ) : (
              <Upload className="w-20 h-20 text-gray-400 relative z-10" />
            )}
          </div>
          
          <div>
            <h3 className="text-xl font-display text-gray-800 mb-2">
              {dragActive ? '¡Soltá tu archivo acá!' : 'Subí tu PDF'}
            </h3>
            <p className="text-gray-500 font-sans mb-6">
              Arrastrá y soltá tu archivo, o hacé click en el botón
            </p>
            <p className="text-sm text-gray-400 font-sans mb-8">
              Apuntes, papers, libros... cualquier material educativo
            </p>
          </div>
          
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-8 py-4 bg-adhoc-violet text-white font-sans font-medium rounded-lg hover:bg-adhoc-violet/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Upload className="w-5 h-5" />
            Seleccionar archivo
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 font-sans text-center">
          📄 Formato soportado: PDF • 📦 Tamaño máximo: 20MB
        </p>
      </div>
    </div>
  );
};

export default FileUpload;
