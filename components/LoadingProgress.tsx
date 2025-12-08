import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface LoadingProgressProps {
  isVisible: boolean;
}

const steps = [
  { label: 'Leyendo tu documento', icon: '📄', duration: 3000 },
  { label: 'Analizando contenido', icon: '🔍', duration: 3000 },
  { label: 'Extrayendo conceptos clave', icon: '🧠', duration: 3000 },
  { label: 'Generando infograma visual', icon: '🎨', duration: 3000 },
  { label: 'Aplicando estética manuscrita', icon: '✏️', duration: 2000 },
];

const LoadingProgress: React.FC<LoadingProgressProps> = ({ isVisible }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    // Calculate total duration
    const totalDuration = steps.reduce((acc, step) => acc + step.duration, 0);
    let elapsed = 0;

    // Progress animation
    const progressInterval = setInterval(() => {
      elapsed += 50;
      setProgress(Math.min((elapsed / totalDuration) * 100, 95)); // Cap at 95% until complete
    }, 50);

    // Step progression
    let stepIndex = 0;
    const stepIntervals: NodeJS.Timeout[] = [];

    steps.forEach((step, index) => {
      const timeout = setTimeout(() => {
        setCurrentStep(index);
      }, steps.slice(0, index).reduce((acc, s) => acc + s.duration, 0));
      stepIntervals.push(timeout as any);
    });

    return () => {
      clearInterval(progressInterval);
      stepIntervals.forEach(interval => clearTimeout(interval));
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
      {/* Main Loader */}
      <div className="relative inline-block mb-8">
        <div className="absolute inset-0 bg-adhoc-violet blur-xl opacity-20 rounded-full animate-pulse"></div>
        <Loader2 className="w-16 h-16 text-adhoc-violet animate-spin relative z-10" />
      </div>

      {/* Title */}
      <h3 className="text-2xl font-display text-gray-800 mb-8">Generando tu infograma...</h3>

      {/* Steps */}
      <div className="space-y-4 max-w-2xl mx-auto mb-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center gap-4 p-4 rounded-lg transition-all duration-500 ${
              index < currentStep
                ? 'bg-green-50 border border-green-200'
                : index === currentStep
                ? 'bg-adhoc-lavender border border-adhoc-violet'
                : 'bg-gray-50 border border-gray-200 opacity-50'
            }`}
          >
            <div className="text-2xl flex-shrink-0">{step.icon}</div>
            <div className="flex-grow text-left">
              <p className={`font-sans font-medium ${
                index < currentStep
                  ? 'text-green-700'
                  : index === currentStep
                  ? 'text-adhoc-violet'
                  : 'text-gray-500'
              }`}>
                {step.label}
              </p>
            </div>
            {index < currentStep && (
              <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            )}
            {index === currentStep && (
              <Loader2 className="w-6 h-6 text-adhoc-violet animate-spin flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto">
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-adhoc-violet to-adhoc-coral h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 font-sans mt-2">{Math.round(progress)}%</p>
      </div>

      {/* Footer message */}
      <p className="text-gray-500 font-sans text-sm mt-6 animate-pulse">
        Esto puede tomar un momento. Gracias por tu paciencia ⏳
      </p>
    </div>
  );
};

export default LoadingProgress;
