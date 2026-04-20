import React from "react";
import Editor from "@/components/Editor";

interface Character {
  name: string;
  email: string;
  designation: string;
}

interface AddContentStepProps {
  characters: Character[];
  emails: Email[];
  setEmails: React.Dispatch<React.SetStateAction<Email[]>>;
  exerciseTime: number;
  setExerciseTime: React.Dispatch<React.SetStateAction<number>>;
  readingTime: number;
  setReadingTime: React.Dispatch<React.SetStateAction<number>>;
}

export interface Email {
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

const AddContentStep: React.FC<AddContentStepProps> = ({ characters, emails, setEmails, exerciseTime, setExerciseTime, readingTime, setReadingTime }) => {

  const addEmail = () => {
    const newEmail: Email = {
      id: Date.now(),
      from: "",
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      date: "",
      emailContent: "",
      isCollapsed: false,
    };
    setEmails(prev => [...prev, newEmail]);
  };

  const updateEmail = <K extends keyof Email>(id: number, field: K, value: Email[K]) => {
    setEmails(prev => prev.map(email => (email.id === id ? { ...email, [field]: value } : email)));
  };

  const toggleCollapse = (id: number) => {
    setEmails(prev => prev.map(email => (email.id === id ? { ...email, isCollapsed: !email.isCollapsed } : email)));
  };

  const deleteEmail = (id: number) => {
    setEmails(prev => prev.filter(email => email.id !== id));
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
    <div className="bg-white rounded-lg p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-black">Inbox Content</h2>
        <div className="flex gap-4">
          <div className="flex items-center gap-2 border rounded-full px-4 py-2 bg-white">
            <span className="text-gray-700">Exercise Time (Min)</span>
            <input
              type="number"
              value={exerciseTime}
              onChange={e => setExerciseTime(Number(e.target.value))}
              className="w-16 px-2 py-1 border-none outline-none text-black bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2 border rounded-full px-4 py-2 bg-white">
            <span className="text-gray-700">Reading Time (Min)</span>
            <input
              type="number"
              value={readingTime}
              onChange={e => setReadingTime(Number(e.target.value))}
              className="w-16 px-2 py-1 border-none outline-none text-black bg-transparent"
            />
          </div>
        </div>
      </div>

      <div className="mt-8">
        {emails.some(e => e.isCollapsed) && (
          <div className="grid grid-cols-4 gap-4 items-center p-4 border-b bg-gray-100 rounded-t-md font-semibold text-sm text-gray-600">
            <div>Sender</div>
            <div>Subject</div>
            <div>Date & Time</div>
            <div>Actions</div>
          </div>
        )}

        <div className={emails.some(e => e.isCollapsed) ? 'border-x border-b rounded-b-md' : ''}>
          {emails.map(email => (
            <div key={email.id} className="border-b last:border-b-0">
              {email.isCollapsed ? (
                <div className="grid grid-cols-4 gap-4 items-center p-4 hover:bg-gray-50">
                  <div className="truncate">{email.from}</div>
                  <div className="truncate">{email.subject}</div>
                  <div className="truncate">{formatDate(email.date)}</div>
                  <div className="flex items-center gap-4">
                    <button onClick={() => toggleCollapse(email.id)} className="transition-transform transform hover:scale-110">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={() => deleteEmail(email.id)} className="text-red-500 hover:text-red-700">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border p-4 my-4 rounded-md">
                  <div className="grid grid-cols-2 gap-6 mb-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-black">From<span className="text-red-500">*</span></label>
                      <select
                        value={email.from}
                        onChange={e => updateEmail(email.id, "from", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-black bg-white"
                        required
                      >
                        <option value="">Select Character</option>
                        {characters.map((char, idx) => (
                          <option key={char.email + idx} value={char.email}>{char.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-black">To<span className="text-red-500">*</span></label>
                      <select
                        value={email.to}
                        onChange={e => updateEmail(email.id, "to", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-black bg-white"
                        required
                      >
                        <option value="">Select Character</option>
                        {characters.map((char, idx) => (
                          <option key={char.email + idx} value={char.email}>{char.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-black">CC</label>
                      <select
                        value={email.cc}
                        onChange={e => updateEmail(email.id, "cc", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-black bg-white"
                      >
                        <option value="">Select Character</option>
                        {characters.map((char, idx) => (
                          <option key={char.email + idx} value={char.email}>{char.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-black">BCC</label>
                      <select
                        value={email.bcc}
                        onChange={e => updateEmail(email.id, "bcc", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-black bg-white"
                      >
                        <option value="">Select Character</option>
                        {characters.map((char, idx) => (
                          <option key={char.email + idx} value={char.email}>{char.email}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-black">Subject<span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={email.subject}
                        onChange={e => updateEmail(email.id, "subject", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-black"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-black">Date<span className="text-red-500">*</span></label>
                      <input
                        type="datetime-local"
                        value={email.date}
                        onChange={e => updateEmail(email.id, "date", e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md text-black"
                        required
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold mb-2 text-black">E-mail Content</label>
                    <Editor
                      content={email.emailContent}
                      onChange={value => updateEmail(email.id, "emailContent", value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => toggleCollapse(email.id)}
                      className="mt-4 px-8 py-2 rounded-full bg-gray-900 text-white font-semibold text-lg shadow hover:bg-gray-800 transition"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-start mt-6">
        <button
          onClick={addEmail}
          className="px-6 py-2 rounded-full bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
        >
          Add Email
        </button>
      </div>
    </div>
  );
};

export default AddContentStep;