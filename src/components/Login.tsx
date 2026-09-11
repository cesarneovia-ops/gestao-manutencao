import { useState } from 'react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login, erro } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!email || !senha) { setMsg('Informe usuário e senha.'); return; }
    const ok = await login(email, senha);
    if (!ok) setMsg(erro || 'Falha no login.');
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">🏭</div>
        <h1>Sistema Integrado de Manutenção Predial</h1>
        <p className="sub">Gestão de Facilities</p>
        <form onSubmit={submit}>
          <input type="email" placeholder="Usuário (e-mail)" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Senha" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          <div className="login-erro">{msg}</div>
          <button className="btn-submit" type="submit" style={{ marginTop: 0 }}>Entrar</button>
        </form>
      </div>
    </div>
  );
}