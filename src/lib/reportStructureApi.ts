// reportStructureApi.ts
import { API_BASE_URL_WITH_API } from './apiConfig';

const API_BASE_URL = API_BASE_URL_WITH_API;

export interface ReportFormData {
  reportName: string;
  description: string;
  selectedAssessment: string | string[]; // Can be string (for backward compatibility) or array of assessment types
  reportTemplate: string;
  aiProfile: string;
  reportCover: {
    reportName: boolean;
    candidateName: boolean;
    date: boolean;
  };
  part1Introduction: boolean;
  part2Analysis: {
    detailObservation: boolean;
    overallCompetencyRating: boolean;
  };
  readinessVsApplication: boolean;
  part3Comments: {
    areasOfStrength: boolean;
    areasOfDevelopment: boolean;
  };
  part4OverallRatings: {
    interpretingScoreTable: boolean;
    competenciesScoreMatrix: boolean;
    chartType: 'bar' | 'pie';
  };
  part5Recommendation: boolean;
}

export interface ReportStructure {
  id: string;
  reportName: string;
  description: string;
  selectedAssessment: string | string[]; // Can be string (for backward compatibility) or array of assessment types
  reportTemplate: string;
  aiProfile: string;
  reportCover: {
    reportName: boolean;
    candidateName: boolean;
    date: boolean;
  };
  part1Introduction: boolean;
  part2Analysis: {
    detailObservation: boolean;
    overallCompetencyRating: boolean;
  };
  readinessVsApplication: boolean;
  part3Comments: {
    areasOfStrength: boolean;
    areasOfDevelopment: boolean;
  };
  part4OverallRatings: {
    interpretingScoreTable: boolean;
    competenciesScoreMatrix: boolean;
    chartType: 'bar' | 'pie';
  };
  part5Recommendation: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ReportStructuresResponse {
  reportStructures: ReportStructure[];
  pagination: PaginationInfo;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface GetReportStructuresParams {
  page?: number;
  limit?: number;
  search?: string;
}

export class ReportStructureApi {
  private static getAuthHeaders(token: string) {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  static async getReportStructures(
    token: string, 
    params: GetReportStructuresParams = {}
  ): Promise<ApiResponse<ReportStructuresResponse>> {
    try {
      // Build query string
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.search) queryParams.append('search', params.search);
      
      const queryString = queryParams.toString();
      const url = `${API_BASE_URL}/report-structures${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(token),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to fetch report structures',
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error fetching report structures:', error);
      return {
        success: false,
        message: 'Network error occurred while fetching report structures',
      };
    }
  }

  static async createReportStructure(
    token: string, 
    reportData: ReportFormData
  ): Promise<ApiResponse<ReportStructure>> {
    try {
      const response = await fetch(`${API_BASE_URL}/report-structures`, {
        method: 'POST',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(reportData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to create report structure',
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error creating report structure:', error);
      return {
        success: false,
        message: 'Network error occurred while creating report structure',
      };
    }
  }

  static async getReportStructure(
    token: string,
    id: string
  ): Promise<ApiResponse<ReportStructure>> {
    try {
      const response = await fetch(`${API_BASE_URL}/report-structures/${id}`, {
        method: 'GET',
        headers: this.getAuthHeaders(token),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to fetch report structure',
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error fetching report structure:', error);
      return {
        success: false,
        message: 'Network error occurred while fetching report structure',
      };
    }
  }

  static async updateReportStructure(
    token: string,
    id: string,
    reportData: Partial<ReportFormData>
  ): Promise<ApiResponse<ReportStructure>> {
    try {
      const response = await fetch(`${API_BASE_URL}/report-structures/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(token),
        body: JSON.stringify(reportData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to update report structure',
        };
      }

      return {
        success: true,
        data: result.data,
        message: result.message,
      };
    } catch (error) {
      console.error('Error updating report structure:', error);
      return {
        success: false,
        message: 'Network error occurred while updating report structure',
      };
    }
  }

  static async deleteReportStructure(token: string, id: string): Promise<ApiResponse<void>> {
    try {
      const response = await fetch(`${API_BASE_URL}/report-structures/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(token),
      });

      const result = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: result.message || 'Failed to delete report structure',
        };
      }

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      console.error('Error deleting report structure:', error);
      return {
        success: false,
        message: 'Network error occurred while deleting report structure',
      };
    }
  }
}
