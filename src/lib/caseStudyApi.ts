import { API_BASE_URL_WITH_API } from './apiConfig';

const API_URL = `${API_BASE_URL_WITH_API}/case-studies`;

function getAuthToken() {
  if (typeof window === 'undefined') throw new Error('No window object');
  const token = localStorage.getItem('token');
  if (!token) throw new Error('User not authenticated');
  return `Bearer ${token}`;
}

export async function createCaseStudy<T = unknown>(data: T) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthToken(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to create case study');
  }
  return res.json();
}

export async function fetchCaseStudies(page = 1, limit = 10) {
  const res = await fetch(`${API_URL}?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': getAuthToken() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch case studies');
  }
  return res.json();
}

export async function updateCaseStudy<T = unknown>(id: string, data: T) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthToken(),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to update case study');
  }
  return res.json();
}

export async function deleteCaseStudy(id: string) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': getAuthToken() }
  });
  if (!res.ok) {
    throw new Error('Failed to delete case study');
  }
  return res.json();
}

export async function fetchCaseStudyById(id: string) {
  const res = await fetch(`${API_URL}/${id}`, {
    headers: { 'Authorization': getAuthToken() }
  });
  if (!res.ok) {
    throw new Error('Failed to fetch case study');
  }
  const result = await res.json();
  return result.data || result;
} 