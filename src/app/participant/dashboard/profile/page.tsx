'use client'

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, User, Mail, Briefcase, Users, Calendar } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  admin: string;
  adminEmail: string;
  participantIds: string[];
  createdAt: string;
  updatedAt: string;
}

interface ParticipantProfile {
  id: string;
  name: string;
  email: string;
  designation: string;
  managerName: string | null;
  userCode?: string;
  createdAt: string;
  updatedAt: string;
  groups?: Group[];
}

const ParticipantProfilePage: React.FC = () => {
  const router = useRouter();
  const { token, participantId, assignments, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const currentParticipantId = participantId || assignments?.participant?.id;
    if (!token || !currentParticipantId) {
      if (!token) setError('Authentication token not available. Please log in again.');
      else if (!currentParticipantId) setError('Participant ID not available. Please try refreshing the page.');
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for the same participant
    if (lastFetchedIdRef.current === currentParticipantId) return;
    lastFetchedIdRef.current = currentParticipantId;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/participants/${currentParticipantId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const result = await response.json();

        if (result.success && result.data) {
          setProfile(result.data);
        } else {
          setError(result.message || 'Failed to fetch profile');
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('An error occurred while fetching profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [participantId, token, authLoading, assignments?.participant?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-gray-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm text-gray-600">Loading profile...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="w-full">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">No profile data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-gray-600 hover:text-black mb-3 text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <h1 className="text-2xl font-semibold text-black mb-1.5">My Profile</h1>
          <p className="text-sm text-gray-600">
            View and manage your participant profile information
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          {/* Profile Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-black">{profile.name}</h2>
                <p className="text-sm text-gray-600">{profile.designation}</p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-6 space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-base font-semibold text-black mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.userCode && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Employee ID</p>
                      <p className="text-sm text-black font-mono font-semibold">{profile.userCode}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-black">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Designation</p>
                    <p className="text-sm text-black">{profile.designation}</p>
                  </div>
                </div>
                {profile.managerName && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Manager</p>
                      <p className="text-sm text-black">{profile.managerName}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Member Since</p>
                    <p className="text-sm text-black">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Groups Information */}
            {profile.groups && profile.groups.length > 0 && (
              <div>
                <h3 className="text-base font-semibold text-black mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Groups ({profile.groups.length})
                </h3>
                <div className="space-y-3">
                  {profile.groups.map((group) => (
                    <div
                      key={group.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-black mb-1">{group.name}</h4>
                          <div className="space-y-1 text-xs text-gray-600">
                            <p>
                              <span className="font-medium">Admin:</span> {group.admin}
                            </p>
                            <p>
                              <span className="font-medium">Admin Email:</span> {group.adminEmail}
                            </p>
                            <p>
                              <span className="font-medium">Members:</span> {group.participantIds.length}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Information */}
            <div>
              <h3 className="text-base font-semibold text-black mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Participant ID</p>
                  <p className="text-sm text-black font-mono">{profile.id}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                  <p className="text-sm text-black">{formatDate(profile.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantProfilePage;

