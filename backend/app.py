from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from facebook_business.api import FacebookAdsApi
from facebook_business.adobjects.adaccount import AdAccount
from facebook_business.adobjects.campaign import Campaign
from facebook_business.adobjects.adsinsights import AdsInsights
import os
import json
import pandas as pd
from datetime import datetime, timedelta
import tempfile
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import jwt
import secrets
from dotenv import load_dotenv
from models import db, BusinessManager, Report, SharedLink
import uuid

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
APP_SECRET = os.environ.get('APP_SECRET', secrets.token_hex(24))
ACCESS_TOKEN = os.environ.get('META_ACCESS_TOKEN')
APP_ID = os.environ.get('META_APP_ID')
APP_SECRET_KEY = os.environ.get('META_APP_SECRET')

# PostgreSQL configuration
DB_URI = f"postgresql://{os.environ.get('POSTGRES_USER')}:{os.environ.get('POSTGRES_PASSWORD')}@{os.environ.get('POSTGRES_HOST')}/{os.environ.get('POSTGRES_DB')}"
app.config['SQLALCHEMY_DATABASE_URI'] = DB_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy with app
db.init_app(app)

# Initialize Meta API
FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, ACCESS_TOKEN)

# Create database tables within the application context
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    """API documentation and information"""
    api_routes = {
        "/api/register-bm": "Register a new Business Manager (POST)",
        "/api/bm-accounts": "Get list of registered Business Managers (GET)",
        "/api/bm-accounts/<string:bm_id>": "Delete a Business Manager account (DELETE)",
        "/api/ad-accounts": "Get list of ad accounts for a Business Manager (GET)",
        "/api/campaigns": "Get campaigns for a specific ad account (GET)",
        "/api/campaign-insights": "Get insights for a specific campaign (GET)",
        "/api/account-insights": "Get insights for a specific ad account (GET)",
        "/api/generate-pdf": "Generate a PDF report (POST)",
        "/api/create-share-link": "Create a shareable link (POST)",
        "/api/validate-share-link": "Validate a share link token (GET)",
        "/api/reports": "Get list of saved reports (GET)",
        "/api/reports/<id>": "Get a specific report by ID (GET)",
        "/api/ads": "Get ads for a specific ad account or campaign (GET)"
    }
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Meta Ads Dashboard API</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #3b5998; }
            h2 { color: #4267B2; margin-top: 30px; }
            .endpoint { background-color: #f0f2f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
            .endpoint-url { font-weight: bold; color: #4267B2; }
            .endpoint-desc { margin-left: 10px; color: #444; }
        </style>
    </head>
    <body>
        <h1>Meta Ads Dashboard API</h1>
        <p>Welcome to the Meta Ads Dashboard API. Use the following endpoints to interact with the service:</p>
        <h2>Available Endpoints</h2>
    """
    
    for route, description in api_routes.items():
        html += f"""
        <div class="endpoint">
            <span class="endpoint-url">{route}</span>
            <span class="endpoint-desc">{description}</span>
        </div>
        """
    
    html += """
    </body>
    </html>
    """
    
    return html

@app.route('/api/register-bm', methods=['POST'])
def register_bm():
    """Register a new Business Manager account"""
    data = request.json
    bm_id = data.get('bm_id')
    access_token = data.get('access_token')
    
    if not bm_id or not access_token:
        return jsonify({'error': 'BM ID and access token are required'}), 400
    
    try:
        # Test the connection
        FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, access_token)
        
        # Check if BM already exists
        existing_bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if existing_bm:
            # Update existing BM
            existing_bm.access_token = access_token
            db.session.commit()
            return jsonify({'success': True, 'message': f'BM {bm_id} updated successfully'})
        
        # Create new BM
        new_bm = BusinessManager(bm_id=bm_id, access_token=access_token)
        db.session.add(new_bm)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'BM {bm_id} registered successfully'})
    except Exception as e:
        print(f"Erro ao registrar BM account: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bm-accounts', methods=['GET'])
def get_bm_accounts():
    """Get list of registered Business Manager accounts"""
    try:
        bm_accounts = BusinessManager.query.all()
        return jsonify({'bm_accounts': [bm.bm_id for bm in bm_accounts]})
    except Exception as e:
        print(f"Erro ao buscar BM accounts: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bm-accounts/<string:bm_id>', methods=['DELETE'])
def delete_bm_account(bm_id):
    """Delete a Business Manager account"""
    try:
        # Retrieve BM from database
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        
        if not bm:
            return jsonify({'error': f'Business Manager with ID {bm_id} not found'}), 404
        
        # Remove the BM from the database
        db.session.delete(bm)
        db.session.commit()
        
        return jsonify({'success': True, 'message': f'Business Manager {bm_id} deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/ad-accounts', methods=['GET'])
def get_ad_accounts():
    """Get list of ad accounts for a specific Business Manager"""
    bm_id = request.args.get('bm_id')
    
    if not bm_id:
        return jsonify({'error': 'Missing BM ID'}), 400
    
    try:
        # Retrieve BM from database
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if not bm:
            return jsonify({'error': 'Invalid BM ID'}), 400
        
        # Set up the API with the specific BM token
        FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, bm.access_token)
        
        # Get ad accounts
        from facebook_business.adobjects.business import Business
        business = Business(bm_id)
        accounts = business.get_owned_ad_accounts(fields=['id', 'name', 'account_status'])
        
        return jsonify({
            'ad_accounts': [{'id': account['id'], 'name': account['name']} for account in accounts]
        })
    except Exception as e:
        print(f"Erro ao buscar anúncios: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/campaigns', methods=['GET'])
def get_campaigns():
    """Get campaigns for a specific ad account"""
    ad_account_id = request.args.get('ad_account_id')
    bm_id = request.args.get('bm_id')
    
    if not ad_account_id:
        return jsonify({'error': 'Ad account ID is required'}), 400
    
    if not bm_id:
        return jsonify({'error': 'Missing BM ID'}), 400
    
    try:
        # Retrieve BM from database
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if not bm:
            return jsonify({'error': 'Invalid BM ID'}), 400
        
        # Set up the API with the specific BM token
        FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, bm.access_token)
        
        # Get campaigns
        ad_account = AdAccount(ad_account_id)
        campaigns = ad_account.get_campaigns(fields=[
            'id', 'name', 'status', 'objective', 'created_time'
        ])
        
        return jsonify({
            'campaigns': [{'id': campaign['id'], 'name': campaign['name'], 
                          'status': campaign['status'], 'objective': campaign.get('objective')} 
                         for campaign in campaigns]
        })
    except Exception as e:
        print(f"Erro ao buscar campaigns: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/campaign-insights', methods=['GET'])
def get_campaign_insights():
    """Get insights for a specific campaign"""
    campaign_id = request.args.get('campaign_id')
    bm_id = request.args.get('bm_id')
    date_preset = request.args.get('date_preset', 'last_7d')
    
    if not campaign_id:
        return jsonify({'error': 'Campaign ID is required'}), 400
    
    if not bm_id:
        return jsonify({'error': 'Missing BM ID'}), 400
    
    try:
        # Retrieve BM from database
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if not bm:
            return jsonify({'error': 'Invalid BM ID'}), 400
        
        # Set up the API with the specific BM token
        FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, bm.access_token)
        
        # Get insights
        campaign = Campaign(campaign_id)
        insights = campaign.get_insights(
            fields=[
                'campaign_name',
                'spend',
                'impressions',
                'clicks',
                'cpc',
                'ctr',
                'reach',
                'frequency',
                'actions',
                'action_values'
            ],
            params={
                'date_preset': date_preset,
                'level': 'campaign'
            }
        )
        
        # Process insights
        processed_insights = []
        for insight in insights:
            insight_data = {
                'campaign_name': insight.get('campaign_name'),
                'spend': insight.get('spend'),
                'impressions': insight.get('impressions'),
                'clicks': insight.get('clicks'),
                'cpc': insight.get('cpc'),
                'ctr': insight.get('ctr'),
                'reach': insight.get('reach'),
                'frequency': insight.get('frequency'),
            }
            
            # Process actions
            if 'actions' in insight:
                for action in insight['actions']:
                    action_type = action.get('action_type')
                    value = action.get('value')
                    insight_data[f"action_{action_type}"] = value
            
            # Process action values
            if 'action_values' in insight:
                for action_value in insight['action_values']:
                    action_type = action_value.get('action_type')
                    value = action_value.get('value')
                    insight_data[f"value_{action_type}"] = value
                    
            processed_insights.append(insight_data)
        
        # Save to database
        report_name = f"Campaign Insights: {processed_insights[0].get('campaign_name', campaign_id)}"
        save_report(report_name, 'campaign', bm_id, campaign_id, date_preset, processed_insights)
        
        return jsonify({'insights': processed_insights})
    except Exception as e:
        print(f"Erro ao buscar campaign insights: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/account-insights', methods=['GET'])
def get_account_insights():
    """Get insights for a specific ad account"""
    ad_account_id = request.args.get('ad_account_id')
    bm_id = request.args.get('bm_id')
    date_preset = request.args.get('date_preset')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    if not ad_account_id:
        return jsonify({'error': 'Ad account ID is required'}), 400
    
    if not bm_id:
        return jsonify({'error': 'Missing BM ID'}), 400
    
    try:
        # Retrieve BM from database
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if not bm:
            return jsonify({'error': 'Invalid BM ID'}), 400
        
        # Set up the API with the specific BM token
        FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, bm.access_token)
        
        # Prepare params based on date selection
        params = {
            'level': 'account',
            'time_increment': 1  # Solicitando breakdown por dia (diário)
        }
        
        # Log date parameters for debugging
        print(f"Date parameters received: preset={date_preset}, start_date={start_date}, end_date={end_date}")
        
        if date_preset and date_preset != 'custom':
            # Use the pre-defined date preset
            params['date_preset'] = date_preset
            print(f"Using date preset: {date_preset}")
        elif start_date and end_date:
            # Use custom date range
            params['time_range'] = json.dumps({
                'since': start_date,
                'until': end_date
            })
            print(f"Using custom date range: {start_date} to {end_date}")
        else:
            # Default to last 7 days if no valid date parameters
            params['date_preset'] = 'last_7d'
            print("No valid date parameters, defaulting to last_7d")
        
        # Modificar para buscar insights no nível de campanhas
        ad_account = AdAccount(ad_account_id)
        # Buscar todas as campanhas da conta primeiro
        campaigns = ad_account.get_campaigns(fields=[
            'id',
            'name',
            'status',
            'objective'
        ])
        
        # Imprimir informações sobre as campanhas encontradas
        print(f"Campanhas encontradas para a conta {ad_account_id}: {len(campaigns)}")
        for i, campaign in enumerate(campaigns):
            if i < 5:  # Limitar a exibição a 5 campanhas
                print(f"Campanha {i+1}: ID={campaign['id']}, Nome={campaign['name']}, Status={campaign.get('status')}")
        
        # Modificar parâmetros para buscar insights no nível de campanha
        params['level'] = 'campaign'
        
        # Adicionar campo de nome de campanha
        insights = ad_account.get_insights(
            fields=[
                'account_id',
                'account_name',
                'campaign_id',
                'campaign_name',  # Adicionado nome da campanha
                'spend',
                'impressions',
                'clicks',
                'cpc',
                'ctr',
                'reach',
                'frequency',
                'actions',
                'action_values',
                'date_start',
                'date_stop'
            ],
            params=params
        )
        
        # Process insights
        processed_insights = []
        for insight in insights:
            insight_data = {
                'account_id': insight.get('account_id'),
                'account_name': insight.get('account_name'),
                'campaign_id': insight.get('campaign_id'),
                'campaign_name': insight.get('campaign_name'),  # Adicionado nome da campanha
                'spend': insight.get('spend'),
                'impressions': insight.get('impressions'),
                'clicks': insight.get('clicks'),
                'cpc': insight.get('cpc'),
                'ctr': insight.get('ctr'),
                'reach': insight.get('reach'),
                'frequency': insight.get('frequency'),
                'date_start': insight.get('date_start'),
                'date_stop': insight.get('date_stop')
            }
            
            # Process actions
            if 'actions' in insight:
                for action in insight['actions']:
                    action_type = action.get('action_type')
                    value = action.get('value')
                    insight_data[f"action_{action_type}"] = value
            
            # Process action values
            if 'action_values' in insight:
                for action_value in insight['action_values']:
                    action_type = action_value.get('action_type')
                    value = action_value.get('value')
                    insight_data[f"value_{action_type}"] = value
                    
            processed_insights.append(insight_data)
            
        # Save to database
        report_name = f"Account Insights: {processed_insights[0].get('account_name', ad_account_id)}"
        save_report(report_name, 'ad_account', bm_id, ad_account_id, date_preset, processed_insights)
        
        return jsonify({'insights': processed_insights})
    except Exception as e:
        print(f"Erro ao buscar account insights: {str(e)}")
        return jsonify({'error': str(e)}), 500

def save_report(name, report_type, bm_id, object_id, date_preset, insights_data):
    """Save report to database"""
    try:
        report = Report(
            report_name=name,
            report_type=report_type,
            bm_id=bm_id,
            object_id=object_id,
            date_preset=date_preset,
            insights_data=insights_data
        )
        db.session.add(report)
        db.session.commit()
        return report
    except Exception as e:
        print(f"Error saving report: {str(e)}")
        db.session.rollback()
        return None

@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    """Generate a PDF report for a specific ad account or campaign"""
    data = request.json
    bm_id = data.get('bm_id')
    ad_account_id = data.get('ad_account_id')
    campaign_id = data.get('campaign_id')
    date_preset = data.get('date_preset', 'last_7d')
    
    if not bm_id:
        return jsonify({'error': 'Missing BM ID'}), 400
    
    if not ad_account_id and not campaign_id:
        return jsonify({'error': 'Either ad account ID or campaign ID is required'}), 400
    
    try:
        # Retrieve BM from database
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if not bm:
            return jsonify({'error': 'Invalid BM ID'}), 400
        
        # Set up the API with the specific BM token
        FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, bm.access_token)
        
        # Get insights data
        if campaign_id:
            campaign = Campaign(campaign_id)
            insights = campaign.get_insights(
                fields=[
                    'campaign_name',
                    'spend',
                    'impressions',
                    'clicks',
                    'cpc',
                    'ctr',
                    'reach',
                    'frequency',
                    'actions',
                ],
                params={
                    'date_preset': date_preset,
                    'level': 'campaign'
                }
            )
            title = f"Campaign Report: {insights[0].get('campaign_name', campaign_id)}"
            
        else:  # ad_account_id
            ad_account = AdAccount(ad_account_id)
            insights = ad_account.get_insights(
                fields=[
                    'account_name',
                    'spend',
                    'impressions',
                    'clicks',
                    'cpc',
                    'ctr',
                    'reach',
                    'frequency',
                    'actions',
                ],
                params={
                    'date_preset': date_preset,
                    'level': 'account'
                }
            )
            title = f"Ad Account Report: {insights[0].get('account_name', ad_account_id)}"
        
        # Process insights for PDF
        insights_data = {}
        for insight in insights:
            for key, value in insight.items():
                if key not in ['actions', 'action_values']:
                    insights_data[key] = value
            
            # Process actions
            if 'actions' in insight:
                for action in insight['actions']:
                    action_type = action.get('action_type')
                    value = action.get('value')
                    insights_data[f"action_{action_type}"] = value
        
        # Create PDF
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        doc = SimpleDocTemplate(temp_file.name, pagesize=letter)
        styles = getSampleStyleSheet()
        
        # Create content
        content = []
        content.append(Paragraph(title, styles['Title']))
        content.append(Paragraph(f"Date Range: {date_preset}", styles['Heading2']))
        
        # Create table with insights data
        table_data = []
        table_data.append(['Metric', 'Value'])
        for key, value in insights_data.items():
            if key not in ['account_name', 'campaign_name']:
                table_data.append([key, str(value)])
        
        table = Table(table_data, colWidths=[300, 200])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        content.append(table)
        doc.build(content)
        
        # Return the PDF file
        return send_file(
            temp_file.name,
            as_attachment=True,
            download_name=f"{title.replace(' ', '_')}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"Erro ao gerar PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/create-share-link', methods=['POST'])
def create_share_link():
    """Create a shareable link for a specific report"""
    data = request.json
    bm_id = data.get('bm_id')
    ad_account_id = data.get('ad_account_id')
    campaign_id = data.get('campaign_id')
    date_preset = data.get('date_preset', 'last_7d')
    expiration = data.get('expiration', 24)  # Hours
    
    if not bm_id:
        return jsonify({'error': 'Missing BM ID'}), 400
    
    if not ad_account_id and not campaign_id:
        return jsonify({'error': 'Either ad account ID or campaign ID is required'}), 400
    
    try:
        # Check if BM exists
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if not bm:
            return jsonify({'error': 'Invalid BM ID'}), 400
        
        # Generate a unique token
        token = str(uuid.uuid4())
        
        # Calculate expiration time
        expires_at = datetime.now() + timedelta(hours=expiration)
        
        # Find existing report
        object_id = campaign_id if campaign_id else ad_account_id
        report_type = 'campaign' if campaign_id else 'ad_account'
        
        report = Report.query.filter_by(
            bm_id=bm_id,
            object_id=object_id,
            report_type=report_type,
            date_preset=date_preset
        ).order_by(Report.created_at.desc()).first()
        
        # Create shared link
        shared_link = SharedLink(
            token=token,
            report_id=report.id if report else None,
            bm_id=bm_id,
            ad_account_id=ad_account_id,
            campaign_id=campaign_id,
            date_preset=date_preset,
            expires_at=expires_at
        )
        
        db.session.add(shared_link)
        db.session.commit()
        
        # Create share link URL
        share_link = f"{request.host_url}share/{token}"
        
        return jsonify({
            'share_link': share_link,
            'expires_in': f"{expiration} hours"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/validate-share-link', methods=['GET'])
def validate_share_link():
    """Validate a share link token"""
    token = request.args.get('token')
    
    if not token:
        return jsonify({'error': 'Token is required'}), 400
    
    try:
        # Look up token in database
        shared_link = SharedLink.query.filter_by(token=token).first()
        
        if not shared_link:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Check if token is expired
        if shared_link.expires_at < datetime.now():
            return jsonify({'error': 'Token has expired'}), 401
        
        return jsonify({
            'valid': True,
            'report_params': {
                'bm_id': shared_link.bm_id,
                'ad_account_id': shared_link.ad_account_id,
                'campaign_id': shared_link.campaign_id,
                'date_preset': shared_link.date_preset
            }
        })
    except Exception as e:
        print(f"Erro ao validar share link: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def get_reports():
    """Get list of saved reports"""
    try:
        reports = Report.query.order_by(Report.created_at.desc()).all()
        return jsonify({
            'reports': [report.to_dict() for report in reports]
        })
    except Exception as e:
        print(f"Erro ao buscar reports: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    """Get a specific report by ID"""
    try:
        report = Report.query.get(report_id)
        if not report:
            return jsonify({'error': 'Report not found'}), 404
        
        return jsonify(report.to_dict())
    except Exception as e:
        print(f"Erro ao buscar report específico: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/ads', methods=['GET'])
def get_ads():
    """Get ads for a specific ad account or campaign"""
    ad_account_id = request.args.get('ad_account_id')
    campaign_id = request.args.get('campaign_id')
    bm_id = request.args.get('bm_id')
    limit = request.args.get('limit', '10')  # Limite padrão de 10 anúncios
    
    if not bm_id:
        return jsonify({'error': 'Missing BM ID'}), 400
    
    if not ad_account_id and not campaign_id:
        return jsonify({'error': 'Either Ad account ID or Campaign ID is required'}), 400
    
    try:
        # Converter limit para inteiro
        limit = int(limit)
        
        # Recuperar BM do banco de dados
        bm = BusinessManager.query.filter_by(bm_id=bm_id).first()
        if not bm:
            return jsonify({'error': 'Invalid BM ID'}), 400
        
        # Configurar a API com o token específico do BM
        FacebookAdsApi.init(APP_ID, APP_SECRET_KEY, bm.access_token)
        
        ads = []
        
        # Importar o que precisamos
        from facebook_business.adobjects.ad import Ad
        from facebook_business.adobjects.adpreview import AdPreview
        
        # Definir parâmetros das requisições - evitar adicionar access_token explicitamente,
        # pois o SDK do Facebook já inclui o token da inicialização
        params = {'limit': limit, 'summary': True}
        fields = ['id', 'name', 'status', 'preview_shareable_link', 'creative']
        
        if ad_account_id:
            # Obter anúncios da conta
            ad_account = AdAccount(ad_account_id)
            ads_data = ad_account.get_ads(
                fields=fields,
                params=params
            )
        elif campaign_id:
            # Obter anúncios da campanha
            campaign = Campaign(campaign_id)
            ads_data = campaign.get_ads(
                fields=fields,
                params=params
            )
        
        # Processar os anúncios e obter prévia
        processed_ads = []
        for ad_data in ads_data:
            ad_info = {
                'id': ad_data.get('id'),
                'name': ad_data.get('name'),
                'status': ad_data.get('status'),
                'preview_link': ad_data.get('preview_shareable_link', '')
            }
            
            # Se não tiver link de prévia, tentar gerar um
            if not ad_info['preview_link']:
                try:
                    ad = Ad(ad_data.get('id'))
                    # Não adicionar access_token explicitamente, SDK já inclui na inicialização
                    preview = ad.get_previews(
                        params={
                            'ad_format': 'DESKTOP_FEED_STANDARD',
                            'full_render': True
                        }
                    )
                    if preview and len(preview) > 0:
                        ad_info['preview_html'] = preview[0].get('body', '')
                except Exception as preview_error:
                    ad_info['preview_error'] = str(preview_error)
            
            processed_ads.append(ad_info)
        
        return jsonify({'ads': processed_ads})
    except Exception as e:
        print(f"Erro ao buscar anúncios: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
