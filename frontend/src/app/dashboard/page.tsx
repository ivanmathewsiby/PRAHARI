"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "../../context/LanguageContext";
import {
  getDashboardStats,
  getIncidents,
  getAnalytics,
  updateIncident,
  deleteIncident,
  Incident,
  DashboardStats,
} from "../../lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import FraudRingPanel from "../../components/FraudRingPanel";
import {
  Shield,
  AlertOctagon,
  CheckCircle2,
  FolderOpen,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<"online" | "offline">("online");
  
  // Selected incident details for Inspector Modal
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, incidentsList, analyticsData] = await Promise.all([
        getDashboardStats(),
        getIncidents(),
        getAnalytics(),
      ]);

      setStats(statsData);
      setIncidents(incidentsList);
      setAnalytics(analyticsData);
      setBackendStatus("online");
    } catch (err) {
      console.warn("FastAPI backend offline. Loading mock database for demonstration.", err);
      setBackendStatus("offline");
      loadMockDashboardData();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const loadMockDashboardData = () => {
    // High-fidelity fallback database for offline demonstration
    const mockStats: DashboardStats = {
      total_incidents: 12,
      open_cases: 6,
      closed_cases: 4,
      under_review: 2,
      high_risk: 5,
      medium_risk: 4,
      low_risk: 3,
    };

    const mockIncidents: Incident[] = [
      {
        incident_id: "7a2b9c1d",
        citizen_name: "Rahul Sharma",
        phone_number: "9812456789",
        transcript: "This is Cyber Crime Branch. You are under virtual arrest. Narcotics were detected in a parcel booked under your Aadhaar number. Do not disconnect call and transfer 85000 verification amount immediately.",
        location: "Delhi",
        fraud_type: "Digital Arrest Scam",
        risk_level: "HIGH",
        status: "OPEN",
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        incident_id: "3d8e9f2a",
        citizen_name: "Priya Nair",
        phone_number: "9734567890",
        transcript: "Dear customer, your credit card block sequence has initiated due to non-compliance. Verify your account balance immediately or pay verification penalty fee of 15000.",
        location: "Mumbai",
        fraud_type: "Phishing Attempt",
        risk_level: "MEDIUM",
        status: "UNDER_REVIEW",
        created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      },
      {
        incident_id: "5b6c7d8e",
        citizen_name: "Aman Gupta",
        phone_number: "9988776655",
        transcript: "Need to update banking profiles. Standard KYC confirmation request. Please share verification OTP to approve transactions.",
        location: "Bengaluru",
        fraud_type: "OTP Scam",
        risk_level: "MEDIUM",
        status: "OPEN",
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        incident_id: "1f2e3d4c",
        citizen_name: "Sneha Reddy",
        phone_number: "9512345678",
        transcript: "Hi dad, reached hostel safely. Please send the college notes when you get time. Love you.",
        location: "Hyderabad",
        fraud_type: "Clean / Low Risk",
        risk_level: "LOW",
        status: "CLOSED",
        created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      },
      {
        incident_id: "9e8d7c6b",
        citizen_name: "Arjun Menon",
        phone_number: "9876543210",
        transcript: "Custom clearance officer warning. Your consignment from courier is detained. Pay customs fees of 45000.",
        location: "Kochi",
        fraud_type: "Courier Scam",
        risk_level: "HIGH",
        status: "OPEN",
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      },
    ];

    const mockAnalytics = {
      "Digital Arrest Scam": 5,
      "Phishing Attempt": 4,
      "OTP Scam": 2,
      "Courier Scam": 1,
    };

    setStats(mockStats);
    setIncidents(mockIncidents);
    setAnalytics(mockAnalytics);
  };

  const handleUpdateStatus = async (newStatus: "OPEN" | "UNDER_REVIEW" | "CLOSED") => {
    if (!selectedIncident) return;
    setStatusUpdateLoading(true);

    try {
      if (backendStatus === "online") {
        const updated = await updateIncident(selectedIncident.incident_id, {
          status: newStatus,
        });
        
        // Sync local list
        setIncidents(incidents.map(inc => 
          inc.incident_id === selectedIncident.incident_id 
            ? { ...inc, status: newStatus } 
            : inc
        ));
        
        // Recalculate stats counts
        if (stats) {
          const statsDiff: Partial<DashboardStats> = {};
          // Crude local update of stats counts
          setStats({
            ...stats,
            open_cases: newStatus === "OPEN" ? stats.open_cases + 1 : selectedIncident.status === "OPEN" ? stats.open_cases - 1 : stats.open_cases,
            under_review: newStatus === "UNDER_REVIEW" ? stats.under_review + 1 : selectedIncident.status === "UNDER_REVIEW" ? stats.under_review - 1 : stats.under_review,
            closed_cases: newStatus === "CLOSED" ? stats.closed_cases + 1 : selectedIncident.status === "CLOSED" ? stats.closed_cases - 1 : stats.closed_cases,
          });
        }
      } else {
        // Fallback updates local list
        setIncidents(incidents.map(inc => 
          inc.incident_id === selectedIncident.incident_id 
            ? { ...inc, status: newStatus } 
            : inc
        ));
      }

      setSelectedIncident({ ...selectedIncident, status: newStatus });
    } catch (err) {
      console.error("Failed to update status", err);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  const handleDeleteCase = async () => {
    if (!selectedIncident) return;
    if (!confirm("Are you sure you want to delete this incident record from databases?")) return;

    try {
      if (backendStatus === "online") {
        await deleteIncident(selectedIncident.incident_id);
      }
      
      setIncidents(incidents.filter(inc => inc.incident_id !== selectedIncident.incident_id));
      
      if (stats) {
        setStats({
          ...stats,
          total_incidents: stats.total_incidents - 1,
          open_cases: selectedIncident.status === "OPEN" ? stats.open_cases - 1 : stats.open_cases,
          under_review: selectedIncident.status === "UNDER_REVIEW" ? stats.under_review - 1 : stats.under_review,
          closed_cases: selectedIncident.status === "CLOSED" ? stats.closed_cases - 1 : stats.closed_cases,
          high_risk: selectedIncident.risk_level === "HIGH" ? stats.high_risk - 1 : stats.high_risk,
          medium_risk: selectedIncident.risk_level === "MEDIUM" ? stats.medium_risk - 1 : stats.medium_risk,
          low_risk: selectedIncident.risk_level === "LOW" ? stats.low_risk - 1 : stats.low_risk,
        });
      }
      
      setSelectedIncident(null);
    } catch (err) {
      console.error("Failed to delete incident", err);
    }
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case "HIGH":
        return "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30";
      case "MEDIUM":
        return "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30";
      default:
        return "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900/30";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30";
      case "UNDER_REVIEW":
        return "bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900/30";
      default:
        return "bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700";
    }
  };

  // Filters logic
  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.citizen_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incident_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.fraud_type.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesRisk = riskFilter === "ALL" || inc.risk_level === riskFilter;
    
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="relative flex-grow py-12 px-4 sm:px-6 lg:px-8 bg-gray-50/20 dark:bg-zinc-950 transition-colors duration-200 text-left">
      <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#1f1f23_1px,transparent_1px)] opacity-50 dark:opacity-30 pointer-events-none z-0" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
              <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              Public Safety Intelligence Room
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              National cyber-crime audit logs & threat severity classifications.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              backendStatus === "online" 
                ? "bg-green-50 text-green-600 border-green-200" 
                : "bg-amber-50 text-amber-600 border-amber-200 border-dashed"
            }`}>
              <span className={`h-2 w-2 rounded-full ${backendStatus === "online" ? "bg-green-500 animate-pulse" : "bg-amber-500 animate-pulse"}`} />
              Database API: {backendStatus === "online" ? "Online Syncing" : "Offline Sandbox"}
            </span>

            <button
              onClick={fetchDashboardData}
              className="p-2 rounded-lg border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors"
              title="Refresh database"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats KPIs Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm text-left flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Reports</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{stats.total_incidents}</h3>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm text-left flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertOctagon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">High Risk Scam</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{stats.high_risk}</h3>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm text-left flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Under Review</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{stats.under_review}</h3>
              </div>
            </div>

            <div className="p-6 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm text-left flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Closed cases</span>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{stats.closed_cases}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search toolbar */}
        <div className="p-4 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800/80 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, name, location, or scam type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-gray-400 hidden sm:block" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full sm:w-44 bg-gray-50 dark:bg-zinc-950 border border-gray-250 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>
          </div>
        </div>

        {/* Incidents Table card */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-950 border-b border-gray-150 dark:border-zinc-850 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Incident ID</th>
                  <th className="px-6 py-4">Citizen Name</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Fraud Type</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-850">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 animate-pulse font-medium">
                      Querying threat intelligence database...
                    </td>
                  </tr>
                ) : filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-medium">
                      No reports found matching selection criteria.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((incident) => (
                    <tr key={incident.incident_id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900 dark:text-white">
                        {incident.incident_id}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-gray-200">
                        {incident.citizen_name}
                      </td>
                      <td className="px-6 py-4 text-gray-550 dark:text-gray-400">
                        {incident.location}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">
                        {incident.fraud_type}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getRiskBadgeColor(incident.risk_level)}`}>
                          {incident.risk_level}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadgeColor(incident.status)}`}>
                          {incident.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {new Date(incident.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedIncident(incident)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Fraud Ring Intelligence Panel */}
      <FraudRingPanel />

      {/* Incident Inspector dialog */}
      <Dialog open={selectedIncident !== null} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        {selectedIncident && (
          <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl shadow-xl">
            <DialogHeader className="text-left border-b border-gray-100 dark:border-zinc-850 pb-3">
              <div className="flex items-center justify-between gap-4">
                <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5.5 w-5.5 text-indigo-500" />
                  Incident File: PR-{selectedIncident.incident_id}
                </DialogTitle>
                <div className="flex gap-2">
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getRiskBadgeColor(selectedIncident.risk_level)}`}>
                    {selectedIncident.risk_level}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadgeColor(selectedIncident.status)}`}>
                    {selectedIncident.status}
                  </span>
                </div>
              </div>
              <DialogDescription className="text-xs text-gray-400 mt-1">
                Submitted on {new Date(selectedIncident.created_at).toLocaleString()} from {selectedIncident.location}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4 text-left">
              {/* Metadata Fields */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Citizen Name</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedIncident.citizen_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Callback Phone</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{selectedIncident.phone_number}</span>
                </div>
              </div>

              {/* Transcript */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Submitted Interaction Transcript</span>
                <div className="p-4 bg-gray-50/50 dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-xl max-h-[180px] overflow-y-auto">
                  <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedIncident.transcript}
                  </p>
                </div>
              </div>

              {/* Controls workflow status updates */}
              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-zinc-850 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Update Audit Status</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={statusUpdateLoading}
                      onClick={() => handleUpdateStatus("OPEN")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        selectedIncident.status === "OPEN"
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white dark:bg-zinc-950 border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-850"
                      }`}
                    >
                      OPEN
                    </button>
                    <button
                      disabled={statusUpdateLoading}
                      onClick={() => handleUpdateStatus("UNDER_REVIEW")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        selectedIncident.status === "UNDER_REVIEW"
                          ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                          : "bg-white dark:bg-zinc-950 border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-850"
                      }`}
                    >
                      UNDER REVIEW
                    </button>
                    <button
                      disabled={statusUpdateLoading}
                      onClick={() => handleUpdateStatus("CLOSED")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                        selectedIncident.status === "CLOSED"
                          ? "bg-green-600 text-white border-green-600 shadow-sm"
                          : "bg-white dark:bg-zinc-950 border-gray-250 dark:border-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-850"
                      }`}
                    >
                      CLOSED
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleDeleteCase}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent rounded-xl transition-colors sm:self-end"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Discard Record
                </button>
              </div>
            </div>

            <DialogFooter className="mt-2 border-t border-gray-100 dark:border-zinc-850 pt-3">
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 text-sm font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-xl transition-colors"
              >
                Close File
              </button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
