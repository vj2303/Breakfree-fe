'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

// API Configuration
import { API_BASE_URL_WITH_API } from '../../../../../lib/apiConfig';

const API_BASE_URL = API_BASE_URL_WITH_API;

// Interface definitions based on API response
interface CompetencyLibrary {
  id: string;
  competencyName: string;
  subCompetencyNames: string[];
  createdAt: string;
  updatedAt: string;
}

interface CompetencyMapping {
  id: string;
  competencyMapName: string;
  designation: string;
  selectedCompetencyIds: string[];
  createdAt: string;
  updatedAt: string;
  competencyLibraries: CompetencyLibrary[];
}

interface CompetencyMappingsResponse {
  success: boolean;
  message: string;
  data: {
    competencyMappings: CompetencyMapping[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Changed from empty interface to Record<string, never> to represent no props needed
type CompetencyMappingProps = Record<string, never>;

const CompetencyMapping: React.FC<CompetencyMappingProps> = () => {
  const { token } = useAuth();
  
  // Wrap getHeaders in useCallback to prevent recreation on every render
  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  }), [token]);

  const [showCreateMap, setShowCreateMap] = useState(false);
  const [editingMap, setEditingMap] = useState<CompetencyMapping | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [libraries, setLibraries] = useState<CompetencyLibrary[]>([]);
  const [competencyMappings, setCompetencyMappings] = useState<CompetencyMapping[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [loading, setLoading] = useState(false);
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    mappingId: string | null;
    mappingName: string;
  }>({
    isOpen: false,
    mappingId: null,
    mappingName: ''
  });
  
  const [newMap, setNewMap] = useState({
    name: '',
    designation: '',
    selectedCompetencies: [] as string[]
  });

  // Fetch competency mappings from API - now properly includes getHeaders dependency
  const fetchCompetencyMappings = useCallback(async (page: number = 1, limit: number = 10, search: string = '', designation: string = '') => {
    try {
      setMappingsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: search,
        designation: designation
      });

      const response = await fetch(
        `${API_BASE_URL}/competency-mappings?${queryParams}`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: CompetencyMappingsResponse = await response.json();
      
      if (result.success && result.data?.competencyMappings) {
        setCompetencyMappings(result.data.competencyMappings);
        setPagination(result.data.pagination);
      } else {
        throw new Error(result.message || 'Failed to fetch competency mappings');
      }
    } catch (err) {
      console.error('Error fetching competency mappings:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setCompetencyMappings([]);
    } finally {
      setMappingsLoading(false);
    }
  }, [getHeaders]);

