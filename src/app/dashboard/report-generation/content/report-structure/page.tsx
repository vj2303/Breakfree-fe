"use client"
import React, { useState, useEffect } from 'react'
import ReportStructureCard from './ReportStructureCard'
import CreateReportForm from './CreateReportForm'
import { ReportStructureApi, ReportStructure, PaginationInfo } from '../../../../../lib/reportStructureApi'
import { useAuth } from '../../../../../context/AuthContext'

interface DisplayReportStructure {
  id: string
  title: string
  createdDate: string
  description: string
}

export default function ReportStructurePage() {
  const { token } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [reportStructures, setReportStructures] = useState<DisplayReportStructure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [editingReport, setEditingReport] = useState<ReportStructure | null>(null)
  const [editLoading, setEditLoading] = useState(false)

  // Fetch report structures on component mount
  useEffect(() => {
    const fetchReportStructures = async () => {
      if (!token) {
        setError('Authentication required')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        const response = await ReportStructureApi.getReportStructures(token, {
          page: currentPage,
          limit: 10,
          search: searchTerm || undefined
        })
        
        if (response.success && response.data) {
          // Convert API data to display format
          const displayReports = response.data.reportStructures.map((report: ReportStructure) => ({
            id: report.id,
            title: report.reportName,
            createdDate: new Date(report.createdAt || '').toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            }),
            description: report.description
          }))
          
          setReportStructures(displayReports)
          setPagination(response.data.pagination)
        } else {
          setError(response.message || 'Failed to fetch report structures')
        }
      } catch (err) {
        setError('An unexpected error occurred')
        console.error('Error fetching report structures:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReportStructures()
  }, [token, currentPage, searchTerm])

  const handleCreateReport = () => {
    setShowCreateForm(true)
  }

  const handleCancelCreate = () => {
    setShowCreateForm(false)
    setEditingReport(null)
  }

  const handleSaveReport = (data: ReportStructure) => {
    // Handle saving the report structure
    console.log(`Report structure ${editingReport ? 'updated' : 'created'} successfully:`, data)
    
    if (editingReport) {
      // Update existing report in the list
      setReportStructures(prev => prev.map(report => 
        report.id === editingReport.id 
          ? {
              id: data.id,
              title: data.reportName,
              createdDate: new Date(data.updatedAt || data.createdAt || new Date().toISOString()).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              }),
              description: data.description
            }
          : report
      ))
    } else {
      // Add new report to the list
      const newReport = {
        id: data.id,
        title: data.reportName,
        createdDate: new Date(data.createdAt || new Date().toISOString()).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }),
        description: data.description
      }
      
      setReportStructures(prev => [newReport, ...prev])
    }
    
    setShowCreateForm(false)
    setEditingReport(null)
  }

  const handleEditReport = async (id: string) => {
    if (!token) {
      setError('Authentication required')
      return
    }

    try {
      setEditLoading(true)
      setError(null)
      
      const response = await ReportStructureApi.getReportStructure(token, id)
      
      if (response.success && response.data) {
        setEditingReport(response.data)
        setShowCreateForm(true)
      } else {
        setError(response.message || 'Failed to fetch report structure for editing')
      }
    } catch (err) {
      setError('An unexpected error occurred while fetching the report structure')
      console.error('Error fetching report structure:', err)
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!token) {
      setError('Authentication required')
      return
    }

    try {
      const response = await ReportStructureApi.deleteReportStructure(token, id)
      
      if (response.success) {
        // Remove from local state
        setReportStructures(prev => prev.filter(report => report.id !== id))
      } else {
        setError(response.message || 'Failed to delete report structure')
      }
    } catch (err) {
      setError('An unexpected error occurred while deleting the report structure')
      console.error('Error deleting report structure:', err)
    }
  }

  if (showCreateForm) {
    if (editLoading) {
      return (
        <div className="py-4">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
            <span className="ml-3 text-sm text-gray-600">Loading report structure for editing...</span>
          </div>
        </div>
      )
    }
    return <CreateReportForm onCancel={handleCancelCreate} onSave={handleSaveReport} editingReport={editingReport} />
  }

  return (
    <div className="py-4">
      {/* Section Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-black">Report Structures</h2>
        <button
          onClick={handleCreateReport}
          disabled={!token}
          className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Report
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search report structures..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 pl-9 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-black focus:border-black text-sm"
          />
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 flex-1">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <span className="ml-3 text-sm text-gray-600">Loading report structures...</span>
        </div>
      ) : (
        <>
          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportStructures.map((report) => (
              <ReportStructureCard
                key={report.id}
                id={report.id}
                title={report.title}
                createdDate={report.createdDate}
                description={report.description}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
              />
            ))}
          </div>

          {/* Empty State */}
          {reportStructures.length === 0 && !loading && (
            <div className="text-center py-8">
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-black">No report structures</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new report structure.</p>
              <div className="mt-4">
                <button
                  onClick={handleCreateReport}
                  disabled={!token}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  Create Report Structure
                </button>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.totalItems)} of {pagination.totalItems} results
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const pageNum = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i;
                  if (pageNum > pagination.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md ${
                        pageNum === currentPage
                          ? 'bg-black text-white'
                          : 'text-gray-600 bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
