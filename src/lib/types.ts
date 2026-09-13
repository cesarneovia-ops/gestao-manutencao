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

export function formatarData(d: string | null | undefined): string {
  if (!d) return '';
  const partes = String(d).split('-');
  if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return String(d);
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
  { palavras: ['climatiza', 'ar-condicionado', 'arcondicionado', 'hvac', 'refrigeracao', 'frio'], icone: '❄️' },
  { palavras: ['pintura', 'acabamento', 'revestimento', 'tinta'], icone: '🎨' },
  { palavras: ['telhado', 'cobertura', 'calha', 'forro'], icone: '🏚️' },
  { palavras: ['vidro', 'esquadria', 'janela', 'porta'], icone: '🪟' },
  { palavras: ['elevador'], icone: '🛗' },
  { palavras: ['limpeza', 'vassoura', 'higiene'], icone: '🧹' },
  { palavras: ['preventiva', 'preditiva', 'inspecao', 'inspeção', 'geral', 'ferramenta'], icone: '🗓️' }
];

export function normalizarTexto(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function iconeCategoria(cat: string): string {
  const c = normalizarTexto(String(cat || ''));
  for (const item of CATEGORIA_ICONES) {
    if (item.palavras.some((p) => c.includes(normalizarTexto(p)))) return item.icone;
  }
  return '⚠️';
}

export function ehSerraCircular(cat: string): boolean {
  const c = normalizarTexto(String(cat || ''));
  return c.includes('serra') || c.includes('serrail');
}

export const STATUS_CORES: Record<StatusOS, string> = {
  Concluído: '#28a745',
  'Em Andamento': '#0d6efd',
  Reprogramado: '#ffc107',
  Aberto: '#dc3545'
};

export function compactarImagem(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}