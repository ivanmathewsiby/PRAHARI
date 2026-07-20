const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Incident {
  id?: number;
  incident_id: string;
  citizen_name: string;
  phone_number: string;
  transcript: string;
  location: string;
  fraud_type: string;
  risk_level: string;
  status: string;
  created_at: string;
}

export interface IncidentCreateInput {
  citizen_name: string;
  phone_number: string;
  transcript: string;
  location: string;
}

export interface IncidentUpdateInput {
  fraud_type?: string;
  risk_level?: string;
  status?: string;
}

export interface AuditCreateInput {
  incident_id: string;
  action: string;
  rule_hits: string[];
  model_version: string;
  prompt_version: string;
  score_components: Record<string, any>;
  threshold_version: string;
}

export interface AuditLogResponse {
  id: number;
  incident_id: string;
  action: string;
  rule_hits: string[] | Record<string, any>;
  model_version: string;
  prompt_version: string;
  score_components: Record<string, any>;
  threshold_version: string;
  created_at: string;
}

export interface DashboardStats {
  total_incidents: number;
  open_cases: number;
  closed_cases: number;
  under_review: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
}

// -------------------------------------------------------------
// Incident Endpoints
// -------------------------------------------------------------

export async function createIncident(data: IncidentCreateInput): Promise<Incident> {
  const res = await fetch(`${API_BASE}/api/incidents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create incident");
  return res.json();
}

export async function getIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/api/incidents`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch incidents");
  return res.json();
}

export async function getIncident(id: string): Promise<Incident> {
  const res = await fetch(`${API_BASE}/api/incidents/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch incident ${id}`);
  return res.json();
}

export async function updateIncident(id: string, data: IncidentUpdateInput): Promise<Incident> {
  const res = await fetch(`${API_BASE}/api/incidents/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update incident");
  return res.json();
}

export async function deleteIncident(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/incidents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete incident");
  return res.json();
}

// -------------------------------------------------------------
// Audit Endpoints
// -------------------------------------------------------------

export async function createAuditLog(data: AuditCreateInput): Promise<AuditLogResponse> {
  const res = await fetch(`${API_BASE}/api/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create audit log");
  return res.json();
}

export async function getAuditLogs(): Promise<AuditLogResponse[]> {
  const res = await fetch(`${API_BASE}/api/audit`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

// -------------------------------------------------------------
// Dashboard Endpoints
// -------------------------------------------------------------

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch(`${API_BASE}/dashboard/stats`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export async function getRecentIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/dashboard/recent-incidents`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch recent incidents");
  return res.json();
}

export async function getHighRiskIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/dashboard/high-risk`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch high-risk cases");
  return res.json();
}

export async function getOpenIncidents(): Promise<Incident[]> {
  const res = await fetch(`${API_BASE}/dashboard/open`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch open cases");
  return res.json();
}

export async function getAnalytics(): Promise<Record<string, number>> {
  const res = await fetch(`${API_BASE}/dashboard/analytics`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch analytics");
  return res.json();
}

// -------------------------------------------------------------
// Fraud Ring Endpoints (Neo4j Graph)
// -------------------------------------------------------------

export interface RingSummary {
  ring_id: string;
  report_count: number;
  city_count: number;
  critical_count: number;
  agencies: string[];
}

export interface RingNode {
  id: string;
  label: string;
  type: string;
  hub_rank?: number;
}

export interface RingEdge {
  source: string;
  target: string;
  label: string;
}

export interface RingGraph {
  nodes: RingNode[];
  edges: RingEdge[];
}

export interface HubIdentifier {
  identifier: string;
  type: string;
  connection_count: number;
  hub_rank?: number;
}

export interface RingDetail {
  ring_id: string;
  reports: any[];
  top_hubs: HubIdentifier[];
  graph: RingGraph;
}

export interface EvidencePackageReport {
  report_id: string;
  transcript_preview: string;
  risk_label: string;
  claimed_agency: string;
  city: string;
  created_at: string;
  phones: string[];
  upis: string[];
  banks: string[];
  agencies: string[];
}

export interface EvidencePackage {
  ring_id: string;
  stats: {
    report_count: number;
    city_count: number;
    agencies: string[];
  };
  reports: EvidencePackageReport[];
  top_hubs: HubIdentifier[];
}

export async function getRings(): Promise<RingSummary[]> {
  const res = await fetch(`${API_BASE}/api/rings`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch rings");
  return res.json();
}

export async function getRingDetail(ringId: string): Promise<RingDetail> {
  const res = await fetch(`${API_BASE}/api/rings/${ringId}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ring ${ringId}`);
  return res.json();
}

export async function getRingGraph(ringId: string): Promise<RingGraph> {
  const res = await fetch(`${API_BASE}/api/rings/${ringId}/graph`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch graph for ring ${ringId}`);
  return res.json();
}

export async function getEvidencePackage(ringId: string): Promise<EvidencePackage> {
  const res = await fetch(`${API_BASE}/api/rings/${ringId}/evidence-package`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch evidence package for ring ${ringId}`);
  return res.json();
}
