'use client';

import React, { useState, useEffect } from 'react';
import CaseStudyLayout from './CaseStudyLayout';
import OverviewStep from './steps/OverviewStep';
import ScenarioStep from './steps/ScenarioStep';
import TaskStep from './steps/TaskStep';
import PreviewStep from './steps/PreviewStep';
import { createCaseStudy, fetchCaseStudyById, updateCaseStudy } from '@/lib/caseStudyApi';
import { useRouter, useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface Document {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  content: string;
  exerciseTime: number;
  readingTime: number;
  documents: Document[];
}

export interface Task {
  id: string;
  title: string;
  content: string;
  responseType: string;
  isMandatory: boolean;
  exerciseTime: number;
  readingTime: number;
}

// Define API response types
interface ApiScenario {
  id?: string;
  title?: string;
  description?: string;
  data?: string;
  exerciseTime?: number;
  readTime?: number;
}

interface ApiTask {
  id?: string;
  title?: string;
  data?: string;
  responseType?: string;
  isMandatory?: boolean;
  exerciseTime?: number;
  readTime?: number;
}

interface CaseStudyApiResponse {
  instructions?: string;
  name?: string;
  description?: string;
  videoUrl?: string;
  interactiveActivityType?: 'GD' | 'ROLEPLAY' | 'CASE_STUDY';
  scenarios?: ApiScenario[];
  tasks?: ApiTask[];
}

type InteractiveActivityType = 'GD' | 'ROLEPLAY' | 'CASE_STUDY';

const CaseStudyAssessment = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    overview: '',
    exerciseTime: 30,
    readingTime: 30,
    name: '',
    description: '',
    videoUrl: '',
    interactiveActivityType: 'CASE_STUDY' as InteractiveActivityType,
  });
  
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentScenario, setCurrentScenario] = useState<Scenario>({
    id: '',
    title: '',
    description: '',
    content: '',
    exerciseTime: 30,
    readingTime: 30,
    documents: []
  });
  const [currentTask, setCurrentTask] = useState<Task>({
    id: '',
    title: '',
    content: '',
    responseType: '',
    isMandatory: false,
    exerciseTime: 30,
    readingTime: 30
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [prefilledId, setPrefilledId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  useEffect(() => {
    // Pre-fill from localStorage if available (for new)
    if (!id && typeof window !== 'undefined') {
      const draft = localStorage.getItem('caseStudyDraft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setFormData(prev => ({
            ...prev,
            name: parsed.name || '',
            description: parsed.description || '',
            interactiveActivityType: parsed.interactiveActivityType || 'CASE_STUDY',
          }));
        } catch {}
        localStorage.removeItem('caseStudyDraft');
      }
    }
  }, [id]);

  useEffect(() => {
    // If editing, fetch and prefill
    if (id && prefilledId !== id) {
      setLoading(true);
      fetchCaseStudyById(id)
        .then((data: CaseStudyApiResponse) => {
          setFormData({
            overview: data.instructions || '',
            exerciseTime: 30,
            readingTime: 30,
            name: data.name || '',
            description: data.description || '',
            videoUrl: data.videoUrl || '',
            interactiveActivityType: data.interactiveActivityType || 'CASE_STUDY',
          });
          setScenarios(
            (data.scenarios || []).map((s: ApiScenario) => ({
              id: s.id || '',
              title: s.title || '',
              description: s.description || '',
              content: s.data || '',
              exerciseTime: s.exerciseTime || 30,
              readingTime: s.readTime || 30,
              documents: []
            }))
          );
          // Prefill currentScenario with the first scenario if available
          const loadedScenarios = (data.scenarios || []).map((s: ApiScenario) => ({
            id: s.id || '',
            title: s.title || '',
            description: s.description || '',
            content: s.data || '',
            exerciseTime: s.exerciseTime || 30,
            readingTime: s.readTime || 30,
            documents: []
          }));
          setScenarios(loadedScenarios);
          if (loadedScenarios.length > 0) {
            setCurrentScenario(loadedScenarios[0]);
          }

          setTasks(
            (data.tasks || []).map((t: ApiTask) => ({
              id: t.id || '',
              title: t.title || '',
              content: t.data || '',
              responseType: t.responseType || '',
              isMandatory: t.isMandatory || false,
              exerciseTime: t.exerciseTime || 30,
              readingTime: t.readTime || 30,
            }))
          );
          // Prefill currentTask with the first task if available
          const loadedTasks = (data.tasks || []).map((t: ApiTask) => ({
            id: t.id || '',
            title: t.title || '',
            content: t.data || '',
            responseType: t.responseType || '',
            isMandatory: t.isMandatory || false,
            exerciseTime: t.exerciseTime || 30,
            readingTime: t.readTime || 30,
          }));
          setTasks(loadedTasks);
          if (loadedTasks.length > 0) {
            setCurrentTask(loadedTasks[0]);
          }
          setPrefilledId(id);
        })
        .catch(() => {
          setError('Failed to load case study for editing');
        })
        .finally(() => setLoading(false));
    }
  }, [id, prefilledId]);

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
  };

  const handleSave = async () => {
    if (currentStep === 1) {
      // Save scenario
      if (currentScenario.title && currentScenario.content) {
        const scenarioToSave: Scenario = {
          ...currentScenario,
          id: currentScenario.id || Date.now().toString(),
          description: currentScenario.description || '',
          documents: currentScenario.documents || []
        };
        
        if (currentScenario.id) {
          setScenarios(prev => prev.map(s => s.id === currentScenario.id ? scenarioToSave : s));
        } else {
          setScenarios(prev => [...prev, scenarioToSave]);
        }
        
        setCurrentScenario({
          id: '',
          title: '',
          description: '',
          content: '',
          exerciseTime: 30,
          readingTime: 30,
          documents: []
        });
      }
    } else if (currentStep === 2) {
      // Save task
      if (currentTask.title && currentTask.content) {
        const taskToSave = {
          ...currentTask,
          id: currentTask.id || Date.now().toString()
        };
        
        if (currentTask.id) {
          setTasks(prev => prev.map(t => t.id === currentTask.id ? taskToSave : t));
        } else {
          setTasks(prev => [...prev, taskToSave]);
        }
        
        setCurrentTask({
          id: '',
          title: '',
          content: '',
          responseType: '',
          isMandatory: false,
          exerciseTime: 30,
          readingTime: 30
        });
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Final save logic: call API
      setLoading(true);
      setError(null);
      setSuccess(false);
      try {
        const payload = {
          name: formData.name || '',
          description: formData.description || '',
          instructions: formData.overview || '',
          videoUrl: formData.videoUrl || '',
          interactiveActivityType: formData.interactiveActivityType || undefined,
          scenarios: scenarios.map(s => ({
            title: s.title || '',
            readTime: Number(s.readingTime) || 1,
            exerciseTime: Number(s.exerciseTime) || 1,
            data: s.content || ''
          })),
          tasks: tasks.map(t => ({
            title: t.title || '',
            readTime: Number(t.readingTime) || 1,
            exerciseTime: Number(t.exerciseTime) || 1,
            data: t.content || ''
          }))
        };
        if (id) {
          await updateCaseStudy(id, payload);
        } else {
          await createCaseStudy(payload);
        }
        router.push('/dashboard/report-generation/content/assessment');
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error && typeof (error as Error).message === 'string') {
          setError((error as Error).message);
        } else {
          setError('Failed to save case study');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    console.log('Cancelled');
  };

  const updateFormData = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    setCurrentScenario(scenario);
  };

  const handleTaskSelect = (task: Task) => {
    setCurrentTask(task);
  };

  const handleAddNewScenario = () => {
    setCurrentScenario({
      id: '',
      title: '',
      description: '',
      content: '',
      exerciseTime: 30,
      readingTime: 30,
      documents: []
    });
  };

  const handleAddScenario = (scenario: Scenario) => {
    // Only add if title and content are present
    if (scenario.title && scenario.content) {
      const scenarioToAdd: Scenario = {
        ...scenario,
        id: scenario.id || Date.now().toString(),
        documents: scenario.documents || []
      };
      setScenarios(prev => [...prev, scenarioToAdd]);
      handleAddNewScenario();
    }
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios(prev => prev.filter(s => s.id !== id));
    // If the deleted scenario is the current one, clear the form
    if (currentScenario.id === id) {
      setCurrentScenario({
        id: '',
        title: '',
        description: '',
        content: '',
        exerciseTime: 30,
        readingTime: 30,
        documents: []
      });
    }
  };

  const handleAddNewTask = () => {
    setCurrentTask({
      id: '',
      title: '',
      content: '',
      responseType: '',
      isMandatory: false,
      exerciseTime: 30,
      readingTime: 30
    });
  };

  const handleAddTask = (task: Task) => {
    if (task.title && task.content) {
      const taskToAdd: Task = {
        ...task,
        id: task.id || Date.now().toString()
      };
      setTasks(prev => [...prev, taskToAdd]);
      handleAddNewTask();
    }
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (currentTask.id === id) {
      setCurrentTask({
        id: '',
        title: '',
        content: '',
        responseType: '',
        isMandatory: false,
        exerciseTime: 30,
        readingTime: 30
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <OverviewStep
            formData={formData}
            updateFormData={updateFormData}
          />
        );

      case 1:
        return (
          <ScenarioStep
            scenarios={scenarios}
            currentScenario={currentScenario}
            setCurrentScenario={setCurrentScenario}
            onScenarioSelect={handleScenarioSelect}
            onAddNew={handleAddNewScenario}
            onDeleteScenario={handleDeleteScenario}
            onAddScenario={handleAddScenario}
          />
        );

      case 2:
        return (
          <TaskStep
            tasks={tasks}
            currentTask={currentTask}
            setCurrentTask={setCurrentTask}
            onTaskSelect={handleTaskSelect}
            onAddNew={handleAddNewTask}
            onDeleteTask={handleDeleteTask}
            onAddTask={handleAddTask}
          />
        );

      case 3:
        return (
          <PreviewStep
            formData={formData}
            scenarios={scenarios}
            tasks={tasks}
          />
        );

      default:
        return null;
    }
  };

  return (
    <>
      {loading && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">Saving assessment, please wait...</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">Assessment saved successfully!</div>
      )}
      <CaseStudyLayout
        currentStep={currentStep}
        onStepChange={handleStepChange}
        onSave={handleSave}
        onCancel={handleCancel}
        showCancelButton={currentStep === 0}
        saveButtonText={currentStep === 3 ? (id ? "Update Assessment" : "Save Assessment") : "Save and Next"}
      >
        {renderStepContent()}
      </CaseStudyLayout>
    </>
  );
};

export default CaseStudyAssessment;