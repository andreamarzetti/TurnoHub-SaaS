import { createContext, useContext, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { customFetch } from "@workspace/api-client-react/src/custom-fetch";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export interface ProfessionalSession {
  id: number;
  status: "active" | "suspended" | "trial";
  slug: string;
  onboardingCompleted: boolean;
  currentPlan: string | null;
  trialEndsAt: string | null;
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: "super_admin" | "professional" | "client";
  createdAt: string;
  professional: ProfessionalSession | null;
}

interface AuthContextType {
  user: SessionUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  setUser: (u: SessionUser | null) => void;
}

export const SESSION_QUERY_KEY = ["session-user"] as const;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user = null, isLoading } = useQuery<SessionUser | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await customFetch<SessionUser>("/api/auth/me");
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const handleLogout = async () => {
    try {
      await customFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    }
    queryClient.setQueryData(SESSION_QUERY_KEY, null);
    queryClient.clear();
    setLocation("/login");
    toast({ title: "Sesión cerrada correctamente" });
  };

  const setUser = (u: SessionUser | null) => {
    queryClient.setQueryData(SESSION_QUERY_KEY, u);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      logout: handleLogout,
      setUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
