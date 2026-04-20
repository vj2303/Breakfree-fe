import React, { useState } from "react";
import { Edit2, Trash2, Check, X, Network } from "lucide-react";

interface Character {
  name: string;
  email: string;
  designation: string;
}

interface OrgChartMember {
  id: string;
  name: string;
  email: string;
  designation: string;
  parentId?: string;
}

interface AddCharactersStepProps {
  characters: Character[];
  addCharacter: (character: Character) => void;
  orgChartMembers?: OrgChartMember[];
  onOrgChartUpdate?: (members: OrgChartMember[]) => void;
}

const AddCharactersStep: React.FC<AddCharactersStepProps> = ({ 
  characters, 
  addCharacter, 
  orgChartMembers = [], 
  onOrgChartUpdate 
}) => {
  const [form, setForm] = useState<Character>({ name: '', email: '', designation: '' });
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Character>({ name: '', email: '', designation: '' });
  const [charList, setCharList] = useState<Character[]>(characters);
  const [showOrgChart, setShowOrgChart] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', email: '', designation: '', parentId: '' });
  const [orgMembers, setOrgMembers] = useState<OrgChartMember[]>(orgChartMembers);
  const [isGenerating, setIsGenerating] = useState(false);
  const [chartGenerated, setChartGenerated] = useState(false);
  const [showChart, setShowChart] = useState(false);

  // Sync charList with characters prop
  React.useEffect(() => {
    setCharList(characters);
  }, [characters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.email && form.designation) {
      addCharacter(form);
      setForm({ name: '', email: '', designation: '' });
    }
  };

  const handleEdit = (idx: number) => {
    setEditIndex(idx);
    setEditForm(charList[idx]);
  };

  const handleEditSave = () => {
    if (editForm.name && editForm.email && editForm.designation && editIndex !== null) {
      const updated = [...charList];
      updated[editIndex] = editForm;
      setCharList(updated);
      setEditIndex(null);
    }
  };

  const handleEditCancel = () => {
    setEditIndex(null);
  };

  const handleDelete = (idx: number) => {
    const updated = charList.filter((_, i) => i !== idx);
    setCharList(updated);
  };

  // Organization Chart handlers
  const handleOrgFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setOrgForm({ ...orgForm, [e.target.name]: e.target.value });
  };

  const handleAddOrgMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (orgForm.name && orgForm.email && orgForm.designation) {
      const newMember: OrgChartMember = {
        id: Date.now().toString(),
        name: orgForm.name,
        email: orgForm.email,
        designation: orgForm.designation,
        parentId: orgForm.parentId || undefined,
      };
      const updatedMembers = [...orgMembers, newMember];
      setOrgMembers(updatedMembers);
      onOrgChartUpdate?.(updatedMembers);
      setOrgForm({ name: '', email: '', designation: '', parentId: '' });
    }
  };

  const handleGenerateChart = async () => {
    if (orgMembers.length === 0) {
      alert('Please add at least one member to generate the chart.');
      return;
    }

    setIsGenerating(true);
    
    // Simulate chart generation process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setChartGenerated(true);
    setIsGenerating(false);
    
    // Show success message and keep modal open to show chart
    setTimeout(() => {
      setChartGenerated(false);
      setShowChart(true);
    }, 1000);
  };

  // Sync org members with prop
  React.useEffect(() => {
    setOrgMembers(orgChartMembers);
  }, [orgChartMembers]);

  // Render organization chart for modal
  const renderModalOrgChart = () => {
    const topLevelMembers = orgMembers.filter(member => !member.parentId);
    
    const renderMember = (member: OrgChartMember, level = 0) => {
      const children = orgMembers.filter(m => m.parentId === member.id);
      
      return (
        <div key={member.id} className={`ml-${level * 4}`}>
          <div className={`p-2 mb-2 rounded border ${
            level === 0 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 bg-gray-50'
          }`}>
            <div className="font-medium text-black text-sm">{member.name}</div>
            <div className="text-xs text-gray-600">{member.designation}</div>
          </div>
          {children.length > 0 && (
            <div className="ml-3 border-l border-gray-300 pl-3">
              {children.map(child => renderMember(child, level + 1))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-black mb-3">Generated Organization Chart</h4>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {topLevelMembers.length > 0 ? (
            topLevelMembers.map(member => renderMember(member))
          ) : (
            <p className="text-gray-500 text-center py-4 text-sm">No members added yet</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-8">
      {/* Characters Table */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-black">Characters</h2>
          <button
            onClick={() => setShowOrgChart(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Network className="w-4 h-4" />
            Organization Chart
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">E-mail</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Designation</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {charList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-400 text-lg font-medium">No data available</td>
                </tr>
              ) : (
                charList.map((char, idx) => (
                  <tr key={idx} className="border-t">
                    {editIndex === idx ? (
                      <>
                        <td className="px-6 py-4"><input name="name" value={editForm.name} onChange={handleEditChange} className="w-full px-2 py-1 border rounded text-black" /></td>
                        <td className="px-6 py-4"><input name="email" value={editForm.email} onChange={handleEditChange} className="w-full px-2 py-1 border rounded text-black" /></td>
                        <td className="px-6 py-4"><input name="designation" value={editForm.designation} onChange={handleEditChange} className="w-full px-2 py-1 border rounded text-black" /></td>
                        <td className="px-6 py-4 flex gap-2">
                          <button type="button" onClick={handleEditSave} className="p-1 rounded bg-green-100 hover:bg-green-200"><Check className="w-4 h-4 text-green-700" /></button>
                          <button type="button" onClick={handleEditCancel} className="p-1 rounded bg-gray-100 hover:bg-gray-200"><X className="w-4 h-4 text-gray-700" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-black font-medium">{char.name}</td>
                        <td className="px-6 py-4 text-black">{char.email}</td>
                        <td className="px-6 py-4 text-black">{char.designation}</td>
                        <td className="px-6 py-4 flex gap-2">
                          <button type="button" onClick={() => handleEdit(idx)} className="p-1 rounded bg-blue-100 hover:bg-blue-200"><Edit2 className="w-4 h-4 text-blue-700" /></button>
                          <button type="button" onClick={() => handleDelete(idx)} className="p-1 rounded bg-red-100 hover:bg-red-200"><Trash2 className="w-4 h-4 text-red-700" /></button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Add Character Form */}
      <div className="w-full max-w-xs bg-white rounded-2xl shadow p-8 border border-gray-100 flex flex-col justify-between">
        <h3 className="text-xl font-bold mb-6 text-black">Add Characters</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
          <div>
            <label className="block text-sm font-semibold mb-1 text-black">Name*</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-black">E-mail*</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-black">Designation*</label>
            <input
              name="designation"
              value={form.designation}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              required
            />
          </div>
          <button
            type="submit"
            className="mt-6 w-full py-2 rounded-full bg-gray-900 text-white font-semibold text-lg shadow hover:bg-gray-800 transition"
          >
            Save
          </button>
        </form>
      </div>

      {/* Organization Chart Modal */}
      {showOrgChart && (
        <div className="fixed inset-0 bg-black/20 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Create Organizational Chart</h3>
              <button
                onClick={() => setShowOrgChart(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrgMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-black">Name*</label>
                <input
                  name="name"
                  value={orgForm.name}
                  onChange={handleOrgFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-black">Email*</label>
                <input
                  name="email"
                  type="email"
                  value={orgForm.email}
                  onChange={handleOrgFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-black">Designation*</label>
                <input
                  name="designation"
                  value={orgForm.designation}
                  onChange={handleOrgFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-black">Parent*</label>
                <select
                  name="parentId"
                  value={orgForm.parentId}
                  onChange={handleOrgFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  <option value="">Select Type</option>
                  {orgMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} - {member.designation}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Add Member
              </button>
            </form>

            {/* Organization Chart Members List */}
            {!showChart && (
              <div className="mt-6">
                <div className="space-y-3">
                  {orgMembers.map((member) => {
                    const parent = orgMembers.find(m => m.id === member.parentId);
                    const isTopLevel = !member.parentId;
                    
                    return (
                      <div
                        key={member.id}
                        className={`p-3 rounded border ${isTopLevel ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
                      >
                        <div className="font-medium text-black">{member.name}</div>
                        <div className="text-sm text-gray-600">{member.designation}</div>
                        {parent && (
                          <div className="text-xs text-gray-500 mt-1">
                            Reports to: {parent.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Generated Organization Chart Display */}
            {showChart && renderModalOrgChart()}

            {!showChart && (
              <div className="mt-6 flex justify-between">
                <button
                  onClick={handleGenerateChart}
                  disabled={isGenerating || orgMembers.length === 0}
                  className={`px-4 py-2 rounded-md transition-colors ${
                    isGenerating || orgMembers.length === 0
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Generating...
                    </div>
                  ) : chartGenerated ? (
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Chart Generated!
                    </div>
                  ) : (
                    'Generate Chart'
                  )}
                </button>
                <p className="text-xs text-gray-500 self-center">
                  *Generate Chart after Adding all members
                </p>
              </div>
            )}

            {showChart && (
              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => {
                    setShowChart(false);
                    setShowOrgChart(false);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Done
                </button>
                <button
                  onClick={() => setShowChart(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Edit More
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCharactersStep; 