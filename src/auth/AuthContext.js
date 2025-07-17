import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

console.log('AuthContext module loaded');

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  console.log('AuthProvider initializing');
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('AuthProvider useEffect running - checking session');
    
    // Check for active session on mount
    const getActiveSession = async () => {
      try {
        console.log('Getting active session...');
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }
        
        console.log('Session data:', data);
        
        if (data?.session) {
          console.log('Session found, getting user data');
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error('Error getting user data:', userError);
            throw userError;
          }
          
          console.log('Setting user:', userData.user);
          setUser(userData.user);
        } else {
          console.log('No active session found');
        }
      } catch (error) {
        console.error('Error checking authentication state:', error.message);
        setError(error.message);
      } finally {
        console.log('Finished checking authentication, setting loading to false');
        setLoading(false);
      }
    };

    getActiveSession();

    // Set up listener for auth state changes
    console.log('Setting up auth state change listener');
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session ? 'session exists' : 'no session');
        if (session) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Clean up subscription
    return () => {
      console.log('Cleaning up auth listener');
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Create a user value with extra info for debugging
  const userValue = user ? {
    ...user,
    id: user.id,
    email: user.email,
    isLoggedIn: true,
  } : null;

  // Sign up with email and password
  const signUp = async (email, password) => {
    try {
      console.log('Signing up with email:', email);
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error('Sign up error:', error);
        throw error;
      }

      console.log('Sign up successful:', data);
      return data;
    } catch (error) {
      console.error('Sign up error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      console.log('Signing in with email:', email);
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      console.log('Sign in successful:', data);
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };



  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };





  const value = {
    user: userValue,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
  };

  console.log('AuthProvider rendering with value:', {
    user: userValue ? 'user exists' : 'no user',
    loading,
    error
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 