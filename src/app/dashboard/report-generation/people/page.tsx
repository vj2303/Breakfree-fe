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

  // Members who have finished every activity assigned to them, per group.
  const [progressByGroup, setProgressByGroup] = useState<Map<string, { done: number; total: number }>>(
    new Map()
  );
  const [progressLoading, setProgressLoading] = useState(false);

  /** Runs `task` over `items` a few at a time so a large cohort cannot flood the API. */
  const mapWithConcurrency = async <T, R>(
    items: T[],
    limit: number,
    task: (item: T) => Promise<R>
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index]);
      }
    });
    await Promise.all(workers);
    return results;
  };

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

  // Group progress: one assignments lookup per distinct member, reused across groups.
  useEffect(() => {
    if (groups.length === 0) return;
    let cancelled = false;

    const loadProgress = async () => {
      const token = getAuthToken();
      if (!token) return;

      const memberIds = Array.from(
        new Set(
          groups.flatMap(
            (group) =>
              group.members || group.participantIds || group.participants?.map((p) => p.id) || []
          )
        )
      );
      if (memberIds.length === 0) return;

      setProgressLoading(true);
      try {
        const entries = await mapWithConcurrency(memberIds, 4, async (participantId) => {
          try {
            const res = await fetch(
              `${API_BASE_URL_WITH_API}/assignments/participant/${participantId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const json = res.ok ? await res.json() : null;
            const assignments: any[] = json?.data?.assignments || [];
            const activities = assignments.flatMap((a: any) => a.activities || []);
            const done =
              activities.length > 0 && activities.every((a: any) => Boolean(a.isSubmitted));
            return [participantId, done] as const;
          } catch {
            return [participantId, false] as const;
          }
        });

        if (cancelled) return;
        const doneById = new Map(entries);
        const next = new Map<string, { done: number; total: number }>();
        groups.forEach((group) => {
          const ids =
            group.members || group.participantIds || group.participants?.map((p) => p.id) || [];
          next.set(group.id, {
            done: ids.filter((id) => doneById.get(id)).length,
            total: ids.length,
          });
        });
        setProgressByGroup(next);
      } finally {
        if (!cancelled) setProgressLoading(false);
      }
    };

    loadProgress();
    return () => {
      cancelled = true;
    };
  }, [groups]);

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
      // Filter participant IDs to only include those that exist in the current participants list
      const validParticipantIds = (newGroup.members || []).filter(id =>
        participants.some(p => p.id === id)
      );
      const payload = {
        name: newGroup.name,
        admin: newGroup.admin,
        adminEmail: newGroup.adminEmail,
        participantIds: validParticipantIds,
      };
      console.log('Sending to API:', payload);
      console.log('Participants available:', participants);
      const res = await fetch(`${API_BASE_URL_WITH_API}/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      console.log('API response:', result);
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
      // Filter participant IDs to only include those that exist in the current participants list
      const validParticipantIds = (groupData.members || []).filter(id =>
        participants.some(p => p.id === id)
      );
      const payload = {
        name: groupData.name,
        admin: groupData.admin,
        adminEmail: groupData.adminEmail,
        participantIds: validParticipantIds,
      };
      console.log('Editing group - Sending to API:', payload);
      console.log('Editing group - Participants available:', participants);
      const res = await fetch(`${API_BASE_URL_WITH_API}/groups/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      console.log('Editing group - API response:', result);
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

  const TAB_COPY: Record<typeof tab, string> = {
    groups: "Manage the assessment groups you run and who's admin for each",
    participants: 'Add, edit and organise the people being assessed',
    assessors: 'Manage the assessors who score submissions',
  };

  const TABS: Array<{ id: typeof tab; label: string }> = [
    { id: 'groups', label: 'Groups' },
    { id: 'participants', label: 'Participants' },
    { id: 'assessors', label: 'Assessors' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafd] p-6">
      <h1 className="text-3xl font-bold text-black">People Management</h1>
      <p className="mt-1 text-sm text-gray-500">{TAB_COPY[tab]}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        {TABS.map((item) => {
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-black hover:bg-gray-50'
              }`}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Keep all tabs mounted to avoid re-fetching on toggle */}
      <div className={tab === 'groups' ? 'mt-6' : 'hidden'}>
        {groupsLoading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
            {[0, 1].map((row) => (
              <div key={row} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="h-5 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                <div className="mt-5 h-2 w-full animate-pulse rounded-full bg-gray-200" />
                <div className="mt-6 flex gap-3">
                  <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-100" />
                  <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : groupsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {groupsError}
          </div>
        ) : participantsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {participantsError}
          </div>
        ) : (
          <GroupsComponent
            groups={groups}
            participants={participants}
            progressByGroup={progressByGroup}
            progressLoading={progressLoading}
            onAddGroup={handleAddGroup}
            onEditGroup={handleEditGroup}
            onRemoveGroup={handleRemoveGroup}
          />
        )}
      </div>
      <div className={tab === 'participants' ? 'mt-6' : 'hidden'}>
        <ParticipantsComponent
          onAddParticipant={handleAddParticipant}
          onEditParticipant={handleEditParticipant}
          onRemoveParticipant={handleRemoveParticipant}
        />
      </div>
      <div className={tab === 'assessors' ? 'mt-6' : 'hidden'}>
        <UsersComponent />
      </div>
    </div>
  );
};

export default PeopleManagement;