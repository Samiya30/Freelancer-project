"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { api } from "@/lib/api/http";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;

  /*
   * Kept for backwards compatibility.
   *
   * The authoritative role is authorization.roleName.
   */
  role: string;

  bio: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthorizationContext {
  workspaceId: number;
  workspaceName: string;
  memberId: number;
  roleId: number;
  roleName: string;
  status: string;
  permissions: string[];
}

interface AuthResponseData {
  user: AuthUser;
  authorization?: AuthorizationContext | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  authorization: AuthorizationContext | null;
  loading: boolean;
  isAuthenticated: boolean;

  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;

  hasPermission: (
    permission: string,
  ) => boolean;
}

const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined,
  );

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [authorization, setAuthorization] =
    useState<AuthorizationContext | null>(null);

  const [loading, setLoading] =
    useState(true);

  const applyAuthResponse = useCallback(
    (response: {
      success: boolean;
      data?: AuthResponseData;
    }) => {
      if (
        response.success &&
        response.data?.user
      ) {
        setUser(response.data.user);
        setAuthorization(
          response.data.authorization ?? null,
        );
      } else {
        setUser(null);
        setAuthorization(null);
      }
    },
    [],
  );

  const refreshUser = useCallback(
    async () => {
      try {
        const response =
          await api.get<AuthResponseData>(
            "/api/auth/me",
          );

        applyAuthResponse(response);
      } catch {
        setUser(null);
        setAuthorization(null);
      }
    },
    [applyAuthResponse],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const response =
          await api.get<AuthResponseData>(
            "/api/auth/me",
          );

        if (cancelled) {
          return;
        }

        applyAuthResponse(response);
      } catch {
        if (!cancelled) {
          setUser(null);
          setAuthorization(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [applyAuthResponse]);

  const logout = useCallback(async () => {
    try {
      await api.post(
        "/api/auth/logout",
        {},
      );
    } finally {
      setUser(null);
      setAuthorization(null);
    }
  }, []);

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!authorization) {
        return false;
      }

      return authorization.permissions.includes(
        permission,
      );
    },
    [authorization],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authorization,
      loading,
      isAuthenticated:
        user !== null &&
        authorization !== null,

      refreshUser,
      logout,
      hasPermission,
    }),
    [
      user,
      authorization,
      loading,
      refreshUser,
      logout,
      hasPermission,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider",
    );
  }

  return context;
}