import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  TextField,
  // Grid, // Removido pois nu00e3o u00e9 utilizado
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import axios from '../axiosConfig';

function Settings() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [bmAccounts, setBmAccounts] = useState([]);
  const [addBmDialog, setAddBmDialog] = useState(false);
  const [newBmId, setNewBmId] = useState('');
  const [newBmToken, setNewBmToken] = useState('');
  const [confirmDeleteDialog, setConfirmDeleteDialog] = useState(false);
  const [bmIdToDelete, setBmIdToDelete] = useState('');

  useEffect(() => {
    fetchBmAccounts();
  }, []);

  const fetchBmAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/bm-accounts');
      setBmAccounts(response.data.bm_accounts || []);
      setLoading(false);
    } catch (err) {
      setError('Falha ao carregar contas de Business Manager');
      setLoading(false);
    }
  };

  const handleAddBm = async () => {
    if (!newBmId || !newBmToken) {
      setError('BM ID e token de acesso são obrigatórios');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/api/register-bm', {
        bm_id: newBmId,
        access_token: newBmToken
      });
      
      setSuccess(`Business Manager ${newBmId} adicionado com sucesso`);
      setNewBmId('');
      setNewBmToken('');
      setAddBmDialog(false);
      await fetchBmAccounts();
    } catch (err) {
      setError('Falha ao adicionar Business Manager');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirmDialog = (bmId) => {
    setBmIdToDelete(bmId);
    setConfirmDeleteDialog(true);
  };

  const handleDeleteBm = async () => {
    try {
      setLoading(true);
      await axios.delete(`/api/bm-accounts/${bmIdToDelete}`);
      
      setSuccess(`Business Manager ${bmIdToDelete} removido com sucesso`);
      setConfirmDeleteDialog(false);
      setBmIdToDelete('');
      
      fetchBmAccounts();
    } catch (err) {
      setError(`Falha ao remover Business Manager: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Clear alerts after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Configurações
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}
        
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">
              Contas Business Manager
            </Typography>
            
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddBmDialog(true)}
            >
              Adicionar BM
            </Button>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <CircularProgress />
            </Box>
          ) : bmAccounts.length > 0 ? (
            <List>
              {bmAccounts.map((bmId) => (
                <ListItem key={bmId} divider>
                  <ListItemText
                    primary={`Business Manager: ${bmId}`}
                    secondary="Meta Ads"
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => openDeleteConfirmDialog(bmId)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhuma conta Business Manager adicionada
              </Typography>
            </Box>
          )}
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Documentação da API
          </Typography>
          
          <Typography variant="body1" paragraph>
            Para integrar com a API do Meta, você precisará criar um aplicativo no Meta for Developers:
          </Typography>
          
          <Box component="ol" sx={{ pl: 2 }}>
            <li>
              <Typography variant="body1" paragraph>
                Acesse <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer">Meta for Developers</a>
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                Crie um aplicativo com o tipo "Business"
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                Adicione o produto "Marketing API" ao seu aplicativo
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                Gere um token de acesso com as permissões: ads_read, ads_management
              </Typography>
            </li>
            <li>
              <Typography variant="body1" paragraph>
                Use o Business Manager ID e o token de acesso para adicionar a conta neste painel
              </Typography>
            </li>
          </Box>
        </Paper>
      </Box>
      
      {/* Add BM Dialog */}
      <Dialog open={addBmDialog} onClose={() => setAddBmDialog(false)}>
        <DialogTitle>Adicionar Business Manager</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Adicione uma nova conta de Business Manager do Meta para analisar seus dados de anúncios.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Business Manager ID"
            fullWidth
            variant="outlined"
            value={newBmId}
            onChange={(e) => setNewBmId(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Access Token"
            fullWidth
            variant="outlined"
            value={newBmToken}
            onChange={(e) => setNewBmToken(e.target.value)}
          />
          <DialogContentText sx={{ mt: 2, fontSize: '0.875rem' }}>
            Para obter seu access token, acesse <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">Graph API Explorer</a> e selecione as permissões: ads_read, ads_management.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddBmDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleAddBm} 
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Adicionar'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmDeleteDialog}
        onClose={() => setConfirmDeleteDialog(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja remover o Business Manager {bmIdToDelete}?
            Esta ação não poderá ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteDialog(false)}>Cancelar</Button>
          <Button onClick={handleDeleteBm} color="error" autoFocus>
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Settings;
