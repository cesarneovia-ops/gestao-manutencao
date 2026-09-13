// Camada de acesso a dados sobre o Supabase.
// Todos os métodos autenticados via sessão do Supabase Auth.
import { supabase } from './supabase';
import { OS, Perfil } from './types';

// Configurações
export async function getConfig(chave: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('valor')
    .eq('chave', chave)
    .maybeSingle();
  if (error || !data) return null;
  return data.valor;
}

export async function setConfig(chave: string, valor: unknown) {
  const { error } = await supabase
    .from('configuracoes')
    .upsert({ chave, valor }, { onConflict: 'chave' });
  if (error) throw new Error(error.message);
}

// Ordens de serviço
export async function listarOS(): Promise<OS[]> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('*')
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as OS[];
}

export async function getOSDetalhe(id: string): Promise<OS | null> {
  const { data, error } = await supabase
    .from('ordens_servico')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as OS) || null;
}

export async function criarOS(os: Partial<OS> & { id: string }) {
  const { data, error } = await supabase.from('ordens_servico').insert(os).select().single();
  if (error) throw new Error(error.message);
  return data as OS;
}

export async function atualizarOS(id: string, campos: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('ordens_servico')
    .update(campos)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as OS;
}

export async function apagarOS(id: string) {
  const { error } = await supabase.from('ordens_servico').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Storage (fotos de evidência e planta)
export function getPublicUrl(bucket: 'evidencias' | 'planta', path: string): string | null {
  if (!path) return null;
  if (path.startsWith('data:')) return path; // fallback p/ base64 (não recomendado na nuvem)
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadArquivo(bucket: 'evidencias' | 'planta', path: string, dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  const mime = (dataUrl.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg');
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, base64ToBlob(base64, mime), { contentType: mime, upsert: true });
  if (error) throw new Error(error.message);
  return getPublicUrl(bucket, path);
}

export async function uploadFileObject(bucket: 'evidencias' | 'planta', path: string, file: File) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw new Error(error.message);
  return getPublicUrl(bucket, path);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const byteChars = atob(b64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function lerPlanta(): Promise<string | null> {
  const url = await getConfig('planta_url');
  if (url) return url;
  const { data, error } = await supabase.storage
    .from('planta')
    .list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
  if (!error && data && data.length > 0) {
    return getPublicUrl('planta', data[0].name);
  }
  return null;
}

export async function salvarPlanta(dataUrl: string) {
  const path = `planta-${Date.now()}.jpg`;
  const url = await uploadArquivo('planta', path, dataUrl);
  await setConfig('planta_url', url);
  return url;
}

// Backpressure / helpers de erro
export { supabase };