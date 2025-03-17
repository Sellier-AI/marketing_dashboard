from flask import Flask, session
import os
import sys

# config 모듈 직접 임포트
try:
    from config import Config
except ImportError as e:
    print(f"Failed to import config: {e}")
    Config = type('Config', (), {'DEBUG': True, 'DATA_PATH': 'data/campaign_data.csv'})  # 임시 fallback

def create_app():
    print("sys.path:", sys.path)

    base_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(base_dir, '..', 'templates')
    static_path = os.path.join(base_dir, '..', 'static')

    app = Flask(__name__, template_folder=template_path, static_folder=static_path)
    app.config.from_object(Config)
    app.secret_key = 'your_secret_key'  # 세션 암호화용 키 (테스트용, 실제로는 안전한 키 사용)

    print(f"Config loaded successfully. DATA_PATH: {app.config['DATA_PATH']}")
    print("Template folder:", app.template_folder)
    print("Static folder:", app.static_folder)
    print("Available templates:", app.jinja_env.list_templates())

    from .routes import init_routes
    init_routes(app)

    return app