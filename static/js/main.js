let revenueChart;

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
            const sourceTable = document.getElementById('sourceTable');
            const revenueChartCanvas = document.getElementById('revenueChart');

            if (kpiClicks) kpiClicks.textContent = data.kpis.clicks || 0;
            if (kpiCost) kpiCost.textContent = data.kpis.cost || 0;
            if (kpiCpc) kpiCpc.textContent = data.kpis.cpc || 0;
            if (kpiImpressions) kpiImpressions.textContent = data.kpis.impressions || 0;
            if (kpiRoas) kpiRoas.textContent = data.kpis.roas || 0;

            if (sourceTable) {
                const rows = sourceTable.getElementsByTagName('tr');
                for (let i = 1; i < rows.length; i++) {
                    sourceTable.deleteRow(1);
                }
                data.sources.forEach(source => {
                    const row = sourceTable.insertRow();
                    row.insertCell(0).textContent = source.source;
                    row.insertCell(1).textContent = Math.round(source.clicks);
                    row.insertCell(2).textContent = source.cost.toFixed(2);
                    row.insertCell(3).textContent = source.cpc.toFixed(3);
                    row.insertCell(4).textContent = Math.round(source.impressions);
                    row.insertCell(5).textContent = source.roas.toFixed(3);
                });
            }

            if (revenueChartCanvas) {
                if (revenueChart) {
                    revenueChart.destroy();
                }
                const revenueCtx = revenueChartCanvas.getContext('2d');
                revenueChart = new Chart(revenueCtx, {
                    type: 'line',
                    data: {
                        labels: data.dates,
                        datasets: [{
                            label: 'Revenue',
                            data: data.revenue,
                            borderColor: '#3498db',
                            fill: false,
                            tension: 0.1
                        }]
                    },
                    options: {
                        scales: {
                            x: { title: { display: true, text: 'Date' } },
                            y: { title: { display: true, text: 'Revenue' } }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('데이터 로드 오류:', error));
}

function applyFilters() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    loadData(startDate, endDate);
}