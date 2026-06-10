import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setAuthUser(newSession?.user || null);
      setIsAuthenticated(!!newSession?.user);

      if (newSession?.user) {
        await loadEmployee(newSession.user.id);
      } else {
        setEmployee(null);
        setPermissions([]);
      }

      setIsLoadingAuth(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadSession = async () => {
    setIsLoadingAuth(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    setSession(session);
    setAuthUser(session?.user || null);
    setIsAuthenticated(!!session?.user);

    if (session?.user) {
      await loadEmployee(session.user.id);
    } else {
      setEmployee(null);
      setPermissions([]);
    }

    setIsLoadingAuth(false);
  };

  const loadEmployee = async (authUserId) => {
    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select(`
        *,
        sector:sectors(*),
        employee_positions(
          position:positions(
            *,
            position_permissions(
              permission:permissions(*)
            )
          )
        )
      `)
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (employeeError) {
      console.error("Erro ao carregar funcionário:", employeeError);
      setEmployee(null);
      setPermissions([]);
      return;
    }

    setEmployee(employeeData);

    const permissionKeys =
      employeeData?.employee_positions
        ?.flatMap((ep) =>
          ep.position?.position_permissions?.map(
            (pp) => pp.permission?.key
          ) || []
        )
        .filter(Boolean) || [];

    setPermissions([...new Set(permissionKeys)]);
  };

  const hasPermission = (permissionKey) => {
    return permissions.includes("total") || permissions.includes(permissionKey);
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();

    setSession(null);
    setAuthUser(null);
    setEmployee(null);
    setPermissions([]);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    if (authUser?.id) {
      await loadEmployee(authUser.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        authUser,
        user: employee,
        employee,
        permissions,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: null,
        authChecked: !isLoadingAuth,
        login,
        logout,
        hasPermission,
        refreshUser,
        checkUserAuth: refreshUser,
        checkAppState: refreshUser,
        navigateToLogin: () => {
          window.location.href = "/login";
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};