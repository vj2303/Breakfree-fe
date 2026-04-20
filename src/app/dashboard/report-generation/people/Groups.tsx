'use client';
import React, { useState } from 'react';

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

interface GroupsComponentProps {
  groups: Group[];
  participants: Participant[];
  onAddGroup: (group: Omit<Group, 'id'>) => void;
  onEditGroup: (id: string, group: Omit<Group, 'id'>) => void;
  onRemoveGroup: (id: string) => void;
}

const GroupsComponent: React.FC<GroupsComponentProps> = ({
  groups,
  participants,
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
    members: [] as string[]
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);

  const handleAddGroupDetails = () => {
    if (!newGroup.name || !newGroup.admin || !newGroup.adminEmail) return;
    setCurrentStep('members');
    setFilteredParticipants(participants);
  };

  const handleEditGroupDetails = () => {
    if (!newGroup.name || !newGroup.admin || !newGroup.adminEmail) return;
    setCurrentStep('members');
    setFilteredParticipants(participants);
  };

  const handleSearchParticipants = (term: string) => {
    setSearchTerm(term);
    if (term.trim() === '') {
      setFilteredParticipants(participants);
    } else {
      const filtered = participants.filter(p =>
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        p.email.toLowerCase().includes(term.toLowerCase()) ||
        p.designation.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredParticipants(filtered);
    }
  };

  const handleToggleParticipant = (participantId: string) => {
    setNewGroup(prev => ({
      ...prev,
      members: prev.members.includes(participantId)
        ? prev.members.filter(id => id !== participantId)
        : [...prev.members, participantId]
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

  const openEditModal = (group: Group) => {
    setEditingGroup(group);
    // Get member IDs from either members array, participantIds, or participants array
    const memberIds = group.members || group.participantIds || (group as any).participants?.map((p: any) => p.id) || [];
    setNewGroup({
      name: group.name,
      admin: group.admin,
      adminEmail: group.adminEmail,
      members: memberIds,
    });
    setShowEditGroup(true);
    setCurrentStep('details');
    setFilteredParticipants(participants); // Initialize filtered participants
  };

  const resetForm = () => {
    setNewGroup({ name: '', admin: '', adminEmail: '', members: [] });
    setShowAddGroup(false);
    setShowEditGroup(false);
    setEditingGroup(null);
    setCurrentStep('details');
    setSearchTerm('');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-black">All Groups</h2>
        <button
          className="bg-gray-800 text-white px-4 py-2 rounded-full shadow"
          onClick={() => setShowAddGroup(true)}
        >
          + Add Group
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg border border-gray-200 p-6 relative">
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                className="text-blue-600 hover:text-blue-900"
                onClick={() => openEditModal(group)}
                title="Edit Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button
                className="text-red-600 hover:text-red-900"
                onClick={() => onRemoveGroup(group.id)}
                title="Delete Group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
            <h3 className="font-bold text-lg mb-2 text-black pr-16">{group.name}</h3>
            <p className="mb-1 text-black">Group Admin: <span className="font-semibold">{group.admin}</span></p>
            <p className="mb-4 text-black">No. of Members: <span className="font-semibold">{(group.members?.length ?? group.participantIds?.length ?? 0)}</span></p>
            <div className="flex gap-2 mb-2">
              <button 
                className="bg-gray-700 text-white px-4 py-2 rounded flex-1"
                onClick={() => {
                  setViewingGroup(group);
                  setShowMembersModal(true);
                }}
              >
                All Members →
              </button>
              <button
                className="border border-gray-300 px-4 py-2 rounded flex-1 text-black"
                onClick={() => openEditModal(group)}
              >
                Edit
              </button>
            </div>
           
          </div>
        ))}
      </div>

      {/* Add Group Modal */}
      {showAddGroup && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {currentStep === 'details' ? (
              <>
                <h3 className="font-bold mb-4 text-xl text-black">Add New Group</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Name*</label>
                    <input
                      className="border w-full p-3 rounded-lg text-black"
                      placeholder="Enter group name"
                      value={newGroup.name}
                      onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Group Admin Name*</label>
                    <input
                      className="border w-full p-3 rounded-lg text-black"
                      placeholder="Enter admin name"
                      value={newGroup.admin}
                      onChange={e => setNewGroup({ ...newGroup, admin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Group Admin Email*</label>
                    <input
                      className="border w-full p-3 rounded-lg text-black"
                      placeholder="Enter admin email"
                      type="email"
                      value={newGroup.adminEmail}
                      onChange={e => setNewGroup({ ...newGroup, adminEmail: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button className="px-6 py-2 text-black" onClick={resetForm}>Cancel</button>
                  <button 
                    className="bg-gray-800 text-white px-6 py-2 rounded-lg" 
                    onClick={handleAddGroupDetails}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold mb-4 text-xl text-black">Add Members to {newGroup.name}</h3>
                <div className="mb-4">
                  <div className="relative">
                    <input
                      className="border w-full p-3 pl-10 rounded-lg text-black"
                      placeholder="Search participants..."
                      value={searchTerm}
                      onChange={e => handleSearchParticipants(e.target.value)}
                    />
                    <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto mb-4">
                  <div className="space-y-2">
                    {filteredParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${newGroup.members.includes(participant.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
                        onClick={() => handleToggleParticipant(participant.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGroup.members.includes(participant.id)}
                            onChange={() => handleToggleParticipant(participant.id)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-black">{participant.name}</div>
                            <div className="text-sm text-black">{participant.email}</div>
                            <div className="text-sm text-black">{participant.designation} • Manager: {participant.managerName}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <span className="text-sm text-black">Selected: {newGroup.members.length} participants</span>
                  <div className="flex gap-2">
                    <button 
                      className="px-6 py-2 text-black" 
                      onClick={() => setCurrentStep('details')}
                    >
                      Back
                    </button>
                    <button className="px-6 py-2 text-black" onClick={resetForm}>Cancel</button>
                    <button 
                      className="bg-gray-800 text-white px-6 py-2 rounded-lg" 
                      onClick={handleFinishAddingGroup}
                    >
                      Create Group
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Group Modal */}
      {showEditGroup && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {currentStep === 'details' ? (
              <>
                <h3 className="font-bold mb-4 text-xl text-black">Edit Group</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Name*</label>
                    <input
                      className="border w-full p-3 rounded-lg text-black"
                      placeholder="Enter group name"
                      value={newGroup.name}
                      onChange={e => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Group Admin Name*</label>
                    <input
                      className="border w-full p-3 rounded-lg text-black"
                      placeholder="Enter admin name"
                      value={newGroup.admin}
                      onChange={e => setNewGroup({ ...newGroup, admin: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-black">Group Admin Email*</label>
                    <input
                      className="border w-full p-3 rounded-lg text-black"
                      placeholder="Enter admin email"
                      type="email"
                      value={newGroup.adminEmail}
                      onChange={e => setNewGroup({ ...newGroup, adminEmail: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button className="px-6 py-2 text-black" onClick={resetForm}>Cancel</button>
                  <button 
                    className="bg-gray-800 text-white px-6 py-2 rounded-lg" 
                    onClick={handleEditGroupDetails}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold mb-4 text-xl text-black">Edit Members in {newGroup.name}</h3>
                <div className="mb-4">
                  <div className="relative">
                    <input
                      className="border w-full p-3 pl-10 rounded-lg text-black"
                      placeholder="Search participants..."
                      value={searchTerm}
                      onChange={e => handleSearchParticipants(e.target.value)}
                    />
                    <svg className="w-5 h-5 absolute left-3 top-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto mb-4">
                  <div className="space-y-2">
                    {filteredParticipants.map((participant) => (
                      <div
                        key={participant.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${newGroup.members.includes(participant.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'}`}
                        onClick={() => handleToggleParticipant(participant.id)}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newGroup.members.includes(participant.id)}
                            onChange={() => handleToggleParticipant(participant.id)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-black">{participant.name}</div>
                            <div className="text-sm text-black">{participant.email}</div>
                            <div className="text-sm text-black">{participant.designation} • Manager: {participant.managerName}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <span className="text-sm text-black">Selected: {newGroup.members.length} participants</span>
                  <div className="flex gap-2">
                    <button 
                      className="px-6 py-2 text-black" 
                      onClick={() => setCurrentStep('details')}
                    >
                      Back
                    </button>
                    <button className="px-6 py-2 text-black" onClick={resetForm}>Cancel</button>
                    <button 
                      className="bg-gray-800 text-white px-6 py-2 rounded-lg" 
                      onClick={handleFinishEditingGroup}
                    >
                      Update Group
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* View All Members Modal */}
      {showMembersModal && viewingGroup && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold mb-4 text-xl text-black">All Members - {viewingGroup.name}</h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Total Members: <span className="font-semibold text-black">
                  {(viewingGroup.members?.length ?? viewingGroup.participantIds?.length ?? 0)}
                </span>
              </p>
            </div>
            <div className="max-h-96 overflow-y-auto mb-4">
              {(() => {
                // Get member IDs
                const memberIds = viewingGroup.members || viewingGroup.participantIds || [];
                
                // Get participant details for these IDs
                const groupMembers = participants.filter(p => memberIds.includes(p.id));
                
                if (groupMembers.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No members in this group
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-2">
                    {groupMembers.map((participant) => (
                      <div
                        key={participant.id}
                        className="p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-black">{participant.name}</div>
                          <div className="text-sm text-black">{participant.email}</div>
                          <div className="text-sm text-black">{participant.designation} • Manager: {participant.managerName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                className="px-6 py-2 bg-gray-800 text-white rounded-lg" 
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