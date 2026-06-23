import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { services } from "@/services";
import type { User } from "@/services/types";

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  signup: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    services.currentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthCtx = {
    user,
    loading,
    async login(u, p) {
      const r = await services.login(u, p);
      setUser(r.user);
    },
    async signup(u, p) {
      const r = await services.signup(u, p);
      setUser(r.user);
    },
    async logout() {
      await services.logout();
      setUser(null);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}