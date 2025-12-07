import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

console.log('Supabase Config:', { 
  url: supabaseUrl, 
  keyExists: !!supabaseKey 
});

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface InfogramLog {
  id?: string;
  created_at?: string;
  file_name: string;
  title: string;
  summary: string;
  difficulty: string;
  infogram_data: string; // JSON completo del infograma
  sketch_image_data?: string | null; // Base64 de la imagen generada
}

export const logInfogramGeneration = async (data: Omit<InfogramLog, 'id' | 'created_at'>) => {
  try {
    console.log('Attempting to log infogram:', { fileName: data.file_name, title: data.title });
    console.log('Supabase client status:', supabase ? 'initialized' : 'not initialized');
    console.log('Full supabase URL being used:', supabaseUrl);
    
    // Test if we can even reach Supabase
    try {
      const testFetch = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      console.log('Direct fetch test status:', testFetch.status, testFetch.statusText);
    } catch (fetchErr) {
      console.error('Direct fetch test failed:', fetchErr);
    }
    
    const { data: result, error } = await supabase
      .from('infogram_logs')
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
    
    console.log('Infogram logged successfully:', result);
    return result;
  } catch (err) {
    console.error('Exception logging infogram:', err);
    return null;
  }
};

export const getRecentInfograms = async (limit: number = 10) => {
  try {
    const { data, error } = await supabase
      .from('infogram_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching infograms:', error);
      return [];
    }
    
    return data || [];
  } catch (err) {
    console.error('Error fetching infograms:', err);
    return [];
  }
};
