// aiProfileApi.ts
import { AIProfile, AIProfilesResponse } from '../app/dashboard/report-generation/content/ai-profile/types';
import { API_BASE_URL_WITH_API } from './apiConfig';

const API_BASE_URL = API_BASE_URL_WITH_API;

export interface CreateAIProfileData {
  title: string;
  systemInstruction: string;
  temperature: number;
  model: 'gpt-4o' | 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface GetProfilesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export class AIProfileApi {
  private static getAuthHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  static async getProfiles(
    token: string, 
    params: GetProfilesParams = {}
  ): Promise<ApiResponse<AIProfilesResponse>> {
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/ai-profiles${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(token),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to fetch AI profiles',
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error fetching AI profiles:', error);
      return {
        success: false,
        message: 'Network error occurred while fetching AI profiles',
      };
    }
  }

  static async createProfile(
    token: string, 
    profileData: CreateAIProfileData
  ): Promise<ApiResponse<AIProfile>> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-profiles`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(profileData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to create AI profile',
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error creating AI profile:', error);
      return {
        success: false,
        message: 'Network error occurred while creating AI profile',
      };
    }
  }

  static async updateProfile(
    token: string,
    id: string,
    profileData: Partial<CreateAIProfileData>
  ): Promise<ApiResponse<AIProfile>> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-profiles/${id}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(profileData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to update AI profile',
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error updating AI profile:', error);
      return {
        success: false,
        message: 'Network error occurred while updating AI profile',
      };
    }
  }

  static async deleteProfile(token: string, id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/ai-profiles/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(token),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to delete AI profile',
        };
      }

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      console.error('Error deleting AI profile:', error);
      return {
        success: false,
        message: 'Network error occurred while deleting AI profile',
      };
    }
  }
}
