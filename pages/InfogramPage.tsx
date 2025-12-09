import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Header } from '../components/Header';
import ResultView from '../components/ResultView';
import { getInfogramById } from '../services/supabase';
import { InfogramResult } from '../types';

const InfogramPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [infogram, setInfogram] = useState<InfogramResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInfogram = async () => {
      if (!id) {
        setError('ID de infograma no válido');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await getInfogramById(id);
        if (data) {
          setInfogram(data);
        } else {
          setError('No se encontró el infograma');
        }
      } catch (err: any) {
        console.error('Error fetching infogram:', err);
        setError(err.message || 'Error al cargar el infograma');
      } finally {
        setLoading(false);
      }
    };

    fetchInfogram();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto flex items-center justify-center h-96">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-adhoc-violet mx-auto mb-4" />
              <p className="text-gray-600 font-sans">Cargando infograma...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !infogram) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-adhoc-violet hover:text-adhoc-violet/80 font-sans font-medium mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver
            </button>
            <div className="bg-white rounded-xl shadow-lg border-2 border-red-200 p-8 text-center">
              <p className="text-red-700 font-sans text-lg mb-4">
                {error || 'No se encontró el infograma solicitado'}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2 rounded-lg bg-adhoc-violet text-white font-sans font-medium hover:bg-adhoc-violet/90 transition-colors"
              >
                Crear nuevo infograma
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-adhoc-violet hover:text-adhoc-violet/80 font-sans font-medium mb-8 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver
          </button>
          <ResultView 
            result={infogram} 
            onReset={() => navigate('/')}
            infogramLogId={id}
          />
        </div>
      </main>
    </div>
  );
};

export default InfogramPage;
