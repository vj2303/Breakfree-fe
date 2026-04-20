import { API_BASE_URL_WITH_API } from './apiConfig';

const API_URL = `${API_BASE_URL_WITH_API}/inbox-activities`;

function getAuthToken() {
  if (typeof window === 'undefined') throw new Error('No window object');
  const token = localStorage.getItem('token');
  if (!token) throw new Error('User not authenticated');
  return `Bearer ${token}`;
}

// TypeScript interfaces for inbox activity data structure
export interface InboxActivityScenario {
  title: string;
  readTime: number;
  exerciseTime: number;
  data: string;
}

export interface InboxActivityTask {
  title: string;
  readTime: number;
  exerciseTime: number;
  data: string;
}

export interface InboxActivityCharacter {
  name: string;
  email: string;
  designation: string;
}

export interface InboxActivityOrgChart {
  name: string;
  email: string;
  designation: string;
  parentId?: string;
}

export interface InboxActivityContent {
  to: string[];
  from: string;
  cc: string[];
  bcc: string[];
  subject: string;
  date: string;
  emailContent: string;
}

export type InteractiveActivityType = 'GD' | 'ROLEPLAY' | 'CASE_STUDY';

export interface InboxActivityPayload {
  name: string;
  description: string;
  instructions: string;
  videoUrl: string;
  interactiveActivityType?: InteractiveActivityType;
  scenarios: InboxActivityScenario[];
  tasks: InboxActivityTask[];
  characters: InboxActivityCharacter[];
  organizationCharts: InboxActivityOrgChart[];
  contents: InboxActivityContent[];
}

export async function fetchInboxActivities(page = 1, limit = 10) {
  const res = await fetch(`${API_URL}?page=${page}&limit=${limit}`, {
    headers: { 
      'Authorization': getAuthToken(),
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch inbox activities: ${errorText}`);
  }
  return res.json();
}

export async function createInboxActivity(payload: InboxActivityPayload, token: string) {
  console.log('Creating inbox activity with payload:', JSON.stringify(payload, null, 2));
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.error('API Error Response:', errorText);
    throw new Error(`Failed to create inbox activity: ${res.status} ${res.statusText} - ${errorText}`);
  }
  
  const result = await res.json();
  console.log('Inbox activity created successfully:', result);
  return result;
}

export async function updateInboxActivity(activityId: string, payload: Partial<InboxActivityPayload>, token: string) {
  console.log('Updating inbox activity with payload:', JSON.stringify(payload, null, 2));
  
  const res = await fetch(`${API_URL}/${activityId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    console.error('API Error Response:', errorText);
    throw new Error(`Failed to update inbox activity: ${res.status} ${res.statusText} - ${errorText}`);
  }
  
  const result = await res.json();
  console.log('Inbox activity updated successfully:', result);
  return result;
}

export async function getInboxActivity(activityId: string, token: string) {
  const res = await fetch(`${API_URL}/${activityId}`, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to fetch inbox activity: ${errorText}`);
  }
  
  return res.json();
}

export async function deleteInboxActivity(activityId: string) {
  const res = await fetch(`${API_URL}/${activityId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthToken(),
    },
  });
  
  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error');
    throw new Error(`Failed to delete inbox activity: ${errorText}`);
  }
  
  return res.json();
}