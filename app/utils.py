import pandas as pd

def load_and_filter_data(start_date=None, end_date=None):
    try:
        df = pd.read_csv('data/campaign_data.csv')
        print("Loaded DataFrame:", df.head())  # 디버깅용 출력
        df['date'] = pd.to_datetime(df['date'])
        if start_date and end_date:
            df = df[(df['date'] >= start_date) & (df['date'] <= end_date)]

        kpis = {
            'clicks': int(df['clicks'].sum()),
            'cost': round(df['cost'].sum(), 2),
            'cpc': round(df['cpc'].mean(), 3) if df['cpc'].notna().any() else 0,
            'impressions': int(df['impressions'].sum()),
            'roas': round(df['roas'].mean(), 3) if df['roas'].notna().any() else 0
        }

        sources = df.groupby('source').agg({
            'clicks': 'sum',
            'cost': 'sum',
            'cpc': 'mean',
            'impressions': 'sum',
            'roas': 'mean'
        }).reset_index()
        print("Grouped Sources:", sources)  # 디버깅용 출력

        dates = df['date'].dt.strftime('%Y-%m-%d').tolist()
        revenue = df['revenue'].tolist()

        return df, kpis, sources, dates, revenue
    except Exception as e:
        print(f"데이터 처리 오류: {e}")
        return pd.DataFrame(), {}, pd.DataFrame(), [], []