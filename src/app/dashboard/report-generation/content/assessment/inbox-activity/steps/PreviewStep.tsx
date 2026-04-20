import React, { useState } from "react";

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

interface Email {
  id: number;
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  date: string;
  emailContent: string;
  isCollapsed: boolean;
}

interface FormDataShape {
  overview: string;
  exerciseTime: number;
  readingTime: number;
  name: string;
  description: string;
  videoUrl?: string;
}

interface Scenario {
  id: string | number;
  title: string;
  content: string;
  exerciseTime: number;
  readingTime: number;
  documents?: { id: string; name: string; url: string; size: number; type: string }[];
}

interface PreviewStepProps {
  loading?: boolean;
  error?: string;
  scenarios: Scenario[];
  characters: Character[];
  emails: Email[];
  formData: FormDataShape;
  orgChartMembers?: OrgChartMember[];
  onSubmit?: () => void;
  onPrevious?: () => void;
}

const PreviewStep: React.FC<PreviewStepProps> = ({
  loading = false,
  error = "",
  scenarios,
  characters,
  emails,
  formData,
  orgChartMembers = [],
  onSubmit,
  onPrevious,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [activeView, setActiveView] = useState<'inbox' | 'scenarios'>('inbox');

  const getSenderInfo = (fromEmail: string) => {
    const c = characters.find(ch => ch.email === fromEmail);
    return {
      sender: c ? c.name : fromEmail || '-'.toString(),
      designation: c ? c.designation : '',
    };
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    };
    try {
      return new Date(dateString).toLocaleString('en-US', options).replace(',', '');
    } catch {
      return new Date(dateString).toLocaleString('en-US', options);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-6" style={{ minHeight: "600px" }}>
        {/* Left Sidebar - Scenarios + Org Chart */}
        <div className="w-80 flex flex-col gap-4">
          {/* Scenarios Section */}
          {scenarios.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-black">All Scenarios</span>
                  <span className="bg-gray-900 text-white rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {scenarios.length}
                  </span>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-2 space-y-2">
                {scenarios.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedScenario(s);
                      setActiveView("scenarios");
                      setSelectedEmail(null);
                    }}
                    className={`p-3 rounded-lg border-l-4 cursor-pointer transition-colors ${
                      selectedScenario?.id === s.id && activeView === "scenarios"
                        ? "bg-blue-50 border-blue-500 border-l-4"
                        : "bg-white border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-sm font-medium text-black">
                      {s.title || "Untitled Scenario"}
                    </div>
                    {(s.exerciseTime > 0 || s.readingTime > 0) && (
                      <div className="text-xs text-gray-600 mt-1">
                        {s.exerciseTime > 0 && (
                          <span>Exercise: {s.exerciseTime}min</span>
                        )}
                        {s.exerciseTime > 0 && s.readingTime > 0 && (
                          <span> | </span>
                        )}
                        {s.readingTime > 0 && (
                          <span>Reading: {s.readingTime}min</span>
                        )}
                      </div>
                    )}
                    {s.documents && s.documents.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        📎 {s.documents.length} attachment
                        {s.documents.length > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organization Chart Section */}
          {orgChartMembers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 flex flex-col">
              <div className="px-4 py-3 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Organization Chart
                </span>
              </div>
              <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
                {orgChartMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-gray-50 border border-gray-200 rounded px-2.5 py-2"
                  >
                    <div className="text-xs font-semibold text-black">
                      {member.name}
                    </div>
                    <div className="text-[11px] text-gray-600">
                      {member.designation}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {member.email}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setActiveView('inbox');
                setSelectedScenario(null);
                setSelectedEmail(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeView === 'inbox'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Inbox ({emails.length})
            </button>
            {scenarios.length > 0 && (
              <button
                onClick={() => {
                  setActiveView('scenarios');
                  if (!selectedScenario && scenarios.length > 0) {
                    setSelectedScenario(scenarios[0]);
                  }
                  setSelectedEmail(null);
                }}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  activeView === 'scenarios'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Scenarios ({scenarios.length})
              </button>
            )}
          </div>
          {activeView === 'inbox' && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm bg-white text-black font-medium text-sm hover:bg-gray-50">
              <span className="text-lg">+</span> Compose
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Email List */}
          {activeView === 'inbox' && (
            <>
              <div className="w-80 border-r border-gray-200 overflow-y-auto">
                <div className="divide-y divide-gray-200">
                  {emails.map((mail) => {
                    const { sender, designation } = getSenderInfo(mail.from);
                    const isSelected = selectedEmail?.id === mail.id;
                    return (
                      <div
                        key={mail.id}
                        onClick={() => setSelectedEmail(mail)}
                        className={`p-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="font-semibold text-sm text-black truncate flex-1">{sender}</div>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {new Date(mail.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-black truncate mb-1">{mail.subject}</div>
                        <div className="text-xs text-gray-600 truncate">
                          {designation && <span className="text-gray-500">{designation} • </span>}
                          <span className="text-gray-500">To: {mail.to}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Email Detail View */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedEmail ? (
                  <div className="max-w-3xl">
                    <div className="mb-6">
                      <h2 className="text-2xl font-semibold text-black mb-4">{selectedEmail.subject}</h2>
                      <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                        <div>
                          <div className="font-semibold text-black">
                            {getSenderInfo(selectedEmail.from).sender}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">From:</span> {selectedEmail.from}
                            <br />
                            <span className="font-medium">To:</span> {selectedEmail.to}
                            {selectedEmail.cc && (
                              <>
                                <br />
                                <span className="font-medium">CC:</span> {selectedEmail.cc}
                              </>
                            )}
                            {selectedEmail.bcc && (
                              <>
                                <br />
                                <span className="font-medium">BCC:</span> {selectedEmail.bcc}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(selectedEmail.date)}
                        </div>
                      </div>
                    </div>
                    <div
                      className="prose prose-sm max-w-none text-gray-800"
                      dangerouslySetInnerHTML={{ __html: selectedEmail.emailContent }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p className="text-lg mb-2">Select an email to view</p>
                      <p className="text-sm">Click on an email from the list to see its content</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Scenario Detail View */}
          {activeView === 'scenarios' && (
            <div className="flex-1 overflow-y-auto p-6">
              {selectedScenario ? (
                <div className="max-w-3xl">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-black mb-4">{selectedScenario.title || 'Untitled Scenario'}</h2>
                    {(selectedScenario.exerciseTime > 0 || selectedScenario.readingTime > 0) && (
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                        {selectedScenario.exerciseTime > 0 && (
                          <span><span className="font-medium">Exercise Time:</span> {selectedScenario.exerciseTime} min</span>
                        )}
                        {selectedScenario.readingTime > 0 && (
                          <span><span className="font-medium">Reading Time:</span> {selectedScenario.readingTime} min</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div
                    className="prose prose-sm max-w-none text-gray-800"
                    dangerouslySetInnerHTML={{ __html: selectedScenario.content || '' }}
                  />
                  {selectedScenario.documents && selectedScenario.documents.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h3 className="text-lg font-semibold text-black mb-3">Attachments</h3>
                      <div className="space-y-2">
                        {selectedScenario.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <span className="text-2xl">📎</span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-blue-600">{doc.name}</div>
                              <div className="text-xs text-gray-500">{Math.round(doc.size / 1024)} KB</div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">Select a scenario to view</p>
                    <p className="text-sm">Click on a scenario from the list to see its details</p>
                  </div>
          </div>
              )}
          </div>
          )}
        </div>
      </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-end gap-3">
        {onPrevious && (
          <button onClick={onPrevious} className="px-5 py-2 rounded-lg border bg-white text-black hover:bg-gray-100 font-medium">
            Previous
          </button>
        )}
        {onSubmit && (
          <button onClick={onSubmit} className="px-5 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 font-medium" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export default PreviewStep;