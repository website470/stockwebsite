const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());

// Serve the compiled frontend out folder
app.use(express.static(path.join(__dirname, '../frontend/out')));

// Global variable to store the session cookie to bypass NSE 403
let nseCookie = '';

async function fetchNseApi(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': nseCookie,
                'Accept': '*/*, application/json',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000
        });
        return response.data;
    } catch (error) {
        if (error.response && error.response.status === 401) {
            // Update cookie if unauthorized, fetch base page
            const baseRes = await axios.get('https://www.nseindia.com/', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Accept': "text/html,application/xhtml+xml,application/xml"
                }
            });
            if (baseRes.headers['set-cookie']) {
                nseCookie = baseRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            }
            // Retry the original request
            const retryResp = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Cookie': nseCookie,
                    'Accept': '*/*, application/json'
                }
            });
            return retryResp.data;
        }
        throw error;
    }
}

app.get('/api/stock/connplex', async (req, res) => {
    try {
        const data = await fetchNseApi('https://www.nseindia.com/api/quote-equity?symbol=CONNPLEX');
        res.json(data);
    } catch (err) {
        console.error("Error fetching from NSE:", err.message);
        res.status(500).json({ error: 'Failed to fetch from NSE', details: err.message });
    }
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend working 🚀" });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Backend API live at http://localhost:${PORT}`);
});
