import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getConfig, setConfig, supabase } from '../lib/api';
import { Perfil, sortAlphabetical, sortRecordValues } from '../lib/types';
import { BadgePerfil } from './Modal';

export default function Cadastros({ aoMudarDados }: { aoMudarDados: () => void }) {
  const { user, pode } = useAuth();
  const [fabricas, setFabricas] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [solicitantes, setSolicitantes] = useState<string[]>([]);
  const [responsaveis, setResponsaveis] = useState<string[]>([]);
  const [locais, setLocais] = useState<Record<string, string[]>>({});
  const [subs, setSubs] = useState<Record<string, string[]>>({});
  const [fabSel, setFabSel] = useState('');
  const [catSel, setCatSel] = useState('');
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [novo, setNovo] = useState({ fabrica: '', local: '', categoria: '', sub: '', solicitante: '', responsavel: '' });
  const [nvUsuario, setNvUsuario] = useState({ usuario: '', nome: '', perfil: 'Usuario', senha: '' });
  const [msg, setMsg] = useState('');

  const isDev = pode('usuarios');

  async function carregarTudo() {
    setFabricas(sortAlphabetical((await getConfig('conf_fabricas')) || []));
    setCategorias(sortAlphabetical((await getConfig('conf_categorias')) || []));
    setSolicitantes(sortAlphabetical((await getConfig('conf_solicitantes')) || []));
    setResponsaveis(sortAlphabetical((await getConfig('conf_responsaveis')) || []));
    setLocais(sortRecordValues((await getConfig('conf_locais')) || {}));
    setSubs(sortRecordValues((await getConfig('conf_subcategorias')) || {}));
    if (isDev) carregarUsuarios();
  }

  async function carregarUsuarios() {
    const { data, error } = await supabase.rpc('listar_usuarios' as any) as any;
    const ordenar = (u: Perfil[]) => (u || []).sort((a: any, b: any) => (a.nome || a.usuario || '').localeCompare(b.nome || b.usuario || '', 'pt-BR', { sensitivity: 'base' }));
    if (!error && Array.isArray(data)) {
      setUsuarios(ordenar(data as Perfil[]));
    } else {
      const { data: d2, error: e2 } = await supabase.from('perfis').select('*');
      if (!e2) setUsuarios(ordenar((d2 || []) as Perfil[]));
    }
  }

  useEffect(() => { carregarTudo(); /* eslint-disable-next-line */ }, []);

  async function salvarConfig(chave: string, valor: unknown) {
    if (!pode('cadastros')) return;
    await setConfig(chave, valor);
    await carregarTudo();
    aoMudarDados();
  }

  function adicionarLista(chave: string, val: string) {
    if (!pode('cadastros')) return;
    if (!val.trim()) { setMsg('Digite um valor para adicionar.'); return; }
    if (chave === 'conf_fabricas') salvarConfig(chave, [...fabricas, val.trim()]);
    else if (chave === 'conf_categorias') salvarConfig(chave, [...categorias, val.trim()]);
    else if (chave === 'conf_solicitantes') salvarConfig(chave, [...solicitantes, val.trim()]);
    else if (chave === 'conf_responsaveis') salvarConfig(chave, [...responsaveis, val.trim()]);
  }

  function removerItem(chave: string, arr: string[], item: string) {
    if (!pode('cadastros')) return;
    if (window.confirm(`Remover "${item}"?`)) salvarConfig(chave, arr.filter((x) => x !== item));
  }

  function adicionarLocal() {
    if (!pode('cadastros')) return;
    if (fabricas.length === 0) { setMsg('Cadastre um edifício/unidade primeiro (bloco "Edifícios / Unidades").'); return; }
    if (!fabSel) { setMsg('Selecione um edifício acima antes de adicionar local/pavimento.'); return; }
    if (!novo.local.trim()) { setMsg('Digite o local/pavimento para adicionar.'); return; }
    const atual = { ...locais };
    if (!atual[fabSel]) atual[fabSel] = [];
    if (!atual[fabSel].includes(novo.local.trim())) atual[fabSel] = [...atual[fabSel], novo.local.trim()];
    salvarConfig('conf_locais', atual);
    setNovo((n) => ({ ...n, local: '' }));
    setMsg(`✅ "${novo.local.trim()}" adicionado em ${fabSel}.`);
  }

  function removerLocal(item: string) {
    if (!pode('cadastros')) return;
    const atual = { ...locais };
    if (atual[fabSel]) atual[fabSel] = atual[fabSel].filter((x) => x !== item);
    salvarConfig('conf_locais', atual);
  }

  function adicionarSub() {
    if (!pode('cadastros')) return;
    if (categorias.length === 0) { setMsg('Cadastre uma categoria primeiro (bloco "Categorias de Manutenção").'); return; }
    if (!catSel) { setMsg('Selecione a categoria acima antes de adicionar subcategoria.'); return; }
    if (!novo.sub.trim()) { setMsg('Digite a subcategoria para adicionar.'); return; }
    const atual = { ...subs };
    if (!atual[catSel]) atual[catSel] = [];
    if (!atual[catSel].includes(novo.sub.trim())) atual[catSel] = [...atual[catSel], novo.sub.trim()];
    salvarConfig('conf_subcategorias', atual);
    setNovo((n) => ({ ...n, sub: '' }));
    setMsg(`✅ Subcategoria "${novo.sub.trim()}" adicionada em ${catSel}.`);
  }

  function removerSub(item: string) {
    if (!pode('cadastros')) return;
    const atual = { ...subs };
    if (atual[catSel]) atual[catSel] = atual[catSel].filter((x) => x !== item);
    salvarConfig('conf_subcategorias', atual);
  }

  async function criarUsuario() {
    if (!isDev) return;
    if (!nvUsuario.usuario || nvUsuario.senha.length < 6) { setMsg('Login obrigatório e senha com mínimo 6 caracteres.'); return; }
    try {
      const email = nvUsuario.usuario.includes('@') ? nvUsuario.usuario : `${nvUsuario.usuario}@sistema.local`;
      // signUp funciona com a anon key e cria a conta no auth.
      const { data, error } = await supabase.auth.signUp({ email, password: nvUsuario.senha });
      if (error) {
        setMsg('Não foi possível criar: ' + error.message);
        return;
      }
      const uid = data.user?.id;
      if (!uid) {
        setMsg('Usuário criado, mas aguardando confirmação de e-mail. Se a opção "Confirm email" estiver ativa no Supabase, é preciso confirmar antes do primeiro login.');
        return;
      }
      const nome = nvUsuario.nome || nvUsuario.usuario;
      const { error: ePerfil } = await supabase.from('perfis').insert({
        id: uid,
        usuario: nvUsuario.usuario,
        nome,
        perfil: nvUsuario.perfil
      });
      if (ePerfil) {
        setMsg('Usuário criado, mas o perfil não foi vinculado: ' + ePerfil.message);
      } else {
        setMsg(`✅ Usuário "${nvUsuario.usuario}" criado com perfil ${nvUsuario.perfil}.`);
        setNvUsuario({ usuario: '', nome: '', perfil: 'Usuario', senha: '' });
      }
      await carregarUsuarios();
    } catch (e: any) {
      setMsg('Erro: ' + e.message);
    }
  }

  async function atualizarUsuario(perfilId: string, campos: Record<string, unknown>) {
    if (!isDev) return;
    const alvo = usuarios.find((u: any) => u.id === perfilId);
    if (alvo && alvo.usuario === user?.usuario && campos.ativo === false) { setMsg('Você não pode desativar a própria conta.'); return; }
    const { error } = await supabase.from('perfis').update({ ativo: campos.ativo }).eq('id', perfilId);
    if (error) setMsg(error.message);
    await carregarUsuarios();
  }

  return (
    <div className="form-container">
      <h2>Cadastros Gerais e Estrutura</h2>

      <BlocoAdicionar titulo="Edifícios / Unidades"
        placeholder="Ex: Torre A"
        valor={novo.fabrica}
        onChange={(v) => setNovo((n) => ({ ...n, fabrica: v }))}
        onAdd={() => { adicionarLista('conf_fabricas', novo.fabrica); setNovo((n) => ({ ...n, fabrica: '' })); }}
      >
        <ul className="config-list">{fabricas.map((f) => <Item chave="" valor={f} onRemover={() => removerItem('conf_fabricas', fabricas, f)} key={f} />)}</ul>
      </BlocoAdicionar>

      <BlocoAdicionar titulo="Locais e Pavimentos"
        placeholder="Ex: Térreo"
        valor={novo.local}
        onChange={(v) => setNovo((n) => ({ ...n, local: v }))}
        onAdd={adicionarLocal}
        prefix={(
          <select value={fabSel} onChange={(e) => setFabSel(e.target.value)} style={{ marginBottom: 10, display: 'block', width: '100%' }}>
            <option value="">Selecione o edifício...</option>
            {fabricas.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
      >
        <ul className="config-list">{(locais[fabSel] || []).map((l) => <Item chave="" valor={l} onRemover={() => removerLocal(l)} key={l} />)}</ul>
      </BlocoAdicionar>

      <BlocoAdicionar titulo="Categorias de Manutenção"
        placeholder="Ex: Elétrica"
        valor={novo.categoria}
        onChange={(v) => setNovo((n) => ({ ...n, categoria: v }))}
        onAdd={() => { adicionarLista('conf_categorias', novo.categoria); setNovo((n) => ({ ...n, categoria: '' })); }}
      >
        <ul className="config-list">{categorias.map((c) => <Item chave="" valor={c} onRemover={() => removerItem('conf_categorias', categorias, c)} key={c} />)}</ul>
      </BlocoAdicionar>

      <BlocoAdicionar titulo="Subcategorias"
        placeholder="Ex: Troca Lâmpada"
        valor={novo.sub}
        onChange={(v) => setNovo((n) => ({ ...n, sub: v }))}
        onAdd={adicionarSub}
        prefix={(
          <select value={catSel} onChange={(e) => setCatSel(e.target.value)} style={{ marginBottom: 10, display: 'block', width: '100%' }}>
            <option value="">Selecione a categoria...</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      >
        <ul className="config-list">{(subs[catSel] || []).map((s) => <Item chave="" valor={s} onRemover={() => removerSub(s)} key={s} />)}</ul>
      </BlocoAdicionar>

      <BlocoAdicionar titulo="Solicitantes"
        placeholder="Nome do morador, síndico ou fiscal"
        valor={novo.solicitante}
        onChange={(v) => setNovo((n) => ({ ...n, solicitante: v }))}
        onAdd={() => { adicionarLista('conf_solicitantes', novo.solicitante); setNovo((n) => ({ ...n, solicitante: '' })); }}
      >
        <ul className="config-list">{solicitantes.map((s) => <Item chave="" valor={s} onRemover={() => removerItem('conf_solicitantes', solicitantes, s)} key={s} />)}</ul>
      </BlocoAdicionar>

      <BlocoAdicionar titulo="Equipe Técnica Responsável"
        placeholder="Nome do mantenedor ou empresa terceira"
        valor={novo.responsavel}
        onChange={(v) => setNovo((n) => ({ ...n, responsavel: v }))}
        onAdd={() => { adicionarLista('conf_responsaveis', novo.responsavel); setNovo((n) => ({ ...n, responsavel: '' })); }}
      >
        <ul className="config-list">{responsaveis.map((r) => <Item chave="" valor={r} onRemover={() => removerItem('conf_responsaveis', responsaveis, r)} key={r} />)}</ul>
      </BlocoAdicionar>

      {isDev && (
        <div className="form-group" style={{ borderTop: '2px solid var(--border-light)', paddingTop: 20 }}>
          <h2 style={{ marginTop: 0 }}>🔐 Gestão de Usuários (apenas Dev)</h2>
          <div className="form-grid">
            <div className="form-group"><label>Usuário (login)</label><input value={nvUsuario.usuario} onChange={(e) => setNvUsuario({ ...nvUsuario, usuario: e.target.value })} placeholder="Ex: joao.silva" /></div>
            <div className="form-group"><label>Nome completo</label><input value={nvUsuario.nome} onChange={(e) => setNvUsuario({ ...nvUsuario, nome: e.target.value })} placeholder="Ex: João da Silva" /></div>
            <div className="form-group">
              <label>Perfil</label>
              <select value={nvUsuario.perfil} onChange={(e) => setNvUsuario({ ...nvUsuario, perfil: e.target.value })}>
                <option value="Usuario">Usuário (operador)</option>
                <option value="Admin">Admin (gestor)</option>
                <option value="Dev">Dev (total)</option>
              </select>
            </div>
            <div className="form-group"><label>Senha</label><input type="password" value={nvUsuario.senha} onChange={(e) => setNvUsuario({ ...nvUsuario, senha: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
          </div>
          <button className="btn-action" style={{ background: 'var(--success)', width: '100%' }} onClick={criarUsuario}>➕ Adicionar Usuário</button>
          <ul className="config-list" style={{ maxHeight: 300, marginTop: 12 }}>
            {usuarios.map((u: any) => (
              <li key={u.id} className="config-item">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <strong>{u.usuario}</strong>
                  <BadgePerfil perfil={u.perfil} />
                </div>
                <div className="config-item-actions">
                  {u.ativo ? (
                    <button className="btn-action-sm" style={{ background: 'var(--warning)', color: '#212529' }} onClick={() => atualizarUsuario(u.id, { ativo: false })}>🚫 Inativar</button>
                  ) : (
                    <button className="btn-action-sm" style={{ background: 'var(--success)', color: '#fff' }} onClick={() => atualizarUsuario(u.id, { ativo: true })}>✅ Ativar</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {msg && <div style={{ marginTop: 12, fontWeight: 600 }}>{msg}</div>}
    </div>
  );
}

function BlocoAdicionar({ titulo, placeholder, valor, onChange, onAdd, prefix, children }: {
  titulo: string; placeholder: string; valor: string; onChange: (v: string) => void; onAdd: () => void; prefix?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="form-group">
      <label>{titulo}</label>
      {prefix}
      <div style={{ display: 'flex', gap: 10 }}>
        <input type="text" placeholder={placeholder} value={valor} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }} />
        <button className="btn-action" style={{ background: 'var(--primary)' }} onClick={onAdd}>Adicionar</button>
      </div>
      {children}
    </div>
  );
}

function Item({ chave, valor, onRemover }: { chave: string; valor: string; onRemover: () => void }) {
  return (
    <li className="config-item">
      <span className="config-item-text">{valor}</span>
      <button className="btn-action-sm btn-delete" onClick={onRemover}>Excluir</button>
    </li>
  );
}