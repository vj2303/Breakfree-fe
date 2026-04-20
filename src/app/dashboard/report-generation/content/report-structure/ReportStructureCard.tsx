"use client"
import React, { useState } from 'react'

interface ReportStructureCardProps {
  id: string
  title: string
  createdDate: string
  description: string
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const ReportStructureCard: React.FC<ReportStructureCardProps> = ({
  id,
  title,
  createdDate,
  description,
  onEdit,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false)

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowMenu(!showMenu)
  }

  const handleEdit = () => {
    onEdit(id)
    setShowMenu(false)
  }

  const handleDelete = () => {
    onDelete(id)
    setShowMenu(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 relative hover:border-gray-300 transition-colors">
      {/* Three dots menu */}
      <div className="absolute top-3 right-3">
        <button
          onClick={handleMenuToggle}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>
        
        {/* Dropdown menu */}
        {showMenu && (
          <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[100px]">
            <button
              onClick={handleEdit}
              className="w-full px-3 py-1.5 text-left text-xs text-black hover:bg-gray-50 first:rounded-t-lg"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-gray-50 last:rounded-b-lg"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="pr-6">
        {/* Icon */}
        <div className="mb-3">
          <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center">
            <svg
              className="w-4 h-4 text-black"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-black mb-1.5">
          {title}
        </h3>

        {/* Date */}
        <p className="text-xs text-gray-500 mb-2">
          Created on {createdDate}
        </p>

        {/* Description */}
        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  )
}

export default ReportStructureCard
