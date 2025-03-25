import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { DataGrid } from '@mui/x-data-grid';
import axios from '../axiosConfig';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function SharedReport() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportParams, setReportParams] = useState(null);
  const [insights, setInsights] = useState(null);
  const [reportTitle, setReportTitle] = useState('');

  // Converter para useCallback e mover para antes dos useEffect
  const validateToken = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/validate-share-link?token=${token}`);
      
      if (response.data.valid) {
        setReportParams(response.data.report_params);
      } else {
        setError('O link de compartilhamento é inválido ou expirou');
        setLoading(false);
      }
    } catch (err) {
      setError('O link de compartilhamento é inválido ou expirou');
      setLoading(false);
    }
  }, [token, setLoading, setError, setReportParams]);

  const fetchReportData = useCallback(async () => {
    try {
      let response;
      
      if (reportParams.campaign_id) {
        response = await axios.get(`/api/campaign-insights?bm_id=${reportParams.bm_id}&campaign_id=${reportParams.campaign_id}&date_preset=${reportParams.date_preset}`);
        setReportTitle(`Relatório da Campanha - ${reportParams.date_preset}`);
      } else if (reportParams.ad_account_id) {
        response = await axios.get(`/api/account-insights?bm_id=${reportParams.bm_id}&ad_account_id=${reportParams.ad_account_id}&date_preset=${reportParams.date_preset}`);
        setReportTitle(`Relatório da Conta de Anúncio - ${reportParams.date_preset}`);
      }
      
      setInsights(response.data.insights || []);
      setLoading(false);
    } catch (err) {
      setError('Falha ao carregar os dados do relatório');
      setLoading(false);
    }
  }, [reportParams, setLoading, setInsights, setReportTitle, setError]);
  
  // Adicionar os useEffects depois das declarau00e7u00f5es das funu00e7u00f5es
  useEffect(() => {
    validateToken();
  }, [validateToken]);

  useEffect(() => {
    if (reportParams) {
      fetchReportData();
    }
  }, [reportParams, fetchReportData]);

  // Prepare data for charts
  const prepareChartData = () => {
    if (!insights || insights.length === 0) return null;
    
    const labels = insights.map((insight, index) => `Day ${index + 1}`);
    
    // Prepare data for spend chart
    const spendData = {
      labels,
      datasets: [
        {
          label: 'Spend (BRL)',
          data: insights.map(insight => parseFloat(insight.spend || 0)),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
      ],
    };
    
    // Prepare data for performance metrics chart
    const performanceData = {
      labels,
      datasets: [
        {
          label: 'Clicks',
          data: insights.map(insight => parseInt(insight.clicks || 0)),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
        {
          label: 'Impressions (÷1000)',
          data: insights.map(insight => parseInt(insight.impressions || 0) / 1000),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
      ],
    };
    
    // Prepare data for conversion metrics chart (if available)
    const conversionMetrics = {};
    insights.forEach(insight => {
      Object.keys(insight).forEach(key => {
        if (key.startsWith('action_')) {
          const actionType = key.replace('action_', '');
          if (!conversionMetrics[actionType]) {
            conversionMetrics[actionType] = [];
          }
          conversionMetrics[actionType].push(parseFloat(insight[key] || 0));
        }
      });
    });
    
    const conversionData = {
      labels: Object.keys(conversionMetrics),
      datasets: [
        {
          data: Object.values(conversionMetrics).map(values => 
            values.reduce((sum, value) => sum + value, 0)
          ),
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
          ],
        },
      ],
    };
    
    return { spendData, performanceData, conversionData };
  };

  const chartData = prepareChartData();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            Este link de compartilhamento é inválido ou expirou
          </Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ my: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            {reportTitle}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Relatório compartilhado - Meta Ads Dashboard
          </Typography>
        </Paper>
        
        {insights && insights.length > 0 && chartData ? (
          <>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Gastos (BRL)
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Line 
                      options={{ 
                        responsive: true,
                        maintainAspectRatio: false
                      }} 
                      data={chartData.spendData} 
                    />
                  </Box>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: '100%' }}>
                  <Typography variant="h6" gutterBottom>
                    Performance
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar 
                      options={{ 
                        responsive: true,
                        maintainAspectRatio: false
                      }} 
                      data={chartData.performanceData} 
                    />
                  </Box>
                </Paper>
              </Grid>
              
              {chartData.conversionData.labels.length > 0 && (
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 2, height: '100%' }}>
                    <Typography variant="h6" gutterBottom>
                      Conversões
                    </Typography>
                    <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                      <Doughnut 
                        options={{ 
                          responsive: true,
                          maintainAspectRatio: false
                        }} 
                        data={chartData.conversionData} 
                      />
                    </Box>
                  </Paper>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Dados Detalhados
                  </Typography>
                  <Box sx={{ height: 400, width: '100%' }}>
                    <DataGrid
                      rows={insights.map((insight, index) => ({ id: index, ...insight }))}
                      columns={Object.keys(insights[0] || {}).map(key => ({
                        field: key,
                        headerName: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                        width: 150,
                        valueFormatter: (params) => {
                          if (typeof params.value === 'number' || !isNaN(parseFloat(params.value))) {
                            return parseFloat(params.value).toLocaleString('pt-BR', {
                              maximumFractionDigits: 2
                            });
                          }
                          return params.value;
                        }
                      }))}
                      pageSize={5}
                      rowsPerPageOptions={[5]}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              Nenhum dado disponível para este relatório
            </Typography>
          </Paper>
        )}
      </Box>
    </Container>
  );
}

export default SharedReport;
