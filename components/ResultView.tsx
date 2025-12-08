import React, { useState } from 'react';
import { 
  Lightbulb, 
  Target, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight,
  Brain,
  TrendingUp,
  Sparkles,
  Pencil
} from 'lucide-react';
import { InfogramResult } from '../types';

interface ResultViewProps {
  result: InfogramResult;
  onReset: () => void;
  infogramLogId?: string | null;
}

const DifficultyBadge: React.FC<{ level: string }> = ({ level }) => {
  const configs = {
    'Básico': { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' },
    'Intermedio': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡' },
    'Avanzado': { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴' }
  };
  const config = configs[level as keyof typeof configs] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⚪' };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-sans font-medium ${config.bg} ${config.text}`}>
      <span>{config.icon}</span>
      {level}
    </span>
  );
};

const ResultView: React.FC<ResultViewProps> = ({ result, onReset, infogramLogId }) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleShareWhatsApp = () => {
    if (!infogramLogId) {
      alert('El infograma aún se está guardando. Intentá en unos segundos.');
      return;
    }
    
    const shareUrl = `${window.location.origin}/infogram/${infogramLogId}`;
    const text = `¡Mirá este infograma educativo que creé con Adhoc Student Helper! 📚✨\n\n"${result.title}"\n\nVeelo acá:`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCopyLink = async () => {
    if (!infogramLogId) {
      alert('El infograma aún se está guardando. Intentá en unos segundos.');
      return;
    }
    
    const shareUrl = `${window.location.origin}/infogram/${infogramLogId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 3000);
    } catch (err) {
      alert('No se pudo copiar el link. Intentá de nuevo.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-lg border border-adhoc-lavender p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-adhoc-violet" />
              <span className="text-xs font-sans font-bold text-adhoc-violet uppercase tracking-wider">Infograma Generado</span>
            </div>
            <h1 className="text-3xl font-display font-medium text-gray-900 mb-3">
              {result.title}
            </h1>
            <p className="text-lg text-gray-600 font-sans">
              {result.summary}
            </p>
          </div>
          <DifficultyBadge level={result.difficulty} />
        </div>
      </div>

      {/* Hand-Drawn Sketch IMAGE */}
      <div className="bg-white rounded-xl shadow-lg border-2 border-adhoc-coral/30 p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-adhoc-coral/20 flex items-center justify-center">
            <Pencil className="w-6 h-6 text-adhoc-coral" />
          </div>
          <h2 className="text-2xl font-display font-medium text-gray-900">
            Sketch Notes Visual
          </h2>
        </div>
        <p className="text-sm text-gray-600 font-sans mb-6 italic">
          {result.handDrawnSketch.description}
        </p>
        <div className="bg-amber-50/50 rounded-lg p-6 border-2 border-amber-200/50">
          <img 
            src={result.handDrawnSketch.imageUrl} 
            alt="Infográfico educativo tipo sketch notes"
            className="w-full h-auto rounded-lg shadow-md"
          />
        </div>
      </div>

      {/* Main Concepts */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-adhoc-lavender/30 flex items-center justify-center">
            <Brain className="w-6 h-6 text-adhoc-violet" />
          </div>
          <h2 className="text-2xl font-display font-medium text-gray-900">
            Conceptos Clave
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {result.mainConcepts.map((concept, idx) => (
            <div 
              key={idx}
              className="border-2 border-adhoc-lavender/50 rounded-lg p-5 hover:border-adhoc-violet hover:shadow-md transition-all bg-gradient-to-br from-white to-adhoc-lavender/10"
            >
              <h3 className="text-lg font-display font-medium text-gray-900 mb-2 flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-full bg-adhoc-violet text-white text-sm font-bold">
                  {idx + 1}
                </span>
                {concept.concept}
              </h3>
              <p className="text-gray-700 font-sans mb-3 leading-relaxed">
                {concept.explanation}
              </p>
              {concept.example && (
                <div className="bg-white rounded-lg p-3 border-l-4 border-adhoc-coral">
                  <p className="text-sm text-gray-600 font-sans">
                    <span className="font-semibold text-adhoc-violet">Ejemplo:</span> {concept.example}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Visual Elements */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-display font-medium text-gray-900">
            Elementos Visuales
          </h2>
        </div>

        {result.visualElements.diagram && (
          <div className="mb-6 p-5 bg-blue-50 rounded-lg border-2 border-blue-200">
            <h3 className="font-display font-medium text-blue-900 mb-2 flex items-center gap-2">
              <span>📊</span> Diagrama Visual
            </h3>
            <p className="text-gray-700 font-sans">{result.visualElements.diagram}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="font-display font-medium text-gray-900 mb-3 flex items-center gap-2">
            <span>✨</span> Puntos Clave
          </h3>
          <ul className="space-y-2">
            {result.visualElements.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 font-sans text-gray-700">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-adhoc-violet/20 text-adhoc-violet flex items-center justify-center text-xs font-bold mt-0.5">
                  ✓
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {result.visualElements.connections.length > 0 && (
          <div>
            <h3 className="font-display font-medium text-gray-900 mb-3 flex items-center gap-2">
              <span>🔗</span> Conexiones entre Conceptos
            </h3>
            <div className="space-y-3">
              {result.visualElements.connections.map((conn, idx) => (
                <div 
                  key={idx}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-adhoc-lavender transition-colors"
                >
                  <span className="font-sans font-medium text-adhoc-violet">{conn.from}</span>
                  <ArrowRight className="w-4 h-4 text-adhoc-coral flex-shrink-0" />
                  <span className="text-sm text-gray-600 font-sans italic">{conn.relationship}</span>
                  <ArrowRight className="w-4 h-4 text-adhoc-coral flex-shrink-0" />
                  <span className="font-sans font-medium text-adhoc-violet">{conn.to}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Study Tips */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-yellow-50 flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-display font-medium text-gray-900">
            Tips de Estudio
          </h2>
        </div>
        <ul className="space-y-3">
          {result.studyTips.map((tip, idx) => (
            <li 
              key={idx}
              className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200 hover:border-yellow-300 transition-colors"
            >
              <TrendingUp className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <span className="text-gray-700 font-sans">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Key Questions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-display font-medium text-gray-900">
            Preguntas de Autoevaluación
          </h2>
        </div>
        <ul className="space-y-3">
          {result.keyQuestions.map((question, idx) => (
            <li 
              key={idx}
              className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border-2 border-green-200 hover:border-green-300 transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-gray-700 font-sans">{question}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Share & Action Buttons */}
      <div className="flex flex-wrap justify-center gap-4 pt-6">
        {/* WhatsApp Share Button */}
        {infogramLogId ? (
          <button
            onClick={handleShareWhatsApp}
            className="px-6 py-3 rounded-lg bg-[#25D366] text-white font-sans font-medium hover:bg-[#20BA5A] transition-colors flex items-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            <span>Compartir por WhatsApp</span>
          </button>
        ) : (
          <div className="px-6 py-3 rounded-lg bg-gray-200 text-gray-500 font-sans font-medium flex items-center gap-2 opacity-60 cursor-not-allowed">
            <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Guardando infograma...</span>
          </div>
        )}

        {/* Copy Link Button */}
        {infogramLogId && (
          <button
            onClick={handleCopyLink}
            className="px-6 py-3 rounded-lg bg-white border-2 border-adhoc-violet text-adhoc-violet font-sans font-medium hover:bg-adhoc-violet hover:text-white transition-colors flex items-center gap-2"
          >
            {showCopied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>¡Link copiado!</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                  <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                </svg>
                <span>Copiar link</span>
              </>
            )}
          </button>
        )}
        
        {/* Reset Button */}
        <button
          onClick={onReset}
          className="px-6 py-3 rounded-lg bg-white border-2 border-adhoc-violet text-adhoc-violet font-sans font-medium hover:bg-adhoc-violet hover:text-white transition-colors shadow-sm"
        >
          <RefreshCw className="w-5 h-5 inline mr-2" />
          Generar otro infograma
        </button>
      </div>
    </div>
  );
};

export default ResultView;
