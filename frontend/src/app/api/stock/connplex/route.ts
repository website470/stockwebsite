import { NextResponse } from 'next/server';
import axios from 'axios';

// Global variable to store the session cookie to bypass NSE 403
// Note: In serverless environments, this may reset. The retry logic handles it.
let nseCookie = '';

async function fetchNseApi(url: string) {
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
    } catch (error: any) {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
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

export async function GET() {
    try {
        const data = await fetchNseApi('https://www.nseindia.com/api/quote-equity?symbol=CONNPLEX');
        return NextResponse.json(data);
    } catch (err: any) {
        console.error("Error fetching from NSE:", err.message);
        return NextResponse.json(
            { error: 'Failed to fetch from NSE', details: err.message },
            { status: 500 }
        );
    }
}
