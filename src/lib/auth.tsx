import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Perfil, TipoPerfil, podePerfil } from '../lib/types';

interface AuthCtx {
  user: Perfil | null;
  loading: boolean;
  erro: string;
  login: (email: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
  pode: (permissao: string) => boolean;
}

const AuthContext = createContext<AuthCtx>(null as unknown as AuthCtx);

async function buscarPerfil(): Promise<Perfil | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('perfis')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Perfil;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const p = await buscarPerfil();
        setUser(p);
      }
      setLoading(false);
    });
  }, []);

  async function login(email: string, senha: string): Promise<boolean> {
    setErro('');
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setErro('Usuário ou senha inválidos.');
      return false;
    }
    const p = await buscarPerfil();
    if (!p || !p.ativo) {
      setErro('Perfil não encontrado ou usuário inativo. Contate o administrador.');
      await supabase.auth.signOut();
      return false;
    }
    setUser(p);
    return true;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
  }

  function pode(permissao: string): boolean {
    return podePerfil(user?.perfil as TipoPerfil | undefined, permissao);
  }

  return (
    <AuthContext.Provider value={{ user, loading, erro, login, logout, pode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}