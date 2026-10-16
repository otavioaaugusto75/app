import { storage } from "@/src/utils/storage";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL ?? "";
const TOKEN_KEY = "inclusiv_token";

export const auth = {
  getToken: () => storage.secureGet<string | null>(TOKEN_KEY, null),
  setToken: (t: string) => storage.secureSet(TOKEN_KEY, t),
  clearToken: () => storage.secureRemove(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await auth.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }
  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) return res.json();
  return (await res.text()) as unknown as T;
}

export const api = {
  base: BASE_URL,
  login: (email: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (name: string, email: string, password: string, institution: string) =>
    request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, institution }),
    }),
  me: () => request<any>("/auth/me"),
  listStudents: () => request<any[]>("/students"),
  createStudent: (data: any) => request("/students", { method: "POST", body: JSON.stringify(data) }),
  deleteStudent: (id: string) => request(`/students/${id}`, { method: "DELETE" }),
  listExams: () => request<any[]>("/exams"),
  getExam: (id: string) => request<any>(`/exams/${id}`),
  uploadExam: (payload: { title: string; source: string; content_base64: string; mime_type: string }) =>
    request<any>("/exams", { method: "POST", body: JSON.stringify(payload) }),
  updateStructure: (id: string, structure: any) =>
    request<any>(`/exams/${id}/structure`, { method: "PUT", body: JSON.stringify(structure) }),
  listAdaptations: () => request<any[]>("/adaptations"),
  getAdaptation: (id: string) => request<any>(`/adaptations/${id}`),
  createAdaptation: (payload: any) =>
    request<any>("/adaptations", { method: "POST", body: JSON.stringify(payload) }),
  editAdaptation: (id: string, questoes: any[]) =>
    request<any>(`/adaptations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ questoes_adaptadas: questoes }),
    }),
  approveAdaptation: (id: string) =>
    request<any>(`/adaptations/${id}/approve`, { method: "POST" }),
  listProfiles: () => request<{ id: string; label: string }[]>("/profiles"),
  ttsUrl: (aid: string) =>
    request<{ url: string }>(`/adaptations/${aid}/tts`, { method: "POST" }),
  exportTxtUrl: (aid: string) => `${BASE_URL}/api/adaptations/${aid}/export.txt`,
  exportPdfUrl: (aid: string) => `${BASE_URL}/api/adaptations/${aid}/export.pdf`,
};
