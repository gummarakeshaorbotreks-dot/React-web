import React, { useMemo, useState, useEffect } from 'react';
import { getCsrfToken } from '../utils/csrf';
import './ContactSubmissionsManager.css';

// Converted from aorboweb/templates/admin/contact_filter.html
//
// This is a genuine functional port (not just markup) of the Django admin
// "Contact Submissions" custom changelist page: tabs for view/user-type/date
// range, search, row + bulk soft-delete / restore / permanent-delete, and
// an expandable comment cell.
//
// IMPORTANT — for this to work as a real page you need to supply:
//   1. `initialData`: the same shape Django's ContactSubmissionAdmin builds
//      for `submissions_json` (id, name, email, mobile, user_type,
//      trek_category, comment, created_at, is_deleted, deleted_at).
//      Today that JSON is only embedded in the server-rendered admin page —
//      add a small `GET` JSON endpoint next to the existing
//      soft-delete/restore/permanent-delete views so this component can
//      fetch it directly, e.g. `admin:contact_submissions_json`.
//   2. `endpoints`: the three existing POST URLs already registered in
//      treks_app/admin.py (`contact_soft_delete`, `contact_restore`,
//      `contact_permanent_delete`) — these already exist, no backend
//      change needed for the actions themselves, only for initial data.
const TAB_KEYS = ['All', 'trekker', 'organizer', 'other'];

const CATEGORY_LABELS = {
  adventure: 'Adventure Treks',
  weekend: 'Weekend Treks',
  nature: 'Nature Escapes',
  beach: 'Beach Treks',
  camping: 'Camping Treks',
  spiritual: 'Spiritual Treks',
};

function badgeClass(t) {
  if (t === 'trekker') return 'cs-b-trekker';
  if (t === 'organizer') return 'cs-b-organizer';
  return 'cs-b-other';
}

function badgeLabel(t) {
  if (t === 'trekker') return 'Trekker';
  if (t === 'organizer') return 'Trek Organizer';
  return 'Other';
}

function isInRange(dateStr, range) {
  if (range === 'all') return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === 'today') {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (range === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return d >= start;
  }
  if (range === 'year') return d.getFullYear() === now.getFullYear();
  return true;
}

function formatDateTime(str) {
  if (!str) return '—';
  const d = new Date(str);
  if (isNaN(d)) return str;
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  return (
    <>
      <span style={{ color: '#374151' }}>{date}</span>
      <span className="cs-time">⏰ {time}</span>
    </>
  );
}

