// Tipo de perfil de usuário
export type TipoPerfil = 'Dev' | 'Admin' | 'Usuario';

export interface Perfil {
  id: string;
  usuario: string;
  nome: string;
  perfil: TipoPerfil;
  ativo: boolean;
  criado_em?: string;
}

export interface OS {
  id: string;
  fabrica: string;
  solicitante: string;
  data: string | null;
  local: string;
  descricao: string;
  categoria: string;
  subcategoria: string;
  criticidade: string;
  evidencia: string;
  map_x: number | null;
  map_y: number | null;
  responsavel: string;
  data_prevista: string | null;
  executado_em: string | null;
  reprogramado: string | null;
  criado_em?: string;
}

export type StatusOS = 'Aberto' | 'Concluído' | 'Em Andamento' | 'Reprogramado';

export function getStatusOS(os: OS): StatusOS {
  if (os.executado_em) return 'Concluído';
  if (os.reprogramado) return 'Reprogramado';
  if (os.responsavel) return 'Em Andamento';
  return 'Aberto';
}

export const ROTULO_PERFIL: Record<TipoPerfil, string> = {
  Dev: 'Desenvolvedor',
  Admin: 'Administrador',
  Usuario: 'Operador'
};

export const PERFIS_VALIDOS: TipoPerfil[] = ['Dev', 'Admin', 'Usuario'];

// Permissões por perfil (espelha backend original)
export function podePerfil(p: TipoPerfil | undefined, permissao: string): boolean {
  if (!p) return false;
  switch (permissao) {
    case 'cadastros':
    case 'editarOS':
    case 'excluirOS':
    case 'atualizarOS':
    case 'carregarPlanta':
      return p === 'Admin' || p === 'Dev';
    case 'usuarios':
      return p === 'Dev';
    default:
      return true;
  }
}

export function normalizarTexto(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function escapeHTML(str: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>'"]/g, (t: string) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] ?? t)
  );
}

export function sortAlphabetical(arr: string[]): string[] {
  return (arr || []).slice().sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
}

export function sortRecordValues(rec: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  Object.keys(rec || {})
    .slice()
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
    .forEach((k) => { out[k] = sortAlphabetical(rec[k]); });
  return out;
}

