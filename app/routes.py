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
        kpis['revenue'] = round(df['revenue'].sum(), 2)
        print(f"Rendering with kpis={kpis}, dates={dates}, revenue={revenue}")
        return render_template('index.html', kpis=kpis, dates=dates, revenue=revenue, user_name=session.get('user_name', 'Guest'))

    @app.route('/data')
    def get_data():
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        df, kpis, sources, dates, revenue = load_and_filter_data(start_date, end_date)
        kpis['revenue'] = round(df['revenue'].sum(), 2)

        # 소스별 데이터 집계 (도넛 차트 및 막대 그래프용)
        sources_data = df.groupby('source').agg({
            'clicks': 'sum',
            'cost': 'sum',
            'cpc': 'mean',
            'impressions': 'sum',
            'roas': 'mean',
            'revenue': 'sum'
        }).reset_index()

        # 소스 필터링 (Naver, Criteo, Google, TikTok만 포함)
        valid_sources = ['Naver', 'Criteo', 'Google', 'TikTok']
        sources_data = sources_data[sources_data['source'].isin(valid_sources)]

        # 데이터가 비어 있을 경우 기본 데이터 제공
        if sources_data.empty:
            sources_data = pd.DataFrame([
                {'source': 'Naver', 'clicks': 100, 'cost': 500, 'cpc': 5.0, 'impressions': 1000, 'roas': 2.5, 'revenue': 1250},
                {'source': 'Criteo', 'clicks': 150, 'cost': 600, 'cpc': 4.0, 'impressions': 1200, 'roas': 2.8, 'revenue': 1680},
                {'source': 'Google', 'clicks': 200, 'cost': 700, 'cpc': 3.5, 'impressions': 1500, 'roas': 3.0, 'revenue': 2100},
                {'source': 'TikTok', 'clicks': 120, 'cost': 550, 'cpc': 4.6, 'impressions': 1100, 'roas': 2.7, 'revenue': 1485}
            ])

        # CTR 계산: (클릭 수 / 노출 수) * 100
        sources_data['ctr'] = sources_data.apply(lambda row: (row['clicks'] / row['impressions'] * 100) if row['impressions'] > 0 else 0, axis=1)
        sources_data = sources_data.round(2)

        # 월별 데이터 집계 (시간별 트렌드용)
        df['month'] = pd.to_datetime(df['date']).dt.to_period('M').astype(str)
        time_trend_data = df.groupby(['month', 'source']).agg({
            'clicks': 'sum',
            'impressions': 'sum',
            'roas': 'mean',
            'revenue': 'sum',
            'cpc': 'mean',
            'cost': 'sum'
        }).reset_index()

        # 데이터가 비어 있을 경우 기본 데이터 제공
        if time_trend_data.empty:
            time_trend_data = pd.DataFrame([
                {'month': '2023-01', 'source': 'Criteo', 'clicks': 50, 'impressions': 500, 'roas': 2.1, 'revenue': 1000, 'cpc': 2.5, 'cost': 500},
                {'month': '2023-01', 'source': 'Naver', 'clicks': 60, 'impressions': 600, 'roas': 2.7, 'revenue': 1200, 'cpc': 1.8, 'cost': 600},
                {'month': '2023-02', 'source': 'Criteo', 'clicks': 70, 'impressions': 700, 'roas': 2.2, 'revenue': 1100, 'cpc': 2.4, 'cost': 550},
                {'month': '2023-02', 'source': 'Naver', 'clicks': 80, 'impressions': 800, 'roas': 2.8, 'revenue': 1300, 'cpc': 1.7, 'cost': 650},
                {'month': '2023-01', 'source': 'Google', 'clicks': 90, 'impressions': 900, 'roas': 3.0, 'revenue': 1500, 'cpc': 3.5, 'cost': 700},
                {'month': '2023-02', 'source': 'Google', 'clicks': 100, 'impressions': 1000, 'roas': 3.1, 'revenue': 1600, 'cpc': 3.4, 'cost': 750},
                {'month': '2023-01', 'source': 'TikTok', 'clicks': 40, 'impressions': 400, 'roas': 2.5, 'revenue': 900, 'cpc': 4.6, 'cost': 450},
                {'month': '2023-02', 'source': 'TikTok', 'clicks': 50, 'impressions': 500, 'roas': 2.6, 'revenue': 950, 'cpc': 4.5, 'cost': 500}
            ])

        # 디버깅: 소스 데이터 출력
        print(f"Sources Data: {sources_data.to_dict(orient='records')}")
        print(f"Time Trend Data: {time_trend_data.to_dict(orient='records')}")

        data = {
            'dates': dates,
            'revenue': revenue,
            'kpis': kpis,
            'sources_data': sources_data.to_dict(orient='records') if not sources_data.empty else [],
            'time_trend_data': time_trend_data.to_dict(orient='records') if not time_trend_data.empty else []
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
        return render_template('register.html')