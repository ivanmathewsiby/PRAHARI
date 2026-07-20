"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import {
  getRings,
  getRingDetail,
  getRingGraph,
  RingSummary,
  RingGraph,
  HubIdentifier,
} from "../lib/api";
import {
  Shield,
  AlertTriangle,
  Phone,
  CreditCard,
  Building2,
  Users,
  MapPin,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const NODE_COLORS: Record<string, string> = {
  Report: "#6366f1",
  PhoneNumber: "#f59e0b",
  UPI_ID: "#10b981",
  BankAccount: "#ef4444",
  ClaimedAgency: "#8b5cf6",
};

const NODE_ICONS: Record<string, string> = {
  Report: "R",
  PhoneNumber: "P",
  UPI_ID: "U",
  BankAccount: "B",
  ClaimedAgency: "A",
};

const layoutConfig = {
  name: "cose-bilkent",
  animate: true,
  animationDuration: 800,
  nodeRepulsion: 8000,
  idealEdgeLength: 120,
  gravity: 0.25,
  numIter: 1000,
};

const styleSheet: any = [
  {
    selector: "node",
    style: {
      "background-color": "data(type)",
      "background-opacity": 0.85,
      label: "data(label)",
      color: "#1e293b",
      "font-size": "10px",
      "text-valign": "bottom",
      "text-halign": "center",
      "text-margin-y": 4,
      width: 40,
      height: 40,
      "border-width": 2,
      "border-color": "#cbd5e1",
      "border-opacity": 1,
      "min-zoomed-font-size": 8,
    },
  },
  {
    selector: "node[hub_rank]",
    style: {
      "border-width": 4,
      "border-color": "#dc2626",
    },
  },
  {
    selector: "node[type = 'PhoneNumber']",
    style: {
      "background-color": "#f59e0b",
    },
  },
  {
    selector: "node[type = 'UPI_ID']",
    style: {
      "background-color": "#10b981",
    },
  },
  {
    selector: "node[type = 'BankAccount']",
    style: {
      "background-color": "#ef4444",
    },
  },
  {
    selector: "node[type = 'Report']",
    style: {
      "background-color": "#6366f1",
    },
  },
  {
    selector: "node[type = 'ClaimedAgency']",
    style: {
      "background-color": "#8b5cf6",
    },
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#94a3b8",
      "target-arrow-color": "#64748b",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      "arrow-scale": 0.8,
    },
  },
  {
    selector: "edge[label]",
    style: {
      label: "data(label)",
      "font-size": "8px",
      color: "#64748b",
      "text-background-color": "#ffffff",
      "text-background-opacity": 0.8,
      "text-background-padding": 2,
    },
  },
];

