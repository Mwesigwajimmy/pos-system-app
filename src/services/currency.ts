// src/services/currency.ts
import { createClient } from '@/lib/supabase/client';
import { Currency, ExchangeRate, TExchangeRateSchema } from '@/types/currency';

const supabase = createClient();

/**
 * Fetches all exchange rates from the database.
 * @returns A promise that resolves to an array of exchange rates.
 */
export async function fetchExchangeRates(): Promise<ExchangeRate[]> {
    const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .order('effective_date', { ascending: false });

    if (error) {
        console.error('Error fetching exchange rates:', error.message);
        throw new Error('Could not fetch exchange rates.');
    }
    return data;
}

/**
 * Fetches all available currencies.
 * @returns A promise that resolves to an array of currencies.
 */
export async function fetchCurrencies(): Promise<Currency[]> {
    const { data, error } = await supabase
        .from('currencies')
        .select('code, name')
        .order('name');

    if (error) {
        console.error('Error fetching currencies:', error.message);
        throw new Error('Could not fetch currencies.');
    }
    return data;
}

/**
 * Creates or updates an exchange rate in the database.
 * @param rateData - The data for the new or updated exchange rate.
 * @returns A promise that resolves with the new/updated record.
 */
export async function upsertExchangeRate(rateData: TExchangeRateSchema): Promise<ExchangeRate> {
    const { data, error } = await supabase
        .from('exchange_rates')
        .upsert(rateData)
        .select()
        .single();

    if (error) {
        console.error('Error upserting exchange rate:', error.message);
        throw new Error('The exchange rate could not be saved.');
    }
    return data;
}