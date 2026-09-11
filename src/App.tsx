import { useState } from 'react';
import { useAuth } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase';
import Login from './components/Login';
import Layout, { AbaId } from './components/Layout';
import Home from './components/Home';
import AberturaOS from './components/AberturaOS';
import Dashboard from './components/Dashboard';
import Historico from './components/Historico';
import Cadastros from './components/Cadastros';

export default function App() {
  const { user, loading } = useAuth();
  const [aba, setAba] = useState<AbaId>('home');
  const [refresh, setRefresh] = useState(0);

  // Força re-render das abas que dependem de configs quando muda
  const notificarMudanca = () => setRefresh((r) => r + 1);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        Carregando...
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <div className="login-logo">⚠️</div>
          <h1>Configuração pendente</h1>
          <p className="sub">Defina as variáveis <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> no Supabase do Lovable (Settings → Environment) para conectar o sistema.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout abaAtiva={aba} onTrocarAba={setAba}>
      {aba === 'home' && <Home aoNavegar={setAba} />}
      {aba === 'os' && <AberturaOS key={refresh} />}
      {aba === 'dashboard' && <Dashboard key={refresh} />}
      {aba === 'historico' && <Historico key={refresh} />}
      {aba === 'cadastros' && <Cadastros aoMudarDados={notificarMudanca} />}
    </Layout>
  );
}