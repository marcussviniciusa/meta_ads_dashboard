from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class BusinessManager(db.Model):
    __tablename__ = 'business_managers'
    
    id = db.Column(db.Integer, primary_key=True)
    bm_id = db.Column(db.String(100), unique=True, nullable=False)
    access_token = db.Column(db.Text, nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<BusinessManager {self.bm_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'bm_id': self.bm_id,
            'added_at': self.added_at.isoformat()
        }

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.Integer, primary_key=True)
    report_name = db.Column(db.String(255), nullable=False)
    report_type = db.Column(db.String(50), nullable=False)  # 'campaign', 'ad_account'
    bm_id = db.Column(db.String(100), nullable=False)
    object_id = db.Column(db.String(100), nullable=False)  # campaign_id or ad_account_id
    date_preset = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    insights_data = db.Column(db.JSON, nullable=True)
    
    def __repr__(self):
        return f'<Report {self.report_name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'report_name': self.report_name,
            'report_type': self.report_type,
            'bm_id': self.bm_id,
            'object_id': self.object_id,
            'date_preset': self.date_preset,
            'created_at': self.created_at.isoformat(),
            'insights_data': self.insights_data
        }

class SharedLink(db.Model):
    __tablename__ = 'shared_links'
    
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(255), unique=True, nullable=False)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id'), nullable=True)
    bm_id = db.Column(db.String(100), nullable=False)
    ad_account_id = db.Column(db.String(100), nullable=True)
    campaign_id = db.Column(db.String(100), nullable=True)
    date_preset = db.Column(db.String(50), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    report = db.relationship('Report', backref=db.backref('shared_links', lazy=True))
    
    def __repr__(self):
        return f'<SharedLink {self.token[:10]}...>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'token': self.token,
            'bm_id': self.bm_id,
            'ad_account_id': self.ad_account_id,
            'campaign_id': self.campaign_id,
            'date_preset': self.date_preset,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }
