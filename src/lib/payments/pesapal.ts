const BASE_URL = process.env.PESAPAL_BASE_URL;

/**
 * GET ACCESS TOKEN
 * Authenticates with PesaPal using Consumer Key & Secret
 */
export async function getPesaPalToken() {
    try {
        const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                consumer_key: process.env.PESAPAL_CONSUMER_KEY,
                consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
            }),
            cache: 'no-store' // Ensure we always get a fresh token
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(`PesaPal Auth Error: ${data.error?.message || res.statusText}`);
        }

        return data.token;
    } catch (error) {
        console.error("PESAPAL_AUTH_FAILURE:", error);
        throw error;
    }
}

/**
 * REGISTER IPN
 * Tells PesaPal where to send the "Success" notification
 */
export async function registerIPN(token: string) {
    try {
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

        if (!res.ok) {
            throw new Error(`PesaPal IPN Error: ${data.error?.message || res.statusText}`);
        }

        // Return the specific ID PesaPal assigned to this listener
        return data.ipn_id;
    } catch (error) {
        console.error("PESAPAL_IPN_REGISTRATION_FAILURE:", error);
        throw error;
    }
}