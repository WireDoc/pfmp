import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { pfmpApiConfig } from '../config/authConfig';
import type {
    UserProfile,
    Account,
    Task,
    Alert,
    MarketIndex,
    StockQuote,
    TspFundPrice,
    PortfolioSummary,
    PortfolioValuation,
    NetWorthSummary,
    AccountPerformance,
} from '../types/domain';

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

    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
        const response: AxiosResponse<T> = await this.api.post(url, data, config);
        return response.data;
    }

    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
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
    async getCurrentUserProfile(): Promise<UserProfile> {
        return this.apiService.get<UserProfile>('/profile/current');
    }

    async getUserProfile(userId: number): Promise<UserProfile> {
        return this.apiService.get<UserProfile>(`/profile/${userId}`);
    }

    async updateUserProfile(userId: number, profileData: Partial<UserProfile>): Promise<UserProfile> {
        return this.apiService.put<UserProfile>(`/profile/${userId}`, profileData);
    }

    // Account Methods
    async getUserAccounts(userId: number): Promise<Account[]> {
        return this.apiService.get<Account[]>(`/accounts/user/${userId}`);
    }

    async getAccountById(accountId: number): Promise<Account> {
        return this.apiService.get<Account>(`/accounts/${accountId}`);
    }

    async createAccount(accountData: Partial<Account>): Promise<Account> {
        return this.apiService.post<Account>('/accounts', accountData);
    }

    async updateAccount(accountId: number, accountData: Partial<Account>): Promise<Account> {
        return this.apiService.put<Account>(`/accounts/${accountId}`, accountData);
    }

    async deleteAccount(accountId: number): Promise<void> {
        return this.apiService.delete(`/accounts/${accountId}`);
    }

    // Task Methods
    async getUserTasks(userId: number): Promise<Task[]> {
        return this.apiService.get<Task[]>(`/tasks/user/${userId}`);
    }

    async createTask(taskData: Partial<Task>): Promise<Task> {
        return this.apiService.post<Task>('/tasks', taskData);
    }

    async updateTask(taskId: number, taskData: Partial<Task>): Promise<Task> {
        return this.apiService.put<Task>(`/tasks/${taskId}`, taskData);
    }

    async deleteTask(taskId: number): Promise<void> {
        return this.apiService.delete(`/tasks/${taskId}`);
    }

    // AI Recommendations
    async getAiRecommendations(userId: number): Promise<Task[]> { // assuming recommendations are task-like
        return this.apiService.get<Task[]>(`/tasks/ai/recommendations?userId=${userId}`);
    }

    // Leaving portfolio analysis loosely typed; using unknown instead of any during transition
    async getPortfolioAnalysis(userId: number): Promise<unknown> {
        return this.apiService.get(`/tasks/ai/portfolio-analysis?userId=${userId}`);
    }

    // Market Data Methods
    // Market status not modeled yet; using unknown placeholder
    async getMarketStatus(): Promise<unknown> {
        return this.apiService.get('/market-data/status');
    }

    async getMarketIndices(): Promise<MarketIndex[]> {
        return this.apiService.get<MarketIndex[]>('/market-data/indices');
    }

    async getStockPrice(symbol: string): Promise<StockQuote> {
        return this.apiService.get<StockQuote>(`/market-data/stock/${symbol}`);
    }

    async getTspFundPrices(): Promise<TspFundPrice[]> {
        return this.apiService.get<TspFundPrice[]>('/market-data/tsp-funds');
    }

    // Portfolio Methods
    async getPortfolioSummary(userId: number): Promise<PortfolioSummary> {
        return this.apiService.get<PortfolioSummary>(`/portfolio/summary/${userId}`);
    }

    async getPortfolioValuation(userId: number): Promise<PortfolioValuation> {
        return this.apiService.get<PortfolioValuation>(`/portfolio/valuation/${userId}`);
    }

    async getNetWorthSummary(userId: number): Promise<NetWorthSummary> {
        return this.apiService.get<NetWorthSummary>(`/portfolio/net-worth/${userId}`);
    }

    async getAccountPerformance(userId: number, accountId: number): Promise<AccountPerformance> {
        return this.apiService.get<AccountPerformance>(`/portfolio/account-performance/${userId}/${accountId}`);
    }

    // Alert Methods  
    async getUserAlerts(userId: number, isActive?: boolean): Promise<Alert[]> {
        const params = isActive !== undefined ? `?isActive=${isActive}` : '';
        return this.apiService.get<Alert[]>(`/alerts/user/${userId}${params}`);
    }

    async markAlertAsRead(alertId: number): Promise<void> {
        return this.apiService.put(`/alerts/${alertId}/read`, {});
    }

    async dismissAlert(alertId: number): Promise<void> {
        return this.apiService.put(`/alerts/${alertId}/dismiss`, {});
    }
}