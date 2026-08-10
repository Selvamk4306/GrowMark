import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/LoadingScreen';

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
          await supabase.auth.signOut().catch(() => {});
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
      {loading && <LoadingScreen />}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