export default function ContactSubmissionsManager({
  initialData = [],
  endpoints = {
    softDelete: '/supersecretadmin/treks_app/contactsubmission/soft-delete/',
    restore: '/supersecretadmin/treks_app/contactsubmission/restore/',
    permanentDelete: '/supersecretadmin/treks_app/contactsubmission/permanent-delete/',
  },
}) {
  const [data, setData] = useState(initialData);
  const [activeView, setActiveView] = useState('active'); // 'active' | 'deleted'
  const [activeTab, setActiveTab] = useState('All');
  const [activeDateRange, setActiveDateRange] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [toast, setToast] = useState('');

  useEffect(() => setData(initialData), [initialData]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const viewFiltered = useMemo(
    () => data.filter((d) => (activeView === 'deleted' ? d.is_deleted : !d.is_deleted)),
    [data, activeView]
  );

  const counts = useMemo(() => {
    const byDate = viewFiltered.filter((d) => isInRange(d.created_at, activeDateRange));
    const result = { deletedView: data.filter((d) => d.is_deleted).length };
    TAB_KEYS.forEach((t) => {
      result[t] = t === 'All' ? byDate.length : byDate.filter((d) => d.user_type === t).length;
    });
    return result;
  }, [viewFiltered, activeDateRange, data]);

  const rows = useMemo(() => {
    let r = viewFiltered.filter((d) => isInRange(d.created_at, activeDateRange));
    if (activeTab !== 'All') r = r.filter((d) => d.user_type === activeTab);
    const q = search.toLowerCase();
    if (q) {
      r = r.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.email || '').toLowerCase().includes(q) ||
          (d.mobile || '').includes(q) ||
          (d.comment || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [viewFiltered, activeTab, activeDateRange, search]);

  async function postIds(url, ids) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() || '' },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      setToast('Something went wrong. Please try again.');
      throw new Error(`Request failed: ${res.status}`);
    }
    return res.json();
  }

  function markDeleted(ids, isDeleted) {
    const idSet = new Set(ids.map(String));
    setData((prev) =>
      prev.map((d) => (idSet.has(String(d.id)) ? { ...d, is_deleted: isDeleted } : d))
    );
    setSelectedIds(new Set());
  }

  function removeLocal(ids) {
    const idSet = new Set(ids.map(String));
    setData((prev) => prev.filter((d) => !idSet.has(String(d.id))));
    setSelectedIds(new Set());
  }

  const deleteOne = async (id) => {
    if (!confirm('Move this submission to Deleted? You can restore it later.')) return;
    await postIds(endpoints.softDelete, [id]);
    markDeleted([id], true);
    setToast('Moved to Deleted');
  };

  const restoreOne = async (id) => {
    if (!confirm('Restore this submission?')) return;
    await postIds(endpoints.restore, [id]);
    markDeleted([id], false);
    setToast('Restored');
  };

  const permanentDeleteOne = async (id) => {
    if (!confirm('Permanently delete this submission? This CANNOT be undone.')) return;
    await postIds(endpoints.permanentDelete, [id]);
    removeLocal([id]);
    setToast('Deleted permanently');
  };

  const bulkAction = async (kind) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    if (kind === 'delete') {
      if (!confirm(`Move ${ids.length} submission(s) to Deleted?`)) return;
      await postIds(endpoints.softDelete, ids);
      markDeleted(ids, true);
      setToast(`${ids.length} moved to Deleted`);
    } else if (kind === 'restore') {
      if (!confirm(`Restore ${ids.length} submission(s)?`)) return;
      await postIds(endpoints.restore, ids);
      markDeleted(ids, false);
      setToast(`${ids.length} restored`);
    } else if (kind === 'permanent') {
      if (!confirm(`Permanently delete ${ids.length} submission(s)? This CANNOT be undone.`)) return;
      await postIds(endpoints.permanentDelete, ids);
      removeLocal(ids);
      setToast(`${ids.length} deleted permanently`);
    }
  };

  const toggleRow = (id, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      checked ? next.add(String(id)) : next.delete(String(id));
      return next;
    });
  };

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? new Set(rows.map((r) => String(r.id))) : new Set());
  };

  const toggleComment = (id) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allChecked = rows.length > 0 && rows.every((r) => selectedIds.has(String(r.id)));

  return (
    <div className="cs-wrap">
      <div className="cs-title">📬 Contact Submissions</div>

      <div className="cs-view-tabs">
        <button
          type="button"
          className={`cs-view-tab ${activeView === 'active' ? 'active' : ''}`}
          onClick={() => {
            setActiveView('active');
            setSelectedIds(new Set());
            setSearch('');
          }}
        >
          📥 Active
        </button>
        <button
          type="button"
          className={`cs-view-tab ${activeView === 'deleted' ? 'active' : ''}`}
          onClick={() => {
            setActiveView('deleted');
            setSelectedIds(new Set());
            setSearch('');
          }}
        >
          🗑 Deleted <span className="cs-count">{counts.deletedView}</span>
        </button>
      </div>

      <div className="cs-tabs">
        {TAB_KEYS.map((t) => (
          <button
            key={t}
            type="button"
            className={`cs-tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(t);
              setSearch('');
            }}
          >
            {t === 'All' ? 'All' : badgeLabel(t)} <span className="cs-count">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="cs-date-tabs">
        {[
          ['all', 'All Time'],
          ['today', 'Today'],
          ['week', 'This Week'],
          ['year', 'This Year'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`cs-date-tab ${activeDateRange === key ? 'active' : ''}`}
            onClick={() => {
              setActiveDateRange(key);
              setSearch('');
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="cs-search-row">
        <div className="cs-search-box">
          🔍
          <input
            placeholder="Search name, email, mobile or message…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="cs-result">
          {rows.length} result{rows.length !== 1 ? 's' : ''}
        </div>
        <div className={`cs-bulkbar ${selectedIds.size > 0 ? 'show' : ''}`}>
          <span>{selectedIds.size} selected</span>
          {activeView === 'active' && (
            <button type="button" className="cs-btn-danger" onClick={() => bulkAction('delete')}>
              🗑 Delete Selected
            </button>
          )}
          {activeView === 'deleted' && (
            <>
              <button type="button" className="cs-btn-restore" onClick={() => bulkAction('restore')}>
                ♻ Restore Selected
              </button>
              <button type="button" className="cs-btn-danger" onClick={() => bulkAction('permanent')}>
                🗑 Delete Forever
              </button>
            </>
          )}
        </div>
      </div>

      <div className="cs-table-wrap">
        <table className="cs-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                />
              </th>
              <th>#</th>
              <th>Name</th>
              <th>Email</th>
              <th>Mobile</th>
              <th>User Type</th>
              <th>Trek Category</th>
              <th>Message</th>
              <th>Date &amp; Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const comment = r.comment || '—';
              const expanded = expandedComments.has(r.id);
              return (
                <tr key={r.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(String(r.id))}
                      onChange={(e) => toggleRow(r.id, e.target.checked)}
                    />
                  </td>
                  <td className="cs-muted">{i + 1}</td>
                  <td>
                    <span className="cs-name">{r.name || '—'}</span>
                  </td>
                  <td>
                    <span className="cs-muted">{r.email || '—'}</span>
                  </td>
                  <td style={{ color: '#1a1f36', fontWeight: 500 }}>{r.mobile || '—'}</td>
                  <td>
                    <span className={`badge ${badgeClass(r.user_type)}`}>{badgeLabel(r.user_type)}</span>
                  </td>
                  <td>
                    <span className="cs-muted">{CATEGORY_LABELS[r.trek_category] || r.trek_category || '—'}</span>
                  </td>
                  <td>
                    <span className={`cs-comment ${expanded ? 'expanded' : ''}`}>{comment}</span>
                    {comment.length > 60 && (
                      <button className="cs-comment-toggle" onClick={() => toggleComment(r.id)}>
                        {expanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </td>
                  <td>{formatDateTime(r.created_at)}</td>
                  <td>
                    {activeView === 'active' ? (
                      <button className="cs-del-btn" onClick={() => deleteOne(r.id)}>
                        🗑 Delete
                      </button>
                    ) : (
                      <>
                        <button className="cs-restore-btn" onClick={() => restoreOne(r.id)}>
                          ♻ Restore
                        </button>
                        <button className="cs-del-btn" onClick={() => permanentDeleteOne(r.id)}>
                          🗑 Forever
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <div className="cs-empty">🔍 No results found</div>}
      </div>

      {toast && <div className="cs-toast">{toast}</div>}
    </div>
  );
}
