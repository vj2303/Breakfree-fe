'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchCompetencyLibraries,
  createCompetencyLibrary,
  updateCompetencyLibrary,
  deleteCompetencyLibrary
} from '@/lib/competencyLibraryApi';

interface SubCompetency {
  id: string;
  text: string;
}

interface CompetencyLibrary {
  id: string;
  name: string;
  createdOn: string;
  competencies: Competency[];
}

interface Competency {
  id: string;
  name: string;
  subCompetencies: SubCompetency[];
}

interface LibraryData {
  id: string;
  competencyName: string;
  createdAt: string;
  subCompetencyNames?: string[];
}

const CompetencyLibrary: React.FC = () => {
  const [libraries, setLibraries] = useState<CompetencyLibrary[]>([]);
  const [showCreateCompetency, setShowCreateCompetency] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newCompetency, setNewCompetency] = useState({
    name: '',
    subCompetencies: [{ id: '1', text: '' }] as SubCompetency[]
  });
  const [expandedLibraryId, setExpandedLibraryId] = useState<string | null>(null);
  const [editCompetency, setEditCompetency] = useState({
    name: '',
    subCompetencies: [{ id: '1', text: '' }] as SubCompetency[]
  });
  const [editLibraryId, setEditLibraryId] = useState<string | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    libraryId: string | null;
    libraryName: string;
  }>({
    isOpen: false,
    libraryId: null,
    libraryName: ''
  });

  // Helper function to get auth token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      return token ? `Bearer ${token}` : '';
    }
    return '';
  };

  // Fetch libraries - wrapped in useCallback to stabilize reference
  const loadLibraries = useCallback(async (search = '') => {
    setLoading(true);
    try {
      const authToken = getAuthToken();
      const data = await fetchCompetencyLibraries(search, authToken);
      const libs = Array.isArray(data?.data?.competencyLibraries)
        ? data.data.competencyLibraries.map((lib: LibraryData) => ({
            id: lib.id,
            name: lib.competencyName,
            createdOn: new Date(lib.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            }),
            competencies: [
              {
                id: lib.id + '-main',
                name: lib.competencyName,
                subCompetencies: (lib.subCompetencyNames || []).map((sub: string, idx: number) => ({
                  id: `${lib.id}-sub-${idx}`,
                  text: sub
                }))
              }
            ]
          }))
        : [];
      setLibraries(libs);
    } catch {
      // handle error
      setLibraries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibraries(searchTerm);
  }, [searchTerm, loadLibraries]);

  const handleCreateCompetency = async () => {
    if (!newCompetency.name.trim()) return;
    const validSubCompetencies = newCompetency.subCompetencies.filter(sub => sub.text.trim());
    const subCompetencyNames = validSubCompetencies.map(sub => sub.text);
    try {
      const authToken = getAuthToken();
      await createCompetencyLibrary(newCompetency.name, subCompetencyNames, authToken);
      setShowCreateCompetency(false);
      setNewCompetency({ name: '', subCompetencies: [{ id: '1', text: '' }] });
      loadLibraries();
    } catch {
      // handle error
    }
  };

  const openDeleteConfirmation = (library: CompetencyLibrary) => {
    setDeleteConfirmation({
      isOpen: true,
      libraryId: library.id,
      libraryName: library.name
    });
    setDropdownOpen(null);
  };

  const handleDeleteLibrary = async () => {
    if (!deleteConfirmation.libraryId) return;
    
    try {
      setLoading(true);
      const authToken = getAuthToken();
      await deleteCompetencyLibrary(deleteConfirmation.libraryId, authToken);
      setDeleteConfirmation({ isOpen: false, libraryId: null, libraryName: '' });
      loadLibraries();
    } catch (error) {
      console.error('Error deleting library:', error);
      // You could add error state handling here
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubCompetency = () => {
    setNewCompetency(prev => ({
      ...prev,
      subCompetencies: [
        ...prev.subCompetencies,
        { id: (prev.subCompetencies.length + 1).toString(), text: '' }
      ]
    }));
  };

  const handleSubCompetencyChange = (index: number, value: string) => {
    setNewCompetency(prev => ({
      ...prev,
      subCompetencies: prev.subCompetencies.map((sub, i) => 
        i === index ? { ...sub, text: value } : sub
      )
    }));
  };

  const handleEditLibrary = (library: CompetencyLibrary) => {
    setEditLibraryId(library.id);
    setEditCompetency({
      name: library.name,
      subCompetencies: library.competencies[0]?.subCompetencies.map((sub, idx) => ({
        id: (idx + 1).toString(),
        text: sub.text
      })) || [{ id: '1', text: '' }]
    });
  };

  const handleUpdateCompetency = async () => {
    if (!editCompetency.name.trim() || !editLibraryId) return;
    const validSubCompetencies = editCompetency.subCompetencies.filter(sub => sub.text.trim());
    const subCompetencyNames = validSubCompetencies.map(sub => sub.text);
    try {
      const authToken = getAuthToken();
      await updateCompetencyLibrary(editLibraryId, editCompetency.name, subCompetencyNames, authToken);
      setEditLibraryId(null);
      setEditCompetency({ name: '', subCompetencies: [{ id: '1', text: '' }] });
      loadLibraries();
    } catch {
      // handle error
    }
  };

  const filteredLibraries = libraries.filter(library =>
    library.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleDropdown = (libraryId: string) => {
    setDropdownOpen(dropdownOpen === libraryId ? null : libraryId);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-black">Competency Library</h2>
        </div>
        <div className="relative">
          <input
            className="border border-gray-300 rounded-full px-4 py-2 pl-10 w-80 text-black"
            placeholder="Search by competency name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <svg className="w-4 h-4 absolute left-3 top-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Library Card */}
          <div
            className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setShowCreateCompetency(true)}
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-black font-medium">Create Competency</span>
          </div>

          {/* Library Cards */}
          {filteredLibraries.map((library) => (
            <div key={library.id} className="bg-white border border-gray-200 rounded-lg p-6 relative">
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => toggleDropdown(library.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                  </svg>
                </button>
                {dropdownOpen === library.id && (
                  <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    <button
                      onClick={() => {
                        setExpandedLibraryId(library.id === expandedLibraryId ? null : library.id);
                        setDropdownOpen(null);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-black hover:bg-gray-50"
                    >
                      {expandedLibraryId === library.id ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => {
                        handleEditLibrary(library);
                        setDropdownOpen(null);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirmation(library)}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold text-black mb-2 pr-8 cursor-pointer" onClick={() => setExpandedLibraryId(library.id === expandedLibraryId ? null : library.id)}>{library.name}</h3>
              <p className="text-sm text-gray-600 mb-2">Created on {library.createdOn}</p>
              {library.competencies.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-black mb-2">Competencies ({library.competencies.length}):</p>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {library.competencies.slice(0, 3).map((comp) => (
                      <div key={comp.id} className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded">
                        {comp.name}
                      </div>
                    ))}
                    {library.competencies.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{library.competencies.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Expanded view for competencies and sub-competencies */}
              {expandedLibraryId === library.id && (
                <div className="mt-4 border-t pt-4">
                  {library.competencies.map((comp) => (
                    <div key={comp.id} className="mb-2">
                      <div className="font-semibold text-black">{comp.name}</div>
                      <ul className="list-disc ml-6 text-gray-700">
                        {comp.subCompetencies.map((sub) => (
                          <li key={sub.id}>{sub.text}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Competency Modal */}
      {showCreateCompetency && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="font-bold mb-4 text-xl text-black">Add Competency to Library</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Competency Name</label>
                <input
                  className="border w-full p-3 rounded-lg text-black"
                  placeholder="Enter competency name"
                  value={newCompetency.name}
                  onChange={(e) => setNewCompetency({ ...newCompetency, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Sub competency</label>
                {newCompetency.subCompetencies.map((sub, index) => (
                  <div key={sub.id} className="mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-black min-w-[20px]">{index + 1}.</span>
                      <input
                        className="border flex-1 p-2 rounded text-black"
                        placeholder="Enter sub competency"
                        value={sub.text}
                        onChange={(e) => handleSubCompetencyChange(index, e.target.value)}
                      />
                      {newCompetency.subCompetencies.length > 1 && (
                        <button
                          onClick={() => {
                            setNewCompetency(prev => ({
                              ...prev,
                              subCompetencies: prev.subCompetencies.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove sub competency"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleAddSubCompetency}
                  className="text-blue-600 text-sm flex items-center gap-1 mt-2 hover:text-blue-800"
                >
                  <span>+</span> Add Sub Competency
                </button>
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button
                className="bg-gray-800 text-white px-8 py-2 rounded-lg hover:bg-gray-900 transition-colors"
                onClick={handleCreateCompetency}
                disabled={!newCompetency.name.trim()}
              >
                Done
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-6 py-2 text-black hover:bg-gray-100 rounded transition-colors"
                onClick={() => {
                  setShowCreateCompetency(false);
                  setNewCompetency({ name: '', subCompetencies: [{ id: '1', text: '' }] });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Competency Modal */}
      {editLibraryId && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="font-bold mb-4 text-xl text-black">Edit Competency Library</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Competency Name</label>
                <input
                  className="border w-full p-3 rounded-lg text-black"
                  placeholder="Enter competency name"
                  value={editCompetency.name}
                  onChange={(e) => setEditCompetency({ ...editCompetency, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-black">Sub competency</label>
                {editCompetency.subCompetencies.map((sub, index) => (
                  <div key={sub.id} className="mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-black min-w-[20px]">{index + 1}.</span>
                      <input
                        className="border flex-1 p-2 rounded text-black"
                        placeholder="Enter sub competency"
                        value={sub.text}
                        onChange={(e) => setEditCompetency(prev => ({
                          ...prev,
                          subCompetencies: prev.subCompetencies.map((s, i) => i === index ? { ...s, text: e.target.value } : s)
                        }))}
                      />
                      {editCompetency.subCompetencies.length > 1 && (
                        <button
                          onClick={() => {
                            setEditCompetency(prev => ({
                              ...prev,
                              subCompetencies: prev.subCompetencies.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Remove sub competency"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => setEditCompetency(prev => ({
                    ...prev,
                    subCompetencies: [
                      ...prev.subCompetencies,
                      { id: (prev.subCompetencies.length + 1).toString(), text: '' }
                    ]
                  }))}
                  className="text-blue-600 text-sm flex items-center gap-1 mt-2 hover:text-blue-800"
                >
                  <span>+</span> Add Sub Competency
                </button>
              </div>
            </div>
            <div className="flex justify-center mt-6">
              <button
                className="bg-gray-800 text-white px-8 py-2 rounded-lg hover:bg-gray-900 transition-colors"
                onClick={handleUpdateCompetency}
                disabled={!editCompetency.name.trim()}
              >
                Save
              </button>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-6 py-2 text-black hover:bg-gray-100 rounded transition-colors"
                onClick={() => {
                  setEditLibraryId(null);
                  setEditCompetency({ name: '', subCompetencies: [{ id: '1', text: '' }] });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="font-bold mb-4 text-xl text-black">Delete Competency Library</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <span className="font-semibold">&quot;{deleteConfirmation.libraryName}&quot;</span>? 
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                onClick={() => setDeleteConfirmation({ isOpen: false, libraryId: null, libraryName: '' })}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                onClick={handleDeleteLibrary}
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

export default CompetencyLibrary;