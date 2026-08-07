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
      try {
        const { data, error } = await supabase.auth.getSession();
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
              const { data: ownerData, error: ownerError } = await supabase
                .from('owners')
                .select('*')
                .eq('user_id', data.session.user.id)
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
      } catch (err) {
        console.error('Unexpected error fetching session:', err);
        if (mounted) {
          setSession(null);
          setOwner(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = 
      supabase.auth.onAuthStateChange(async (_, session) => {
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
