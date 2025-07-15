import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ProfileService } from '../../services/profileService';
import { supabase } from '../../lib/supabase';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';

const AvatarTest = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const addResult = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testDatabaseConnection = async () => {
    try {
      setLoading(true);
      setResults([]);
      setError(null);

      addResult('Testing database connection...', 'info');

      // Test 1: Check if user is authenticated
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        addResult(`✅ User authenticated: ${currentUser.email}`, 'success');
      } else {
        addResult('❌ User not authenticated', 'error');
        return;
      }

      // Test 2: Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        addResult(`❌ Profile fetch error: ${profileError.message}`, 'error');
      } else {
        addResult(`✅ Profile found: ${profile.username}`, 'success');
        addResult(`   Avatar URL: ${profile.avatar_url || 'null'}`, 'info');
      }

      // Test 3: Test profile update permission
      try {
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', currentUser.id)
          .select();

        if (updateError) {
          addResult(`❌ Profile update error: ${updateError.message}`, 'error');
        } else {
          addResult('✅ Profile update permission: OK', 'success');
        }
      } catch (err) {
        addResult(`❌ Profile update exception: ${err.message}`, 'error');
      }

      // Test 4: Check storage bucket access (try to list files instead of buckets)
      try {
        const { data: files, error: bucketError } = await supabase.storage
          .from('avatars')
          .list('', { limit: 1 });

        if (bucketError) {
          addResult(`❌ Storage bucket access error: ${bucketError.message}`, 'error');
        } else {
          addResult('✅ Avatars bucket accessible', 'success');
          addResult(`   Files found: ${files ? files.length : 0}`, 'info');
        }
      } catch (err) {
        addResult(`❌ Storage bucket exception: ${err.message}`, 'error');
      }

      // Test 5: Test storage upload permission with a valid image MIME type
      try {
        const testPath = `avatars/${currentUser.id}/test.png`;
        // Create a minimal PNG file (1x1 pixel transparent PNG)
        const pngData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
        const testFile = new Blob([Uint8Array.from(atob(pngData), c => c.charCodeAt(0))], { type: 'image/png' });

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(testPath, testFile);

        if (uploadError) {
          addResult(`❌ Storage upload test error: ${uploadError.message}`, 'error');
        } else {
          addResult('✅ Storage upload permission: OK', 'success');

          // Clean up test file
          await supabase.storage.from('avatars').remove([testPath]);
          addResult('✅ Test file cleaned up', 'success');
        }
      } catch (err) {
        addResult(`❌ Storage upload exception: ${err.message}`, 'error');
      }

    } catch (error) {
      setError(error.message);
      addResult(`❌ Test failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const testProfileService = async () => {
    try {
      setLoading(true);
      setResults([]);
      setError(null);

      addResult('Testing ProfileService methods...', 'info');

      // Test getCurrentProfile
      try {
        const profile = await ProfileService.getCurrentProfile();
        addResult('✅ ProfileService.getCurrentProfile(): OK', 'success');
        addResult(`   Username: ${profile.username}`, 'info');
        addResult(`   Avatar URL: ${profile.avatar_url || 'null'}`, 'info');
      } catch (err) {
        addResult(`❌ ProfileService.getCurrentProfile(): ${err.message}`, 'error');
      }

      // Test updateProfile
      try {
        const updated = await ProfileService.updateProfile({
          updated_at: new Date().toISOString()
        });
        addResult('✅ ProfileService.updateProfile(): OK', 'success');
      } catch (err) {
        addResult(`❌ ProfileService.updateProfile(): ${err.message}`, 'error');
      }

      // Test checkProfileDeletionSafety
      try {
        const safety = await ProfileService.checkProfileDeletionSafety();
        addResult('✅ ProfileService.checkProfileDeletionSafety(): OK', 'success');
        addResult(`   Can delete: ${safety.canDelete}`, 'info');
        addResult(`   Risk level: ${safety.riskLevel}`, 'info');
      } catch (err) {
        addResult(`❌ ProfileService.checkProfileDeletionSafety(): ${err.message}`, 'error');
      }

    } catch (error) {
      setError(error.message);
      addResult(`❌ ProfileService test failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Please log in to test avatar functionality.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Paper elevation={2} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          Avatar System Diagnostic
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Test database connectivity and avatar upload functionality
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="contained"
            onClick={testDatabaseConnection}
            disabled={loading}
          >
            Test Database
          </Button>
          <Button
            variant="outlined"
            onClick={testProfileService}
            disabled={loading}
          >
            Test ProfileService
          </Button>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography>Running tests...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {results.length > 0 && (
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom>
              Test Results:
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {results.map((result, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    color: result.type === 'error' ? 'error.main' : 
                           result.type === 'success' ? 'success.main' : 'text.primary'
                  }}
                >
                  [{result.timestamp}] {result.message}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}
      </Paper>
    </Box>
  );
};

export default AvatarTest;
