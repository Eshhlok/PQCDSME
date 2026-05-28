// src/context/AuthContext.tsx
import React, {
  createContext, useContext, useEffect, useRef, useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Role = "admin" | "operator" | "viewer";

interface UserProfile {
  id: string;
  role: Role;
  plantId: number | null;
  fullName: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const intentionalSignOut  = useRef(false);
  const didResolve          = useRef(false);   // ensures setLoading(false) only fires once
  const cancelledRef        = useRef(false);

  // --- profile fetcher (unchanged from your version, it's fine) ---
  async function fetchProfile(userId: string, retries = 3): Promise<UserProfile | null> {
    for (let i = 0; i < retries; i++) {
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 1000 * i));
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, role, plant_id, full_name")
          .eq("id", userId)
          .single();
        if (error || !data) continue;
        return {
          id: data.id,
          role: data.role as Role,
          plantId: data.plant_id,
          fullName: data.full_name,
        };
      } catch { continue; }
    }
    return null;
  }

  // --- called exactly once, whichever path wins the race ---
  function resolveAuth(resolvedSession: Session | null) {
    if (didResolve.current) return;   // second caller is ignored
    didResolve.current = true;

    if (cancelledRef.current) return;
    setSession(resolvedSession);
    setUser(resolvedSession?.user ?? null);
    setLoading(false);                // ← UI unblocked here

    if (resolvedSession?.user) {
      // profile loads in background — UI is already ready
      fetchProfile(resolvedSession.user.id).then(p => {
        if (!cancelledRef.current && p) setProfile(p);
      });
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    didResolve.current   = false;

    // STEP 1 — listener registered first.
    // onAuthStateChange fires synchronously from localStorage on mount
    // (no network needed). This wins the race on a normal refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (cancelledRef.current) return;

        // On mount, Supabase fires INITIAL_SESSION (v2.39+) or SIGNED_IN.
        // Either way, this is our fast path — resolves before getSession() can hang.
        if (event === "INITIAL_SESSION" ) {
          resolveAuth(newSession);
          return;
        }

        if (event === "SIGNED_IN") {
          // Could be bootstrap (no INITIAL_SESSION) OR a fresh login
          if (!didResolve.current) {
            // Still bootstrapping — use resolveAuth
            resolveAuth(newSession);
          } else {
            // Fresh login after bootstrap — bypass didResolve guard
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);
            if (newSession?.user) {
              fetchProfile(newSession.user.id).then(p => {
                if (!cancelledRef.current && p) setProfile(p);
              });
            }
          }
          return;
        }

        // Token silently refreshed — update session but don't re-fetch profile
        if (event === "TOKEN_REFRESHED") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          return;
        }

        if (event === "SIGNED_OUT") {
          if (intentionalSignOut.current) {
            intentionalSignOut.current = false;
            setSession(null);
            setUser(null);
            setProfile(null);
            didResolve.current = false;
            setLoading(false);
          }
          return;
        }
      }
    );

    // STEP 2 — getSession() called after listener is registered.
    // If the listener already fired above (fast path), resolveAuth's
    // didResolve guard makes this a no-op. If the listener was slow
    // for some reason, this becomes the fallback.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        resolveAuth(null);
      } else {
        resolveAuth(session);
      }
    }).catch(() => resolveAuth(null));

    // STEP 3 — hard ceiling at 3s, truly last resort only.
    // By this point the listener or getSession() should have fired.
    // This only triggers if both are genuinely stuck (offline, Supabase down).
    const timeout = setTimeout(() => resolveAuth(null), 3000);

    return () => {
      cancelledRef.current = true;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function signOut() {
    intentionalSignOut.current = true;
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}