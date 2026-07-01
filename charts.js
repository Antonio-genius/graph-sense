// Charting functions
function renderGraph(element, data, isPie) {
    element.innerHTML = '<canvas style="max-width: 100%; max-height: 100%; width: 100%; height: 100%;"></canvas>';
    var canvas = element.querySelector('canvas');
    var chartType = isPie ? 'pie' : (data.isQuantitative ? 'line' : 'bar');

    // Pull accent colors from CSS variables for theme consistency
    var bodyStyle = getComputedStyle(document.body);
    var accent = bodyStyle.getPropertyValue('--accent').trim() || '#d4894a';
    var accentSoft = bodyStyle.getPropertyValue('--accent-soft').trim() || '#e0a570';
    var chartText = bodyStyle.getPropertyValue('--chart-text').trim() || '#3a3226';

    // Dataset colors: orange for bars, accent-soft for lines, default palette for pies
    var datasetConfig = {
        data: data.data,
        borderWidth: 1
    };
    if (chartType === 'bar') {
        datasetConfig.backgroundColor = accent;
        datasetConfig.borderColor = accent;
    } else if (chartType === 'line') {
        datasetConfig.borderColor = accentSoft;
        datasetConfig.pointBackgroundColor = accentSoft;
        datasetConfig.fill = false;
        datasetConfig.tension = 0.15;
    }

    new Chart(canvas, {
        type: chartType,
        data: {
            labels: data.labels,
            datasets: [datasetConfig]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: isPie ? 1 : 0.6,
            plugins: {
                legend: { 
                    display: isPie,
                    position: 'right',
                    labels: {
                        font: { size: 12 },
                        padding: 8,
                        boxWidth: 15,
                        boxHeight: 15,
                        color: chartText
                    }
                },
                tooltip: { enabled: false },
                title: { display: false }
            },
            scales: isPie ? {} : {
                x: {
                    ticks: { display: false, maxTicksLimit: 3 },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { display: false, maxTicksLimit: 3 },
                    grid: { display: false }
                }
            },
            layout: {
                padding: {
                    top: 5,
                    bottom: 5,
                    left: 5,
                    right: 5
                }
            }
        }
    });
}

function renderTable(element, data) {
    var tableHtml = '<table><thead><tr>';
    if (data.isQuantitative) {
        tableHtml += '<th>X</th>';
    } else {
        tableHtml += '<th>Category</th>';
    }
    tableHtml += '<th>Y</th></tr></thead><tbody>';

    for (var i = 0; i < data.labels.length; i++) {
        tableHtml += '<tr><td>' + data.labels[i] + '</td><td>' + data.data[i].toFixed(2) + '</td></tr>';
    }

    tableHtml += '</tbody></table>';
    element.innerHTML = tableHtml;
}