export function gerarIdOS(fabrica: string): string {
  const prefix = fabrica.replace(/\s+/g, '').substring(0, 4).toUpperCase();
  const dt = new Date().toISOString().slice(2, 7).replace('-', '');
  return `OS-${prefix}-${dt}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function dataHoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function formatarData(d: string | null | undefined): string {
  if (!d) return '';
  return String(d);
}

// Ícones de categoria para os pinos do mapa
const CATEGORIA_ICONES: { palavras: string[]; icone: string }[] = [
  { palavras: ['fechadura', 'trinco', 'maçaneta'], icone: '🔑' },
  { palavras: ['eletrica', 'eletro', 'energia', 'retifica', 'lampada', 'iluminacao', 'disjuntor', 'tomada', 'quadro'], icone: '⚡' },
  { palavras: ['incendio', 'incêndio', 'ppci', 'bombeiro', 'extintor', 'hidrante'], icone: '🧯' },
  { palavras: ['seguranca', 'segurança', 'cftv', 'alarme', 'camera', 'câmera', 'circuito', 'acesso'], icone: '📹' },
  { palavras: ['gas', 'glp', 'gnv'], icone: '🔥' },
  { palavras: ['hidrossanitario', 'hidraulica', 'hidro', 'agua', 'encanamento', 'esgoto', 'torneira', 'vazamento'], icone: '💧' },
  { palavras: ['mecanic', 'chave', 'parafuso', 'rolamento', 'engrenagem', 'correia', 'motor', 'usinagem', 'rosca', 'maquina'], icone: '🛠️' },
  { palavras: ['serrail', 'serra', 'chapa', 'solda', 'ferro', 'metal', 'aluminio', 'alumínio', 'grade', 'gradil', 'portao', 'portão', 'aco', 'aço'], icone: '🪚' },
  { palavras: ['civil', 'estrutura', 'alvenaria', 'muro', 'concreto', 'patologia', 'rachadura', 'fissura', 'reboco'], icone: '🧱' },
  { palavras: ['climatiza', 'ar-condicionado', 'arcondicionado', 'hvac', 'refrigeracao', 'frio', 'ventilacao', 'exaustao'], icone: '❄️' },
  { palavras: ['pintura', 'acabamento', 'revestimento', 'tinta'], icone: '🎨' },
  { palavras: ['telhado', 'cobertura', 'calha', 'forro', 'impermeabiliza', 'infiltracao', 'gesso', 'drywall'], icone: '🏚️' },
  { palavras: ['vidro', 'esquadria', 'janela', 'porta'], icone: '🪟' },
  { palavras: ['elevador'], icone: '🛗' },
  { palavras: ['limpeza', 'vassoura', 'higiene'], icone: '🧹' },
  { palavras: ['marcenaria', 'marceneiro', 'madeira', 'mdf', 'movel', 'armario'], icone: '🪵' },
  { palavras: ['jardinagem', 'jardim', 'grama', 'poda', 'paisagismo'], icone: '🌱' },
  { palavras: ['dedetizacao', 'dedetizar', 'praga', 'cupim', 'barata', 'formiga'], icone: '🐜' },
  { palavras: ['interfonia', 'telefonia'], icone: '📞' },
  { palavras: ['preventiva', 'preditiva', 'inspecao', 'inspeção', 'geral', 'ferramenta'], icone: '🔍' }
];

export function iconeCategoria(cat: string): string {
  const c = normalizarTexto(String(cat || ''));
  const cSemEspaco = c.replace(/[\s\-_./]+/g, '');
  for (const item of CATEGORIA_ICONES) {
    if (item.palavras.some((p) => {
      const pn = normalizarTexto(p);
      return c.includes(pn) || cSemEspaco.includes(pn.replace(/[\s\-_./]+/g, ''));
    })) return item.icone;
  }
  return '⚠️';
}

export function ehSerraCircular(cat: string): boolean {
  const c = normalizarTexto(String(cat || ''));
  return c.includes('serra') || c.includes('serrail');
}

export const STATUS_CORES: Record<StatusOS, string> = {
  Concluído: '#16a34a',
  'Em Andamento': '#00ffff',
  Reprogramado: '#d97706',
  Aberto: '#dc2626'
};

// Separação usada para guardar MÚLTIPLAS evidências no campo text `evidencia`.
// É um separador impossível de aparecer em dataURL/base64 ou em URLs comuns,
// então registros antigos (uma única foto) continuam funcionando normalmente.
const SEP_EVIDENCIAS = '|SPLIT|';

export function evidenciasDeOS(os: OS | null | undefined): string[] {
  const ev = os?.evidencia;
  if (!ev) return [];
  const partes = String(ev).split(SEP_EVIDENCIAS).filter(Boolean);
  return partes.length > 0 ? partes : [];
}

export function juntarEvidencias(lista: (string | null | undefined)[]): string {
  return (lista || []).filter(Boolean).join(SEP_EVIDENCIAS);
}

export async function compactarImagem(file: File, maxWidth = 800): Promise<string> {
  // Prioridade 1 (menor memória): createImageBitmap com resizeWidth/Height faz o
  // navegador reduzir a imagem DURANTE a decodificação nativa — a foto em resolução
  // cheia nunca chega a ser montada na memória do aparelho.
  const bitmapFull = await createImageBitmap(file).catch(() => null);
  if (bitmapFull) {
    const scale = Math.min(1, maxWidth / Math.max(1, bitmapFull.width));
    const w = Math.max(1, Math.round(bitmapFull.width * scale));
    const h = Math.max(1, Math.round(bitmapFull.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmapFull, 0, 0, w, h);
    }
    bitmapFull.close();
    return canvas.toDataURL('image/jpeg', 0.72);
  }
  // Prioridade 2: createImageBitmap com resizeWidth já reduzido (compatível Safari/Edge)
  const bitmapReduzido = await createImageBitmap(file, { resizeWidth: maxWidth, resizeQuality: 'high' }).catch(() => null);
  if (bitmapReduzido) {
    const canvas = document.createElement('canvas');
    canvas.width = bitmapReduzido.width;
    canvas.height = bitmapReduzido.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(bitmapReduzido, 0, 0);
    bitmapReduzido.close();
    return canvas.toDataURL('image/jpeg', 0.72);
  }
  // Último recurso: canvas + Image via objectURL (sem nunca ler o arquivo por inteiro
  // como base64, evitando estourar a memória de celulares comuns).
  return await new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      try {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, w, h);
        }
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      } catch (e) {
        reject(e);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}
