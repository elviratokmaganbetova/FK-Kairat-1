import { Chart, registerables } from 'chart.js'; 

// Register all the components needed
Chart.register(...registerables);

// Store chart instances to destroy them when needed
const chartInstances = {};

// Function to render finance charts
export function renderFinanceCharts() {
    // Dashboard finance chart
    const dashboardFinanceCtx = document.getElementById('dashboard-finance-chart'); 
    if (dashboardFinanceCtx) {
        // Destroy existing chart if it exists
        if (chartInstances['dashboard-finance-chart']) {
            chartInstances['dashboard-finance-chart'].destroy();
        }

        chartInstances['dashboard-finance-chart'] = new Chart(dashboardFinanceCtx, {
            type: 'bar',
            data: {
                labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн'], 
                datasets: [
                    {
                        label: 'Доходы',
                        data: [150000, 180000, 120000, 200000, 170000, 220000],
                        backgroundColor: '#28a745',
                        borderColor: '#28a745',
                        borderWidth: 1
                    },
                    {
                        label: 'Расходы',
                        data: [120000, 150000, 140000, 130000, 160000, 180000],
                        backgroundColor: '#dc3545',
                        borderColor: '#dc3545',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Евро (€)'
                        }
                    }
                }
            }
        });
    }

    // Budget distribution chart in Finance View
    const budgetChartCtx = document.getElementById('budget-chart');
    if (budgetChartCtx) {
        // Destroy existing chart if it exists
        if (chartInstances['budget-distribution-chart']) {
            chartInstances['budget-distribution-chart'].destroy();
        }

        chartInstances['budget-distribution-chart'] = new Chart(budgetChartCtx, {
            type: 'doughnut',
            data: {
                labels: ['Зарплаты персонала', 'Скаутинг', 'Инфраструктура', 'Турниры и сборы', 'Медицина'],
                datasets: [{
                    data: [35, 15, 30, 10, 10], 
                    backgroundColor: [
                        '#0055A4',
                        '#28a745',
                        '#FFCC00',
                        '#17a2b8',
                        '#dc3545'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    // Financial reports chart in Finance View
    const financialReportChartCtx = document.getElementById('financial-report-chart'); 
    if (financialReportChartCtx) { 
        // Destroy existing chart if it exists
        if (chartInstances['financial-report-chart']) {
            chartInstances['financial-report-chart'].destroy();
        }

        chartInstances['financial-report-chart'] = new Chart(financialReportChartCtx, {
            type: 'line',
            data: {
                labels: ['2018', '2019', '2020', '2021', '2022', '2023'], 
                datasets: [
                    {
                        label: 'Расходы на академию',
                        data: [1800000, 2000000, 2200000, 2300000, 2400000, 2500000],
                        borderColor: '#0055A4',
                        backgroundColor: 'rgba(0, 85, 164, 0.1)',
                        fill: true
                    },
                    {
                        label: 'Доходы от продажи игроков',
                        data: [500000, 800000, 1200000, 900000, 1500000, 1800000],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        fill: true
                    }
                    // TODO: Add more datasets based on selected tab (income, expenses, roi)
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Евро (€)'
                        }
                    }
                }
            }
        });
    }
}

// Function to update the budget distribution chart data
export function updateBudgetChartData(newData) {
    const budgetChart = chartInstances['budget-distribution-chart']; 
    if (budgetChart) {
        budgetChart.data.datasets[0].data = newData;
        budgetChart.update();
    } else {
        console.warn("Budget distribution chart instance not found for update.");
    }
}