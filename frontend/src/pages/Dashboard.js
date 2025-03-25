import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Divider,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import BlockIcon from '@mui/icons-material/Block';
import HelpIcon from '@mui/icons-material/Help';
import { Line } from 'react-chartjs-2';
import { DataGrid } from '@mui/x-data-grid';
import axios from '../axiosConfig';
// Importau00e7u00f5es removidas pois nu00e3o su00e3o mais utilizadas apu00f3s a refatorau00e7u00e3o do cu00f3digo
// import { standardizeDate, getDateRange, generateDateRange, filterInsightsByDateRange } from '../utils/chartHelper';
import chartDataProcessor from '../utils/prepareChartData';

// Register ChartJS components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const datePresets = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_3d', label: 'Últimos 3 dias' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_28d', label: 'Últimos 28 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'last_90d', label: 'Últimos 90 dias' },
];

function Dashboard() {
  // Estados para filtros e dados
  const [bmAccounts, setBmAccounts] = useState([]);
  const [adAccounts, setAdAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [insights, setInsights] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [ads, setAds] = useState([]); 
  const [filteredAds, setFilteredAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adStatusFilter, setAdStatusFilter] = useState('ALL'); 
  
  // Estados para seleções
  const [selectedBm, setSelectedBm] = useState('');
  const [selectedAdAccount, setSelectedAdAccount] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [datePreset, setDatePreset] = useState('last_7d');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState(new Date());
  
  // Estados para UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [ctr, setCtr] = useState(0);
  const [registerBmDialog, setRegisterBmDialog] = useState(false);
  const [newBmId, setNewBmId] = useState('');
  const [newBmToken, setNewBmToken] = useState('');
  const [shareDialog, setShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [shareExpiration, setShareExpiration] = useState(24);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Função para buscar Business Manager Accounts (movida para cima para evitar erro de acesso antes da definição)
  const fetchBmAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/bm-accounts');
      setBmAccounts(response.data.bm_accounts || []);
      setLoading(false);
      
      // Show register BM dialog if no accounts are found
      if (response.data.bm_accounts?.length === 0) {
        setRegisterBmDialog(true);
      }
    } catch (err) {
      setError('Failed to load Business Manager accounts');
      setLoading(false);
    }
  }, []);
  
  // A antiga função prepareChartData foi substituída pela importação chartDataProcessor

  // Função para processar e agrupar os dados de insights por campanha
  const processInsightsData = (insightsData) => {
    // Validar entrada
    if (!insightsData || !Array.isArray(insightsData) || insightsData.length === 0) {
      console.log('Sem dados de insights para processar');
      return [];
    }
    
    console.log(`Processando ${insightsData.length} insights`);
    
    // Mostrar exemplo dos insights recebidos para debugging
    if (insightsData.length > 0) {
      console.log('Exemplo de insight recebido:', insightsData[0]);
      // Verificar se os insights contêm nomes de campanhas
      const hasCampaignNames = insightsData.some(insight => insight && insight.campaign_name);
      console.log('Os insights contêm nomes de campanhas?', hasCampaignNames);
    }
    
    // Usar todos os insights, mesmo que não tenham métricas significativas
    // Isso garantirá que todas as campanhas ativas no período sejam exibidas
    const relevantInsights = insightsData.filter(insight => {
      // Aceitar qualquer insight desde que seja um objeto válido
      return insight && typeof insight === 'object';
    });
    
    // Agrupar por campanha
    const campaignGroups = {};
    
    relevantInsights.forEach(insight => {
      // Usar o nome da campanha como chave de agrupamento
      const campaignName = insight.campaign_name;
      
      if (!campaignGroups[campaignName]) {
        // Se é a primeira ocorrência da campanha, criar o grupo
        campaignGroups[campaignName] = insight;
      } else {
        // Se já existe, somar valores numéricos
        const existing = campaignGroups[campaignName];
        
        // Somar métricas acumuláveis
        ['impressions', 'clicks', 'reach'].forEach(metric => {
          if (insight[metric] && existing[metric]) {
            existing[metric] = (parseFloat(existing[metric]) + parseFloat(insight[metric])).toString();
          }
        });
        
        // Tratamento especial para gasto (spend) - garantir precisão de 2 casas decimais
        if (insight.spend || existing.spend) {
          // Converter para números com tratamento de valores inválidos
          const existingSpend = existing.spend ? parseFloat(existing.spend) : 0;
          const insightSpend = insight.spend ? parseFloat(insight.spend) : 0;
          
          // Verificar se os valores são números válidos
          const validExistingSpend = !isNaN(existingSpend) ? existingSpend : 0;
          const validInsightSpend = !isNaN(insightSpend) ? insightSpend : 0;
          
          // Somar valores e formatar com precisão exata de 2 casas decimais
          const totalSpend = validExistingSpend + validInsightSpend;
          existing.spend = totalSpend.toFixed(2);
        } else {
          existing.spend = '0.00';
        }
        
        // Para CTR e CPC, recalcular baseado nos valores acumulados
        if (existing.impressions && existing.clicks) {
          existing.ctr = (parseFloat(existing.clicks) / parseFloat(existing.impressions)).toString();
        }
        
        if (existing.clicks && existing.spend) {
          existing.cpc = (parseFloat(existing.spend) / parseFloat(existing.clicks)).toString();
        }
      }
    });
    
    // Converter o objeto de grupos de campanhas em um array para o DataGrid
    return Object.values(campaignGroups).map((insight, index) => {
      // Garantir que todos os campos obrigatórios existam para evitar undefined
      const processedInsight = {
        id: index,
        campaign_name: insight.campaign_name || 'Campanha sem nome',
        // Garantir que o valor do gasto tenha exatamente 2 casas decimais
        spend: insight.spend ? (parseFloat(insight.spend) || 0).toFixed(2) : '0.00',
        impressions: insight.impressions || '0',
        clicks: insight.clicks || '0',
        ctr: insight.ctr || '0',
        // Garantir que o CPC tenha 2 casas decimais
        cpc: insight.cpc ? parseFloat(parseFloat(insight.cpc).toFixed(2)).toString() : '0.00',
        reach: insight.reach || '0',
        frequency: insight.frequency || '0',
        conversions: insight.conversions || '0',
        // Garantir que o custo por conversão tenha 2 casas decimais
        cost_per_conversion: insight.cost_per_conversion ? 
          parseFloat(parseFloat(insight.cost_per_conversion).toFixed(2)).toString() : '0.00',
        ...insight // Manter outros campos que possam existir
      };
      
      return processedInsight;
    });
  };
  
  // Função para gerar as colunas do DataGrid
  const getDataGridColumns = (insightsData) => {
    // Lista de colunas importantes/prioritárias
    const priorityColumns = [
      'date_start', 'date_stop', 'campaign_name', 'adset_name', 'ad_name',
      'spend', 'impressions', 'clicks', 'ctr', 'cpc', 'reach', 
      'frequency', 'conversions', 'cost_per_conversion'
    ];
    
    // Mapeamento de nomes de colunas para português
    const columnNameMap = {
      'date_start': 'Data Inicial',
      'date_stop': 'Data Final',
      'campaign_name': 'Campanha',
      'adset_name': 'Conjunto de Anúncios',
      'ad_name': 'Anúncio',
      'spend': 'Investimento (R$)',
      'impressions': 'Impressões',
      'clicks': 'Cliques',
      'ctr': 'CTR',
      'cpc': 'CPC (R$)',
      'reach': 'Alcance',
      'frequency': 'Frequência',
      'conversions': 'Conversões',
      'cost_per_conversion': 'Custo por Conversão (R$)'
    };
    
    // Obter todas as colunas disponíveis
    const availableColumns = insightsData.length > 0 ? Object.keys(insightsData[0] || {}) : [];
    
    // Filtrar colunas prioritárias que existem nos dados
    const columnsToShow = priorityColumns.filter(col => 
      availableColumns.includes(col)
    );
    
    // Adicionar outras colunas importantes que podem não estar na lista prioritária
    availableColumns.forEach(col => {
      if (!columnsToShow.includes(col) && 
          (col.includes('conversion') || 
           col.includes('action') || 
           col.includes('cost_per') || 
           col.includes('value'))) {
        columnsToShow.push(col);
      }
    });
    
    // Retornar configuração de colunas
    return columnsToShow.map(key => ({
      field: key,
      headerName: columnNameMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      width: 150,
      flex: 1,
      minWidth: 120,
      valueFormatter: (params) => {
        if (key.includes('cost_per') || key === 'cpc' || key === 'cpm' || key === 'spend') {
          return `R$ ${parseFloat(params.value).toLocaleString('pt-BR', {
            maximumFractionDigits: 2
          })}`;
        } else if (key === 'ctr' || key === 'frequency') {
          return parseFloat(params.value).toLocaleString('pt-BR', {
            style: key === 'ctr' ? 'percent' : 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        } else if (key.includes('date')) {
          // Formatar data para formato brasileiro
          try {
            const date = new Date(params.value);
            return date.toLocaleDateString('pt-BR');
          } catch (e) {
            return params.value;
          }
        } else if (typeof params.value === 'number' || !isNaN(parseFloat(params.value))) {
          return parseFloat(params.value).toLocaleString('pt-BR', {
            maximumFractionDigits: 2
          });
        }
        return params.value;
      }
    }));
  };
  /* Função comentada para remover aviso ESLint - substituída pelo chartDataProcessor importado
  const prepareChartData = useCallback((insightsData) => {
    // Usar os estados de data atuais para filtrar os dados
    console.log('Estado atual dos filtros:', { datePreset, startDate, endDate });
    if (!insightsData || insightsData.length === 0) return null;
    
    // Verificar se temos datas definidas nos insights
    const hasDefinedDates = insightsData.some(item => item.date_start);
    
    // Criar datas simuladas para os últimos 7 dias se não houver datas
    let dates = [];
    let sortedInsights = [...insightsData];
    
    if (!hasDefinedDates) {
      console.log('Sem datas definidas nos insights, criando datas simuladas');
      
      // Criar datas para os últimos 7 dias
      const today = new Date();
      dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (6 - i));  // Últimos 7 dias, começando 6 dias atrás
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      });
      
      // Se temos apenas um insight, distribuímos os valores entre as datas
      if (insightsData.length === 1) {
        const singleInsight = insightsData[0];
        sortedInsights = dates.map((date, index) => {
          // Criamos uma variação para não ter valores iguais todos os dias
          const factor = 0.7 + (index / 6) * 0.6; // Fator que vai de 0.7 a 1.3
          
          return {
            ...singleInsight,
            date_start: date,
            impressions: Math.round((parseInt(singleInsight.impressions) || 0) * factor / 7),
            clicks: Math.round((parseInt(singleInsight.clicks) || 0) * factor / 7),
            spend: ((parseFloat(singleInsight.spend) || 0) * factor / 7).toFixed(2)
          };
        });
      }
    } else {
      console.log('Insights com datas definidas - aplicando filtro e ordenando');
      
      // Obter o intervalo de datas baseado nos filtros selecionados
      const dateRange = getDateRange(datePreset, startDate, endDate);
      console.log('Filtrando por datas:', dateRange.formattedStartDate, 'a', dateRange.formattedEndDate);
      
      // Filtrar insights por intervalo de datas
      sortedInsights = filterInsightsByDateRange(sortedInsights, dateRange.formattedStartDate, dateRange.formattedEndDate);
      console.log('Insights filtrados:', sortedInsights.length);
      
      // Ordenar corretamente por data
      sortedInsights.sort((a, b) => {
        const dateA = standardizeDate(a.date_start);
        const dateB = standardizeDate(b.date_start);
        return dateA.localeCompare(dateB); // Comparau00e7u00e3o de strings para melhor consistu00eancia
      });
      
      // Extrair datas u00fanicas e garantir ordenau00e7u00e3o
      dates = [...new Set(sortedInsights.map(item => standardizeDate(item.date_start)))];
      dates.sort(); // Garantir ordenau00e7u00e3o cronolu00f3gica
      
      // Se nu00e3o houver datas aps a filtragem, usar datas do intervalo do filtro
      if (dates.length === 0) {
        dates = generateDateRange(dateRange.startDate, dateRange.endDate);
        console.log('Usando datas do intervalo do filtro:', dates);
      }
    }
    
    // Log para depuração do formato das datas
    console.log('Datas para o gráfico (após processamento):', dates);
    
    // Preparar dados para o gráfico de cliques x impressões
    const clicksData = dates.map(date => {
      const dayData = sortedInsights.find(item => item.date_start === date);
      // Garantir que estamos convertendo para número
      return dayData ? parseInt(dayData.clicks || 0, 10) : 0;
    });
    
    const impressionsData = dates.map(date => {
      const dayData = sortedInsights.find(item => item.date_start === date);
      // Dividir por 1000 para escala mais adequada e garantir que é número
      return dayData ? parseInt(dayData.impressions || 0, 10) / 1000 : 0;
    });
    
    const spendData = dates.map(date => {
      const dayData = sortedInsights.find(item => item.date_start === date);
      // Garantir que estamos convertendo para número decimal
      return dayData ? parseFloat(dayData.spend || 0) : 0;
    });
    
    // Log para depuração dos valores
    console.log('Valores de cliques:', clicksData);
    console.log('Valores de impressões:', impressionsData);
    console.log('Valores de gastos:', spendData);
    
    // Formatar datas para exibição no eixo X com tratamento de erros
    const formattedDates = dates.map(date => {
      try {
        // Verificar o formato da data recebida
        console.log('Processando data:', date, 'tipo:', typeof date);
        
        // Se a data for undefined ou null, usar uma representação segura
        if (!date) {
          console.error('Data indefinida ou null');
          return 'Data indisponível';
        }
        
        // Verificar se a data tem o formato ISO (YYYY-MM-DD)
        let dateObj;
        if (typeof date === 'string') {
          // Se for uma string, tentar extrair partes da data
          if (date.includes('-')) {
            // Formato ISO YYYY-MM-DD 
            const parts = date.split('-');
            if (parts.length === 3) {
              // Garantir que os valores sejam números válidos
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed em JavaScript
              const day = parseInt(parts[2], 10);
              
              if (!isNaN(year) && !isNaN(month) && !isNaN(day) && 
                  month >= 0 && month < 12 && day >= 1 && day <= 31) {
                dateObj = new Date(year, month, day);
              } else {
                // Se algum componente não for válido, usar uma string segura
                console.error('Componentes de data inválidos:', parts);
                return date.toString().substring(0, 10);
              }
            } else {
              dateObj = new Date(date);
            }
          } else if (date.includes('/')) {
            // Formato MM/DD/YYYY ou DD/MM/YYYY
            const parts = date.split('/');
            if (parts.length === 3) {
              // Garantir que os valores sejam números válidos
              const month = parseInt(parts[0], 10) - 1; // Assumir MM/DD/YYYY (mês primeiro)
              const day = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              
              if (!isNaN(year) && !isNaN(month) && !isNaN(day) && 
                  month >= 0 && month < 12 && day >= 1 && day <= 31) {
                dateObj = new Date(year, month, day);
              } else {
                // Se algum componente não for válido, usar uma string segura
                console.error('Componentes de data inválidos:', parts);
                return date.toString().substring(0, 10);
              }
            } else {
              dateObj = new Date(date);
            }
          } else {
            // Tentar converter diretamente
            dateObj = new Date(date);
          }
        } else {
          // Caso não seja string, tentar converter diretamente
          dateObj = new Date(date);
        }
        
        // Verificar se a data é válida
        if (isNaN(dateObj.getTime())) {
          // Data inválida, usar a string original processada de forma segura
          console.error('Data inválida após conversão:', date);
          
          // Gerar uma data simulada baseada no índice na lista
          const today = new Date();
          const simulatedDate = new Date(today);
          simulatedDate.setDate(today.getDate() - dates.length + dates.indexOf(date));
          return simulatedDate.toLocaleDateString('pt-BR');
        }
        
        // Formatar a data válida
        return dateObj.toLocaleDateString('pt-BR');
      } catch (error) {
        console.error('Erro ao processar data:', date, error);
        
        // Em caso de erro, gerar uma representação baseada no índice na lista
        const today = new Date();
        const simulatedDate = new Date(today);
        simulatedDate.setDate(today.getDate() - dates.length + dates.indexOf(date));
        return simulatedDate.toLocaleDateString('pt-BR');
      }
    });
    
    // Remover cálculo de totais aqui, já que o prepareChartData.js está fazendo isso
    // e passando os valores para as funções setTotal* diretamente
    // Isso evita a sobreposição dos valores corretos
    
    // Log para depuração dos valores calculados em prepareChartData
    console.log('NOTA: O cálculo de totais foi movido para prepareChartData.js');
    console.log('Valores atuais nos estados:');
    console.log('- Total de Impressões:', totalImpressions);
    console.log('- Total de Cliques:', totalClicks);
    console.log('- Total de Investimento:', totalSpend);
    console.log('- CTR médio:', ctr);
    
    return {
      clicksImpressionsData: {
        labels: formattedDates,
        datasets: [
          {
            label: 'Cliques',
            data: clicksData,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            fill: false,
            yAxisID: 'y1',
            tension: 0,  // Remover suavização da linha para valores exatos
            pointRadius: 5, // Pontos maiores para melhor visibilidade
            pointHoverRadius: 8,
          },
          {
            label: 'Impressões (milhares)',
            data: impressionsData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            fill: false,
            yAxisID: 'y',
            tension: 0,  // Remover suavização da linha para valores exatos
            pointRadius: 5, // Pontos maiores para melhor visibilidade
            pointHoverRadius: 8,
          }
        ]
      },
      clicksImpressionsOptions: {
        responsive: true,
        maintainAspectRatio: false, // Permitir que o gráfico se ajuste melhor
        interaction: {
          mode: 'index',
          intersect: false,
        },
        stacked: false,
        plugins: {
          title: {
            display: true,
            text: 'Cliques e Impressões'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + context.parsed.y;
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true, // Garantir que o eixo Y comece em zero
            title: {
              display: true,
              text: 'Impressões (milhares)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true, // Garantir que o eixo Y comece em zero
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: 'Cliques'
            }
          },
        }
      },
      spendData: {
        labels: formattedDates,
        datasets: [
          {
            label: 'Investimento (R$)',
            data: spendData,
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            fill: true,
            tension: 0,  // Remover suavização da linha para valores exatos
            pointRadius: 5, // Pontos maiores para melhor visibilidade
            pointHoverRadius: 8,
          }
        ]
      },
      spendOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Investimento Diário'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': R$ ' + context.parsed.y.toFixed(2);
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true, // Garantir que o eixo Y comece em zero
            ticks: {
              callback: function(value) {
                return 'R$ ' + value.toFixed(2);
              }
            }
          }
        }
      },
      performanceData: {
        labels: formattedDates,
        datasets: [
          {
            label: 'Cliques',
            data: clicksData,
            borderColor: 'rgba(54, 162, 235, 1)',
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            tension: 0, // Remover suavização para mostrar valores reais
          },
          {
            label: 'Impressões (milhares)',
            data: impressionsData,
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 8,
            tension: 0, // Remover suavização para mostrar valores reais
          }
        ]
      },
    };
  }, [datePreset, startDate, endDate]);
  */

  // Nova função para buscar insights (convertida para useCallback)
  const fetchInsights = useCallback(async () => {
    if (!selectedBm || !selectedAdAccount) {
      console.log('Não é possível buscar insights: BM ou AdAccount não selecionados');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Preparar os parâmetros da requisição
      let params = {
        bm_id: selectedBm,
        ad_account_id: selectedAdAccount,
      };
      
      // Adicionar filtros extras se selecionados
      if (selectedCampaign) {
        params.campaign_id = selectedCampaign;
      }
      
      if (datePreset && datePreset !== 'custom') {
        params.date_preset = datePreset;
      } else if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      } else {
        params.date_preset = 'last_7d';  // Padrão para 7 dias
      }
      
      // Adicionar parâmetro para forçar agrupamento diário (breakdowns por dia)
      params.time_increment = 1; // Importante: Solicitar dados por dia
      
      console.log('Fetching insights with params:', params);
      
      const response = await axios.get('/api/account-insights', { params });
      console.log('Raw insights data:', typeof response.data, response.data);
      
      // Acessar o array insights dentro do objeto retornado
      let insightsArray = [];
      if (response.data.insights && Array.isArray(response.data.insights)) {
        insightsArray = response.data.insights;
      } else if (Array.isArray(response.data)) {
        insightsArray = response.data;
      } else if (response.data && typeof response.data === 'object') {
        // Se for um único objeto, colocá-lo em um array
        insightsArray = [response.data];
      }
      
      // Log detalhado dos insights recebidos
      console.log('Insights array extracted:', insightsArray);
      console.log('Número de insights recebidos:', insightsArray.length);
      
      // Verificar datas presentes nos insights
      if (insightsArray.length > 0) {
        console.log('Exemplo de datas nos insights:');
        insightsArray.forEach((insight, index) => {
          if (index < 5) { // Limitar a 5 exemplos para não sobrecarregar o console
            console.log(`Insight ${index}: date_start=${insight.date_start}, date_stop=${insight.date_stop}, impressões=${insight.impressions}, cliques=${insight.clicks}`);
          }
        });
        
        // Verificar se há datas únicas e mostrá-las em ordem
        const uniqueDates = [...new Set(insightsArray.map(item => item.date_start))];
        uniqueDates.sort(); // Ordenar as datas
        console.log(`Datas únicas encontradas: ${uniqueDates.length}`, uniqueDates);
        
        // Se tivermos menos de 7 datas e o preset for de 7 dias ou mais, alertar
        if (uniqueDates.length < 7 && 
            (datePreset === 'last_7d' || datePreset === 'last_14d' || datePreset === 'last_28d' || datePreset === 'last_30d')) {
          console.warn(`ATENÇÃO: Apenas ${uniqueDates.length} datas encontradas nos insights, mas o período selecionado deveria ter pelo menos 7 dias.`);
        }
      }
      
      // Atualizar o estado com os dados
      setInsights(insightsArray);
      
      // Preparar dados para os gráficos
      // Usar o processador de dados externo importado com os paru00e2metros adequados
      const chartData = chartDataProcessor(insightsArray, datePreset, startDate, endDate, setTotalImpressions, setTotalClicks, setTotalSpend, setCtr);
      console.log('Prepared chart data:', chartData);
      
      setChartData(chartData);
      setLoading(false);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching insights:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response,
        request: err.request
      });
      
      let errorMessage = 'Erro ao buscar insights';
      
      if (err.response) {
        // O servidor respondeu com um status diferente de 2xx
        errorMessage += `: ${err.response.status} - ${err.response.statusText}`;
        if (err.response.data && err.response.data.error) {
          errorMessage += ` (${err.response.data.error})`;
        }
      } else if (err.request) {
        // A requisição foi feita mas não houve resposta
        errorMessage += ': Sem resposta do servidor';
      } else {
        // Algo aconteceu na configuração da requisição
        errorMessage += `: ${err.message}`;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }, [selectedBm, selectedAdAccount, selectedCampaign, datePreset, startDate, endDate, setTotalImpressions, setTotalClicks, setTotalSpend, setCtr]);

  // Nova função para buscar anúncios (convertida para useCallback)
  const fetchAds = useCallback(async () => {
    if (!selectedBm || !selectedAdAccount) return;
    
    setAdsLoading(true);
    setError(null);
    
    try {
      // Preparar os parâmetros da requisição
      let params = {
        bm_id: selectedBm,
        limit: 6  // Limitar a 6 anúncios para não sobrecarregar
      };
      
      // Decidir se vamos buscar por conta ou campanha
      if (selectedCampaign) {
        params.campaign_id = selectedCampaign;
      } else {
        params.ad_account_id = selectedAdAccount;
      }
      
      console.log('Fetching ads with params:', params);
      
      // Aumentar o timeout para 60 segundos para evitar erros ECONNABORTED
      const response = await axios.get('/api/ads', { 
        params,
        timeout: 60000 // 60 segundos
      });
      console.log('Ads data:', response.data);
      
      const adsData = response.data.ads || [];
      setAds(adsData);
      setFilteredAds(adsData);
      setAdsLoading(false);
    } catch (err) {
      console.error('Error fetching ads:', err);
      
      // Mensagem de erro mais informativa baseada no tipo de erro
      if (err.code === 'ECONNABORTED') {
        setError('O tempo limite da requisição foi excedido. A API do Facebook pode estar lenta. Tente novamente mais tarde.');
      } else if (err.response) {
        // Erro com resposta do servidor
        setError(`Erro ao buscar anúncios: ${err.response.data?.error || err.message}`);
      } else {
        setError(`Erro ao buscar anúncios: ${err.message}`);
      }
      setAdsLoading(false);
    }
  }, [selectedBm, selectedAdAccount, selectedCampaign]);

  // Load BM accounts when component mounts
  useEffect(() => {
    fetchBmAccounts();
  }, [fetchBmAccounts]);

  // Efeito para atualização automática
  useEffect(() => {
    let intervalId;
    
    if (autoRefresh && selectedAdAccount) {
      intervalId = setInterval(() => {
        fetchInsights();
        setLastRefreshed(new Date());
      }, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, selectedAdAccount, selectedBm, selectedCampaign, datePreset, useCustomDates, startDate, endDate, fetchInsights]);

  // Load ad accounts when BM is selected
  useEffect(() => {
    if (selectedBm) {
      fetchAdAccounts(selectedBm);
    }
  }, [selectedBm]);

  // Load campaigns when ad account is selected
  useEffect(() => {
    if (selectedAdAccount) {
      fetchCampaigns(selectedBm, selectedAdAccount);
    }
  }, [selectedBm, selectedAdAccount]);

  // Load insights when filters change
  useEffect(() => {
    if (selectedBm && (selectedAdAccount || selectedCampaign) && (datePreset || (useCustomDates && startDate && endDate))) {
      fetchInsights();
    }
  }, [selectedBm, selectedAdAccount, selectedCampaign, datePreset, useCustomDates, startDate, endDate, fetchInsights]);

  // Fetch functions

  const fetchAdAccounts = async (bmId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/ad-accounts?bm_id=${bmId}`);
      setAdAccounts(response.data.ad_accounts || []);
      setSelectedAdAccount('');
      setCampaigns([]);
      setSelectedCampaign('');
      setLoading(false);
    } catch (err) {
      setError('Failed to load Ad Accounts');
      setLoading(false);
    }
  };

  const fetchCampaigns = async (bmId, adAccountId) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/campaigns?bm_id=${bmId}&ad_account_id=${adAccountId}`);
      setCampaigns(response.data.campaigns || []);
      setSelectedCampaign('');
      setLoading(false);
    } catch (err) {
      setError('Failed to load Campaigns');
      setLoading(false);
    }
  };

  // Buscar anúncios quando os insights são carregados
  useEffect(() => {
    if (insights && insights.length > 0) {
      fetchAds();
    }
  }, [insights, fetchAds]);

  const generatePdf = async () => {
    try {
      const params = {
        bm_id: selectedBm,
        ad_account_id: selectedCampaign ? null : selectedAdAccount,
        campaign_id: selectedCampaign || null,
        date_preset: useCustomDates ? `custom:${startDate.toISOString()}:${endDate.toISOString()}` : datePreset
      };
      
      const response = await axios.post('/api/generate-pdf', params, {
        responseType: 'blob'
      });
      
      // Create a blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report_${new Date().toISOString()}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up and remove the link
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to generate PDF report');
    }
  };

  const createShareLink = async () => {
    try {
      const params = {
        bm_id: selectedBm,
        ad_account_id: selectedCampaign ? null : selectedAdAccount,
        campaign_id: selectedCampaign || null,
        date_preset: useCustomDates ? `custom:${startDate.toISOString()}:${endDate.toISOString()}` : datePreset,
        expiration: shareExpiration
      };
      
      const response = await axios.post('/api/create-share-link', params);
      setShareLink(response.data.share_link);
    } catch (err) {
      setError('Failed to create share link');
    }
  };

  const handleShareDialogOpen = () => {
    setShareLink('');
    setShareDialog(true);
  };

  const handleShareDialogClose = () => {
    setShareDialog(false);
  };

  const registerNewBm = async () => {
    if (!newBmId || !newBmToken) {
      setError('BM ID and access token are required');
      return;
    }
    
    try {
      setLoading(true);
      await axios.post('/api/register-bm', {
        bm_id: newBmId,
        access_token: newBmToken
      });
      
      // Refresh BM accounts list
      await fetchBmAccounts();
      setRegisterBmDialog(false);
      setNewBmId('');
      setNewBmToken('');
      setLoading(false);
    } catch (err) {
      setError('Failed to register Business Manager account');
      setLoading(false);
    }
  };


  return (
    <Box
      sx={{
        flexGrow: 1,
        p: 3,
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}
    >
      <Container maxWidth="xl" sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Painel de Anúncios do Meta
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ p: 2, mb: 3, overflowX: 'auto' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Business Manager</InputLabel>
                <Select
                  value={selectedBm}
                  onChange={(e) => setSelectedBm(e.target.value)}
                  label="Business Manager"
                >
                  {bmAccounts.map((bm) => (
                    <MenuItem key={bm} value={bm}>
                      {bm}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!selectedBm}>
                <InputLabel>Conta de Anúncio</InputLabel>
                <Select
                  value={selectedAdAccount}
                  onChange={(e) => setSelectedAdAccount(e.target.value)}
                  label="Conta de Anúncio"
                >
                  {adAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!selectedAdAccount}>
                <InputLabel>Campanha (Opcional)</InputLabel>
                <Select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  label="Campanha (Opcional)"
                >
                  <MenuItem value="">Todas as Campanhas</MenuItem>
                  {campaigns.map((campaign) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={useCustomDates ? "custom" : datePreset}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setUseCustomDates(true);
                    } else {
                      setUseCustomDates(false);
                      setDatePreset(e.target.value);
                    }
                  }}
                  label="Período"
                >
                  {datePresets.map((preset) => (
                    <MenuItem key={preset.value} value={preset.value}>
                      {preset.label}
                    </MenuItem>
                  ))}
                  <MenuItem value="custom">Data Personalizada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {useCustomDates && (
              <>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Data Inicial"
                    type="date"
                    value={startDate ? startDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setStartDate(date);
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    fullWidth
                    helperText="DD/MM/AAAA"
                  />
                </Grid>
            
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Data Final"
                    type="date"
                    value={endDate ? endDate.toISOString().split('T')[0] : ''}
                    onChange={(e) => {
                      const date = new Date(e.target.value);
                      setEndDate(date);
                    }}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    fullWidth
                    helperText="DD/MM/AAAA"
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12} md={useCustomDates ? 6 : 3}>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={fetchInsights}
                disabled={!selectedAdAccount}
                fullWidth
                sx={{ height: '56px' }}
                startIcon={<FilterAltIcon />}
              >
                Carregar Dados
              </Button>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Button 
                variant="outlined" 
                onClick={() => setRegisterBmDialog(true)}
                sx={{ mr: 1 }}
              >
                Adicionar Business Manager
              </Button>
              
              <FormControl sx={{ minWidth: 170, ml: 1 }} size="small" variant="outlined">
                <InputLabel>Atualização</InputLabel>
                <Select
                  value={autoRefresh ? refreshInterval : "off"}
                  onChange={(e) => {
                    if (e.target.value === "off") {
                      setAutoRefresh(false);
                    } else {
                      setAutoRefresh(true);
                      setRefreshInterval(Number(e.target.value));
                    }
                  }}
                  label="Atualização"
                >
                  <MenuItem value="off">Desligada</MenuItem>
                  <MenuItem value="30">30 segundos</MenuItem>
                  <MenuItem value="60">1 minuto</MenuItem>
                  <MenuItem value="300">5 minutos</MenuItem>
                  <MenuItem value="600">10 minutos</MenuItem>
                </Select>
              </FormControl>
              
              {lastRefreshed && (
                <Typography variant="caption" sx={{ ml: 2, display: 'inline-block', color: 'text.secondary' }}>
                  Última atualização: {lastRefreshed.toLocaleTimeString('pt-BR')}
                </Typography>
              )}
            </Box>
            
            {insights && insights.length > 0 && (
              <Box>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={generatePdf}
                  disabled={loading}
                  sx={{ mr: 1 }}
                >
                  Exportar PDF
                </Button>
                
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ShareIcon />}
                  onClick={handleShareDialogOpen}
                  disabled={loading}
                >
                  Compartilhar
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', m: 3 }}>
            <CircularProgress />
          </Box>
        ) : insights && insights.length > 0 && chartData ? (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* KPI Cards */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 140,
                    boxShadow: 3,
                    borderRadius: 2,
                    bgcolor: 'primary.lighter',
                  }}
                >
                  <Typography component="h2" variant="h6" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Impressões
                  </Typography>
                  <Typography component="p" variant="h4" sx={{ mt: 'auto', mb: 1 }}>
                    {totalImpressions.toLocaleString('pt-BR')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total no período selecionado
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 140,
                    boxShadow: 3,
                    borderRadius: 2,
                    bgcolor: 'success.lighter',
                  }}
                >
                  <Typography component="h2" variant="h6" color="success.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Cliques
                  </Typography>
                  <Typography component="p" variant="h4" sx={{ mt: 'auto', mb: 1 }}>
                    {totalClicks.toLocaleString('pt-BR')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total no período selecionado
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 140,
                    boxShadow: 3,
                    borderRadius: 2,
                    bgcolor: 'warning.lighter',
                  }}
                >
                  <Typography component="h2" variant="h6" color="warning.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                    CTR
                  </Typography>
                  <Typography component="p" variant="h4" sx={{ mt: 'auto', mb: 1 }}>
                    {ctr.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Taxa de cliques por impressão
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  sx={{
                    p: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    height: 140,
                    boxShadow: 3,
                    borderRadius: 2,
                    bgcolor: 'error.lighter',
                  }}
                >
                  <Typography component="h2" variant="h6" color="error.main" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Investimento
                  </Typography>
                  <Typography component="p" variant="h4" sx={{ mt: 'auto', mb: 1 }}>
                    {`R$ ${totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valor total investido no período
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
              
            {/* Charts section */}
            <Grid container spacing={3}>
              {/* Line chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: 350, 
                  overflowX: 'auto',
                  boxShadow: 2,
                  borderRadius: 2 
                }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'error.main' }}>
                    Investimento ao Longo do Tempo
                  </Typography>
                  <Box sx={{ height: 300, flexGrow: 1, minWidth: '300px' }}>
                    {chartData?.spendData ? (
                      <Line 
                        data={chartData.spendData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top',
                            },
                            tooltip: {
                              enabled: true,
                              mode: 'index',
                              intersect: false,
                              callbacks: {
                                label: function(context) {
                                  return `R$ ${context.raw.toLocaleString('pt-BR', {
                                    maximumFractionDigits: 2
                                  })}`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              display: true,
                              title: {
                                display: true,
                                text: 'Data'
                              }
                            },
                            y: {
                              display: true,
                              title: {
                                display: true,
                                text: 'Valor (R$)'
                              },
                              ticks: {
                                callback: function(value) {
                                  return `R$ ${value.toLocaleString('pt-BR')}`;
                                }
                              }
                            }
                          }
                        }} 
                      />
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <Typography variant="body2" color="text.secondary">
                          {loading ? 'Carregando dados...' : 'Nenhum dado disponível'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
              
              {/* Line chart */}
              <Grid item xs={12} md={6}>
                <Paper sx={{ 
                  p: 2, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  height: 350, 
                  overflowX: 'auto',
                  boxShadow: 2,
                  borderRadius: 2 
                }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Desempenho da Campanha
                  </Typography>
                  <Box sx={{ height: 300, flexGrow: 1, minWidth: '300px' }}>
                    {chartData?.performanceData ? (
                      <Line 
                        data={chartData.performanceData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'top',
                            },
                            tooltip: {
                              enabled: true,
                              mode: 'index',
                              intersect: false,
                              callbacks: {
                                label: function(context) {
                                  const label = context.dataset.label || '';
                                  const value = context.raw;
                                  
                                  if (label.includes('Impressões')) {
                                    return `${label}: ${(value * 1000).toLocaleString('pt-BR')}`;
                                  }
                                  return `${label}: ${value.toLocaleString('pt-BR')}`;
                                }
                              }
                            }
                          },
                          scales: {
                            x: {
                              display: true,
                              title: {
                                display: true,
                                text: 'Data'
                              }
                            },
                            y: {
                              display: true,
                              title: {
                                display: true,
                                text: 'Valor'
                              }
                            }
                          }
                        }} 
                      />
                    ) : (
                      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                        <Typography variant="body2" color="text.secondary">
                          {loading ? 'Carregando dados...' : 'Nenhum dado disponível'}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Paper>
              </Grid>
            </Grid>
              
            {/* DataGrid */}
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Paper sx={{ 
                p: 2, 
                overflowX: 'auto', 
                maxWidth: '100%',
                boxShadow: 2,
                borderRadius: 2 
              }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Campanhas com Dados no Período
                </Typography>
                
                <Box sx={{ maxHeight: 600, width: '100%', overflow: 'auto' }}>
                  {(() => {
                    // Obter os dados processados das campanhas
                    const campaignData = processInsightsData(insights);

                    // Ordenar os dados por nome da campanha
                    campaignData.sort((a, b) => {
                      return a.campaign_name.localeCompare(b.campaign_name);
                    });

                    // Verificar se existem insights mas não têm dados de campanha
                    if (campaignData.length === 0 && insights.length > 0) {
                      console.log('Insights disponíveis mas sem dados de campanha:', insights.length);
                      // Tentar extrair informações de campanha dos insights brutos
                      const tempCampaignData = insights.map((insight, index) => ({
                        id: index,
                        campaign_name: insight.campaign_name || `Campanha ${index + 1}`,
                        spend: insight.spend || '0',
                        impressions: insight.impressions || '0',
                        clicks: insight.clicks || '0',
                        ctr: insight.ctr || '0',
                        cpc: insight.cpc || '0'
                      }));
                      
                      // Se mesmo assim não houver dados, mostrar mensagem
                      if (tempCampaignData.length === 0) {
                        return (
                          <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                            Nenhuma campanha encontrada no período selecionado. Tente selecionar outro período ou conta.
                          </Typography>
                        );
                      }
                      
                      // Se encontrou dados, usar eles
                      campaignData.push(...tempCampaignData);
                    } else if (campaignData.length === 0) {
                      return (
                        <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
                          Nenhuma campanha com dados no período selecionado
                        </Typography>
                      );
                    }

                    // Verificar se há campanhas sem nome e corrigir
                    campaignData.forEach((item, index) => {
                      if (!item.campaign_name || item.campaign_name === 'undefined' || item.campaign_name === '') {
                        item.campaign_name = `Campanha ${index + 1}`;
                      }
                    });
                    
                    // Cada campanha já está consolidada em processInsightsData, então não precisamos fazer mais agrupamento
                    // Criar um grupo para cada campanha
                    const campaignGroups = {};
                    campaignData.forEach(item => {
                      const name = item.campaign_name || `Campanha ${Object.keys(campaignGroups).length + 1}`;
                      // Cada campanha terá apenas um item (já consolidado)
                      campaignGroups[name] = [item];
                    });
                    
                    // Log para debugging
                    console.log(`Encontradas ${Object.keys(campaignGroups).length} campanhas para exibição`);
                    

                    // Retornar uma tabela para cada campanha
                    return Object.entries(campaignGroups).map(([campaignName, campaignItems], groupIndex) => {
                      // Garantir que cada item na tabela tenha o nome da campanha explicitamente
                      const itemsWithCampaignName = campaignItems.map(item => ({
                        ...item,
                        campaign_name: campaignName || 'Campanha sem nome' // Garantir que o nome da campanha esteja presente e nunca undefined
                      }));
                      
                      return (
                      <Paper 
                        key={groupIndex} 
                        elevation={2} 
                        sx={{ 
                          mb: 3, 
                          borderRadius: 2,
                          overflow: 'hidden'
                        }}
                      >
                        {/* Cabeçalho da campanha */}
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: '#1976d2', 
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          {campaignName}
                        </Box>
                        
                        {/* Tabela de dados da campanha */}
                        <DataGrid
                          rows={itemsWithCampaignName}
                    columns={(() => {
                      // Lista de colunas importantes/prioritárias reorganizadas - sempre com campanha como primeira coluna
                      const priorityColumns = [
                        'campaign_name', // Nome da campanha SEMPRE como primeira coluna
                        'spend', 'impressions', 'clicks', 'ctr', 'cpc',
                        'reach', 'frequency', 'conversions', 'cost_per_conversion'
                      ];
                      
                      // Mapeamento de nomes de colunas para português
                      const columnNameMap = {
                        'date_start': 'Data Inicial',
                        'date_stop': 'Data Final',
                        'campaign_name': 'Campanha',
                        'adset_name': 'Conjunto de Anúncios',
                        'ad_name': 'Anúncio',
                        'spend': 'Investimento (R$)',
                        'impressions': 'Impressões',
                        'clicks': 'Cliques',
                        'ctr': 'CTR (%)',
                        'cpc': 'CPC (R$)',
                        'reach': 'Alcance',
                        'frequency': 'Frequência',
                        'conversions': 'Conversões',
                        'cost_per_conversion': 'Custo por Conversão (R$)'
                      };
                      
                      // Obter todas as colunas disponíveis
                      const availableColumns = insights.length > 0 ? Object.keys(insights[0] || {}) : [];
                      
                      // Filtrar colunas prioritárias que existem nos dados
                      let columnsToShow = priorityColumns.filter(col => 
                        availableColumns.includes(col)
                      );
                      
                      // Garantir que campaign_name seja a primeira coluna e SEMPRE esteja presente
                      // Primeiro remover para garantir que não haja duplicatas
                      columnsToShow = columnsToShow.filter(col => col !== 'campaign_name');
                      // Adicionar como primeira coluna
                      columnsToShow.unshift('campaign_name');
                      
                      // Adicionar outras colunas importantes que podem não estar na lista prioritária
                      availableColumns.forEach(col => {
                        if (!columnsToShow.includes(col) && col !== 'campaign_name' && 
                            (col.includes('conversion') || 
                             col.includes('action') || 
                             col.includes('cost_per') || 
                             col.includes('value'))) {
                          columnsToShow.push(col);
                        }
                      });
                      
                      // Definir larguras e estilos especiais para algumas colunas
                      const columnWidths = {
                        'campaign_name': 250,
                        'spend': 150,
                        'impressions': 130,
                        'clicks': 120,
                        'ctr': 100,
                        'cpc': 120
                      };
                      
                      console.log('Colunas a serem exibidas:', columnsToShow);
                      
                      // Certificar-se que a primeira coluna é sempre o nome da campanha
                      if (columnsToShow[0] !== 'campaign_name') {
                        console.warn('Corrigindo ordem das colunas - campaign_name deve ser a primeira');
                        columnsToShow = ['campaign_name', ...columnsToShow.filter(col => col !== 'campaign_name')];
                      }
                      
                      // Configurar colunas para o DataGrid
                      return columnsToShow.map(key => ({
                        field: key,
                        headerName: columnNameMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
                        width: columnWidths[key] || 150,
                        minWidth: 100,
                        flex: key === 'campaign_name' ? 1 : 0,
                        headerAlign: key === 'campaign_name' ? 'left' : 'right',
                        align: key === 'campaign_name' ? 'left' : 'right',
                        hide: false, // Garantir que nenhuma coluna esteja escondida
                        // Estilo especial para a coluna de campanha
                        cellClassName: key === 'campaign_name' ? 'campaign-name-cell' : '',
                        renderHeader: (params) => (
                          <strong>
                            {params.colDef.headerName}
                          </strong>
                        ),
                        valueFormatter: (params) => {
                          // Verificar se params.value é null ou undefined
                          if (params.value === null || params.value === undefined) {
                            return '—';
                          }
                          
                          if (key.includes('cost_per') || key === 'cpc' || key === 'cpm' || key === 'spend') {
                            // Garantir que o valor seja um número válido
                            let numValue = 0;
                            try {
                              numValue = typeof params.value === 'string' ? parseFloat(params.value) : params.value;
                              if (isNaN(numValue)) numValue = 0;
                            } catch (e) {
                              numValue = 0;
                            }
                            // Garantir exatamente 2 casas decimais
                            return `R$ ${numValue.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
                          } else if (key === 'ctr') {
                            const ctrValue = parseFloat(params.value);
                            if (isNaN(ctrValue)) return '0,00%';
                            return `${(ctrValue * 100).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}%`;
                          } else if (key === 'frequency') {
                            const freqValue = parseFloat(params.value);
                            if (isNaN(freqValue)) return '0,00';
                            return freqValue.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            });
                          } else if (key.includes('date')) {
                            // Formatar data para formato brasileiro
                            try {
                              const date = new Date(params.value);
                              return date.toLocaleDateString('pt-BR');
                            } catch (e) {
                              return params.value;
                            }
                          } else if (typeof params.value === 'number' || 
                                   (typeof params.value === 'string' && !isNaN(parseFloat(params.value)))) {
                            const numVal = parseFloat(params.value);
                            if (isNaN(numVal)) return '0';
                            return numVal.toLocaleString('pt-BR', {
                              maximumFractionDigits: 0
                            });
                          }
                          return params.value || '—';
                        }
                      }));
                    })()} 
                    autoHeight
                    disableColumnMenu={false}
                    disableRowSelectionOnClick
                    showCellVerticalBorder
                    showColumnVerticalBorder
                    pageSize={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    pagination
                    initialState={{
                      sorting: {
                        sortModel: [{ field: 'campaign_name', sort: 'asc' }],
                      },
                    }}
                    sx={{
                      '.MuiDataGrid-cell': {
                        py: 1.5
                      },
                      '.MuiDataGrid-columnHeader': {
                        backgroundColor: '#f5f5f5'
                      },
                      border: 'none',
                      borderRadius: 0,
                      '& .MuiDataGrid-main': {
                        borderRadius: 0
                      }
                    }}
                    localeText={{
                      // Tradução dos elementos da tabela
                      noRowsLabel: 'Nenhuma campanha encontrada',
                      footerRowSelected: count => `${count.toLocaleString()} linha${count !== 1 ? 's' : ''} selecionada${count !== 1 ? 's' : ''}`,
                      footerTotalRows: 'Total de linhas:',
                      footerTotalVisibleRows: (visibleCount, totalCount) => `${visibleCount.toLocaleString()} de ${totalCount.toLocaleString()}`,
                      MuiTablePagination: {
                        labelRowsPerPage: 'Linhas por página:',
                        labelDisplayedRows: ({ from, to, count }) => `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                      }
                    }}
                        />
                      </Paper>
                    );
                    });
                  })()}
                </Box>
              </Paper>
            </Grid>
            
            {/* Seção de Prévia dos Anúncios */}
            <Paper sx={{ p: 3, mt: 4, mb: 4, boxShadow: 3, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography component="h2" variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                  Prévia dos Anúncios
                </Typography>
                
                <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                  <InputLabel id="ad-status-filter-label">Status</InputLabel>
                  <Select
                    labelId="ad-status-filter-label"
                    value={adStatusFilter}
                    onChange={(e) => {
                      const newFilter = e.target.value;
                      setAdStatusFilter(newFilter);
                      if (newFilter === 'ALL') {
                        setFilteredAds(ads);
                      } else {
                        setFilteredAds(ads.filter(ad => ad.status === newFilter));
                      }
                    }}
                    label="Status"
                  >
                    <MenuItem value="ALL">Todos</MenuItem>
                    <MenuItem value="ACTIVE">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                        Ativos
                      </Box>
                    </MenuItem>
                    <MenuItem value="PAUSED">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PauseCircleIcon color="warning" fontSize="small" sx={{ mr: 1 }} />
                        Pausados
                      </Box>
                    </MenuItem>
                    <MenuItem value="DELETED">
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <BlockIcon color="error" fontSize="small" sx={{ mr: 1 }} />
                        Excluídos
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>
              </Box>
              
              {adsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', m: 3 }}>
                  <CircularProgress />
                </Box>
              ) : filteredAds && filteredAds.length > 0 ? (
                <>
                  <Grid container spacing={3}>
                    {filteredAds.map((ad) => (
                      <Grid item xs={12} sm={6} md={4} key={ad.id}>
                        <Paper
                          sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: 2,
                            borderRadius: 2,
                            height: '100%'
                          }}
                        >
                          <Typography variant="h6" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
                            {ad.name}
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Chip 
                              label={ad.status} 
                              color={
                                ad.status === 'ACTIVE' ? 'success' : 
                                ad.status === 'PAUSED' ? 'warning' :
                                ad.status === 'DELETED' ? 'error' : 'default'
                              }
                              size="small"
                              sx={{ mr: 1 }}
                              icon={
                                ad.status === 'ACTIVE' ? <CheckCircleIcon /> : 
                                ad.status === 'PAUSED' ? <PauseCircleIcon /> :
                                ad.status === 'DELETED' ? <BlockIcon /> : <HelpIcon />
                              }
                            />
                          </Box>
                          <Divider sx={{ my: 1 }} />
                          {ad.preview_link ? (
                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                              <Button 
                                variant="contained" 
                                color="primary" 
                                href={ad.preview_link} 
                                target="_blank"
                                fullWidth
                              >
                                Ver Anúncio
                              </Button>
                            </Box>
                          ) : ad.preview_html ? (
                            <Box 
                              sx={{ 
                                mt: 2, 
                                p: 1, 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 1,
                                maxHeight: '300px',
                                overflow: 'auto'
                              }}
                              dangerouslySetInnerHTML={{ __html: ad.preview_html }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                              Prévia não disponível para este anúncio
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button 
                      variant="outlined" 
                      color="primary"
                      onClick={fetchAds}
                    >
                      Atualizar Anúncios
                    </Button>
                  </Box>
                </>
              ) : (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Nenhum anúncio encontrado para a seleção atual. Isso pode acontecer se não houver anúncios ativos ou se os anúncios estiverem em revisão.
                </Alert>
              )}
            </Paper>
          </>
        ) : (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="h6" color="text.secondary">
              Selecione os filtros acima para visualizar os dados
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Você precisa selecionar pelo menos uma Business Manager e uma Conta de Anúncio
            </Typography>
          </Paper>
        )}
        
        {/* Register BM Dialog */}
        <Dialog open={registerBmDialog} onClose={() => setRegisterBmDialog(false)}>
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
            <Button onClick={() => setRegisterBmDialog(false)}>Cancelar</Button>
            <Button 
              onClick={registerNewBm} 
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Adicionar'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Share Dialog */}
        <Dialog open={shareDialog} onClose={handleShareDialogClose}>
          <DialogTitle>Compartilhar Relatório</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Gere um link para compartilhar este relatório com outras pessoas.
            </DialogContentText>
            <TextField
              margin="dense"
              label="Expiração (horas)"
              type="number"
              fullWidth
              variant="outlined"
              value={shareExpiration}
              onChange={(e) => setShareExpiration(e.target.value)}
              sx={{ mb: 2 }}
            />
            {shareLink && (
              <TextField
                margin="dense"
                label="Link de Compartilhamento"
                fullWidth
                variant="outlined"
                value={shareLink}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => {
                          navigator.clipboard.writeText(shareLink);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleShareDialogClose}>Fechar</Button>
            {!shareLink && (
              <Button 
                onClick={createShareLink} 
                variant="contained"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Gerar Link'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}

export default Dashboard;
