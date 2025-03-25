/**
 * Funções auxiliares para processamento de dados de gráficos
 */

/**
 * Padroniza uma string de data para o formato YYYY-MM-DD
 * 
 * @param {string} dateString String de data em qualquer formato
 * @returns {string} Data no formato YYYY-MM-DD
 */
export const standardizeDate = (dateString) => {
  if (!dateString) return '';
  
  // Remover a parte do tempo se estiver em formato ISO
  if (dateString.includes('T')) {
    dateString = dateString.split('T')[0];
  }
  
  // Converter de MM/DD/YYYY para YYYY-MM-DD
  if (dateString.includes('/')) {
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }
  
  return dateString;
};

/**
 * Obtém o intervalo de datas com base nos filtros selecionados
 * 
 * @param {string} datePreset Preset de data selecionado
 * @param {string} startDate Data inicial personalizada
 * @param {string} endDate Data final personalizada
 * @returns {Object} Objeto com datas inicial e final do filtro
 */
export const getDateRange = (datePreset, startDate, endDate) => {
  let filterStartDate, filterEndDate;
  
  if (datePreset && datePreset !== 'custom') {
    // Usar o preset de data selecionado
    const today = new Date();
    // Definir a hora para o final do dia para capturar todos os dados do dia atual
    today.setHours(23, 59, 59, 999);
    filterEndDate = new Date(today);
    filterStartDate = new Date(today);
    
    // Adicionar caso especial para 'today'
    if (datePreset === 'today') {
      // Para 'today', início e fim são o mesmo dia
      filterStartDate.setHours(0, 0, 0, 0); // Início do dia
    } else {
      switch(datePreset) {
        case 'yesterday':
          filterStartDate.setDate(today.getDate() - 1);
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
          filterEndDate = new Date(filterStartDate);
          filterEndDate.setHours(23, 59, 59, 999); // Fim do dia
          break;
        case 'last_3d':
          filterStartDate.setDate(today.getDate() - 3);
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
          break;
        case 'last_7d':
          filterStartDate.setDate(today.getDate() - 7);
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
          break;
        case 'last_14d':
          filterStartDate.setDate(today.getDate() - 14);
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
          break;
        case 'last_28d':
          filterStartDate.setDate(today.getDate() - 28);
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
          break;
        case 'last_30d':
          filterStartDate.setDate(today.getDate() - 30);
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
          break;
        case 'last_90d':
          filterStartDate.setDate(today.getDate() - 90);
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
          break;
        default:
          filterStartDate.setDate(today.getDate() - 7); // Padrão para 7 dias
          filterStartDate.setHours(0, 0, 0, 0); // Início do dia
      }
    }
  } else if (startDate && endDate) {
    // Usar datas personalizadas
    filterStartDate = new Date(startDate);
    filterStartDate.setHours(0, 0, 0, 0); // Início do dia
    filterEndDate = new Date(endDate);
    filterEndDate.setHours(23, 59, 59, 999); // Final do dia para capturar todos os dados
  } else {
    // Fallback para últimos 7 dias
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final do dia
    filterEndDate = new Date(today);
    filterStartDate = new Date(today);
    filterStartDate.setDate(today.getDate() - 7);
    filterStartDate.setHours(0, 0, 0, 0); // Início do dia
  }
  
  return {
    startDate: filterStartDate,
    endDate: filterEndDate,
    formattedStartDate: filterStartDate.toISOString().split('T')[0],
    formattedEndDate: filterEndDate.toISOString().split('T')[0]
  };
};

/**
 * Gera um array de datas dentro de um intervalo
 * 
 * @param {Date} startDate Data inicial
 * @param {Date} endDate Data final
 * @returns {Array} Array de strings de data no formato YYYY-MM-DD
 */
export const generateDateRange = (startDate, endDate) => {
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia final
  
  return Array.from({ length: diffDays }, (_, i) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  });
};

/**
 * Filtra um array de insights por intervalo de datas
 * 
 * @param {Array} insights Array de objetos insight
 * @param {string} startDateStr Data inicial no formato YYYY-MM-DD
 * @param {string} endDateStr Data final no formato YYYY-MM-DD
 * @returns {Array} Array filtrado de insights
 */
export const filterInsightsByDateRange = (insights, startDateStr, endDateStr) => {
  console.log(`Filtrando ${insights.length} insights entre ${startDateStr} e ${endDateStr}`);
  
  // Verificar se as datas do filtro são válidas
  if (!startDateStr || !endDateStr) {
    console.warn('Datas de filtro inválidas ou não fornecidas');
    return insights;
  }
  
  // Log para análise da estrutura dos insights
  console.log('Amostra de insights antes da filtragem:', 
    insights.slice(0, 3).map(i => ({ 
      date_start: i.date_start, 
      date_stop: i.date_stop,
      spend: i.spend,
      clicks: i.clicks 
    })));
  
  const filteredInsights = insights.filter(insight => {
    // Se o insight não tiver data_start, mantemos no conjunto de dados, mas log para debug
    if (!insight.date_start) {
      console.log('Insight sem data_start encontrado:', insight);
      return true; // Manter items sem data, poderão ser distribuídos pelo intervalo
    }
    
    // Padronizar a data do insight para comparação
    const dateStr = standardizeDate(insight.date_start);
    
    // Verificar se está dentro do intervalo de datas
    const isInRange = dateStr >= startDateStr && dateStr <= endDateStr;
    
    if (!isInRange) {
      console.log(`Insight com data ${dateStr} está fora do intervalo ${startDateStr} - ${endDateStr}`);
    }
    
    return isInRange;
  });
  
  // Agrupar insights por data para verificar a distribuição
  const insightsByDate = {};
  filteredInsights.forEach(insight => {
    if (insight.date_start) {
      const dateKey = standardizeDate(insight.date_start);
      if (!insightsByDate[dateKey]) insightsByDate[dateKey] = [];
      insightsByDate[dateKey].push(insight);
    }
  });
  
  console.log('Distribuição de insights por data após filtragem:');
  Object.keys(insightsByDate).sort().forEach(date => {
    console.log(`${date}: ${insightsByDate[date].length} insights`);
  });
  
  console.log(`Filtro resultou em ${filteredInsights.length} insights dentro do intervalo de datas`);
  return filteredInsights;
};
