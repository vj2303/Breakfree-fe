import React, { useEffect, useState } from 'react';
import { useAssessmentForm } from '../create/context';
import { useAuth } from '@/context/AuthContext';
import { Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL_WITH_API } from '../../../../../../lib/apiConfig';

const SelectCompetenciesStep: React.FC = () => {
  const context = useAssessmentForm();
  if (!context) {
    throw new Error('SelectCompetenciesStep must be used within AssessmentFormContext');
  }
  const { formData, updateFormData } = context;
  const { token } = useAuth();
  interface CompetencyLibraryItem {
    id: string;
    competencyName: string;
    subCompetencyNames?: string[];
    // Add other properties if needed
  }
  const [competencies, setCompetencies] = useState<CompetencyLibraryItem[]>([]);
  const [selectedCompetencies, setSelectedCompetencies] = useState<string[]>(formData.competencyIds || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Store both id and name for selected competencies
    const selectedData = competencies.filter(comp => selectedCompetencies.includes(comp.id)).map(comp => ({ id: comp.id, name: comp.competencyName }));
    updateFormData('competencyIds', selectedCompetencies);
    updateFormData('selectedCompetenciesData', selectedData);
    try {
      console.log('[Assessment Center][SelectCompetenciesStep] competencyIds:', selectedCompetencies);
      console.log('[Assessment Center][SelectCompetenciesStep] selectedCompetenciesData:', selectedData);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompetencies, competencies]);

  // Log when step is saved/next is clicked
  useEffect(() => {
    const handleStepSave = () => {
      try {
        const selectedData = competencies.filter(comp => selectedCompetencies.includes(comp.id)).map(comp => ({ id: comp.id, name: comp.competencyName }));
        console.log('=== SELECT COMPETENCIES STEP SAVED ===');
        console.log('Selected competency IDs:', selectedCompetencies);
        console.log('Selected competency data:', selectedData);
        console.log('Step validation:', {
          hasCompetencies: selectedCompetencies.length > 0,
          totalAvailable: competencies.length,
          selectedCount: selectedCompetencies.length
        });
      } catch {}
    };

    // Listen for step save events
    window.addEventListener('step-save', handleStepSave);
    return () => window.removeEventListener('step-save', handleStepSave);
  }, [selectedCompetencies, competencies]);

  const fetchCompetencies = async () => {
    if (!token) {
      setError('Authentication token not available');
      toast.error('Please login to access competencies');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log('Fetching competencies with token:', token ? 'Token available' : 'No token');
      
      const res = await fetch(`${API_BASE_URL_WITH_API}/competency-libraries?page=1&limit=10&search=`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('Response status:', res.status);
      
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setCompetencies(data?.data?.competencyLibraries || []);
      // Store the full list in context for other steps
      updateFormData('competencyLibraryList', data?.data?.competencyLibraries || []);
    } catch (error) {
      console.error('Error fetching competencies:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch competencies';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteCompetencyLibrary = async (competencyId: string) => {
    setDeletingIds(prev => new Set(prev).add(competencyId));
    
    try {
      const res = await fetch(`${API_BASE_URL_WITH_API}/competency-libraries/${competencyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Remove from competencies list
        setCompetencies(prev => prev.filter(comp => comp.id !== competencyId));
        // Remove from selected if it was selected
        setSelectedCompetencies(prev => prev.filter(id => id !== competencyId));
        toast.success('Competency library deleted successfully');
      } else {
        throw new Error('Failed to delete competency library');
      }
    } catch (error) {
      console.error('Error deleting competency library:', error);
      toast.error('Failed to delete competency library');
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(competencyId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchCompetencies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheck = (id: string) => {
    setSelectedCompetencies(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-5">Select Competencies</h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-900" />
          <span className="ml-3 text-gray-600 font-medium">Loading competencies...</span>
        </div>
      ) : (
        <div className="space-y-3">
          {competencies.map(comp => {
            const isChecked = selectedCompetencies.includes(comp.id);
            return (
              <div 
                key={comp.id} 
                className={`flex items-center gap-4 p-4 border rounded-lg bg-white transition-all duration-200 ${
                  isChecked 
                    ? 'border-gray-900 shadow-md bg-gray-50' 
                    : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                }`}
              >
                <label 
                  htmlFor={comp.id} 
                  className="relative inline-flex items-center cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    id={comp.id}
                    checked={isChecked}
                    onChange={() => handleCheck(comp.id)}
                    className="sr-only peer"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                    isChecked
                      ? 'bg-gray-900 border-gray-900'
                      : 'bg-white border-gray-300 group-hover:border-gray-400'
                  }`}>
                    {isChecked && (
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </label>
                <div className="flex-1">
                  <label 
                    htmlFor={comp.id} 
                    className={`font-semibold text-base cursor-pointer block transition-colors ${
                      isChecked ? 'text-gray-900' : 'text-gray-700'
                    }`}
                  >
                    {comp.competencyName}
                  </label>
                  {comp.subCompetencyNames && comp.subCompetencyNames.length > 0 && (
                    <span className="text-gray-500 text-sm mt-1 block">
                      {comp.subCompetencyNames.join(', ')}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteCompetencyLibrary(comp.id)}
                  disabled={deletingIds.has(comp.id)}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-transparent hover:border-red-200"
                  title="Delete competency library"
                >
                  {deletingIds.has(comp.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
          {competencies.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-gray-500 font-medium">No competency libraries found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SelectCompetenciesStep;