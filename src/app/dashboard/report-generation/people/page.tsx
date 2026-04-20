'use client';
import React, { useState, useEffect, useCallback } from 'react';
import GroupsComponent from './Groups';
import ParticipantsComponent from './Participants';
import UsersComponent from './Users';
import { API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

// Updated interfaces
interface Participant {
  id: string;
  name: string;
  email: string;
  designation: string;
  managerName: string;
}

interface Group {
  id: string;
  name: string;
  admin: string;
  adminEmail: string;
  members?: string[];
  participantIds?: string[];
  participants?: Participant[];
}

// Note: User interface will be added when UsersComponent requires it

const PeopleManagement = () => {
  const [tab, setTab] = useState<'groups' | 'participants' | 'assessors'>('groups');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantsError, setParticipantsError] = useState<string | null>(null);
  // Note: users state will be added when UsersComponent requires it

  // Helper to get token
  const getAuthToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || '';
    }
    return '';
  };

  // Fetch groups from API
  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL_WITH_API}/groups?page=1&limit=100&search=`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (result.success && result.data && result.data.groups) {
        // Map groups to include both participants array and participantIds for compatibility
        const mappedGroups = result.data.groups.map((group: any) => ({
          ...group,
          members: group.participantIds || [],
          participantIds: group.participantIds || [],
          participants: group.participants || []
        }));
        setGroups(mappedGroups);
      } else {
        setGroupsError(result.message || 'Failed to fetch groups');
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      setGroupsError('Error fetching groups');
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  // Fetch participants from API
  const fetchParticipants = useCallback(async () => {
    setParticipantsLoading(true);
    setParticipantsError(null);
    try {
      const token = getAuthToken();
      const url = new URL(`${API_BASE_URL_WITH_API}/participants`);
      url.searchParams.append('page', '1');
      url.searchParams.append('limit', '100');
      url.searchParams.append('search', '');
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await res.json();
      if (result.success && result.data && result.data.participants) {
        setParticipants(result.data.participants);
      } else {
        setParticipantsError(result.message || 'Failed to fetch participants');
      }
    } catch (err) {
      console.error('Error fetching participants:', err);
      setParticipantsError('Error fetching participants');
    } finally {
      setParticipantsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
    fetchParticipants();
  }, [fetchGroups, fetchParticipants]);

  // Handlers for Participants
  const handleAddParticipant = async (newParticipant: Omit<Participant, 'id'>) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('You must be logged in to add a participant.');
        return;
      }
      const res = await fetch('/api/participants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newParticipant),
      });
      const result = await res.json();
      if (!result.success) {
        alert(result.message || 'Failed to add participant');
      }
    } catch (err) {
      console.error('Error adding participant:', err);
      alert('Error adding participant');
    }
  };

  const handleEditParticipant = () => {
    // Optionally implement API PATCH here if needed
  };

  const handleRemoveParticipant = () => {
    // Optionally implement API DELETE here if needed
  };

  // Handlers for Groups (API-based)
  const handleAddGroup = async (newGroup: Omit<Group, 'id'>) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL_WITH_API}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newGroup.name,
          admin: newGroup.admin,
          adminEmail: newGroup.adminEmail,
          participantIds: newGroup.members,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetchGroups();
      } else {
        alert(result.message || 'Failed to add group');
      }
    } catch (err) {
      console.error('Error adding group:', err);
      alert('Error adding group');
    }
  };

  const handleEditGroup = async (id: string, groupData: Omit<Group, 'id'>) => {
    try {
      const token = getAuthToken();
      if (!token) {
        alert('You must be logged in to edit a group.');
        return;
      }
      const res = await fetch(`${API_BASE_URL_WITH_API}/groups/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: groupData.name,
          admin: groupData.admin,
          adminEmail: groupData.adminEmail,
          participantIds: groupData.members,
        }),
      });
      const result = await res.json();
      if (result.success) {
        fetchGroups(); // Refresh groups list
      } else {
        alert(result.message || 'Failed to update group');
      }
    } catch (err) {
      console.error('Error updating group:', err);
      alert('Error updating group');
    }
  };

  const handleRemoveGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) {
      return;
    }
    try {
      const token = getAuthToken();
      if (!token) {
        alert('You must be logged in to delete a group.');
        return;
      }
      const res = await fetch(`${API_BASE_URL_WITH_API}/groups/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await res.json();
      if (result.success) {
        fetchGroups(); // Refresh groups list
      } else {
        alert(result.message || 'Failed to delete group');
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Error deleting group');
    }
  };

  // Note: handleEditGroupMembers will be implemented when needed
  // Note: User handlers will be implemented when UsersComponent requires them

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-1 text-black">People Management</h1>
      <p className="text-black mb-4">Manage your groups and participants efficiently</p>
      
      <div className="flex gap-2 mb-6">
        <button
          className={`px-6 py-2 rounded-full transition-colors ${tab === 'groups' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
          onClick={() => setTab('groups')}
        >
          Groups
        </button>
        <button
          className={`px-6 py-2 rounded-full transition-colors ${tab === 'participants' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
          onClick={() => setTab('participants')}
        >
          Participants
        </button>
        <button
          className={`px-6 py-2 rounded-full transition-colors ${tab === 'assessors' ? 'bg-gray-700 text-white' : 'bg-gray-100 text-black hover:bg-gray-200'}`}
          onClick={() => setTab('assessors')}
        >
          Assessors
        </button>
      </div>

      {/* Keep all tabs mounted to avoid re-fetching on toggle */}
      <div className={tab === 'groups' ? '' : 'hidden'}>
        {groupsLoading ? (
          <div className="text-gray-500">Loading groups...</div>
        ) : groupsError ? (
          <div className="text-red-500">{groupsError}</div>
        ) : participantsLoading ? (
          <div className="text-gray-500">Loading participants...</div>
        ) : participantsError ? (
          <div className="text-red-500">{participantsError}</div>
        ) : (
          <GroupsComponent
            groups={groups}
            participants={participants}
            onAddGroup={handleAddGroup}
            onEditGroup={handleEditGroup}
            onRemoveGroup={handleRemoveGroup}
          />
        )}
      </div>
      <div className={tab === 'participants' ? '' : 'hidden'}>
        <ParticipantsComponent
          onAddParticipant={handleAddParticipant}
          onEditParticipant={handleEditParticipant}
          onRemoveParticipant={handleRemoveParticipant}
        />
      </div>
      <div className={tab === 'assessors' ? '' : 'hidden'}>
        <UsersComponent />
      </div>
    </div>
  );
};

export default PeopleManagement;