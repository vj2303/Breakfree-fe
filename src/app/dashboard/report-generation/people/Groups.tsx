'use client';
import React, { useState } from 'react';
import { ArrowRight, Plus, Search, Trash2 } from 'lucide-react';

import ActionMenu from '@/components/ui/ActionMenu';

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
  /** Optional close date, if the backend ever supplies one. */
  deadline?: string;
  closesAt?: string;
  endDate?: string;
}

/** Members who have finished every activity assigned to them. */
export interface GroupProgress {
  done: number;
  total: number;
}

interface GroupsComponentProps {
  groups: Group[];
  participants: Participant[];
  progressByGroup?: Map<string, GroupProgress>;
  progressLoading?: boolean;
  onAddGroup: (group: Omit<Group, 'id'>) => void;
  onEditGroup: (id: string, group: Omit<Group, 'id'>) => void;
  onRemoveGroup: (id: string) => void;
}

type GroupStatus = 'complete' | 'on_track' | 'at_risk' | 'not_started';

const STATUS_PILL: Record<GroupStatus, { label: string; className: string }> = {
  complete: { label: 'Complete', className: 'bg-emerald-50 text-emerald-700' },
  on_track: { label: 'On track', className: 'bg-emerald-50 text-emerald-700' },
  at_risk: { label: 'At risk', className: 'bg-amber-50 text-amber-700' },
  not_started: { label: 'Not started', className: 'bg-gray-100 text-gray-600' },
};

const BAR_COLOR: Record<GroupStatus, string> = {
  complete: 'bg-violet-600',
  on_track: 'bg-violet-600',
  at_risk: 'bg-amber-500',
  not_started: 'bg-gray-300',
};

function memberIdsOf(group: Group): string[] {
  return group.members || group.participantIds || group.participants?.map((p) => p.id) || [];
}

