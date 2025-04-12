export const API_BASE_URL = '';  // Запросы будут идти через прокси-сервер

export async function fetchAPI(endpoint, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        mode: 'cors',
        credentials: 'omit'  // Отключаем credentials для решения проблем с CORS
    };
    
    // Убедимся, что endpoint начинается с /
    if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
    }
    
    try {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log(`[${new Date().toLocaleTimeString()}] Fetching API: ${url}`, options);
        
        const response = await fetch(url, {
            ...defaultOptions,
            ...options
        });
        
        console.log(`[${new Date().toLocaleTimeString()}] API response status: ${response.status} for ${endpoint}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${new Date().toLocaleTimeString()}] API error: ${response.status} for ${endpoint}`, errorText);
            throw new Error(`API error: ${response.status}`);
        }
        
        // Для пустых ответов (например 204 No Content) возвращаем пустой объект
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return {};
        }
        
        // Для JSON ответов
        try {
            const data = await response.json();
            console.log(`[${new Date().toLocaleTimeString()}] API data received for ${endpoint}:`, data);
            return data;
        } catch (parseError) {
            console.warn(`[${new Date().toLocaleTimeString()}] Cannot parse JSON from API ${endpoint}:`, parseError);
            return {};
        }
    } catch (error) {
        console.error(`[${new Date().toLocaleTimeString()}] API request failed for ${endpoint}:`, error);
        throw error;
    }
}
