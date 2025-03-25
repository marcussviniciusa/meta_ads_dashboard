# Meta Ads Dashboard

Este projeto é um painel de gerenciamento de anúncios do Meta (Facebook Ads).

## Requisitos

- Python 3.12
- Node.js (versão X.X.X)

## Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/meta-ads-dashboard.git
   ```
2. Crie e ative um ambiente virtual:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Instale as dependências do backend:
   ```bash
   pip install -r requirements.txt
   ```
4. Instale as dependências do frontend:
   ```bash
   cd frontend
   npm install
   ```

## Configuração

### Backend

Configure as variáveis de ambiente no arquivo `.env`.

### Frontend

Configure o arquivo `axiosConfig.js` com o endpoint do backend.

## Execução

1. Inicie o servidor backend:
   ```bash
   python app.py
   ```
2. Inicie o servidor frontend:
   ```bash
   cd frontend
   npm start
   ```

## Funcionalidades

- Gerenciamento de Business Managers
- Visualização de métricas de anúncios
- Configurações de conta

## Endpoints

- `DELETE /api/bm-accounts/<string:bm_id>`: Exclui um Business Manager

## Dependências

- Backend:
  - `numpy==1.26.4`
  - `pandas==2.0.3`

- Frontend:
  - React
  - Axios