function deadlineOf(group: Group): Date | null {
  const raw = group.deadline || group.closesAt || group.endDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Closes in 2 days" / "Closed 3 days ago", or null when no deadline is set. */
function deadlineLabel(deadline: Date | null): string | null {
  if (!deadline) return null;
  const days = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `Closed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Closes today';
  return `Closes in ${days} day${days === 1 ? '' : 's'}`;
}

function deriveStatus(progress: GroupProgress | undefined, deadline: Date | null): GroupStatus {
  const done = progress?.done ?? 0;
  const total = progress?.total ?? 0;
  if (total > 0 && done >= total) return 'complete';

  if (deadline) {
    const days = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days <= 3) return 'at_risk';
  }
  return done > 0 ? 'on_track' : 'not_started';
}

const GroupsComponent: React.FC<GroupsComponentProps> = ({
  groups,
  participants,
  progressByGroup,
  progressLoading = false,
  onAddGroup,
  onEditGroup,
  onRemoveGroup,
}) => {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [viewingGroup, setViewingGroup] = useState<Group | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [currentStep, setCurrentStep] = useState<'details' | 'members'>('details');
  const [newGroup, setNewGroup] = useState({
    name: '',
    admin: '',
    adminEmail: '',
    members: [] as string[],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);

  const detailsComplete = Boolean(newGroup.name && newGroup.admin && newGroup.adminEmail);

  const handleAdvanceToMembers = () => {
    if (!detailsComplete) return;
    setCurrentStep('members');
    setFilteredParticipants(participants);
  };

  const handleSearchParticipants = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setFilteredParticipants(participants);
      return;
    }
    const lower = term.toLowerCase();
    setFilteredParticipants(
      participants.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.email.toLowerCase().includes(lower) ||
          p.designation.toLowerCase().includes(lower)
      )
    );
  };

  const handleToggleParticipant = (participantId: string) => {
    setNewGroup((prev) => ({
      ...prev,
      members: prev.members.includes(participantId)
        ? prev.members.filter((id) => id !== participantId)
        : [...prev.members, participantId],
    }));
  };

  const handleFinishAddingGroup = () => {
    onAddGroup(newGroup);
    resetForm();
  };

  const handleFinishEditingGroup = async () => {
    if (editingGroup) {
      await onEditGroup(editingGroup.id, newGroup);
      resetForm();
    }
  };

  const openAddModal = () => {
    setNewGroup({ name: '', admin: '', adminEmail: '', members: [] });
    setCurrentStep('details');
    setSearchTerm('');
    setFilteredParticipants(participants);
    setShowAddGroup(true);
  };

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    setNewGroup({
      name: group.name,
      admin: group.admin,
      adminEmail: group.adminEmail,
      members: memberIdsOf(group),
    });
    setShowEditGroup(true);
    setCurrentStep('details');
    setSearchTerm('');
    setFilteredParticipants(participants);
  };

  const resetForm = () => {
    setNewGroup({ name: '', admin: '', adminEmail: '', members: [] });
    setShowAddGroup(false);
    setShowEditGroup(false);
    setEditingGroup(null);
    setCurrentStep('details');
    setSearchTerm('');
  };

  const isEditing = showEditGroup;

  /** Shared body for the add and edit flows — both are the same two steps. */
  const renderGroupModal = () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={resetForm}
    >
      <div
        className="view-enter max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-black">{isEditing ? 'Edit Group' : 'Add Group'}</h3>
        <p className="mt-0.5 text-sm text-gray-500">
          Step {currentStep === 'details' ? 1 : 2} of 2 —{' '}
          {currentStep === 'details' ? 'Group details' : 'Members'}
        </p>

        {currentStep === 'details' ? (
          <>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black">Name*</label>
                <input
                  className="w-full rounded-lg border border-gray-300 p-3 text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter group name"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black">
                  Group Admin Name*
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 p-3 text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter admin name"
                  value={newGroup.admin}
                  onChange={(e) => setNewGroup({ ...newGroup, admin: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-black">
                  Group Admin Email*
                </label>
                <input
                  className="w-full rounded-lg border border-gray-300 p-3 text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  placeholder="Enter admin email"
                  type="email"
                  value={newGroup.adminEmail}
                  onChange={(e) => setNewGroup({ ...newGroup, adminEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-black hover:bg-gray-50"
                onClick={resetForm}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black disabled:bg-gray-300"
                onClick={handleAdvanceToMembers}
                disabled={!detailsComplete}
              >
                Next: {isEditing ? 'Edit' : 'Add'} members
                <ArrowRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 text-black focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Search participants..."
                value={searchTerm}
                onChange={(e) => handleSearchParticipants(e.target.value)}
              />
            </div>

            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
              {filteredParticipants.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-500">No participants found</p>
              )}
              {filteredParticipants.map((participant) => {
                const selected = newGroup.members.includes(participant.id);
                return (
                  <div
                    key={participant.id}
                    className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                      selected
                        ? 'border-violet-300 bg-violet-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleParticipant(participant.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleToggleParticipant(participant.id)}
                        className="mr-3 h-4 w-4 accent-violet-600"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-black">{participant.name}</div>
                        <div className="truncate text-sm text-gray-600">{participant.email}</div>
                        <div className="truncate text-sm text-gray-500">
                          {participant.designation} • Manager: {participant.managerName}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-gray-600">
                Selected: <span className="font-semibold text-black">{newGroup.members.length}</span>{' '}
                participants
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-black hover:bg-gray-50"
                  onClick={() => setCurrentStep('details')}
                >
                  Back
                </button>
                <button
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-black"
                  onClick={resetForm}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
                  onClick={isEditing ? handleFinishEditingGroup : handleFinishAddingGroup}
                >
                  {isEditing ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-black">All Groups</h2>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black"
          onClick={openAddModal}
        >
          <Plus size={16} />
          Add Group
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {groups.map((group) => {
          const memberIds = memberIdsOf(group);
          const progress = progressByGroup?.get(group.id);
          const total = progress?.total ?? memberIds.length;
          const done = progress?.done ?? 0;
          const deadline = deadlineOf(group);
          const status = deriveStatus(progress ? { done, total } : undefined, deadline);
          const pill = STATUS_PILL[status];
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;
          const closes = deadlineLabel(deadline);

          return (
            <div
              key={group.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold text-black" title={group.name}>
                    {group.name}
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-gray-500">
                    Group Admin: {group.admin} · {memberIds.length} member
                    {memberIds.length === 1 ? '' : 's'}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pill.className}`}>
                    {pill.label}
                  </span>
                  <ActionMenu
                    label={`More actions for ${group.name}`}
                    items={[
                      {
                        label: 'Delete group',
                        icon: Trash2,
                        tone: 'danger',
                        onSelect: () => onRemoveGroup(group.id),
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${BAR_COLOR[status]}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="flex-shrink-0 text-sm tabular-nums text-gray-600">
                  {progressLoading && !progress ? '—' : `${done}/${total} done`}
                </span>
              </div>

              <p
                className={`mt-3 text-sm ${
                  status === 'at_risk' ? 'font-medium text-amber-600' : 'text-gray-400'
                }`}
              >
                {closes ?? 'No deadline set'}
              </p>

              <div className="mt-4 flex gap-3">
                <button
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50"
                  onClick={() => {
                    setViewingGroup(group);
                    setShowMembersModal(true);
                  }}
                >
                  All Members
                  <ArrowRight size={15} />
                </button>
                <button
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-black transition-colors hover:bg-gray-50"
                  onClick={() => openEditModal(group)}
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={openAddModal}
          className="flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white/50 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:bg-white hover:text-black"
        >
          + Create new assessment group
        </button>
      </div>

      {(showAddGroup || showEditGroup) && renderGroupModal()}

      {/* View All Members */}
      {showMembersModal && viewingGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            setShowMembersModal(false);
            setViewingGroup(null);
          }}
        >
          <div
            className="view-enter max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-black">{viewingGroup.name}</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {memberIdsOf(viewingGroup).length} member
              {memberIdsOf(viewingGroup).length === 1 ? '' : 's'} in this group
            </p>

            <div className="mt-5 max-h-96 space-y-2 overflow-y-auto">
              {(() => {
                const memberIds = memberIdsOf(viewingGroup);
                const groupMembers = participants.filter((p) => memberIds.includes(p.id));

                if (groupMembers.length === 0) {
                  return (
                    <div className="py-8 text-center text-sm text-gray-500">
                      No members in this group
                    </div>
                  );
                }

                return groupMembers.map((participant) => (
                  <div
                    key={participant.id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="truncate font-medium text-black">{participant.name}</div>
                    <div className="truncate text-sm text-gray-600">{participant.email}</div>
                    <div className="truncate text-sm text-gray-500">
                      {participant.designation} • Manager: {participant.managerName}
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-black"
                onClick={() => {
                  setShowMembersModal(false);
                  setViewingGroup(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsComponent;
