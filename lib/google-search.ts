import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY || ''
const SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID || ''

const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null

export interface SearchResult {
    title: string;
    link: string;
    snippet: string;
    pagemap?: any;
}

/**
 * Searches Google Custom Search with caching in search_results table.
 * Results are cached for 30 days by default.
 */
export async function googleSearch(query: string, options: { num?: number; type?: string } = {}): Promise<SearchResult[]> {
    if (!query) return [];

    const cacheKey = `google:${query}:${options.num || 10}:${options.type || 'text'}`.toLowerCase().trim();

    // 1. Check Cache
    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('search_results')
                .select('results, expires_at')
                .eq('query', cacheKey)
                .maybeSingle();

            if (data && new Date(data.expires_at) > new Date()) {
                console.log(`[Google Search] Cache HIT for: ${query}`);
                return data.results as SearchResult[];
            }
        } catch (e) {
            console.error('[Google Search] Cache check error:', e);
        }
    }

    // 2. Perform Live Search
    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        console.warn('[Google Search] API keys not configured, returning empty results');
        return [];
    }

    try {
        console.log(`[Google Search] Live search for: ${query}`);
        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', GOOGLE_API_KEY);
        url.searchParams.set('cx', SEARCH_ENGINE_ID);
        url.searchParams.set('q', query);
        url.searchParams.set('num', String(options.num || 5));
        if (options.type === 'image') url.searchParams.set('searchType', 'image');

        const response = await fetch(url.toString());
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Google Search API Error: ${err}`);
        }

        const data = await response.json();
        const results = (data.items || []).map((item: any) => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            pagemap: item.pagemap
        }));

        // 3. Save to Cache
        if (supabase) {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days TTL

            await supabase
                .from('search_results')
                .upsert({
                    query: cacheKey,
                    results: results,
                    expires_at: expiresAt.toISOString()
                }, { onConflict: 'query' });
        }

        return results;
    } catch (e) {
        console.error('[Google Search] Search failed:', e);
        return [];
    }
}
