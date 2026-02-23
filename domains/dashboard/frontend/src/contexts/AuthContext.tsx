"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { PUBLIC_ROUTES } from "@/config/routes";

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for public routes
      if (isPublicRoute) {
        setIsLoading(false);
        return;
      }

      try {
        // This will trigger refresh if access token expired
        const userData = await api.auth.me();
        setUser(userData);
      } catch {
        // Auth failed even after refresh attempt - redirect to login
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [pathname, isPublicRoute, router]);

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore logout errors
    }
    setUser(null);
    router.push("/login");
  };

  // Show loading state for protected routes
  if (isLoading && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
