'use client'
import React, { useState } from "react";
import InboxActivityLayout from "./InboxActivityLayout";
import OverviewStep from "./steps/OverviewStep";
import ScenarioStep from "./steps/ScenarioStep";
import AddCharactersStep from "./steps/AddCharactersStep";
import AddContentStep from "./steps/AddContentStep";
import PreviewStep from "./steps/PreviewStep";
import { useRouter, useSearchParams } from 'next/navigation';
import { createInboxActivity, updateInboxActivity, getInboxActivity, type InboxActivityPayload } from '@/lib/inboxActivityApi';
import { useAuth } from '@/context/AuthContext';

export const dynamic = 'force-dynamic';

const initialFormData = {
  overview: "",
  exerciseTime: 0,
  readingTime: 0,
  name: "",
  description: "",
  videoUrl: "",
};

// Updated to allow string | number for id to match API response
const initialScenario = {
  id: 1 as string | number,
  title: '',
  content: '',
  exerciseTime: 0,
  readingTime: 0,
  documents: [] as { id: string; name: string; url: string; size: number; type: string }[],
};

interface Character {
  name: string;
  email: string;
  designation: string;
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

interface OrgChartMember {
  id: string;
  name: string;
  email: string;
  designation: string;
  parentId?: string;
}

// Define interfaces for API data structures
interface ApiScenario {
  id?: string | number;
  title?: string;
  data?: string;
  exerciseTime?: number;
  readTime?: number;
}

interface ApiOrgChart {
  id?: string | number;
  name?: string;
  email?: string;
  designation?: string;
  parentId?: string;
}

interface ApiContent {
  from?: string;
  to?: string[] | string;
  cc?: string[] | string;
  bcc?: string[] | string;
  subject?: string;
  date?: string;
  emailContent?: string;
}

interface ApiActivityData {
  name?: string;
  description?: string;
  instructions?: string;
  videoUrl?: string;
  scenarios?: ApiScenario[];
  characters?: Character[];
  organizationCharts?: ApiOrgChart[];
  contents?: ApiContent[];
}

// Update the scenario type to accept string | number for id
type ScenarioType = {
  id: string | number;
  title: string;
  content: string;
  exerciseTime: number;
  readingTime: number;
  documents: { id: string; name: string; url: string; size: number; type: string }[];
};

const Page = () => {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const activityId = searchParams.get('id');
  const isEditMode = !!activityId;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialFormData);
  
  // Debug formData changes
  React.useEffect(() => {
    console.log('FormData updated:', formData);
  }, [formData]);
  const [scenarios, setScenarios] = useState<ScenarioType[]>([]);
  const [currentScenario, setCurrentScenario] = useState<ScenarioType>(initialScenario);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [contentExerciseTime, setContentExerciseTime] = useState<number>(30);
  const [contentReadingTime, setContentReadingTime] = useState<number>(30);
  const [orgChartMembers, setOrgChartMembers] = useState<OrgChartMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [prefilledId, setPrefilledId] = useState<string | null>(null);
  const router = useRouter();

