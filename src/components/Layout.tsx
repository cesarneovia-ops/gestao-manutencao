import { useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import { ROTULO_PERFIL } from '../lib/types';
import { BadgePerfil } from './Modal';
import InstalarApp from './InstalarApp';

export type AbaId = 'home' | 'os' | 'dashboard' | 'historico' | 'cadastros';

interface LayoutProps {
  abaAtiva: AbaId;
  onTrocarAba: (a: AbaId) => void;
  children: ReactNode;
}

export default function Layout({ abaAtiva, onTrocarAba, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [dark, setDark] = useState(() => localStorage.getItem('theme_mode') === 'dark');
  const podeCadastros = user ? (user.perfil === 'Admin' || user.perfil === 'Dev') : false;

  useEffect(() => {
    document.body.classList.toggle('dark-mode', dark);
    localStorage.setItem('theme_mode', dark ? 'dark' : 'light');
  }, [dark]);

  const abas: { id: AbaId; rotulo: string; icone: string; visivel: boolean }[] = [
    { id: 'home', rotulo: 'Início', icone: '🏠', visivel: true },
    { id: 'os', rotulo: 'Nova OS', icone: '📝', visivel: true },
    { id: 'dashboard', rotulo: 'Dashboard', icone: '📊', visivel: true },
    { id: 'historico', rotulo: 'Histórico', icone: '🗺️', visivel: true },
    { id: 'cadastros', rotulo: 'Cadastros', icone: '⚙️', visivel: podeCadastros }
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <div className="header-bar">
        <div>
          <h3 style={{ margin: 0, fontSize: 18 }}>Sistema Integrado de Manutenção Predial e OS</h3>
          <div className="badge-servidor">Gestão de Facilities • Conectado</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="usuario-chip">
            👤 {user ? user.nome || user.usuario : ''}{' '}
            <BadgePerfil perfil={user ? user.perfil : ''} />
          </span>
          <button className="btn-theme" onClick={logout}>🚪 Sair</button>
          <button className="btn-theme" onClick={() => setDark((d) => !d)}>
            {dark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {abas.filter((a) => a.visivel).map((a) => (
          <button
            key={a.id}
            className={`tab-btn ${abaAtiva === a.id ? 'active' : ''}`}
            onClick={() => onTrocarAba(a.id)}
          >
            <span className="tab-ico">{a.icone}</span>
            {a.rotulo}
          </button>
        ))}
      </div>

      <div className="tab-content">{children}</div>
      <button
        className="btn-home-top"
        onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); onTrocarAba('home'); }}
        title="Voltar ao início"
      >
        <span className="ico">🏠</span> Início
      </button>
      {abaAtiva === 'home' && <InstalarApp />}
    </div>
  );
}

// Rótulo amigável por perfil (ex.: "Operador")
export function perfilRotulo(perfil: string): string {
  return ROTULO_PERFIL[perfil as keyof typeof ROTULO_PERFIL] || perfil;
}