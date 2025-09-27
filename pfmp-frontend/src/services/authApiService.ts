import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { pfmpApiConfig } from '../config/authConfig';

/**
 * Authenticated API Service
 * Handles HTTP requests to the PFMP API with automatic token injection
 */
export class AuthenticatedApiService {
    private api: AxiosInstance;
    private getAccessToken: () => Promise<string | null>;

    constructor(getAccessTokenFn: () => Promise<string | null>) {
        this.getAccessToken = getAccessTokenFn;
        
        // Create axios instance
        this.api = axios.create({
            baseURL: pfmpApiConfig.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add authentication token
        this.api.interceptors.request.use(
            async (config) => {
                try {
                    const token = await this.getAccessToken();
                    if (token) {
                        config.headers['Authorization'] = `Bearer ${token}`;
                    }
                } catch (error) {
                    console.error('Failed to get access token:', error);
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor for error handling
        this.api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.warn('API request unauthorized - token may be expired');
                    // Could trigger re-authentication here
                }
                return Promise.reject(error);
            }
        );
    }

    // Generic HTTP methods
    async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.api.get(url, config);
        return response.data;
    }

    async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.api.post(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.api.put(url, data, config);
        return response.data;
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.api.delete(url, config);
        return response.data;
    }
}

/**
 * PFMP API Service
 * High-level API methods for PFMP backend endpoints
 */
export class PfmpApiService {
    private apiService: AuthenticatedApiService;

    constructor(getAccessTokenFn: () => Promise<string | null>) {
        this.apiService = new AuthenticatedApiService(getAccessTokenFn);
    }

    // User Profile Methods
    async getCurrentUserProfile(): Promise<any> {
        return this.apiService.get('/profile/current');
    }

    async getUserProfile(userId: number): Promise<any> {
        return this.apiService.get(`/profile/${userId}`);
    }

    async updateUserProfile(userId: number, profileData: any): Promise<any> {
        return this.apiService.put(`/profile/${userId}`, profileData);
    }

    // Account Methods
    async getUserAccounts(userId: number): Promise<any[]> {
        return this.apiService.get(`/accounts/user/${userId}`);
    }

    async getAccountById(accountId: number): Promise<any> {
        return this.apiService.get(`/accounts/${accountId}`);
    }

    async createAccount(accountData: any): Promise<any> {
        return this.apiService.post('/accounts', accountData);
    }

    async updateAccount(accountId: number, accountData: any): Promise<any> {
        return this.apiService.put(`/accounts/${accountId}`, accountData);
    }

    async deleteAccount(accountId: number): Promise<void> {
        return this.apiService.delete(`/accounts/${accountId}`);
    }

    // Task Methods
    async getUserTasks(userId: number): Promise<any[]> {
        return this.apiService.get(`/tasks/user/${userId}`);
    }

    async createTask(taskData: any): Promise<any> {
        return this.apiService.post('/tasks', taskData);
    }

    async updateTask(taskId: number, taskData: any): Promise<any> {
        return this.apiService.put(`/tasks/${taskId}`, taskData);
    }

    async deleteTask(taskId: number): Promise<void> {
        return this.apiService.delete(`/tasks/${taskId}`);
    }

    // AI Recommendations
    async getAiRecommendations(userId: number): Promise<any[]> {
        return this.apiService.get(`/tasks/ai/recommendations?userId=${userId}`);
    }

    async getPortfolioAnalysis(userId: number): Promise<any> {
        return this.apiService.get(`/tasks/ai/portfolio-analysis?userId=${userId}`);
    }

    // Market Data Methods
    async getMarketStatus(): Promise<any> {
        return this.apiService.get('/market-data/status');
    }

    async getMarketIndices(): Promise<any[]> {
        return this.apiService.get('/market-data/indices');
    }

    async getStockPrice(symbol: string): Promise<any> {
        return this.apiService.get(`/market-data/stock/${symbol}`);
    }

    async getTspFundPrices(): Promise<any[]> {
        return this.apiService.get('/market-data/tsp-funds');
    }

    // Portfolio Methods
    async getPortfolioSummary(userId: number): Promise<any> {
        return this.apiService.get(`/portfolio/summary/${userId}`);
    }

    async getPortfolioValuation(userId: number): Promise<any> {
        return this.apiService.get(`/portfolio/valuation/${userId}`);
    }

    async getNetWorthSummary(userId: number): Promise<any> {
        return this.apiService.get(`/portfolio/net-worth/${userId}`);
    }

    async getAccountPerformance(userId: number, accountId: number): Promise<any> {
        return this.apiService.get(`/portfolio/account-performance/${userId}/${accountId}`);
    }

    // Alert Methods  
    async getUserAlerts(userId: number, isActive?: boolean): Promise<any[]> {
        const params = isActive !== undefined ? `?isActive=${isActive}` : '';
        return this.apiService.get(`/alerts/user/${userId}${params}`);
    }

    async markAlertAsRead(alertId: number): Promise<void> {
        return this.apiService.put(`/alerts/${alertId}/read`, {});
    }

    async dismissAlert(alertId: number): Promise<void> {
        return this.apiService.put(`/alerts/${alertId}/dismiss`, {});
    }
}