import axios from 'axios';

export interface ClaimDocumentPreview {
  id: number;
  type: string;
  filename: string;
  previewUrl: string;
}

export interface Claim {
  id: number;
  claimId: string;
  submissionId: string;
  policyNumber: string;
  customerName: string;
  carrierName: string;
  policyName: string;
  createdDate: string;
  processedDate: string;
  status:
    | 'TPA Approved'
    | 'Carrier Pending'
    | 'Carrier Approved'
    | 'Carrier Rejected'
    | 'Rejected'
    | 'Needs Manual Review'
    | 'Processing'
    | 'Review'
    | 'Pending';
  reason: string;
  extractionConfidence?: number;
  extractedData?: Record<string, unknown>;
  documents?: ClaimDocumentPreview[];
  triggeredRules?: string[];
  rulesExecutedCount?: number;
  rulesFailedCount?: number;
  recommendationStatus?: string;
  carrierReferenceId?: string;
  carrierDecision?: string;
  carrierDecisionDate?: string;
  carrierDecisionReason?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

export const API_BASE_URL = 'http://localhost:8080';
const BASE_URL = API_BASE_URL;

// Unified portal uses one token regardless of role.
const AUTH_TOKEN_KEY = 'access_token';
const AUTH_SESSION_USER_KEY = 'session_user';

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: { id: number; username: string; fullName?: string; role: string; email: string };
}

export interface CarrierOption {
  id: number;
  code: string;
  name: string;
}

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

axiosInstance.interceptors.request.use((config) => {
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response Interceptor for mapping common backend fields to frontend fields
axiosInstance.interceptors.response.use(
  (response) => {
    // If it's a paginated response, map the data items
    if (response.data && response.data.data && Array.isArray(response.data.data)) {
      response.data.data = response.data.data.map(mapBackendToFrontendClaim);
    }
    // If it's a single claim response
    else if (response.data && response.data.claimId) {
      response.data = mapBackendToFrontendClaim(response.data);
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    if (error.response?.status === 401 || error.response?.status === 403) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function mapBackendToFrontendClaim(backend: any): Claim {
  const statusMap: Record<string, Claim['status']> = {
    'APPROVED': 'TPA Approved',
    'TPA_APPROVED': 'TPA Approved',
    'REJECTED': 'Rejected',
    'MANUAL_REVIEW': 'Needs Manual Review',
    'TPA_MANUAL_REVIEW': 'Needs Manual Review',
    'PROCESSING': 'Processing',
    'PENDING': 'Pending',
    'REVIEW': 'Review',
    'SUBMITTED_TO_CARRIER': 'Carrier Pending',
    'CARRIER_PENDING': 'Carrier Pending',
    'CARRIER_APPROVED': 'Carrier Approved',
    'CARRIER_REJECTED': 'Carrier Rejected',
    'CLOSED': 'Carrier Approved'
  };

  return {
    id: backend.id,
    claimId: backend.claimId,
    submissionId: backend.submissionId,
    policyNumber: backend.policyNumber || '',
    customerName: backend.patientName || backend.extractedData?.customer_name || 'Unknown',
    carrierName: backend.carrierName || 'N/A',
    policyName: backend.policyName || 'Standard Policy',
    createdDate: backend.createdAt,
    processedDate: backend.updatedAt,
    status: statusMap[backend.status] || 'Pending',
    reason: backend.rejectionReason || backend.manualReviewReason || backend.tpaRecommendationReason || '',
    extractionConfidence: backend.extractionConfidence == null ? undefined : Number(backend.extractionConfidence),
    extractedData: backend.extractedData || {},
    triggeredRules: backend.triggeredRules || [],
    rulesExecutedCount: backend.rulesExecutedCount || 0,
    rulesFailedCount: backend.rulesFailedCount || 0,
    recommendationStatus: backend.tpaRecommendationStatus || '',
    carrierReferenceId: backend.carrierReferenceId || undefined,
    carrierDecision: backend.carrierDecision || undefined,
    carrierDecisionDate: backend.carrierDecisionDate || undefined,
    carrierDecisionReason: backend.carrierDecisionReason || undefined,
    documents: (backend.documents || []).map((doc: any) => ({
      id: doc.id,
      type: doc.type,
      filename: doc.filename,
      previewUrl: doc.previewUrl,
    })),
  };
}

export interface TpaDashboardSummary {
  totalClaims: number;
  carrierApproved: number;
  carrierRejected: number;
  manualReview: number;
  rejectedTotal: number;
}

export interface CarrierDashboardSummary {
  totalClaims: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  actionType: string;
  message: string;
  createdAt: string;
  actorUsername?: string | null;
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result?.toString().split(',')[1];
      resolve(base64String || '');
    };
    reader.onerror = (error) => reject(error);
  });
};

class ApiService {
  getToken(): string | null {
    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  }

  getSessionUser():
    | { id: number; username: string; fullName?: string; role: string; email: string }
    | null {
    const raw = window.localStorage.getItem(AUTH_SESSION_USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getRole(): string | null {
    const session = this.getSessionUser();
    if (session?.role) return session.role;
    const token = this.getToken();
    if (!token) return null;
    const payload = decodeJwtPayload(token);
    const role = payload?.role;
    return typeof role === 'string' ? role : null;
  }

  setToken(token: string | null) {
    if (!token) {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.removeItem(AUTH_SESSION_USER_KEY);
      return;
    }
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  async login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>('/api/auth/login', { usernameOrEmail, password });
    this.setToken(response.data.accessToken);
    if (response.data?.user) {
      window.localStorage.setItem(AUTH_SESSION_USER_KEY, JSON.stringify(response.data.user));
    }
    return response.data;
  }

  logout() {
    this.setToken(null);
  }

  async fetchClaims(params?: { page?: number; size?: number; status?: string; searchTerm?: string }): Promise<PaginatedResponse<Claim>> {
    const response = await axiosInstance.get<PaginatedResponse<Claim>>('/api/tpa/claims', { params });
    return response.data;
  }

  async fetchDashboardSummary(): Promise<TpaDashboardSummary> {
    const response = await axiosInstance.get<TpaDashboardSummary>('/api/tpa/dashboard');
    return response.data;
  }

  async fetchCarrierDashboardSummary(): Promise<CarrierDashboardSummary> {
    const response = await axiosInstance.get<CarrierDashboardSummary>('/api/carrier/dashboard');
    return response.data;
  }

  async fetchCarrierClaims(params?: { page?: number; size?: number; status?: string; searchTerm?: string }): Promise<PaginatedResponse<Claim>> {
    const response = await axiosInstance.get<PaginatedResponse<Claim>>('/api/carrier/claims', { params });
    return response.data;
  }

  async getCarrierClaimById(id: string | number): Promise<Claim> {
    const response = await axiosInstance.get<Claim>(`/api/carrier/claims/${id}`);
    return response.data;
  }

  async submitCarrierDecision(
    claimId: string | number,
    decision: 'APPROVE' | 'REJECT',
    reason?: string,
    approvedAmount?: number
  ): Promise<Claim> {
    const response = await axiosInstance.post<Claim>(`/api/carrier/claims/${claimId}/decision`, {
      decision,
      reason,
      approvedAmount,
    });
    return response.data;
  }

  async fetchCarrierAuditLogs(claimId: string | number): Promise<AuditLogEntry[]> {
    const response = await axiosInstance.get<AuditLogEntry[]>(`/api/carrier/claims/${claimId}/audit`);
    return response.data;
  }

  async fetchCarriers(): Promise<CarrierOption[]> {
    const response = await axiosInstance.get<CarrierOption[]>('/api/tpa/carriers');
    return response.data;
  }

  async uploadClaimForReview(claimForm: File, combinedDocument: File, carrierId: number): Promise<Claim> {
    const claimFormBase64 = await fileToBase64(claimForm);
    const combinedDocBase64 = await fileToBase64(combinedDocument);

    const claimRequest = {
      submissionId: `SUB-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      carrierId,
      documents: [
        {
          type: "CLAIM_FORM",
          filename: claimForm.name,
          base64Content: claimFormBase64
        },
        {
          type: "DISCHARGE_SUMMARY_AND_FINAL_BILL",
          filename: combinedDocument.name,
          base64Content: combinedDocBase64
        }
      ]
    };

    const response = await axiosInstance.post<Claim>('/api/tpa/claims', claimRequest);
    return response.data;
  }

  async uploadClaim(claimForm: File, combinedDocument: File, carrierId: number): Promise<Claim> {
    return this.uploadClaimForReview(claimForm, combinedDocument, carrierId);
  }

  async confirmClaim(claimId: string | number, extractedData: Record<string, unknown>): Promise<Claim> {
    const response = await axiosInstance.post<Claim>(`/api/tpa/claims/${claimId}/confirm`, {
      extractedData,
    });
    return response.data;
  }

  async applyManualReviewDecision(
    claimId: string | number,
    decision: 'APPROVE' | 'REJECT',
    reason?: string,
    approvedAmount?: number
  ): Promise<Claim> {
    const response = await axiosInstance.post<Claim>(`/api/tpa/claims/${claimId}/manual-review/decision`, {
      decision,
      reason,
      approvedAmount,
    });
    return response.data;
  }

  async getClaimById(id: string | number): Promise<Claim> {
    const response = await axiosInstance.get<Claim>(`/api/claims/${id}`);
    return response.data;
  }

  async submitToCarrier(claimId: string | number): Promise<Claim> {
    const response = await axiosInstance.post<Claim>(`/api/tpa/claims/${claimId}/submit`);
    return response.data;
  }

  async downloadClaimPDF(claimId: string | number): Promise<void> {
    try {
      const response = await axiosInstance.get(`/api/claims/${claimId}/export`, {
        responseType: 'blob',
      });

      const contentDisposition = (response.headers?.['content-disposition'] as string | undefined) || '';
      const filenameMatch = contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i);
      const filename = filenameMatch?.[1] || `claim-${claimId}.pdf`;

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }
}

export default new ApiService();
