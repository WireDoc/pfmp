import { useAuth } from '../contexts/AuthContext';
import { pfmpApiConfig } from '../config/authConfig';

/**
 * Custom hook for making authenticated API calls to the PFMP backend
 */
export const useApiService = () => {
  const { getAccessToken, isAuthenticated, user } = useAuth();

  /**
   * Makes an authenticated HTTP request to the PFMP API
   */
  const apiRequest = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    if (!isAuthenticated) {
      throw new Error('User must be authenticated to make API requests');
    }

    try {
      // Get access token for Microsoft Graph (could be extended for PFMP API scopes)
      const token = await getAccessToken(['User.Read']);
      
      const url = `${pfmpApiConfig.baseUrl}${endpoint}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return response.text() as Promise<T>;
      }

      return response.json();
    } catch (error) {
      console.error('API Request Error:', error);
      throw error;
    }
  };

  /**
   * GET request helper
   */
  const get = <T = any>(endpoint: string): Promise<T> => 
    apiRequest<T>(endpoint, { method: 'GET' });

  /**
   * POST request helper
   */
  const post = <T = any>(endpoint: string, data?: any): Promise<T> => 
    apiRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });

  /**
   * PUT request helper
   */
  const put = <T = any>(endpoint: string, data?: any): Promise<T> => 
    apiRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });

  /**
   * DELETE request helper
   */
  const del = <T = any>(endpoint: string): Promise<T> => 
    apiRequest<T>(endpoint, { method: 'DELETE' });

  /**
   * Get user-specific API endpoints
   */
  const getUserEndpoints = () => {
    if (!user?.localAccountId) {
      throw new Error('User ID not available');
    }
    
    const userId = user.localAccountId;
    return {
      profile: `/users/${userId}/profile`,
      accounts: `/users/${userId}/accounts`,
      goals: `/users/${userId}/goals`,
      transactions: `/users/${userId}/transactions`,
      portfolio: `/users/${userId}/portfolio`,
    };
  };

  return {
    // HTTP methods
    get,
    post,
    put,
    delete: del,
    
    // User-specific helpers
    getUserEndpoints,
    
    // State
    isAuthenticated,
    user,
    
    // Raw request method for advanced usage
    apiRequest,
  };
};

/**
 * Hook for fetching user profile data
 */
export const useUserProfile = () => {
  const { get, getUserEndpoints, isAuthenticated } = useApiService();
  
  const fetchProfile = async () => {
    if (!isAuthenticated) return null;
    
    try {
      const endpoints = getUserEndpoints();
      return await get(endpoints.profile);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  return { fetchProfile };
};

/**
 * Hook for fetching user accounts
 */
export const useUserAccounts = () => {
  const { get, getUserEndpoints, isAuthenticated } = useApiService();
  
  const fetchAccounts = async () => {
    if (!isAuthenticated) return [];
    
    try {
      const endpoints = getUserEndpoints();
      return await get(endpoints.accounts);
    } catch (error) {
      console.error('Failed to fetch user accounts:', error);
      return [];
    }
  };

  return { fetchAccounts };
};

/**
 * Hook for fetching user financial goals
 */
export const useUserGoals = () => {
  const { get, post, put, delete: del, getUserEndpoints, isAuthenticated } = useApiService();
  
  const fetchGoals = async () => {
    if (!isAuthenticated) return [];
    
    try {
      const endpoints = getUserEndpoints();
      return await get(endpoints.goals);
    } catch (error) {
      console.error('Failed to fetch user goals:', error);
      return [];
    }
  };

  const createGoal = async (goalData: any) => {
    const endpoints = getUserEndpoints();
    return await post(endpoints.goals, goalData);
  };

  const updateGoal = async (goalId: string, goalData: any) => {
    const endpoints = getUserEndpoints();
    return await put(`${endpoints.goals}/${goalId}`, goalData);
  };

  const deleteGoal = async (goalId: string) => {
    const endpoints = getUserEndpoints();
    return await del(`${endpoints.goals}/${goalId}`);
  };

  return { 
    fetchGoals, 
    createGoal, 
    updateGoal, 
    deleteGoal 
  };
};