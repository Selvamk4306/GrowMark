/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext<any | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any | null>(null);
  const [owner, setOwner] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      console.log('[DEBUG] initializeAuth start');
      try {
        console.log('[DEBUG] initializeAuth: calling supabase.auth.getSession()');
        const { data, error } = await supabase.auth.getSession();
        console.log('[DEBUG] initializeAuth: getSession returned:', { data, error });
        if (error) {
          console.error('Error fetching session:', error);
          if (mounted) {
            setSession(null);
            setOwner(null);
            setLoading(false);
          }
          return;
        }

        if (mounted) {
          setSession(data.session);
          if (data.session) {
            try {
              console.log('[DEBUG] initializeAuth: fetching owner data for user ID:', data.session.user.id);
              const { data: ownerData, error: ownerError } = await supabase
                .from('owners')
                .select('*')
                .eq('user_id', data.session.user.id)
                .single();
              
              console.log('[DEBUG] initializeAuth: owner data fetched:', { ownerData, ownerError });
              if (!ownerError && ownerData) {
                setOwner(ownerData);
              } else {
                setOwner(null);
              }
            } catch (err) {
              console.error('Error fetching owner data:', err);
              setOwner(null);
            }
          } else {
            setOwner(null);
          }
        }
      } catch (err) {
        console.error('Unexpected error fetching session:', err);
        if (mounted) {
          setSession(null);
          setOwner(null);
        }
      } finally {
        console.log('[DEBUG] initializeAuth finally block. Mounted:', mounted);
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = 
      supabase.auth.onAuthStateChange((_, session) => {
        // Defer database query to prevent Supabase internal client deadlock
        setTimeout(async () => {
          if (mounted) {
            setSession(session);
            if (session) {
              try {
                const { data: ownerData, error: ownerError } = await supabase
                  .from('owners')
                  .select('*')
                  .eq('user_id', session.user.id)
                  .single();
                
                if (!ownerError && ownerData) {
                  setOwner(ownerData);
                } else {
                  setOwner(null);
                }
              } catch (err) {
                console.error('Error fetching owner data:', err);
                setOwner(null);
              }
            } else {
              setOwner(null);
            }
          }
        }, 0);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshOwner = async (userId: string) => {
    const { data } = await supabase
      .from('owners')
      .select('*')
      .eq('user_id', userId)
      .single();
    setOwner(data);
  };

  return (
    <AuthContext.Provider value={{ session, owner, loading, signOut: () => supabase.auth.signOut(), refreshOwner }}>
      {!loading && children}
      {loading && (
        <div className="h-screen w-full flex items-center justify-center bg-background">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
