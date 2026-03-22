document.addEventListener('DOMContentLoaded', () => {
    // Theme setup
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const htmlElement = document.documentElement;
    
    // Default to dark mode is checked by HTML class, set it explicitly
    let isDark = htmlElement.classList.contains('dark');
    
    themeToggle.addEventListener('click', () => {
        isDark = !isDark;
        if(isDark) {
            htmlElement.classList.add('dark');
            themeIcon.setAttribute('data-lucide', 'sun');
        } else {
            htmlElement.classList.remove('dark');
            themeIcon.setAttribute('data-lucide', 'moon');
        }
        lucide.createIcons();
        if(window.myChart) {
            updateChartTheme();
        }
    });

    const refreshBtn = document.getElementById('refreshBtn');
    const rewardIcon = document.getElementById('refreshIcon');
    const predictionDays = document.getElementById('predictionDays');
    
    // Filters logic
    let currentPeriod = '7 dias'; 
    let currentStartDate = '';
    let currentEndDate = '';


    // Initialize Flatpickr for Calendar filtering (new feature)
    const fp = flatpickr("#customDateRange", {
        mode: "range",
        dateFormat: "d/m/Y",
        locale: "pt",
        onClose: function(selectedDates) {
            if(selectedDates.length === 2) {
                const start = fp.formatDate(selectedDates[0], "d/m/Y");
                const end = fp.formatDate(selectedDates[1], "d/m/Y");
                
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                document.getElementById('customDateRange').classList.add('active-filter');
                
                currentPeriod = 'Personalizado';
                currentStartDate = start;
                currentEndDate = end;
                loadData();
            }
        }
    });

    const filterBtns = document.querySelectorAll('.filter-btn');
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            document.getElementById('customDateRange').classList.remove('active-filter'); 
            e.currentTarget.classList.add('active'); 
            
            // clear calendar visually
            fp.clear();
            
            const period = e.currentTarget.getAttribute('data-period'); 
            currentPeriod = period;
            currentStartDate = '';
            currentEndDate = '';
            loadData();
        });
    });


    // Prediction Days Dropdown (new feature)
    document.getElementById('predictionDays').addEventListener('change', () => {
        // Redraw predictability chart without re-fetching
        if (window.lastPredictabilityData) {
            renderChart(window.lastPredictabilityData.history, window.lastPredictabilityData.predictions);
        }
    });

    // Chart Instance
    window.myChart = null;

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const animateValue = (obj, start, end, duration) => {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = formatCurrency(progress * (end - start) + start);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    }

    const loadData = async () => {
        const loader = document.getElementById('loader');
        const dashboard = document.getElementById('dashboard');
        
        loader.classList.remove('hidden');
        dashboard.classList.add('hidden');
        rewardIcon.classList.add('spin');

        const days = predictionDays.value;

        try {
            let url = `/api/predict?days=${days}&period=${encodeURIComponent(currentPeriod)}`;
            if (currentStartDate && currentEndDate) {
                url += `&start=${currentStartDate}&end=${currentEndDate}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success) {
                updateDashboard(data);
            } else {
                alert('Erro ao processar dados corporativos: ' + (data.details || data.error));
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Falha na comunicação com o servidor. O robô demorou a responder ou o site instabilizou.');
        } finally {
            rewardIcon.classList.remove('spin');
            loader.classList.add('hidden');
            dashboard.classList.remove('hidden');
        }
    };

    const updateDashboard = (data) => {
        const { currentMetrics, history, predictions, topProducts } = data;
        
        // Update DOM elements with animation
        animateValue(document.getElementById('valFaturamento'), 0, currentMetrics.faturamento, 1000);
        animateValue(document.getElementById('valLucro'), 0, currentMetrics.lucro, 1000);
        animateValue(document.getElementById('valPrevisto'), 0, predictions.summary.totalFaturamentoPrevisto, 1000);
        animateValue(document.getElementById('valLucroPrevisto'), 0, predictions.summary.totalLucroPrevisto, 1000);

        const valGrowth = document.getElementById('valGrowth');
        valGrowth.innerHTML = `+${predictions.summary.crescimentoMedioDiario > 0 ? formatCurrency(predictions.summary.crescimentoMedioDiario) : '0,00'} Crescimento Médio Diário`;

        renderChart(history, predictions.dailyPredictions);
        renderTopProducts(topProducts);
    };

    const renderTopProducts = (products) => {
        const list = document.getElementById('topProductsList');
        list.innerHTML = '';
        if (!products || products.length === 0) {
            list.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Nenhum produto extraído neste período.</p>';
            return;
        }
        
        products.forEach(p => {
            const li = document.createElement('li');
            li.className = 'product-item';
            li.innerHTML = `
                <span class="product-name">${p.name}</span>
                <span class="product-percent">${p.percent}</span>
            `;
            list.appendChild(li);
        });
    };

    const getColors = () => {
        const isDark = document.documentElement.classList.contains('dark');
        return {
            textColor: isDark ? '#f5f5f7' : '#1d1d1f',
            gridColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            faturamentoHistoryRow: '#34c759', // Green
            lucroRow: '#af52de', // Purple
            predictedBgFill: isDark ? 'rgba(0, 198, 255, 0.2)' : 'rgba(0, 198, 255, 0.1)',
            predictedBorder: '#00C6FF',
        };
    }

    const renderChart = (history, predictions) => {
        const ctx = document.getElementById('mainChart').getContext('2d');
        const colors = getColors();

        const labels = [...history.map(d => d.date), ...predictions.map(d => d.date)];
        const faturamentoData = [...history.map(d => d.faturamento), ...Array(predictions.length).fill(null)];
        const previsaoData = [...Array(history.length).fill(null), ...predictions.map(d => d.faturamento_previsto)];

        // Tie the history tail and prediction head to maintain continuous line visually
        if(history.length > 0 && predictions.length > 0) {
            previsaoData[history.length - 1] = history[history.length - 1].faturamento;
        }

        if (window.myChart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Faturamento Histórico',
                        data: faturamentoData,
                        borderColor: colors.faturamentoHistoryRow,
                        backgroundColor: colors.faturamentoHistoryRow,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        tension: 0.4
                    },
                    {
                        label: 'Previsão Preditiva (Regressão)',
                        data: previsaoData,
                        borderColor: colors.predictedBorder,
                        backgroundColor: colors.predictedBgFill,
                        borderWidth: 3,
                        borderDash: [5, 5],
                        fill: true,
                        pointRadius: Object.keys(previsaoData).map(k => typeof previsaoData[k] === 'number' && previsaoData[k] !== null && k == labels.length - 1 ? 4 : 0),
                        pointHoverRadius: 6,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.textColor,
                            font: { family: 'Inter', weight: 500 }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { family: 'Inter', size: 14 },
                        bodyFont: { family: 'Inter', size: 13 },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'transparent', drawBorder: false },
                        ticks: { color: colors.textColor, maxTicksLimit: 10, font: {family: 'Inter'} }
                    },
                    y: {
                        grid: { color: colors.gridColor, borderDash: [5, 5], drawBorder: false },
                        ticks: { 
                            color: colors.textColor,
                            font: {family: 'Inter'},
                            callback: function(value) {
                                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumSignificantDigits: 3 }).format(value);
                            }
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    };

    const updateChartTheme = () => {
        if (!window.myChart) return;
        const colors = getColors();
        window.myChart.options.plugins.legend.labels.color = colors.textColor;
        window.myChart.options.scales.x.ticks.color = colors.textColor;
        window.myChart.options.scales.y.ticks.color = colors.textColor;
        window.myChart.options.scales.y.grid.color = colors.gridColor;
        window.myChart.data.datasets[1].backgroundColor = colors.predictedBgFill;
        window.myChart.update();
    };

    refreshBtn.addEventListener('click', loadData);
    predictionDays.addEventListener('change', loadData);

    // Initial load
    loadData();
});
