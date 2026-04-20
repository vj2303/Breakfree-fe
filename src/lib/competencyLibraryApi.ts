import { API_BASE_URL_WITH_API } from './apiConfig';

const API_URL = `${API_BASE_URL_WITH_API}/competency-libraries`;

// Helper function to get auth token from localStorage
function getAuthToken() {
  if (typeof window === 'undefined') return '';
  const token = localStorage.getItem('token');
  return token ? `Bearer ${token}` : '';
}

export async function fetchCompetencyLibraries(search = '', authToken?: string) {
  const token = authToken || getAuthToken();
  const res = await fetch(`${API_URL}?page=1&limit=10&search=${encodeURIComponent(search)}`, {
    headers: { Authorization: token }
  });
  return res.json();
}

export async function createCompetencyLibrary(competencyName: string, subCompetencyNames: string[], authToken?: string) {
  const token = authToken || getAuthToken();
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ competencyName, subCompetencyNames })
  });
  return res.json();
}

export async function updateCompetencyLibrary(id: string, competencyName: string, subCompetencyNames: string[], authToken?: string) {
  const token = authToken || getAuthToken();
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token
    },
    body: JSON.stringify({ competencyName, subCompetencyNames })
  });
  return res.json();
}

export async function deleteCompetencyLibrary(id: string, authToken?: string) {
  const token = authToken || getAuthToken();
  const res = await fetch(`/api/competency-libraries/${id}`, {
    method: 'DELETE',
    headers: { 
      'Authorization': token,
      'Content-Type': 'application/json'
    }
  });
  return res.json();
} 