  // Fetch competency libraries from API - now properly includes getHeaders dependency
  const fetchCompetencyLibraries = useCallback(async (search: string = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `${API_BASE_URL}/competency-libraries?search=${encodeURIComponent(search)}`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data?.competencyLibraries) {
        setLibraries(result.data.competencyLibraries);
      } else {
        throw new Error(result.message || 'Failed to fetch competency libraries');
      }
    } catch (err) {
      console.error('Error fetching competency libraries:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLibraries([]);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  // Create competency mapping via API
  const createCompetencyMapping = async (mappingData: {
    competencyMapName: string;
    designation: string;
    selectedCompetencyIds: string[];
  }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/competency-mappings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(mappingData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to create competency mapping');
      }
    } catch (err) {
      console.error('Error creating competency mapping:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load mappings and libraries once token is available
  useEffect(() => {
    if (!token) return;
    fetchCompetencyMappings();
    fetchCompetencyLibraries();
  }, [token, fetchCompetencyMappings, fetchCompetencyLibraries]);

  // Search mappings when search term or designation filter changes
  useEffect(() => {
    if (!token) return;
    const delayedSearch = setTimeout(() => {
      fetchCompetencyMappings(1, pagination.limit, searchTerm, designationFilter);
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [searchTerm, designationFilter, token, fetchCompetencyMappings, pagination.limit]);

  // Search libraries when library search term changes
  useEffect(() => {
    if (!token) return;
    const delayedSearch = setTimeout(() => {
      fetchCompetencyLibraries(librarySearchTerm);
    }, 300);
    return () => clearTimeout(delayedSearch);
  }, [librarySearchTerm, token, fetchCompetencyLibraries]);

  // Fetch details for selected competencies when editing
  useEffect(() => {
    if (!token || !showCreateMap || !editingMap || newMap.selectedCompetencies.length === 0) return;
    
    const fetchSelectedCompetencies = async () => {
      try {
        const selectedIds = newMap.selectedCompetencies;
        const existingIds = libraries.map(lib => lib.id);
        const missingIds = selectedIds.filter(id => !existingIds.includes(id));
        
        if (missingIds.length > 0) {
          // Fetch missing competencies by fetching all and filtering
          const response = await fetch(
            `${API_BASE_URL}/competency-libraries?search=`,
            {
              method: 'GET',
              headers: getHeaders()
            }
          );

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.competencyLibraries) {
              const allLibraries = result.data.competencyLibraries;
              const missingLibraries = allLibraries.filter((lib: CompetencyLibrary) => 
                missingIds.includes(lib.id)
              );
              setLibraries(prev => {
                const prevIds = prev.map(lib => lib.id);
                const newLibraries = missingLibraries.filter((lib: CompetencyLibrary) => 
                  !prevIds.includes(lib.id)
                );
                return [...prev, ...newLibraries];
              });
            }
          }
        }
      } catch (err) {
        console.error('Error fetching selected competencies:', err);
      }
    };

    fetchSelectedCompetencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingMap?.id, showCreateMap, token, getHeaders]);

  const handleCreateMap = async () => {
    if (!newMap.name.trim() || !newMap.designation.trim() || newMap.selectedCompetencies.length === 0) {
      setError('Please fill in all required fields and select at least one competency');
      return;
    }
    
    try {
      const mappingData = {
        competencyMapName: newMap.name,
        designation: newMap.designation,
        selectedCompetencyIds: newMap.selectedCompetencies
      };

      await createCompetencyMapping(mappingData);
      
      // Refresh the mappings list after successful creation
      await fetchCompetencyMappings(pagination.page, pagination.limit, searchTerm, designationFilter);
      
      resetForm();
      setError(null);
    } catch {
      // Error is already handled in createCompetencyMapping
    }
  };

  const handleEditMap = async () => {
    if (!editingMap || !newMap.name.trim() || !newMap.designation.trim() || newMap.selectedCompetencies.length === 0) {
      setError('Please fill in all required fields and select at least one competency');
      return;
    }
    
    try {
      // For edit, we would need an UPDATE API endpoint
      // Since it's not provided, we'll just refresh the data for now
      await fetchCompetencyMappings(pagination.page, pagination.limit, searchTerm, designationFilter);
      
      resetForm();
      setError(null);
    } catch {
      setError('Failed to update competency mapping');
    }
  };

  const openEditModal = async (mapping: CompetencyMapping) => {
    setEditingMap(mapping);
    setNewMap({
      name: mapping.competencyMapName,
      designation: mapping.designation,
      selectedCompetencies: mapping.selectedCompetencyIds
    });
    setShowCreateMap(true);
    setError(null);
    
    // Fetch all libraries to ensure we have details for selected competencies
    // This ensures selected competencies are displayed even without search
    try {
      const response = await fetch(
        `${API_BASE_URL}/competency-libraries?search=`,
        {
          method: 'GET',
          headers: getHeaders()
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.competencyLibraries) {
          setLibraries(result.data.competencyLibraries);
        }
      }
    } catch (err) {
      console.error('Error fetching libraries for edit:', err);
    }
  };

  const openDeleteConfirmation = (mapping: CompetencyMapping) => {
    setDeleteConfirmation({
      isOpen: true,
      mappingId: mapping.id,
      mappingName: mapping.competencyMapName
    });
    setDropdownOpen(null);
  };

  const handleDeleteMapping = async () => {
    if (!deleteConfirmation.mappingId) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/competency-mappings/${deleteConfirmation.mappingId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setDeleteConfirmation({ isOpen: false, mappingId: null, mappingName: '' });
        await fetchCompetencyMappings(pagination.page, pagination.limit, searchTerm, designationFilter);
      } else {
        throw new Error(result.message || 'Failed to delete competency mapping');
      }
    } catch (err) {
      console.error('Error deleting competency mapping:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete competency mapping');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewMap({
      name: '',
      designation: '',
      selectedCompetencies: []
    });
    setShowCreateMap(false);
    setEditingMap(null);
    setLibrarySearchTerm('');
    setLibraries([]); // Clear libraries when closing modal
    setError(null);
  };

  const handleCompetencyToggle = (libraryId: string) => {
    const isSelected = newMap.selectedCompetencies.includes(libraryId);
    
    if (isSelected) {
      setNewMap({
        ...newMap,
        selectedCompetencies: newMap.selectedCompetencies.filter(id => id !== libraryId)
      });
    } else {
      setNewMap({
        ...newMap,
        selectedCompetencies: [...newMap.selectedCompetencies, libraryId]
      });
    }
  };

  const filteredMappings = competencyMappings; // No client-side filtering since API handles it

  const toggleDropdown = (mappingId: string) => {
    setDropdownOpen(dropdownOpen === mappingId ? null : mappingId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-black">Competency Maps</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              className="border border-gray-300 rounded-full px-4 py-2 pl-10 w-60 text-black"
              placeholder="Search by map name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="relative">
            <input
              className="border border-gray-300 rounded-full px-4 py-2 pl-10 w-60 text-black"
              placeholder="Filter by designation"
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
            />
            <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowCreateMap(true)}
            className="bg-gray-800 text-white px-4 py-2 rounded-full"
            disabled={loading}
          >
            + Create Competency Map
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Loading State for Mappings */}
      {mappingsLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading competency mappings...</p>
        </div>
      )}

      {/* Maps Grid */}
      {!mappingsLoading && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMappings.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                No competency mappings found. {(searchTerm || designationFilter) && 'Try adjusting your search criteria.'}
              </div>
            ) : (
              filteredMappings.map((mapping) => (
                <div key={mapping.id} className="bg-white border border-gray-200 rounded-lg p-6 relative">
                  <div className="absolute top-4 right-4">
                    <button
                      onClick={() => toggleDropdown(mapping.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                      </svg>
                    </button>
                    
                    {dropdownOpen === mapping.id && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                        <button
                          onClick={() => {
                            setDropdownOpen(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            openEditModal(mapping);
                            setDropdownOpen(null);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openDeleteConfirmation(mapping)}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-black mb-2 pr-8">{mapping.competencyMapName}</h3>
                  <p className="text-sm text-gray-600 mb-1">Designation: {mapping.designation}</p>
                  <p className="text-sm text-gray-600 mb-2">
                    Created on {new Date(mapping.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </p>
                  
                  {/* Display competency libraries */}
                  {mapping.competencyLibraries.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-blue-600 font-medium mb-1">
                        {mapping.competencyLibraries.length} Competency Libraries:
                      </p>
                      <div className="space-y-2">
                        {mapping.competencyLibraries.slice(0, 2).map((library) => (
                          <div key={library.id} className="text-sm">
                            <p className="text-black font-medium">{library.competencyName}</p>
                            <p className="text-gray-500 text-xs">
                              {library.subCompetencyNames.length} sub-competencies
                            </p>
                          </div>
                        ))}
                        {mapping.competencyLibraries.length > 2 && (
                          <p className="text-xs text-gray-500">
                            +{mapping.competencyLibraries.length - 2} more libraries
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 gap-2">
              <button
                onClick={() => fetchCompetencyMappings(pagination.page - 1, pagination.limit, searchTerm, designationFilter)}
                disabled={pagination.page === 1 || mappingsLoading}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <span className="px-4 py-1 text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
              </span>
              
              <button
                onClick={() => fetchCompetencyMappings(pagination.page + 1, pagination.limit, searchTerm, designationFilter)}
                disabled={pagination.page === pagination.totalPages || mappingsLoading}
                className="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Map Modal */}
      {showCreateMap && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold mb-6 text-xl text-black">
              {editingMap ? 'Edit Competency Map' : 'Create Competency Map'}
            </h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Competency Map Name</label>
                <input
                  className="border w-full p-3 rounded-lg text-black"
                  placeholder="Enter Name"
                  value={newMap.name}
                  onChange={(e) => setNewMap({ ...newMap, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Designation</label>
                <input
                  className="border w-full p-3 rounded-lg text-black"
                  placeholder="Write Designation"
                  value={newMap.designation}
                  onChange={(e) => setNewMap({ ...newMap, designation: e.target.value })}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-black">Search Competency Libraries</label>
              <div className="relative">
                <input
                  className="border w-full p-3 pl-10 rounded-lg text-black"
                  placeholder="Search by competency library name"
                  value={librarySearchTerm}
                  onChange={(e) => setLibrarySearchTerm(e.target.value)}
                />
                <svg className="w-4 h-4 absolute left-3 top-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Selected Competencies Section */}
            {newMap.selectedCompetencies.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-3 text-black">Selected Competencies</label>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {newMap.selectedCompetencies.map((selectedId) => {
                    const selectedLibrary = libraries.find(lib => lib.id === selectedId);
                    if (!selectedLibrary) return null;
                    
                    return (
                      <div
                        key={selectedId}
                        className="border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-start justify-between"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-black mb-1">
                            Competency: {selectedLibrary.competencyName}
                          </div>
                          <div className="text-sm text-gray-500 mb-2">
                            Created: {new Date(selectedLibrary.createdAt).toLocaleDateString()}
                          </div>
                          <div className="ml-0">
                            <div className="text-sm text-blue-600 mb-1">Sub Competencies:</div>
                            <ul className="text-sm text-black space-y-1">
                              {selectedLibrary.subCompetencyNames.slice(0, 3).map((subComp, index) => (
                                <li key={index} className="flex items-center">
                                  <span className="w-2 h-2 bg-black rounded-full mr-2"></span>
                                  {subComp}
                                </li>
                              ))}
                              {selectedLibrary.subCompetencyNames.length > 3 && (
                                <li className="text-gray-500">
                                  +{selectedLibrary.subCompetencyNames.length - 3} more sub-competencies
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCompetencyToggle(selectedId)}
                          className="ml-4 text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                          title="Remove competency"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && librarySearchTerm && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-gray-600">Loading competency libraries...</p>
              </div>
            )}

            {/* Library Selection - Only show after search */}
            {!loading && librarySearchTerm && (
              <div className="space-y-4 mb-6">
                {libraries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No competency libraries found. Try adjusting your search term.
                  </div>
                ) : (
                  libraries
                    .filter(library => !newMap.selectedCompetencies.includes(library.id))
                    .map((library) => (
                      <div
                        key={library.id}
                        className="border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => handleCompetencyToggle(library.id)}
                      >
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            checked={newMap.selectedCompetencies.includes(library.id)}
                            onChange={() => handleCompetencyToggle(library.id)}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-black">
                              Competency: {library.competencyName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Created: {new Date(library.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="ml-6">
                          <div className="text-sm text-blue-600 mb-1">Sub Competencies:</div>
                          <ul className="text-sm text-black space-y-1">
                            {library.subCompetencyNames.slice(0, 3).map((subComp, index) => (
                              <li key={index} className="flex items-center">
                                <span className="w-2 h-2 bg-black rounded-full mr-2"></span>
                                {subComp}
                              </li>
                            ))}
                            {library.subCompetencyNames.length > 3 && (
                              <li className="text-gray-500">
                                +{library.subCompetencyNames.length - 3} more sub-competencies
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* Empty state when no search */}
            {!librarySearchTerm && !loading && (
              <div className="text-center py-8 text-gray-500 mb-6">
                Enter a search term to find and add competency libraries
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                className="px-6 py-2 text-black"
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="bg-gray-800 text-white px-6 py-2 rounded-lg disabled:opacity-50"
                onClick={editingMap ? handleEditMap : handleCreateMap}
                disabled={loading || !newMap.name.trim() || !newMap.designation.trim() || newMap.selectedCompetencies.length === 0}
              >
                {loading ? 'Processing...' : (editingMap ? 'Update Map' : 'Create Map')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="font-bold mb-4 text-xl text-black">Delete Competency Mapping</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">&quot;{deleteConfirmation.mappingName}&quot;</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                onClick={() => setDeleteConfirmation({ isOpen: false, mappingId: null, mappingName: '' })}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleDeleteMapping}
                disabled={loading}
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetencyMapping;