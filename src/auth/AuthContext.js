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

  // Sign in as a guest
  const signInAsGuest = async () => {
    try {
      console.log('Signing in as guest');
      setLoading(true);
      
      // Generate a unique identifier for the guest
      const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
      const username = 'Guest_' + Math.random().toString(36).substring(2, 4);
      
      console.log('Generated guest ID:', guestId);
      
      // Store guest identifier in local storage
      localStorage.setItem('guestId', guestId);
      localStorage.setItem('guestName', username);
      
      // Create a guest user object that mimics the structure of a real user
      const guestUser = {
        id: guestId,
        email: `${guestId}@guest.collabcanvas.com`,
        user_metadata: {
          username: username
        },
        app_metadata: {
          provider: 'guest'
        },
        role: 'guest',
        isGuest: true,
        aud: 'authenticated',
        created_at: new Date().toISOString()
      };
      
      console.log('Created guest user object:', guestUser);
      
      // Set the user in state
      setUser(guestUser);
      
      return { user: guestUser };
    } catch (error) {
      console.error('Error creating guest user:', error);
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
      // If user is a guest, just remove the guest data
      if (user?.isGuest) {
        localStorage.removeItem('guestId');
        setUser(null);
        return;
      }
      
      // Otherwise, sign out from Supabase
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

  // Reset password
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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

  // Update password
  const updatePassword = async (newPassword) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
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

  const value = {
    user: userValue,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signInAsGuest,
    signOut,
    resetPassword,
    updatePassword,
  };

  console.log('AuthProvider rendering with value:', {
    user: userValue ? 'user exists' : 'no user',
    loading,
    error
  });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 