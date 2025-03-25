import axios from 'axios';

// Define a URL base para todas as requisições
axios.defaults.baseURL = 'http://localhost:5000';

// Adiciona cabeçalhos padrão
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Aumenta o timeout global para 30 segundos (valor em ms)
axios.defaults.timeout = 30000;

// Função para realizar retry nas requisições que falharem
axios.interceptors.response.use(null, async (error) => {
  // Configurações originais da requisição
  const originalRequest = error.config;
  
  // Se já tentamos 3 vezes ou se não é um erro de timeout, não tentar novamente
  if (originalRequest._retry >= 2 || error.code !== 'ECONNABORTED') {
    return Promise.reject(error);
  }
  
  // Incrementa contador de retries
  originalRequest._retry = (originalRequest._retry || 0) + 1;
  
  // Adiciona um pequeno delay antes de tentar novamente
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log(`Tentando novamente requisição (${originalRequest._retry}/2)...`);
  
  // Tenta a requisição novamente
  return axios(originalRequest);
});

export default axios;