  // Pre-fill from localStorage if available (for new activities)
  React.useEffect(() => {
    if (!activityId && typeof window !== 'undefined') {
      const draft = localStorage.getItem('inboxActivityDraft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFormData(prev => ({
            ...prev,
            name: parsed.name || '',
            description: parsed.description || '',
          }));
        } catch {
          // Ignore parse errors
        }
        localStorage.removeItem('inboxActivityDraft');
      }
    }
  }, [activityId]);

  const updateFormData = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleScenarioSelect = (scenario: ScenarioType) => {
    setCurrentScenario(scenario);
  };

  const handleAddNewScenario = () => {
    const newScenario: ScenarioType = {
      id: Date.now(),
      title: '',
      content: '',
      exerciseTime: 0,
      readingTime: 0,
      documents: [],
    };
    // Only reset the form to a new blank scenario; do not add to the list here
    setCurrentScenario(newScenario);
  };

  const handleAddScenario = (scenario: ScenarioType) => {
    const id = scenario.id || Date.now();
    const scenarioToAdd = { ...scenario, id };
    setScenarios(prev => [...prev, scenarioToAdd]);
  };

  const handleDeleteScenario = (id: string | number) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    if (currentScenario.id === id) {
      // Reset form to blank scenario
      setCurrentScenario({
        id: Date.now(),
        title: '',
        content: '',
        exerciseTime: 0,
        readingTime: 0,
        documents: [],
      });
    }
  };

  // Character logic
  const addCharacter = (character: Character) => {
    setCharacters((prev) => [...prev, character]);
  };

  // Organization chart logic
  const handleOrgChartUpdate = (members: OrgChartMember[]) => {
    setOrgChartMembers(members);
  };

  // Load data for edit mode
  React.useEffect(() => {
    const loadActivityData = async () => {
      console.log('useEffect triggered - isEditMode:', isEditMode, 'activityId:', activityId, 'token:', !!token, 'prefilledId:', prefilledId);
      if (isEditMode && activityId && token && prefilledId !== activityId) {
        try {
          setLoading(true);
          console.log('Loading activity data for ID:', activityId);
          const response = await getInboxActivity(activityId, token);
          console.log('Received API response:', response);
          
          // Extract data from API response
          const activityData: ApiActivityData = response.data || response;
          console.log('Extracted activity data:', activityData);
          
          // Populate form data
          const newFormData = {
            name: activityData.name || '',
            description: activityData.description || '',
            overview: activityData.instructions || '',
            videoUrl: activityData.videoUrl || '',
            exerciseTime: 0,
            readingTime: 0,
          };
          console.log('Setting form data:', newFormData);
          setFormData(newFormData);

          // Populate scenarios
          if (activityData.scenarios) {
            console.log('Setting scenarios:', activityData.scenarios);
            const loadedScenarios: ScenarioType[] = activityData.scenarios.map((s: ApiScenario) => ({
              id: s.id || Date.now(),
              title: s.title || '',
              content: s.data || '',
              exerciseTime: s.exerciseTime || 0,
              readingTime: s.readTime || 0,
              documents: [],
            }));
            setScenarios(loadedScenarios);
            // Set the first scenario as current if available
            if (loadedScenarios.length > 0) {
              setCurrentScenario(loadedScenarios[0]);
            }
          }

          // Populate characters
          if (activityData.characters) {
            console.log('Setting characters:', activityData.characters);
            setCharacters(activityData.characters);
          }

          // Populate organization chart
          if (activityData.organizationCharts) {
            console.log('Setting org chart:', activityData.organizationCharts);
            setOrgChartMembers(activityData.organizationCharts.map((org: ApiOrgChart, index: number) => ({
              id: org.id?.toString() || (index + 1).toString(),
              name: org.name || '',
              email: org.email || '',
              designation: org.designation || '',
              parentId: org.parentId?.toString(),
            })));
          }

          // Populate emails/contents
          if (activityData.contents) {
            console.log('Setting emails:', activityData.contents);
            setEmails(activityData.contents.map((content: ApiContent, index: number) => ({
              id: index + 1,
              from: content.from || '',
              to: Array.isArray(content.to) ? content.to.join(', ') : content.to || '',
              cc: Array.isArray(content.cc) ? content.cc.join(', ') : content.cc || '',
              bcc: Array.isArray(content.bcc) ? content.bcc.join(', ') : content.bcc || '',
              subject: content.subject || '',
              date: content.date || '',
              emailContent: content.emailContent || '',
              isCollapsed: true,
            })));
          }

          setPrefilledId(activityId);
        } catch (err) {
          console.error('Failed to load activity data:', err);
          setError('Failed to load activity data');
        } finally {
          setLoading(false);
        }
      }
    };

    loadActivityData();
  }, [isEditMode, activityId, token, prefilledId]);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (!token) {
        setError('User not authenticated');
        return;
      }
      
      // Auto-save current scenario if it has content and isn't already saved
      const finalScenarios = [...scenarios];
      if (currentScenario.title.trim() || currentScenario.content.trim()) {
        const existingIndex = finalScenarios.findIndex(s => s.id === currentScenario.id);
        if (existingIndex >= 0) {
          finalScenarios[existingIndex] = currentScenario;
        } else {
          finalScenarios.push(currentScenario);
        }
      }
      
      // Prepare data for API matching the cURL example structure
      const payload: InboxActivityPayload = {
        name: formData.name,
        description: formData.description,
        instructions: formData.overview,
        videoUrl: formData.videoUrl || '',
        scenarios: finalScenarios.map(s => ({
          title: s.title,
          readTime: s.readingTime,
          exerciseTime: s.exerciseTime,
          data: s.content,
        })),
        tasks: finalScenarios.map(s => ({
          title: s.title,
          readTime: s.readingTime,
          exerciseTime: s.exerciseTime,
          data: s.content,
        })),
        characters: characters,
        organizationCharts: orgChartMembers.map(member => ({
          name: member.name,
          email: member.email,
          designation: member.designation,
          parentId: member.parentId,
        })),
        contents: emails.map(e => ({
          from: e.from,
          to: e.to ? e.to.split(',').map(t => t.trim()) : [],
          cc: e.cc ? e.cc.split(',').map(c => c.trim()) : [],
          bcc: e.bcc ? e.bcc.split(',').map(b => b.trim()) : [],
          subject: e.subject,
          date: e.date,
          emailContent: e.emailContent,
        })),
      };
      
      console.log('Submitting payload:', JSON.stringify(payload, null, 2));
      
      if (isEditMode && activityId) {
        await updateInboxActivity(activityId, payload, token);
      } else {
        await createInboxActivity(payload, token);
      }
      
      router.push('/dashboard/report-generation/content/assessment');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error');
      }
    } finally {
      setLoading(false);
    }
  };

  const stepContents = [
    <OverviewStep key="overview" formData={formData} updateFormData={updateFormData} />,
    <ScenarioStep key="scenario"
      scenarios={scenarios}
      currentScenario={currentScenario}
      setCurrentScenario={setCurrentScenario}
      onScenarioSelect={handleScenarioSelect}
      onAddNew={handleAddNewScenario}
      onAddScenario={handleAddScenario}
      onDeleteScenario={handleDeleteScenario}
    />,
    <AddCharactersStep 
      key="characters" 
      characters={characters} 
      addCharacter={addCharacter}
      orgChartMembers={orgChartMembers}
      onOrgChartUpdate={handleOrgChartUpdate}
    />,
    <AddContentStep key="content"
      characters={characters}
      emails={emails}
      setEmails={setEmails}
      exerciseTime={contentExerciseTime}
      setExerciseTime={setContentExerciseTime}
      readingTime={contentReadingTime}
      setReadingTime={setContentReadingTime}
    />,
    <PreviewStep
      key="preview"
      loading={loading}
      error={error}
      scenarios={scenarios}
      characters={characters}
      emails={emails}
      formData={formData}
      orgChartMembers={orgChartMembers}
      onSubmit={handleSubmit}
      onPrevious={() => setCurrentStep(currentStep - 1)}
    />,
  ];

  const getSaveButtonText = () => {
    if (currentStep === stepContents.length - 2) {
      return "Next";
    }
    return "Save and Next";
  };

  const handleSave = () => {
    // Auto-save current scenario when moving from scenario step
    if (currentStep === 1 && (currentScenario.title.trim() || currentScenario.content.trim())) {
      const existingIndex = scenarios.findIndex(s => s.id === currentScenario.id);
      if (existingIndex >= 0) {
        setScenarios(prev => prev.map((s, i) => i === existingIndex ? currentScenario : s));
      } else {
        setScenarios(prev => [...prev, currentScenario]);
      }
    }
    
    if (currentStep < stepContents.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const isLastStep = currentStep === stepContents.length - 1;
  return (
    <InboxActivityLayout
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      onSave={isLastStep ? handleSubmit : handleSave}
      showSaveButton={true}
      saveButtonText={isLastStep ? (loading ? (isEditMode ? 'Updating...' : 'Submitting...') : (isEditMode ? 'Update' : 'Save')) : getSaveButtonText()}
    >
      {stepContents[currentStep]}
    </InboxActivityLayout>
  );
};

export default Page;