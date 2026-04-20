'use client'
import React, { useState, useEffect } from 'react';
import { AIProfileCard } from './AIProfileCard';
import { CreateProfileModal } from './CreateProfileModal';
import { AIProfileApi } from '../../../../../lib/aiProfileApi';
import { useAuth } from '../../../../../context/AuthContext';
import { dummyProfiles } from './dummyData';
import { AIProfile, PaginationInfo } from './types';

const AIProfilesPage: React.FC = () => {
  const { token } = useAuth();
  const [profiles, setProfiles] = useState<AIProfile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AIProfile | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Function to refresh profiles data
  const refreshProfiles = async () => {
    if (!token) return;
    
    try {
      const response = await AIProfileApi.getProfiles(token, {
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined
      });
      
      if (response.success && response.data) {
        setProfiles(response.data.aiProfiles || []);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Error refreshing profiles:', err);
    }
  };

  // Fetch profiles on component mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!token) {
          console.log('No token available, using dummy data');
          // Use dummy data as fallback when no token is available
          setProfiles(dummyProfiles);
          setPagination(null);
          setLoading(false);
          return;
        }

        const response = await AIProfileApi.getProfiles(token, {
          page: currentPage,
          limit: 10,
          search: searchTerm || undefined
        });
        
        console.log('API Response:', response); // Debug log
        
        if (response.success && response.data) {
          // Extract profiles and pagination from the new response structure
          const profilesData = response.data.aiProfiles || [];
          const paginationData = response.data.pagination;
          
          setProfiles(profilesData);
          setPagination(paginationData);
        } else {
          console.log('API failed, using dummy data as fallback');
          setProfiles(dummyProfiles);
          setPagination(null);
          setError(response.message || 'Failed to fetch AI profiles - using demo data');
        }
      } catch (err) {
        console.log('API error, using dummy data as fallback:', err);
        setProfiles(dummyProfiles);
        setPagination(null);
        setError('API unavailable - using demo data');
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, [token, currentPage, searchTerm]);

  const handleCreateProfile = () => {
    setEditingProfile(undefined);
    setIsModalOpen(true);
  };

  const handleEditProfile = (profile: AIProfile) => {
    setEditingProfile(profile);
    setIsModalOpen(true);
  };

  const handleDeleteProfile = async (id: string) => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      const response = await AIProfileApi.deleteProfile(token, id);
      
      if (response.success) {
        // Refresh the profiles list
        await refreshProfiles();
      } else {
        setError(response.message || 'Failed to delete AI profile');
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting the profile');
      console.error('Error deleting profile:', err);
    }
  };

  const handleSaveProfile = async (profileData: Omit<AIProfile, 'id'>) => {
    if (!token) {
      setError('Authentication required');
      return;
    }

    try {
      if (editingProfile) {
        // Update existing profile
        const response = await AIProfileApi.updateProfile(token, editingProfile.id, profileData);
        
        if (response.success && response.data) {
          // Update existing profile in state
          setProfiles(profiles.map(p => 
            p.id === editingProfile.id ? response.data! : p
          ));
          setIsModalOpen(false);
        } else {
          setError(response.message || 'Failed to update AI profile');
        }
      } else {
        // Create new profile
        const response = await AIProfileApi.createProfile(token, profileData);
        
        if (response.success && response.data) {
          // Refresh the profiles list to show the new profile
          // If we're not on the first page, go to first page to see the new profile
          if (currentPage !== 1) {
            setCurrentPage(1);
          } else {
            await refreshProfiles();
          }
          setIsModalOpen(false);
        } else {
          setError(response.message || 'Failed to create AI profile');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred while saving the profile');
      console.error('Error saving profile:', err);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">AI Profiles</h1>
        <button
          onClick={handleCreateProfile}
          disabled={!token}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-lg">+</span>
          Create AI Profile
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search AI profiles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => setError(null)}
                  className="bg-red-100 px-3 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
          <span className="ml-3 text-gray-600">Loading AI profiles...</span>
        </div>
      ) : (
        <>
          {/* Grid of profiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(profiles) && profiles.map((profile, index) => (
              <AIProfileCard
                key={profile.id || `profile-${index}`}
                profile={profile}
                onEdit={handleEditProfile}
                onDelete={handleDeleteProfile}
              />
            ))}
          </div>

          {/* Empty State */}
          {Array.isArray(profiles) && profiles.length === 0 && !loading && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No AI profiles</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new AI profile.</p>
              <div className="mt-6">
                <button
                  onClick={handleCreateProfile}
                  disabled={!token}
                  className="bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create AI Profile
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.pages - 4, currentPage - 2)) + i;
                  if (pageNum > pagination.pages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        pageNum === currentPage
                          ? 'bg-slate-800 text-white'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.pages, currentPage + 1))}
                  disabled={currentPage === pagination.pages}
                  className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal */}
      <CreateProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProfile}
        editingProfile={editingProfile}
      />
    </div>
  );
};

export default AIProfilesPage;