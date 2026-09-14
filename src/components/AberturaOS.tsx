import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { getConfig, setConfig, criarOS, lerPlanta, uploadFileObject } from '../lib/api';
import { pdfParaImagem } from '../lib/pdf';
import { gerarIdOS, dataHoje, compactarImagem, sortAlphabetical, sortRecordValues, iconeCategoria, ehSerraCircular, juntarEvidencias } from '../lib/types';
import Mapa, { IconeSerraCircular } from './Mapa';

export default function AberturaOS() {
  const { user } = useAuth();
  const [fabricas, setFabricas] = useState<string[]>([]);
  const [solicitantes, setSolicitantes] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [locais, setLocais] = useState<Record<string, string[]>>({});
  const [subs, setSubs] = useState<Record<string, string[]>>({});
  const [planta, setPlanta] = useState<string | null>(null);

  const [fab, setFab] = useState('');
  const [solicitante, setSolicitante] = useState('');
  const [local, setLocal] = useState('');
  const [localOutros, setLocalOutros] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [criticidade, setCriticidade] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(dataHoje());
  const [ponto, setPonto] = useState<{ x: number; y: number } | null>(null);
  const [evidencia, setEvidencia] = useState<string>('');
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      setFabricas(sortAlphabetical((await getConfig('conf_fabricas')) || []));
      setSolicitantes(sortAlphabetical((await getConfig('conf_solicitantes')) || []));
      setCategorias(sortAlphabetical((await getConfig('conf_categorias')) || []));
      setLocais(sortRecordValues((await getConfig('conf_locais')) || {}));
      setSubs((await getConfig('conf_subcategorias')) || {});
      setPlanta(await lerPlanta());
    })();
  }, []);

  const podePlanta = user ? (user.perfil === 'Admin' || user.perfil === 'Dev') : false;

  async function carregarPlanta(file: File) {
    if (!podePlanta) return;
    try {
      let arquivo = file;
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setMsg('⏳ Convertendo PDF para imagem ultra-HD...');
        arquivo = await pdfParaImagem(file);
      }
      const url = await uploadFileObject('planta', 'planta.jpg', arquivo);
      if (!url) throw new Error('falha no upload');
      await setConfig('planta_url', url);
      setPlanta(url);
      setMsg('✅ Planta atualizada!');
    } catch (e: any) {
      setMsg('Erro ao carregar planta: ' + e.message);
    }
  }

  async function abrirOS(e: React.FormEvent) {
    e.preventDefault();
    if (!evidencia) { setMsg('Adicione a evidência fotográfica.'); return; }
    setSalvando(true); setMsg('');
    try {
      const id = gerarIdOS(fab);
      // upload da foto
      let evidenciaPath = evidencia; // fallback base64
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop() || 'jpg';
        const url = await uploadFileObject('evidencias', `evid-${id}.${ext}`, fotoFile);
        if (url) evidenciaPath = url;
      }
      const os = {
        id,
        fabrica: fab,
        solicitante,
        data,
        local: local === 'Outros' ? localOutros : local,
        descricao,
        categoria,
        subcategoria,
        criticidade,
        evidencia: evidenciaPath,
        map_x: ponto ? ponto.x : null,
        map_y: ponto ? ponto.y : null,
        responsavel: '',
        data_prevista: null,
        executado_em: null,
        reprogramado: null
      };
      await criarOS(os);
      setMsg(`✅ Ordem ${id} aberta com sucesso!`);
      // reset
      setDescricao(''); setEvidencia(''); setFotoFile(null); setPonto(null);
      setLocal(''); setSubcategoria(''); setCriticidade(''); setLocalOutros('');
      setData(dataHoje());
    } catch (err: any) {
      setMsg('Erro: ' + err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="form-container">
      <h2>Registrar Nova Ocorrência / OS</h2>
      <form onSubmit={abrirOS}>
        <div className="form-grid">
          <div className="form-group">
            <label>Edifício / Unidade *</label>
            <select value={fab} onChange={(e) => setFab(e.target.value)} required>
              <option value="">Selecione...</option>
              {fabricas.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Solicitante *</label>
            <select value={solicitante} onChange={(e) => setSolicitante(e.target.value)} required>
              <option value="">Selecione...</option>
              {solicitantes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Pavimento / Local *</label>
            <select value={local} onChange={(e) => setLocal(e.target.value)} required>
              <option value="">{fab ? 'Selecione...' : 'Selecione a unidade primeiro...'}</option>
              {fab && (locais[fab] || []).map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="Outros">Outros (Especificar)</option>
            </select>
            {local === 'Outros' && (
              <input type="text" placeholder="Especifique o local" value={localOutros} onChange={(e) => setLocalOutros(e.target.value)} style={{ marginTop: 5 }} />
            )}
          </div>
          <div className="form-group">
            <label>Data de Abertura</label>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Categoria Principal *</label>
            <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setSubcategoria(''); }} required>
              <option value="">Selecione...</option>
              {categorias.map((c) => <option key={c} value={c}>{iconeCategoria(c)} {c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Subcategoria (Específica) *</label>
            <select value={subcategoria} onChange={(e) => setSubcategoria(e.target.value)} required>
              <option value="">{categoria ? 'Selecione...' : 'Selecione a categoria primeiro...'}</option>
              {categoria && (subs[categoria] || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Criticidade *</label>
            <select value={criticidade} onChange={(e) => setCriticidade(e.target.value)} required>
              <option value="">Selecione...</option>
              <option value="Alta">Alta (Risco operacional)</option>
              <option value="Média">Média (Programável)</option>
              <option value="Baixa">Baixa (Rotina)</option>
              <option value="Emergência">Emergência (Risco humano / interdição)</option>
            </select>
          </div>
        </div>

        <div className="form-group full-width" style={{ background: 'var(--bg)', padding: 15, borderRadius: 8, border: '1px solid var(--border-light)' }}>
          <label style={{ color: 'var(--primary)' }}>📍 Localização no Layout da Planta</label>
          <button type="button" className="btn-action-sm" style={{ background: '#6c757d', color: '#fff', marginBottom: 10 }} onClick={() => setPonto(null)}>Limpar Ponto</button>
          {ponto ? (
            <div style={{ color: 'var(--primary)', fontWeight: 600, marginBottom: 8 }}>✅ Ponto marcado (X: {ponto.x}%, Y: {ponto.y}%)</div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Clique na planta para marcar o local exato.</div>
          )}
          <Mapa
            dados={[]}
            altura={400}
            plantaUrl={planta}
            modoMarcacao
            aoMarcar={(x, y) => setPonto({ x, y })}
          >
            {ponto && (
              <div className="map-pin" style={{ left: ponto.x + '%', top: ponto.y + '%' }} title="Ponto marcado">
                <span className="pin-ico">{categoria ? (ehSerraCircular(categoria) ? <IconeSerraCircular /> : iconeCategoria(categoria)) : '📌'}</span>
              </div>
            )}
          </Mapa>
          {podePlanta && (
            <label className="btn-map-tool" style={{ cursor: 'pointer', background: 'var(--primary)', color: '#fff', marginTop: 8, display: 'inline-flex' }}>
              📁 Carregar Planta (imagem ou PDF)
              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && carregarPlanta(e.target.files[0])} />
            </label>
          )}
        </div>

        <div className="form-group full-width">
          <label>Descrição Detalhada *</label>
          <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} required placeholder="Descreva o que ocorreu, local exato..." />
        </div>

        <div className="form-group full-width">
          <label>Evidência Fotográfica *</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const fs = e.target.files ? Array.from(e.target.files) : [];
              if (fs.length === 0) return;
              setFotoFile(fs[0]); // fallback: primeira foto
              const comprimidas = await Promise.all(fs.map((f) => compactarImagem(f, 900)));
              setEvidencia(juntarEvidencias(comprimidas));
            }}
          />
          <small style={{ color: 'var(--text-muted)', marginTop: 5 }}>{evidencia ? '✅ Imagem anexada.' : ''}</small>
        </div>

        <button type="submit" className="btn-submit" disabled={salvando}>
          {salvando ? 'Abrindo...' : 'Abrir Ordem de Serviço'}
        </button>
        {msg && <div style={{ marginTop: 12, fontWeight: 600 }}>{msg}</div>}
      </form>
    </div>
  );
}