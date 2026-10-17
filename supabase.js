/* CIA - Ciencias IA | Conexión pública; no usar service_role ni AI_API_KEY */
import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configurado=Boolean(url&&key);
export const supabase=configurado?createClient(url,key):null;
