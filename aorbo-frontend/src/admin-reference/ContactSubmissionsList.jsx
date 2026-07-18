import React, { useMemo, useState } from 'react';
import './ContactSubmissionsList.css';

// Converted from aorboweb/templates/admin/contact_submissions_filter.html
// A read-only variant of ContactSubmissionsManager (no delete/restore
// actions) — pass in the same submissions_json shape as `data`.
const TABS = [
  ['All', 'All'],
  ['trekker', 'Trekker'],
  ['trek_organizer', 'Trek Organizer'],
  ['other', 'Other'],
];

function badgeClass(t) {
  if (t === 'trekker') return 'b-trekker';
  if (t === 'trek_organizer') return 'b-organizer';
  return 'b-other';
}

export default function ContactSubmissionsList({ data = [] }) {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const result = {};
    TABS.forEach(([key]) => {
      result[key] = key === 'All' ? data.length : data.filter((d) => d.user_type === key).length;
    });
    return result;
  }, [data]);

  const rows = useMemo(() => {
    let filtered = activeTab === 'All' ? data : data.filter((d) => d.user_type === activeTab);
    const q = search.toLowerCase();
    if (q) {
      filtered = filtered.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.email || '').toLowerCase().includes(q) ||
          (d.mobile || '').includes(q)
      );
    }
    return filtered;
  }, [data, activeTab, search]);

  return (
    <div className="csl-wrap">
      <div className="csl-page-title">📬 Contact Submissions</div>

      <div className="csl-tabs">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`csl-tab ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label} <span className="csl-count-badge">{counts[key]}</span>
          </button>
        ))}
      </div>

      <div className="csl-search-row">
        <div className="csl-search-box">
          🔍
          <input
            placeholder="Search by name, email or mobile…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="csl-result-info">
          {rows.length} result{rows.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="csl-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>User Type</th>
              <th>Trek Category</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.name || '—'}</td>
                <td className="csl-muted">{r.email || '—'}</td>
                <td>{r.mobile || '—'}</td>
                <td>
                  <span className={`csl-badge ${badgeClass(r.user_type)}`}>
                    {r.user_type === 'trekker'
                      ? 'Trekker'
                      : r.user_type === 'trek_organizer'
                      ? 'Trek Organizer'
                      : 'Other'}
                  </span>
                </td>
                <td className="csl-muted">{r.trek_category || '—'}</td>
                <td className="csl-muted">{r.created_at || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="csl-empty">No results found</div>}
      </div>
    </div>
  );
}