function MockRingGraph({ rings }: { rings: RingSummary[] }) {
  return (
    <div className="space-y-3 px-4 py-3">
      {rings.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          No rings detected yet. Seed the database first.
        </p>
      ) : (
        rings.map((ring) => (
          <div
            key={ring.ring_id}
            className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {ring.ring_id}
              </span>
              <span className="text-[10px] font-bold text-gray-400 bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                {ring.report_count} reports
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {ring.city_count} cities
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />{" "}
                {ring.critical_count} critical
              </span>
            </div>
            {ring.agencies.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ring.agencies.map((a) => (
                  <span
                    key={a}
                    className="text-[10px] px-2 py-0.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default function FraudRingPanel() {
  const [rings, setRings] = useState<RingSummary[]>([]);
  const [selectedRingId, setSelectedRingId] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<RingGraph | null>(null);
  const [hubs, setHubs] = useState<HubIdentifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [graphLoading, setGraphLoading] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  const fetchRings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRings();
      setRings(data);
      setBackendOnline(true);
      if (data.length > 0 && !selectedRingId) {
        setSelectedRingId(data[0].ring_id);
      }
    } catch {
      setBackendOnline(false);
      setRings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRingId]);

  useEffect(() => {
    fetchRings();
  }, []);

  useEffect(() => {
    if (!selectedRingId) return;
    setGraphLoading(true);
    Promise.all([
      getRingDetail(selectedRingId),
    ])
      .then(([detail]) => {
        setGraphData(detail.graph);
        setHubs(detail.top_hubs);
      })
      .catch(() => {
        setGraphData(null);
        setHubs([]);
      })
      .finally(() => setGraphLoading(false));
  }, [selectedRingId]);

  if (!backendOnline) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-500" />
            Fraud Ring Intelligence
          </h2>
        </div>
        <MockRingGraph rings={[]} />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-500" />
          Fraud Ring Intelligence
        </h2>
        <button
          onClick={fetchRings}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-zinc-800">
        {/* Left: Ring list */}
        <div className="lg:col-span-1 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-xs text-gray-400 animate-pulse">
              Loading rings...
            </div>
          ) : rings.length === 0 ? (
            <MockRingGraph rings={[]} />
          ) : (
            <div className="space-y-1 p-2">
              {rings.map((ring) => (
                <button
                  key={ring.ring_id}
                  onClick={() => setSelectedRingId(ring.ring_id)}
                  className={`w-full text-left p-3 rounded-xl transition-colors ${
                    selectedRingId === ring.ring_id
                      ? "bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30"
                      : "hover:bg-gray-50 dark:hover:bg-zinc-800/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white font-mono">
                      {ring.ring_id}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                      {ring.report_count}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-500">
                    <span>{ring.city_count} cities</span>
                    {typeof ring.campaign_early_warning_index === "number" && (
                      <span>{ring.campaign_early_warning_index} index</span>
                    )}
                    {ring.critical_count > 0 && (
                      <span className="text-red-500 font-semibold">
                        {ring.critical_count} critical
                      </span>
                    )}
                  </div>
                  {ring.agencies.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {ring.agencies.slice(0, 2).map((a) => (
                        <span
                          key={a}
                          className="text-[9px] px-1.5 py-0.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Graph visualization */}
        <div className="lg:col-span-2 h-[500px] relative">
          {graphLoading ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 animate-pulse">
              Loading graph...
            </div>
          ) : graphData && graphData.nodes.length > 0 ? (
            <CytoscapeComponent
              elements={[
                ...graphData.nodes.map((n) => ({
                  data: {
                    id: n.id,
                    label: n.label,
                    type: n.type,
                    hub_rank: n.hub_rank,
                  },
                })),
                ...graphData.edges.map((e) => ({
                  data: {
                    source: e.source,
                    target: e.target,
                    label: e.label,
                  },
                })),
              ]}
              style={{ width: "100%", height: "100%" }}
              layout={layoutConfig}
              stylesheet={styleSheet}
              cy={(cy: any) => {
                cy.on("tap", "node", (evt: cytoscape.EventObject) => {
                  const node = evt.target;
                  const type = node.data("type");
                  const label = node.data("label");
                });
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
              {selectedRingId
                ? "No graph data available for this ring."
                : "Select a ring to view graph"}
            </div>
          )}
        </div>

        {/* Right: Hub identifiers panel */}
        <div className="lg:col-span-1 max-h-[500px] overflow-y-auto p-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Top Hub Identifiers
          </h3>
          {hubs.length === 0 ? (
            <p className="text-xs text-gray-400">No hub data available.</p>
          ) : (
            <div className="space-y-2">
              {hubs.map((hub, idx) => (
                <div
                  key={`${hub.type}-${hub.identifier}`}
                  className="p-2.5 bg-gray-50 dark:bg-zinc-950 rounded-xl border border-gray-100 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-2">
                    {hub.type === "PhoneNumber" ? (
                      <Phone className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                    ) : hub.type === "UPI_ID" ? (
                      <CreditCard className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <Building2 className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono font-bold text-gray-900 dark:text-white truncate">
                        {hub.identifier}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span>{hub.type}</span>
                        <span>{hub.connection_count} connections</span>
                        {hub.hub_rank && (
                          <span className="text-red-500 font-semibold">
                            rank #{hub.hub_rank.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
