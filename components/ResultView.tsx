import React from 'react';
import { 
  Lightbulb, 
  Target, 
  HelpCircle, 
  RefreshCw, 
  ArrowRight,
  Brain,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { InfogramResult } from '../types';

interface ResultViewProps {
  result: InfogramResult;
  onReset: () => void;
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

const ResultView: React.FC<ResultViewProps> = ({ result, onReset }) => {
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

      {/* Reset Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 px-8 py-4 bg-adhoc-violet text-white font-sans font-medium rounded-lg hover:bg-adhoc-violet/90 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <RefreshCw className="w-5 h-5" />
          Generar otro infograma
        </button>
      </div>
    </div>
  );
};

export default ResultView;
