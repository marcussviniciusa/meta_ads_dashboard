import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from '@mui/material';
import axios from '../axiosConfig';

function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bmId, setBmId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!bmId || !accessToken) {
      setError('Por favor, preencha todos os campos');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/api/register-bm', {
        bm_id: bmId,
        access_token: accessToken
      });
      
      // Navigate to the dashboard on successful login
      navigate('/');
    } catch (err) {
      setError('Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{
        my: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Meta Ads Dashboard
        </Typography>
        
        <Paper sx={{ p: 4, width: '100%', mt: 2 }}>
          <Typography variant="h5" gutterBottom>
            Entrar
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="bmId"
              label="Business Manager ID"
              name="bmId"
              value={bmId}
              onChange={(e) => setBmId(e.target.value)}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="accessToken"
              label="Access Token"
              type="password"
              id="accessToken"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Entrar'}
            </Button>
          </Box>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" align="center">
              Para obter seu Access Token, acesse o 
              <a 
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginLeft: '4px' }}
              >
                Graph API Explorer
              </a>
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" mt={1}>
              Selecione as permissões: ads_read, ads_management
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;
