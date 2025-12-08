import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

console.log('🔧 Supabase Config:', { 
  url: supabaseUrl, 
  keyLength: supabaseKey.length,
  keyPrefix: supabaseKey.substring(0, 20) + '...'
});

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface InfogramLog {
  id?: string;
  created_at?: string;
  file_name: string;
  title: string;
  summary: string;
  difficulty: string;
  infogram_data: string;
  mermaid_code: string; // Código Mermaid en lugar de imagen base64
}

export const logInfogramGeneration = async (data: Omit<InfogramLog, 'id' | 'created_at'>) => {
  try {
    console.log('📝 Attempting to log infogram:', { 
      fileName: data.file_name, 
      title: data.title,
      dataKeys: Object.keys(data),
      hasMermaidCode: !!data.mermaid_code
    });
    
    // Test connection
    const testUrl = `${supabaseUrl}/rest/v1/`;
    console.log('🔗 Testing connection to:', testUrl);
    
    const testFetch = await fetch(testUrl, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    console.log('✅ Connection test:', testFetch.status, testFetch.statusText);
    
    // Try to insert
    console.log('💾 Inserting to infogram_logs table...');
    const { data: result, error } = await supabase
      .from('infogram_logs')
      .insert([data])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Supabase INSERT error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
      
      // Try to check if table exists
      console.log('🔍 Checking if table exists...');
      const { data: tables, error: listError } = await supabase
        .from('infogram_logs')
        .select('id')
        .limit(1);
      
      if (listError) {
        console.error('❌ Table check error:', listError);
      } else {
        console.log('✅ Table exists, SELECT works');
      }
      
      return null;
    }
    
    console.log('✅ Infogram saved with ID:', result.id);
    return result;
  } catch (err) {
    console.error('💥 Exception logging infogram:', err);
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
