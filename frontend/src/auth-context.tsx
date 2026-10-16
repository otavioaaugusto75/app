import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, auth } from "./api";

type User = { id: string; name: string; email: string; institution: string };

type Ctx = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, institution: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await auth.getToken();
        if (token) {
          const me = await api.me();
          setUser(me);
        }
      } catch {
        await auth.clearToken();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    await auth.setToken(token);
    setUser(user);
  };
  const signUp = async (name: string, email: string, password: string, institution: string) => {
    const { token, user } = await api.register(name, email, password, institution);
    await auth.setToken(token);
    setUser(user);
  };
  const signOut = async () => {
    await auth.clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Ctx {
  const c = useContext(AuthContext);
  if (!c) throw new Error("AuthProvider missing");
  return c;
}
