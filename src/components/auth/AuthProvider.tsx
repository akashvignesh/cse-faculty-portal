"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  canEdit,
  hasPermission,
  type EditTier,
  type Permission,
  type Resource,
  type Role,
} from "@/lib/permissions";

// Client-side session context, hydrated once from /api/v1/me. This is UX
// only — every write is re-checked server-side (src/lib/editor/rbac.ts).
// Until /me resolves (or if it fails) all checks deny, so edit controls
// appear progressively rather than flashing and disappearing.

export interface ClientSession {
  userid: string;
  role: Role;
  permissions: Permission[];
  personNumber: string | null;
  devSwitcher: { enabled: boolean; roles: readonly Role[]; requiresSecret?: boolean };
}

interface AuthContextValue {
  isLoading: boolean;
  session: ClientSession | null;
}

const AuthContext = createContext<AuthContextValue>({ isLoading: true, session: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthContextValue>({ isLoading: true, session: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/v1/me", { headers: { Accept: "application/json" } });
        const payload = (await response.json()) as { success?: boolean; data?: ClientSession };
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error("Failed to load session");
        }
        if (!cancelled) setState({ isLoading: false, session: payload.data });
      } catch {
        // Deny by default: no session → viewer-equivalent (no permissions).
        if (!cancelled) setState({ isLoading: false, session: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useSession(): AuthContextValue {
  return useContext(AuthContext);
}

export interface PermissionHelpers {
  isLoading: boolean;
  role: Role | null;
  can(permission: Permission): boolean;
  /**
   * Edit tier for a resource, collapsed against ownership: "own" only when
   * `owner` (a userid or person number) is the signed-in person.
   */
  canEditResource(resource: Resource, owner?: string | null): EditTier;
}

export function usePermission(): PermissionHelpers {
  const { isLoading, session } = useSession();

  return useMemo(() => {
    const role = session?.role ?? null;

    function ownsRecord(owner?: string | null): boolean {
      if (!session || !owner) return false;
      const normalized = owner.trim();
      return (
        normalized.toLowerCase() === session.userid.toLowerCase() ||
        (session.personNumber !== null && normalized === session.personNumber)
      );
    }

    return {
      isLoading,
      role,
      can: (permission: Permission) => hasPermission(role, permission),
      canEditResource: (resource: Resource, owner?: string | null): EditTier => {
        const tier = canEdit(role, resource);
        if (tier !== "own") return tier;
        return ownsRecord(owner) ? "own" : "none";
      },
    };
  }, [isLoading, session]);
}

/** Renders children only when the permission (optionally on `owner`'s record) holds. */
export function Can({
  perm,
  resource,
  owner,
  fallback = null,
  children,
}: {
  perm?: Permission;
  resource?: Resource;
  owner?: string | null;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { can, canEditResource } = usePermission();
  const allowed =
    (perm !== undefined && can(perm)) ||
    (resource !== undefined && canEditResource(resource, owner) !== "none");
  return <>{allowed ? children : fallback}</>;
}
