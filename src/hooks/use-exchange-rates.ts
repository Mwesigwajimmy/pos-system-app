// src/hooks/use-exchange-rates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TExchangeRateSchema, ExchangeRate } from '@/types/currency';
import { fetchCurrencies, fetchExchangeRates, upsertExchangeRate } from '@/services/currency';

const EXCHANGE_RATES_QUERY_KEY = 'exchangeRates';
const CURRENCIES_QUERY_KEY = 'currencies';

/** Custom hook to fetch all exchange rates. */
export const useExchangeRates = () => {
    return useQuery<ExchangeRate[], Error>({
        queryKey: [EXCHANGE_RATES_QUERY_KEY],
        queryFn: fetchExchangeRates,
    });
};

/** Custom hook to fetch the list of all available currencies. */
export const useCurrencies = () => {
    return useQuery({
        queryKey: [CURRENCIES_QUERY_KEY],
        queryFn: fetchCurrencies,
        staleTime: 1000 * 60 * 60, // Currencies don't change often, cache for 1 hour.
    });
};

/** Custom hook for creating or updating an exchange rate with optimistic updates. */
export const useUpsertExchangeRate = () => {
    const queryClient = useQueryClient();

    // Add the fourth generic argument for the context type here
    return useMutation<
        ExchangeRate,
        Error,
        TExchangeRateSchema,
        { previousRates: ExchangeRate[] | undefined }
    >({
        mutationFn: upsertExchangeRate,
        onMutate: async (newRate) => {
            await queryClient.cancelQueries({ queryKey: [EXCHANGE_RATES_QUERY_KEY] });
            const previousRates = queryClient.getQueryData<ExchangeRate[]>([EXCHANGE_RATES_QUERY_KEY]);

            queryClient.setQueryData<ExchangeRate[]>([EXCHANGE_RATES_QUERY_KEY], (old = []) => {
                const optimisticNewRate: ExchangeRate = {
                    id: Math.random(), // Temporary ID for the optimistic update
                    ...newRate,
                    rate: newRate.rate!, // Asserting rate is not undefined
                };
                
                // A more robust solution would check if the currency_code and date already exist
                // and replace it for an update, but for now, we prepend.
                const sortedRates = [optimisticNewRate, ...old].sort(
                    (a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
                );
                return sortedRates;
            });

            return { previousRates };
        },
        onError: (err, newRate, context) => {
            // Now, 'context' is correctly typed, and this check will work without an error.
            if (context?.previousRates) {
                queryClient.setQueryData([EXCHANGE_RATES_QUERY_KEY], context.previousRates);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [EXCHANGE_RATES_QUERY_KEY] });
        },
    });
};