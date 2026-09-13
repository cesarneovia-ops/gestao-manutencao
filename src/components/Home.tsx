import { useEffect, useState } from 'react';
import { OS, getStatusOS } from '../lib/types';
import { listarOS, getConfig } from '../lib/api';
import { AbaId } from './Layout';

export default function Home({ aoNavegar }: { aoNavegar: (aba: AbaId) => void }) {
  const [db, setDb] = useState<OS[]>([]);
  const [numFabricas, setNumFabricas] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const os = await listarOS();
        setDb(os);
        const fab = (await getConfig('conf_fabricas')) || [];
        setNumFabricas(Array.isArray(fab) ? fab.length : 0);
      } catch { /* ignora */ }
    })();
  }, []);

  const pend = db.filter((o) => !o.executado_em);
  const emerg = pend.filter((o) => o.criticidade === 'Emergência');
  const d = new Date();
  const conc = db.filter(
    (o) => o.executado_em && new Date(o.executado_em).getMonth() === d.getMonth() &&
      new Date(o.executado_em).getFullYear() === d.getFullYear()
  ).length;

  const tops = emerg.concat(pend.filter((o) => o.criticidade === 'Alta')).slice(0, 4);

  return (
    <div>
      <div className="home-hero">
        <h1>Portal de Gestão de Ordens de Serviço</h1>
        <p>Controle operacional de manutenção predial e contenção de patologias com mapa em planta baixa.</p>
      </div>

      <div className="home-pulse-grid">
        <div className="home-pulse-card" style={{ borderLeftColor: 'var(--danger)' }}>
          <div className="home-pulse-icon">🚨</div>
          <div><div className="home-pulse-val" style={{ color: 'var(--danger)' }}>{emerg.length}</div><div className="home-pulse-lbl">Emergências Ativas</div></div>
        </div>
        <div className="home-pulse-card" style={{ borderLeftColor: 'var(--warning)' }}>
          <div className="home-pulse-icon">⏳</div>
          <div><div className="home-pulse-val">{pend.length}</div><div className="home-pulse-lbl">Ordens Pendentes</div></div>
        </div>
        <div className="home-pulse-card" style={{ borderLeftColor: 'var(--success)' }}>
          <div className="home-pulse-icon">✅</div>
          <div><div className="home-pulse-val">{conc}</div><div className="home-pulse-lbl">Concluídas no Mês</div></div>
        </div>
        <div className="home-pulse-card" style={{ borderLeftColor: 'var(--primary)' }}>
          <div className="home-pulse-icon">🏢</div>
          <div><div className="home-pulse-val">{numFabricas}</div><div className="home-pulse-lbl">Edifícios Ativos</div></div>
        </div>
      </div>

      <div className="home-critical-box">
        <h3 style={{ marginTop: 0, marginBottom: 12, color: 'var(--danger)', fontSize: 16 }}>
          ⚠️ Ocorrências Críticas e Emergências em Aberto
        </h3>
        {tops.length === 0 ? (
          <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>✅ Tudo sob controle!</div>
        ) : (
          tops.map((o) => (
            <div key={o.id} className="home-critical-item" onClick={() => aoNavegar('historico')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <strong>{o.id}</strong>
                <span className={`badge ${o.criticidade === 'Emergência' ? 'badge-aberto' : 'badge-reprogramado'}`}>{o.criticidade}</span>
              </div>
              <div style={{ fontSize: 13 }}>{o.local} | {o.categoria}</div>
            </div>
          ))
        )}
      </div>
    <div className="home-links-box">
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>📥 Baixar o aplicativo</h3>
        <div className="home-links-grid">
          <a className="home-link-card" href="https://cesarneovia-ops.github.io/gestao-manutencao/" target="_blank" rel="noopener noreferrer">
            <span className="home-link-ico">📱</span>
            <span>
              <strong>Versão Mobile</strong>
              <small>PWA — abre no navegador e instala no celular</small>
            </span>
            <span className="home-link-set">→</span>
          </a>
          <a className="home-link-card" href="https://github.com/cesarneovia-ops/gestao-manutencao/releases/latest" target="_blank" rel="noopener noreferrer">
            <span className="home-link-ico">🖥️</span>
            <span>
              <strong>Versão Windows</strong>
              <small>Instalador desktop (GitHub Releases)</small>
            </span>
            <span className="home-link-set">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}