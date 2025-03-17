from flask import render_template, jsonify, request, redirect, url_for, session
import pandas as pd
from .utils import load_and_filter_data

def init_routes(app):
    @app.route('/')
    def index():
        if not session.get('logged_in') and not request.headers.get('X-Replit-User-Id'):
            return redirect(url_for('login'))
        user_id = request.headers.get('X-Replit-User-Id')
        user_name = request.headers.get('X-Replit-User-Name')
        if user_id:
            session['logged_in'] = True
            session['user_name'] = user_name
        df, kpis, sources, dates, revenue = load_and_filter_data()
        print(f"Rendering with kpis={kpis}, sources={sources}, dates={dates}, revenue={revenue}")
        return render_template('index.html', kpis=kpis, sources=sources if not sources.empty else [], dates=dates, revenue=revenue, user_name=session.get('user_name', 'Guest'))

    @app.route('/data')
    def get_data():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        df, kpis, sources, dates, revenue = load_and_filter_data(start_date, end_date)
        data = {
            'dates': dates,
            'revenue': revenue,
            'kpis': kpis,
            'sources': sources.to_dict(orient='records') if not sources.empty else []
        }
        return jsonify(data)

    @app.route('/login', methods=['GET', 'POST'])
    def login():
        if request.method == 'POST':
            email = request.form['email']
            password = request.form['password']
            if email == "test@example.com" and password == "password":
                session['logged_in'] = True
                session['user_name'] = 'Test User'
                return redirect(url_for('index'))
            else:
                return render_template('login.html', error="잘못된 로그인 정보입니다.")
        return render_template('login.html')

    @app.route('/logout')
    def logout():
        session.pop('logged_in', None)
        session.pop('user_name', None)
        return redirect(url_for('login'))

    @app.route('/register')
    def register():
        return render_template('register.html')  # 더미 페이지, 필요 시 구현