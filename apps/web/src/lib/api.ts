import type {
  CreateSessionDto,
  CreateSessionResponse,
  JoinSessionResponse,
  Session,
} from '@tabpilot/shared';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  },
);

export async function createSession(dto: CreateSessionDto): Promise<CreateSessionResponse> {
  const response = await apiClient.post<CreateSessionResponse>('/sessions', dto);
  return response.data;
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await apiClient.get<Session>(`/sessions/${sessionId}`);
  return response.data;
}

export async function getSessionByCode(code: string): Promise<Session> {
  const response = await apiClient.get<Session>(`/sessions/code/${code}`);
  return response.data;
}

export async function joinSession(
  sessionId: string,
  name: string,
  email?: string,
): Promise<JoinSessionResponse> {
  const response = await apiClient.post<JoinSessionResponse>(`/sessions/${sessionId}/join`, {
    name,
    email,
  });
  return response.data;
}

export async function deleteSession(sessionId: string, hostKey: string): Promise<void> {
  await apiClient.delete(`/sessions/${sessionId}`, { data: { hostKey } });
}

export default apiClient;
