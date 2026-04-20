import React, { useState } from 'react';
import { API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

interface Assessor {
  id: string;
  name: string;
  email: string;
  designation: string;
  accessLevel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const UsersComponent: React.FC = () => {
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editingAssessorId, setEditingAssessorId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    designation: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk selection state for assessors
  const [selectedAssessorIds, setSelectedAssessorIds] = useState<string[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: string; error?: string } | null>(null);

  // Get auth token (mock, similar to Participants)
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  };

  // Fetch assessors from API
  const fetchAssessors = React.useCallback(async (page = 1, search = '') => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${API_BASE_URL_WITH_API}/assessors`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', pagination.itemsPerPage.toString());
      url.searchParams.append('search', search);
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch assessors');
      }
      setAssessors(data.data.assessors || []);
      setPagination(data.data.pagination || {
        currentPage: page,
        totalPages: 1,
        totalItems: data.data.assessors?.length || 0,
        itemsPerPage: pagination.itemsPerPage
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assessors');
      setAssessors([]);
      setPagination({ currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: pagination.itemsPerPage });
    } finally {
      setLoading(false);
    }
  }, [pagination.itemsPerPage]);

  // Add or update assessor via API
  const createOrUpdateAssessor = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let response, data;
      if (isEdit && editingAssessorId) {
        response = await fetch(`${API_BASE_URL_WITH_API}/assessors/${editingAssessorId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: form.name, designation: form.designation }),
        });
        data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to update assessor');
        }
      } else {
        response = await fetch(`${API_BASE_URL_WITH_API}/assessors`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        });
        data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to create assessor');
        }
      }
      setShowModal(false);
      setForm({ name: '', email: '', designation: '' });
      setIsEdit(false);
      setEditingAssessorId(null);
      await fetchAssessors(pagination.currentPage, searchTerm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save assessor');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk email sending function for assessors
  const sendBulkEmail = async () => {
    setIsSendingEmail(true);
    setEmailStatus(null);
    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/assessors/send-bulk-login-credentials`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessorIds: selectedAssessorIds,
          customMessage: "Welcome to the Assessment Platform! You have been assigned as an assessor. Please check your email for login credentials."
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to send emails');
      }
      setEmailStatus({ success: 'Emails sent successfully!' });
      setSelectedAssessorIds([]);
    } catch (err) {
      setEmailStatus({ error: err instanceof Error ? err.message : 'Failed to send emails' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Checkbox logic for assessors
  const isAllSelected = assessors.length > 0 && selectedAssessorIds.length === assessors.length;
  const isIndeterminate = selectedAssessorIds.length > 0 && !isAllSelected;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedAssessorIds([]);
    } else {
      setSelectedAssessorIds(assessors.map(u => u.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedAssessorIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // Pagination and search
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages && !loading) {
      fetchAssessors(newPage, searchTerm);
    }
  };

  React.useEffect(() => {
    fetchAssessors(1, '');
  }, [fetchAssessors]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAssessors(1, searchTerm);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, fetchAssessors]);

  // Open modal for add
  const openAddModal = () => {
    setForm({ name: '', email: '', designation: '' });
    setIsEdit(false);
    setEditingAssessorId(null);
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = (assessor: Assessor) => {
    setForm({ name: assessor.name, email: assessor.email, designation: assessor.designation });
    setIsEdit(true);
    setEditingAssessorId(assessor.id);
    setShowModal(true);
  };

  // Delete assessor
  const deleteAssessor = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this assessor?')) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/assessors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete assessor');
      }
      await fetchAssessors(pagination.currentPage, searchTerm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete assessor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-black">All Assessors</h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search assessors..."
            className="border px-3 py-2 rounded-lg text-black"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button className="bg-gray-800 text-white px-4 py-2 rounded-full shadow" onClick={openAddModal}>
            + Add Assessor
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-full shadow disabled:opacity-50 flex items-center gap-2"
            onClick={sendBulkEmail}
            disabled={selectedAssessorIds.length === 0 || isSendingEmail}
            title="Send login credentials to selected assessors"
          >
            {isSendingEmail ? (
              <span>Sending...</span>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75m19.5 0v.243a2.25 2.25 0 01-.659 1.591l-7.5 7.5a2.25 2.25 0 01-3.182 0l-7.5-7.5A2.25 2.25 0 012.25 6.993V6.75" />
                </svg>
                <span>Send Email</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Email Status Feedback */}
      {emailStatus?.success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {emailStatus.success}
          <button className="ml-2 text-sm underline" onClick={() => setEmailStatus(null)}>Dismiss</button>
        </div>
      )}
      {emailStatus?.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {emailStatus.error}
          <button className="ml-2 text-sm underline" onClick={() => setEmailStatus(null)}>Dismiss</button>
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button className="ml-2 text-sm underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="text-gray-500">Loading assessors...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-3 text-left text-xs font-medium text-black">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={handleSelectAll}
                    disabled={assessors.length === 0}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">E-mail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Access Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assessors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No assessors found
                  </td>
                </tr>
              ) : (
                assessors.map((assessor) => (
                  <tr key={assessor.id} className="hover:bg-gray-50">
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-black">
                      <input
                        type="checkbox"
                        checked={selectedAssessorIds.includes(assessor.id)}
                        onChange={() => handleSelectOne(assessor.id)}
                        disabled={isSendingEmail}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">{assessor.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{assessor.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{assessor.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-black">{assessor.accessLevel}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                          onClick={() => openEditModal(assessor)}
                          disabled={isSubmitting}
                          title="Edit Assessor"
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          onClick={() => deleteAssessor(assessor.id)}
                          disabled={isSubmitting}
                          title="Delete Assessor"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <div className="text-sm text-gray-500">
          Showing {assessors.length} of {pagination.totalItems} assessors
          {searchTerm && ` matching "${searchTerm}"`}
        </div>
        <div className="flex gap-2 items-center">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handlePageChange(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1 || loading}
          >
            Previous
          </button>
          <span className="px-3 py-1 border rounded bg-gray-100 text-sm">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handlePageChange(pagination.currentPage + 1)}
            disabled={pagination.currentPage >= pagination.totalPages || loading}
          >
            Next
          </button>
        </div>
      </div>
      {/* Add/Edit Assessor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="font-bold mb-4 text-xl text-black">{isEdit ? 'Edit Assessor' : 'Add Assessor'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Name*</label>
                <input
                  className="border w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter assessor name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Email*</label>
                <input
                  className="border w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  disabled={isSubmitting || isEdit}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Designation*</label>
                <input
                  className="border w-full p-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter designation"
                  value={form.designation}
                  onChange={e => setForm({ ...form, designation: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                className="px-6 py-2 text-black hover:bg-gray-100 rounded disabled:opacity-50"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                onClick={createOrUpdateAssessor}
                disabled={isSubmitting}
              >
                {isSubmitting ? (isEdit ? 'Updating...' : 'Adding...') : (isEdit ? 'Update Assessor' : 'Add Assessor')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersComponent; 