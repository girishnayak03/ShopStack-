import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const RANGE_OPTIONS = [
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 12 months", value: "1y" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function SummaryCard({ label, value, sub, accent }) {
  return (
    <div className="glass-card" style={{ padding: "1rem" }}>
      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{label}</p>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem", color: accent }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

export default function VendorEarningsAnalytics({ vendorId }) {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Persistent Module States
  const [customerInsights, setCustomerInsights] = useState(null);
  const [payouts, setPayouts] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  // Ledger States
  const [ledger, setLedger] = useState([]);
  const [ledgerPage, setLedgerPage] = useState(0);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [filterOrderId, setFilterOrderId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchAllAnalytics() {
      setLoading(true);
      setError(null);
      try {
        // Calculate date range
        const endDate = new Date().toISOString().split("T")[0];
        const startDateObj = new Date();
        if (range === "90d") startDateObj.setDate(startDateObj.getDate() - 90);
        else if (range === "1y") startDateObj.setFullYear(startDateObj.getFullYear() - 1);
        else startDateObj.setDate(startDateObj.getDate() - 30);
        const startDate = startDateObj.toISOString().split("T")[0];

        // 1. Fetch persistent sales summary from PostgreSQL
        let salesRes;
        try {
          salesRes = await api.vendor.getPersistentSalesAnalytics(vendorId, startDate, endDate);
        } catch (e) {
          console.warn("Persistent sales summary endpoint fallback", e);
        }

        // 2. Fetch top products
        let prods = [];
        try {
          prods = await api.vendor.getTopProducts(vendorId, startDate, endDate);
        } catch (e) {
          console.warn("Persistent top products endpoint fallback", e);
        }

        // 3. Fetch customer insights
        let insights = null;
        try {
          insights = await api.vendor.getCustomerInsights(vendorId, startDate, endDate);
        } catch (e) {
          console.warn("Persistent customer insights endpoint fallback", e);
        }

        // 4. Fetch payouts
        let payoutList = [];
        try {
          const pRes = await api.vendor.getPayouts(vendorId);
          payoutList = pRes?.content || pRes?.data?.content || pRes || [];
        } catch (e) {
          console.warn("Vendor payouts endpoint error", e);
        }

        if (!cancelled) {
          if (salesRes && salesRes.dailySummaries) {
            const trend = (salesRes.dailySummaries || []).map((s) => ({
              label: s.summaryDate,
              earnings: s.netPayout,
              gross: s.grossRevenue,
            }));

            setData({
              grossSales: salesRes.grossRevenue,
              platformCommission: salesRes.commissionDeducted,
              refundReversalAmount: salesRes.refundsAmount,
              netVendorEarnings: salesRes.netPayout,
              totalOrders: salesRes.totalOrders,
              totalUnitsSold: salesRes.totalUnitsSold,
              trend,
              topProducts: prods.length > 0 ? prods : [],
            });
          } else {
            // Fallback to legacy report service
            const fallbackRes = await api.vendor.getEarnings(vendorId, range);
            setData(fallbackRes);
          }

          if (prods.length > 0) setTopProducts(prods);
          if (insights) setCustomerInsights(insights);
          if (payoutList) setPayouts(payoutList);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (vendorId) fetchAllAnalytics();
    return () => {
      cancelled = true;
    };
  }, [vendorId, range]);

  useEffect(() => {
    let cancelled = false;

    async function fetchLedger() {
      setLedgerLoading(true);
      try {
        const params = { page: 0, size: 100 };
        const response = await api.vendor.getCommissionLedger(params);

        if (!cancelled) {
          const allLedger = response.content || response.data?.content || [];
          const filteredLedger = allLedger.filter((row) => {
            const matchesType =
              !filterType ||
              row.transactionType?.toUpperCase() === filterType.toUpperCase();
            const matchesOrder =
              !filterOrderId.trim() ||
              row.orderId?.toLowerCase().includes(filterOrderId.trim().toLowerCase());
            return matchesType && matchesOrder;
          });

          setLedger(filteredLedger);
          setLedgerTotalPages(1);
          setLedgerPage(0);
        }
      } catch (err) {
        console.error("Failed to fetch ledger", err);
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    }

    fetchLedger();
    return () => {
      cancelled = true;
    };
  }, [ledgerPage, filterType, filterOrderId]);

  const trendData = useMemo(() => data?.trend ?? [], [data]);
  const displayTopProducts = useMemo(() => (topProducts.length > 0 ? topProducts : data?.topProducts ?? []), [topProducts, data]);

  const renderPayoutBadge = (status) => {
    switch (status) {
      case "COMPLETED":
        return <span className="badge badge-active">Completed</span>;
      case "PROCESSING":
        return <span className="badge badge-pending">Processing</span>;
      case "PENDING":
        return <span className="badge badge-pending">Pending</span>;
      case "FAILED":
      case "CANCELLED":
        return <span className="badge badge-rejected">{status}</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 700 }}>Persistent Analytics &amp; Performance</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn ${range === opt.value ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setRange(opt.value)}
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ borderLeft: "4px solid #ef4444", background: "rgba(239,68,68,0.05)" }}>
          <p style={{ fontSize: "0.9rem", color: "#ef4444" }}>
            Couldn't load analytics data: {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="stats-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card stat-card" style={{ opacity: 0.5 }}>
              <span style={{ color: "var(--text-secondary)" }}>Loading persistent analytics…</span>
            </div>
          ))}
        </div>
      ) : (
        data && (
          <>
            {/* Sales Summary Cards */}
            <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <SummaryCard
                label="Gross Revenue"
                value={formatCurrency(data.grossSales || data.totalEarnings)}
                sub={`${data.totalOrders || 0} orders (${data.totalUnitsSold || 0} units)`}
              />
              <SummaryCard
                label="Commission Deducted"
                value={formatCurrency(data.platformCommission)}
                accent="#f59e0b"
              />
              <SummaryCard
                label="Refunds & Reversals"
                value={formatCurrency(data.refundReversalAmount)}
                accent="#ef4444"
              />
              <SummaryCard
                label="Net Vendor Payout"
                value={formatCurrency(data.netVendorEarnings || data.netPayout)}
                sub="after commission & refunds"
                accent="#10b981"
              />
            </div>

            {/* Customer Insights Cards */}
            {customerInsights && (
              <div className="stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <SummaryCard
                  label="New Customers"
                  value={customerInsights.newCustomers || 0}
                  sub="First-time buyers"
                  accent="#3b82f6"
                />
                <SummaryCard
                  label="Repeat Customers"
                  value={customerInsights.repeatCustomers || 0}
                  sub="Returning buyers"
                  accent="#8b5cf6"
                />
                <SummaryCard
                  label="Average Order Value"
                  value={formatCurrency(customerInsights.avgOrderValue)}
                  sub="Per customer order"
                  accent="#ec4899"
                />
              </div>
            )}

            {/* Daily Trend Chart */}
            <div className="glass-card">
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
                Persistent Daily Earnings Trend (PostgreSQL)
              </h4>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="earnings"
                    name="Net Payout"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="gross"
                    name="Gross Revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Product Performance Chart */}
            <div className="glass-card">
              <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
                Persistent Product Performance (Revenue &amp; Sales)
              </h4>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={displayTopProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <YAxis type="category" dataKey="productName" tick={{ fontSize: 12 }} width={140} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" fill="#111827" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Vendor Payout History */}
            <div className="glass-card">
              <h4 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
                Vendor Settlements &amp; Payout History
              </h4>
              <div className="table-container" style={{ width: "100%", overflowX: "auto" }}>
                <table className="custom-table" style={{ fontSize: "0.85rem", width: "100%", minWidth: "900px" }}>
                  <thead>
                    <tr>
                      <th>Payout ID</th>
                      <th>Period</th>
                      <th>Total Sales</th>
                      <th>Commission</th>
                      <th>Net Payable</th>
                      <th>Status</th>
                      <th>Reference</th>
                      <th>Processed Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((p) => (
                      <tr key={p.payoutId}>
                        <td>#{p.payoutId}</td>
                        <td>{p.payoutPeriodStart} to {p.payoutPeriodEnd}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(p.totalSales)}</td>
                        <td style={{ color: "#f59e0b" }}>{formatCurrency(p.commissionAmount)}</td>
                        <td style={{ color: "#10b981", fontWeight: 700 }}>{formatCurrency(p.netAmount)}</td>
                        <td>{renderPayoutBadge(p.status)}</td>
                        <td>{p.transactionRef || "N/A"}</td>
                        <td>{p.processedAt ? new Date(p.processedAt).toLocaleDateString() : "Pending"}</td>
                      </tr>
                    ))}
                    {payouts.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                          No payout settlement records generated yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commission Ledger Table */}
            <div className="glass-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
                <h4 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Commission &amp; Earnings Ledger</h4>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select
                    className="form-input"
                    style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.85rem" }}
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setLedgerPage(0); }}
                  >
                    <option value="">All Transactions</option>
                    <option value="COMMISSION">Commission</option>
                    <option value="REFUND_REVERSAL">Refund Reversal</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Filter Order ID"
                    className="form-input"
                    style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border-color)", background: "var(--bg-card)", color: "var(--text-primary)", fontSize: "0.85rem", width: "160px" }}
                    value={filterOrderId}
                    onChange={(e) => { setFilterOrderId(e.target.value); setLedgerPage(0); }}
                  />
                </div>
              </div>

              {ledgerLoading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                  <div className="spinner"></div>
                </div>
              ) : (
                <div className="table-container" style={{ width: "100%", overflowX: "auto" }}>
                  <table className="custom-table" style={{ fontSize: "0.85rem", width: "100%", minWidth: "1100px" }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Order Ref</th>
                        <th>Product ID</th>
                        <th>Gross Amount</th>
                        <th>Rate</th>
                        <th>Commission</th>
                        <th>Vendor Earnings</th>
                        <th>Type</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.map((row) => (
                        <tr key={row.id}>
                          <td>{new Date(row.createdAt).toLocaleDateString()}</td>
                          <td><span title={row.orderId}>#{row.orderId ? row.orderId.substring(0, 8) : ""}...</span></td>
                          <td><span title={row.productId}>#{row.productId ? row.productId.substring(0, 8) : ""}...</span></td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(row.grossAmount)}</td>
                          <td>{row.commissionRate}%</td>
                          <td style={{ color: row.commissionAmount < 0 ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>
                            {formatCurrency(row.commissionAmount)}
                          </td>
                          <td style={{ color: row.vendorAmount < 0 ? "#ef4444" : "#10b981", fontWeight: 600 }}>
                            {formatCurrency(row.vendorAmount)}
                          </td>
                          <td>
                            <span className="badge" style={{
                              background: row.transactionType === "COMMISSION" ? "rgba(59, 130, 246, 0.15)" : "rgba(239, 68, 68, 0.15)",
                              color: row.transactionType === "COMMISSION" ? "#3b82f6" : "#ef4444",
                              fontSize: "0.75rem",
                            }}>
                              {row.transactionType}
                            </span>
                          </td>
                          <td>
                            <span className="badge" style={{
                              background: row.status === "CONFIRMED" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: row.status === "CONFIRMED" ? "#10b981" : "#f59e0b",
                              fontSize: "0.75rem",
                            }}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {ledger.length === 0 && (
                        <tr>
                          <td colSpan="9" style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>
                            No ledger transactions recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      )}
    </div>
  );
}