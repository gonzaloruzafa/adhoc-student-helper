import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

console.log('Supabase Config:', { 
  url: supabaseUrl, 
  keyExists: !!supabaseKey 
});

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface CVAnalysis {
  id?: string;
  created_at?: string;
  nombre: string;
  perfil_interes: 'Alto' | 'Medio' | 'Bajo';
  ciudad: string;
  pais: string;
  email: string;
  telefono: string;
  puestos_afines: string[];
  cv_data?: any; // Datos estructurados del CV
  file_name?: string;
  file_data?: string; // Base64
}

export const logCVAnalysis = async (data: Omit<CVAnalysis, 'id' | 'created_at'>) => {
  try {
    console.log('Attempting to log CV analysis:', data);
    console.log('Supabase client status:', supabase ? 'initialized' : 'not initialized');
    
    const { data: result, error } = await supabase
      .from('cv_analyses')
      .insert([data])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return null;
    }
    
    console.log('CV analysis logged successfully:', result);
    return result;
  } catch (err) {
    console.error('Exception logging CV analysis:', err);
    return null;
  }
};
