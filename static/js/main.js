let donutChart, barChart, timeTrendChart;

// 숫자 포맷팅 함수: 쉼표 추가 및 K/M 단위 적용, CPC는 % 단위
function formatNumber(num, isCpc = false) {
    if (isCpc) {
        return num.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    } else {
        return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('kpiClicks')) {
        loadData();
        setInterval(() => {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            loadData(startDate, endDate);
        }, 30000);
    }
});

// 도넛 차트 중앙에 텍스트 추가 플러그인
const centerTextPlugin = {
    id: 'centerText',
    beforeDraw(chart) {
        const ctx = chart.ctx;
        const chartArea = chart.chartArea;
        const width = chart.width;
        const height = chart.height;

        // 차트의 실제 중앙 계산
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;

        ctx.restore();
        ctx.font = 'bold 20px Arial';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#3498db';
        ctx.fillText('SELLIER', centerX, centerY);
        ctx.save();
    }
};

// 도넛 차트 업데이트 함수
function updateDonutChart() {
    const metric = document.getElementById('metricFilter').value;
    const isCpc = metric === 'cpc';

    fetch('/data')
        .then(response => response.json())
        .then(data => {
            const sourcesData = data.sources_data;
            if (!sourcesData || sourcesData.length === 0) {
                console.error('No sources data available for donut chart');
                return;
            }

            const labels = sourcesData.map(item => item.source);
            const values = sourcesData.map(item => item[metric] || 0);
            const total = values.reduce((sum, val) => sum + val, 0);
            const percentages = values.map(val => total > 0 ? (val / total * 100).toFixed(1) : 0);

            // 디버깅: 비율 로그 출력
            console.log('Labels:', labels);
            console.log('Values:', values);
            console.log('Percentages:', percentages);

            // 소스별 색상 설정
            const colors = labels.map(label => {
                switch (label.toLowerCase()) {
                    case 'criteo':
                        return '#FF6200';
                    case 'google':
                        return '#4285F4';
                    case 'naver':
                        return '#03C75A';
                    case 'tiktok':
                        return '#00F7F7';
                    default:
                        return '#CCCCCC';
                }
            });

            if (donutChart) {
                donutChart.destroy();
            }

            const donutCtx = document.getElementById('donutChart').getContext('2d');
            if (!donutCtx) {
                console.error('Donut chart canvas not found');
                return;
            }

            donutChart = new Chart(donutCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false // 기본 범례 비활성화
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 12 },
                            padding: 10,
                            cornerRadius: 5,
                            caretSize: 5,
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${formatNumber(value, isCpc)}`;
                                }
                            }
                        },
                        datalabels: {
                            display: true,
                            color: '#000000',
                            font: {
                                size: 14,
                                weight: 'bold'
                            },
                            formatter: (value, context) => {
                                const total = context.chart.data.datasets[0].data.reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
                                return `${percentage}%`;
                            },
                            anchor: 'center',
                            align: 'center',
                            offset: 0,
                            clamp: false,
                            clip: false
                        }
                    },
                    cutout: '50%'
                },
                plugins: [centerTextPlugin, ChartDataLabels]
            });

            // 커스텀 범례 생성 (비율 제거, 소스 이름만 표시)
            const legendContainer = document.getElementById('legendContainer');
            legendContainer.innerHTML = '';
            labels.forEach((label, index) => {
                const legendItem = document.createElement('div');
                legendItem.style.display = 'flex';
                legendItem.style.alignItems = 'center';
                legendItem.style.marginRight = '20px';

                const colorBox = document.createElement('span');
                colorBox.style.width = '20px';
                colorBox.style.height = '20px';
                colorBox.style.backgroundColor = colors[index];
                colorBox.style.display = 'inline-block';
                colorBox.style.marginRight = '10px';

                const labelText = document.createElement('span');
                labelText.textContent = label; // 비율 제거, 소스 이름만 표시

                legendItem.appendChild(colorBox);
                legendItem.appendChild(labelText);
                legendContainer.appendChild(legendItem);
            });
        })
        .catch(error => console.error('도넛 차트 로드 오류:', error));
}

// 막대 그래프 업데이트 함수
function updateBarChart() {
    fetch('/data')
        .then(response => response.json())
        .then(data => {
            const sourcesData = data.sources_data;
            if (!sourcesData || sourcesData.length === 0) {
                console.error('No sources data available for bar chart');
                return;
            }

            // 소스 필터링
            const sourceCheckboxes = document.querySelectorAll('input[name="source"]:checked');
            const selectedSources = Array.from(sourceCheckboxes).map(checkbox => checkbox.value);
            const filteredData = sourcesData.filter(item => selectedSources.includes(item.source));

            if (filteredData.length === 0) {
                console.error('No data available for selected sources');
                if (barChart) {
                    barChart.destroy();
                    barChart = null;
                }
                return;
            }

            // 값 필터링
            const valueCheckboxes = document.querySelectorAll('input[name="value"]:checked');
            const selectedValues = Array.from(valueCheckboxes).map(checkbox => checkbox.value);

            if (selectedValues.length === 0) {
                console.error('No metrics selected for bar chart');
                if (barChart) {
                    barChart.destroy();
                    barChart = null;
                }
                return;
            }

            const labels = filteredData.map(item => item.source);
            const datasets = [];

            const valueColors = {
                'ctr': '#FF6F61', // Coral
                'cpc': '#6B5B95', // Purple
                'roas': '#88B04B', // Green
                'cost': '#F7CAC9', // Light Pink
                'clicks': '#92A8D1', // Light Blue
                'impressions': '#F4A261', // Orange
                'revenue': '#B565A7' // Magenta
            };

            selectedValues.forEach(value => {
                datasets.push({
                    label: value.toUpperCase() + (value === 'ctr' || value === 'cpc' ? ' (%)' : ''),
                    data: filteredData.map(item => item[value]),
                    backgroundColor: valueColors[value],
                    borderWidth: 1
                });
            });

            if (barChart) {
                barChart.destroy();
            }

            const barCtx = document.getElementById('barChart').getContext('2d');
            if (!barCtx) {
                console.error('Bar chart canvas not found');
                return;
            }

            barChart = new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Source',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Value',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            },
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatNumber(value, false); // Y축 레이블에 K/M 단위 적용
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: '#fff',
                            titleColor: '#2c3e50',
                            bodyColor: '#2c3e50',
                            borderColor: '#3498db',
                            borderWidth: 1,
                            cornerRadius: 5,
                            padding: 10,
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${formatNumber(value, label.includes('CPC'))}`;
                                }
                            }
                        }
                    },
                    animation: {
                        duration: 1000, // 애니메이션 지속 시간 (1초)
                        easing: 'easeOutQuart' // 부드러운 easing 함수
                    }
                }
            });
        })
        .catch(error => console.error('막대 그래프 로드 오류:', error));
}

