// webInterface.js
class WebInterface {
    static getHomePageHTML() {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Printer Status</title>
                <style>
                    body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 2em; }
                    h1 { color: #333; }
                    p { font-size: 1.1em; }
                    table { border-collapse: collapse; width: 100%; margin-top: 1em; }
                    th, td { border: 1px solid #ccc; padding: 0.5em; text-align: left; }
                    th { background-color: #eee; }
                </style>
            </head>
            <body>
                <h1>🖨️ Printer Watcher</h1>
                <p>Status API available at <code>/status</code></p>
                <p>Printer Status:</p>
                <table id="statusTable">
                    <thead>
                        <tr><th>Field</th><th>Value</th></tr>
                    </thead>
                    <tbody id="statusBody">
                        <tr><td colspan="2">Loading...</td></tr>
                    </tbody>
                </table>

                <script>
                    function fetchStatus() {
                        const baseUrl = window.location.origin;
                        fetch(baseUrl + '/status')
                            .then(response => response.json())
                            .then(data => {
                                const tbody = document.getElementById('statusBody');
                                tbody.innerHTML = '';
                                Object.entries(data).forEach(([key, value]) => {
                                    const row = document.createElement('tr');
                                    const cellKey = document.createElement('td');
                                    const cellVal = document.createElement('td');
                                    cellKey.textContent = key;
                                    cellVal.textContent = value;
                                    row.appendChild(cellKey);
                                    row.appendChild(cellVal);
                                    tbody.appendChild(row);
                                });
                            })
                            .catch(err => {
                                const tbody = document.getElementById('statusBody');
                                tbody.innerHTML = '<tr><td colspan="2">Error fetching status</td></tr>';
                            });
                    }
                    setInterval(fetchStatus, 3000);
                    fetchStatus();
                </script>
            </body>
            </html>
        `;
    }
}

module.exports = WebInterface;
