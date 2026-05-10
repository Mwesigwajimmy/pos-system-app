const BASE_URL = process.env.PESAPAL_BASE_URL;

export async function getPesaPalToken() {
    const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            consumer_key: process.env.PESAPAL_CONSUMER_KEY,
            consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
        })
    });
    const data = await res.json();
    return data.token;
}

export async function registerIPN(token: string) {
    const res = await fetch(`${BASE_URL}/api/URLSetup/RegisterIPN`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: `https://www.bbu1.com/api/payments/pesapal/ipn`,
            ipn_notification_type: 'GET'
        })
    });
    const data = await res.json();
    return data.ipn_id;
}