// 시간별 트렌드 선 그래프 업데이트 함수
function updateTimeTrendChart() {
    const metric = document.getElementById('timeTrendFilter').value;
    const isCpc = metric === 'cpc';

    fetch('/data')
        .then(response => response.json())
        .then(data => {
            const timeTrendData = data.time_trend_data;
            if (!timeTrendData || timeTrendData.length === 0) {
                console.error('No time trend data available for line chart');
                return;
            }

            // 월별 데이터 정렬
            const months = [...new Set(timeTrendData.map(item => item.month))].sort();
            const sources = ['Criteo', 'Naver', 'Google', 'TikTok'];

            // 소스별 색상 설정 (소스별 비중과 동일)
            const sourceColors = {
                'Criteo': '#FF6200',
                'Naver': '#03C75A',
                'Google': '#4285F4',
                'TikTok': '#00F7F7'
            };

            const datasets = sources.map(source => {
                const sourceData = timeTrendData.filter(item => item.source === source);
                const data = months.map(month => {
                    const entry = sourceData.find(d => d.month === month);
                    return entry ? entry[metric] : 0;
                });

                return {
                    label: source,
                    data: data,
                    borderColor: sourceColors[source],
                    backgroundColor: sourceColors[source],
                    fill: false,
                    tension: 0.1
                };
            });

            if (timeTrendChart) {
                timeTrendChart.destroy();
            }

            const timeTrendCtx = document.getElementById('timeTrendChart').getContext('2d');
            if (!timeTrendCtx) {
                console.error('Time trend chart canvas not found');
                return;
            }

            timeTrendChart = new Chart(timeTrendCtx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Month',
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: metric.toUpperCase() + (metric === 'ctr' || metric === 'cpc' ? ' (%)' : ''),
                                font: {
                                    size: 14,
                                    weight: 'bold'
                                }
                            },
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return formatNumber(value, isCpc);
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: '#fff',
                            titleColor: '#2c3e50',
                            bodyColor: '#2c3e50',
                            borderColor: '#3498db',
                            borderWidth: 1,
                            cornerRadius: 5,
                            padding: 10,
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: ${formatNumber(value, isCpc)}`;
                                }
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error('시간별 트렌드 차트 로드 오류:', error));
}

function loadData(startDate = '', endDate = '') {
    const url = `/data?start_date=${startDate}&end_date=${endDate}`;
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const kpiClicks = document.getElementById('kpiClicks');
            const kpiCost = document.getElementById('kpiCost');
            const kpiCpc = document.getElementById('kpiCpc');
            const kpiImpressions = document.getElementById('kpiImpressions');
            const kpiRoas = document.getElementById('kpiRoas');
            const kpiRevenue = document.getElementById('kpiRevenue');

            if (kpiClicks) kpiClicks.textContent = formatNumber(data.kpis.clicks || 0);
            if (kpiCost) kpiCost.textContent = formatNumber(data.kpis.cost || 0);
            if (kpiCpc) kpiCpc.textContent = formatNumber(data.kpis.cpc || 0, true);
            if (kpiImpressions) kpiImpressions.textContent = formatNumber(data.kpis.impressions || 0);
            if (kpiRoas) kpiRoas.textContent = formatNumber(data.kpis.roas || 0);
            if (kpiRevenue) kpiRevenue.textContent = formatNumber(data.kpis.revenue || 0);

            // 도넛 차트, 막대 그래프, 시간별 트렌드 차트 초기화
            updateDonutChart();
            updateBarChart();
            updateTimeTrendChart();
        })
        .catch(error => console.error('데이터 로드 오류:', error));
}

function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    loadData(startDate, endDate);
}