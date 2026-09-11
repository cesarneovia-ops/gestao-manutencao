import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { OS, getStatusOS, formatarData, sortAlphabetical } from '../lib/types';
import { listarOS, getConfig, atualizarOS, apagarOS, getOSDetalhe, lerPlanta } from '../lib/api';
import { BadgeStatus, BadgePerfil } from './Modal';
import Mapa from './Mapa';

export default function Historico() {
  const { user, pode } = useAuth();
  const [db, setDb] = useState<OS[]>([]);
  const [fabricas, setFabricas] = useState<string[]>([]);
  const [resps, setResps] = useState<string[]>([]);
  const [filtroFab, setFiltroFab] = useState('TODAS');
  const [filtroStat, setFiltroStat] = useState('TODOS');
  const [visao, setVisao] = useState<'tabela' | 'mapa'>('tabela');
  const [planta, setPlanta] = useState<string | null>(null);

  async function carregar() {
    try {
      const os = await listarOS();
      setDb(os);
    } catch { /* ignora */ }
  }

  useEffect(() => {
    carregar();
    (async () => {
      setFabricas(sortAlphabetical((await getConfig('conf_fabricas')) || []));
      setResps(sortAlphabetical((await getConfig('conf_responsaveis')) || []));
      setPlanta(await lerPlanta());
    })();
  }, []);

  const filtrados = db.filter(
    (o) => (filtroFab === 'TODAS' || o.fabrica === filtroFab) && (filtroStat === 'TODOS' || getStatusOS(o) === filtroStat)
  );
  const podeEditar = pode('atualizarOS');
  const podeApagar = pode('excluirOS');

  async function mudarCampo(id: string, chave: string, valor: unknown) {
    if (!pode('atualizarOS')) return;
    await atualizarOS(id, { [chave]: valor });
    await carregar();
  }

  async function excluir(id: string) {
    if (!pode('excluirOS')) return;
    if (window.confirm(`Apagar ${id} permanentemente?`)) {
      await apagarOS(id);
      await carregar();
    }
  }

  return (
    <div>
      <div className="filter-card" style={{ marginTop: 0 }}>
        <div>
          <label>Edifício:</label>
          <select value={filtroFab} onChange={(e) => setFiltroFab(e.target.value)}>
            <option value="TODAS">Todos</option>
            {fabricas.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label>Status:</label>
          <select value={filtroStat} onChange={(e) => setFiltroStat(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="Aberto">Aberto</option>
            <option value="Concluído">Concluído</option>
            <option value="Em Andamento">Em Andamento</option>
            <option value="Reprogramado">Reprogramado</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn-action" style={{ background: visao === 'tabela' ? 'var(--primary)' : '#6c757d' }} onClick={() => setVisao('tabela')}>📋 Tabela</button>
          <button className="btn-action" style={{ background: visao === 'mapa' ? 'var(--primary)' : '#6c757d' }} onClick={() => setVisao('mapa')}>🗺️ Mapa</button>
        </div>
      </div>

      {visao === 'tabela' ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Edifício</th><th>Status</th><th>Solicitante</th><th>Data</th><th>Local</th><th>Descrição</th>
                <th>Categoria / Sub</th><th>Criticidade</th><th>Responsável</th><th>Previsão</th><th>Conclusão</th><th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((o) => (
                <tr key={o.id}>
                  <td data-label="ID"><strong>{o.id}</strong></td>
                  <td data-label="Edifício">{o.fabrica}</td>
                  <td data-label="Status"><BadgeStatus status={getStatusOS(o)} /></td>
                  <td data-label="Solicitante">{o.solicitante}</td>
                  <td data-label="Data">{formatarData(o.data)}</td>
                  <td data-label="Local">{o.local}</td>
                  <td data-label="Descrição" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.descricao}</td>
                  <td data-label="Categoria">{o.categoria}<br /><small>{o.subcategoria}</small></td>
                  <td data-label="Criticidade">{o.criticidade}</td>
                  <td data-label="Responsável">
                    {podeEditar ? (
                      <select value={o.responsavel} onChange={(e) => mudarCampo(o.id, 'responsavel', e.target.value)}>
                        <option value="">Definir...</option>
                        {resps.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (o.responsavel || '—')}
                  </td>
                  <td data-label="Previsão">
                    {podeEditar ? <InputData valor={o.data_prevista} onChange={(v) => mudarCampo(o.id, 'data_prevista', v)} /> : formatarData(o.data_prevista) || '—'}
                  </td>
                  <td data-label="Conclusão">
                    {podeEditar ? <InputData valor={o.executado_em} onChange={(v) => mudarCampo(o.id, 'executado_em', v)} /> : formatarData(o.executado_em) || '—'}
                  </td>
                  <td data-label="Ações">
                    <div style={{ display: 'flex', gap: 4 }}>
                      {o.evidencia && <a className="btn-action-sm" style={{ background: 'var(--info)', color: '#fff', textDecoration: 'none' }} href={o.evidencia} target="_blank" rel="noreferrer">📷</a>}
                      {podeApagar && <button className="btn-action-sm btn-delete" onClick={() => excluir(o.id)}>🗑️</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ background: 'var(--card-bg)', padding: 20, borderRadius: 8 }}>
          <Mapa altura={540} plantaUrl={planta} dados={filtrados} />
        </div>
      )}

      {user && String(user.perfil).length > 0 && (
        <div style={{ marginTop: 10, display: 'none' }}><BadgePerfil perfil={user.perfil} /></div>
      )}
    </div>
  );
}

function InputData({ valor, onChange }: { valor: string | null; onChange: (v: string | null) => void }) {
  return (
    <input
      type="date"
      value={valor || ''}
      onChange={(e) => onChange(e.target.value || null)}
      style={{ padding: '2px 6px', fontSize: 12 }}
    />
  );
}