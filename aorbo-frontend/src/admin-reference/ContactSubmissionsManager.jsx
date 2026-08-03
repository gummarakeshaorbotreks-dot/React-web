import { useEffect, useMemo, useState } from 'react';
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
    softDelete: '/supersecretadmin/treks_app/contact/soft-delete/',
    restore: '/supersecretadmin/treks_app/contact/restore/',
    permanentDelete: '/supersecretadmin/treks_app/contact/permanent-delete/',
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
      credentials: 'include',
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
    <div className="dj-wrap">
      {/* HEADER BAR */}
      <div id="dj-header">
        <div id="dj-branding">
          <h1 id="dj-site-name">
            <a href="/supersecretadmin/">Aorbo Treks Admin</a>
          </h1>
        </div>
        <div id="dj-user-tools">
          WELCOME, admin. <a href="/">VIEW SITE</a> / <a href="/supersecretadmin/password_change/">CHANGE PASSWORD</a> / <a href="/supersecretadmin/logout/">LOG OUT</a>
        </div>
      </div>

      {/* BREADCRUMBS */}
      <div className="dj-breadcrumbs">
        <a href="/supersecretadmin/">Home</a>
        {' '}&rsaquo;{' '}
        <a href="/supersecretadmin/treks_app/">Treks_app</a>
        {' '}&rsaquo;{' '}
        Contact Submissions
      </div>

      {/* PAGE TITLE */}
      <div id="dj-content">
        <h1>Select Contact Submission to change</h1>

        <div id="dj-content-main" className="dj-colms">
          {/* OBJECT-TOOLS (top-right) */}
          <ul className="dj-object-tools">
            <li>
              <a href="#" className="dj-addlink" onClick={(e) => { e.preventDefault(); }}>
                ADD CONTACT SUBMISSION +
              </a>
            </li>
          </ul>

          {/* TOOLBAR (search) */}
          <div id="dj-toolbar">
            <form id="dj-changelist-search" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label htmlFor="searchbar">
                  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath fill='%23666' d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E" alt="Search" style={{ verticalAlign: 'middle', marginRight: 4 }} />
                </label>
                <input
                  id="searchbar"
                  type="text"
                  size="40"
                  placeholder="Search name, email, mobile or message…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <input type="submit" value="Search" />
                <span className="dj-search-count">{rows.length} result{rows.length !== 1 ? 's' : ''}</span>
              </div>
            </form>
          </div>

          {/* BULK ACTION BAR */}
          <div className={`dj-bulkbar ${selectedIds.size > 0 ? 'dj-bulkbar-show' : ''}`}>
            <span className="dj-bulk-count">{selectedIds.size} of {rows.length} selected</span>
            {activeView === 'active' && (
              <button type="button" className="dj-btn-delete" onClick={() => bulkAction('delete')}>
                Delete Selected
              </button>
            )}
            {activeView === 'deleted' && (
              <>
                <button type="button" className="dj-btn-restore" onClick={() => bulkAction('restore')}>
                  Restore Selected
                </button>
                <button type="button" className="dj-btn-delete" onClick={() => bulkAction('permanent')}>
                  Delete Forever
                </button>
              </>
            )}
          </div>

          {/* RESULT LIST TABLE */}
          <div id="dj-changelist" className="dj-changelist">
            <div className="dj-changelist-form">
              <table id="dj-result-list">
                <thead>
                  <tr>
                    <th scope="col" className="dj-action-checkbox">
                      <div className="text">
                        <span>
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={(e) => toggleSelectAll(e.target.checked)}
                          />
                        </span>
                      </div>
                    </th>
                    <th scope="col"><div className="text"><a href="#">Name</a></div></th>
                    <th scope="col"><div className="text"><a href="#">Email</a></div></th>
                    <th scope="col"><div className="text"><a href="#">Mobile</a></div></th>
                    <th scope="col"><div className="text"><a href="#">User type</a></div></th>
                    <th scope="col"><div className="text"><a href="#">Trek category</a></div></th>
                    <th scope="col"><div className="text"><a href="#">Message</a></div></th>
                    <th scope="col"><div className="text"><a href="#">Date &amp; time</a></div></th>
                    <th scope="col"><div className="text"><span>Actions</span></div></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const comment = r.comment || '—';
                    const expanded = expandedComments.has(r.id);
                    return (
                      <tr key={r.id} className={i % 2 === 0 ? 'dj-row-even' : 'dj-row-odd'}>
                        <td className="dj-action-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(String(r.id))}
                            onChange={(e) => toggleRow(r.id, e.target.checked)}
                          />
                        </td>
                        <th scope="row">
                          <a href="#" onClick={(e) => { e.preventDefault(); }}>{r.name || '—'}</a>
                        </th>
                        <td>{r.email || '—'}</td>
                        <td>{r.mobile || '—'}</td>
                        <td>
                          <span className={`dj-badge ${badgeClass(r.user_type)}`}>{badgeLabel(r.user_type)}</span>
                        </td>
                        <td>{CATEGORY_LABELS[r.trek_category] || r.trek_category || '—'}</td>
                        <td>
                          <span className={`dj-comment ${expanded ? 'dj-comment-expanded' : ''}`}>{comment}</span>
                          {comment.length > 60 && (
                            <button className="dj-comment-toggle" onClick={() => toggleComment(r.id)}>
                              {expanded ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </td>
                        <td>{formatDateTime(r.created_at)}</td>
                        <td className="dj-actions-cell">
                          {activeView === 'active' ? (
                            <button className="dj-btn-sm dj-btn-soft-delete" onClick={() => deleteOne(r.id)}>
                              Delete
                            </button>
                          ) : (
                            <>
                              <button className="dj-btn-sm dj-btn-restore" onClick={() => restoreOne(r.id)}>
                                Restore
                              </button>
                              <button className="dj-btn-sm dj-btn-permanent-delete" onClick={() => permanentDeleteOne(r.id)}>
                                Forever
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length === 0 && <div className="dj-empty">No results found</div>}
            </div>

            {/* RIGHT-SIDE FILTER PANEL */}
            <div id="dj-changelist-filter">
              <h2>Filter</h2>

              {/* View filter (Active / Deleted) */}
              <h3>By view</h3>
              <ul>
                <li className={activeView === 'active' ? 'dj-filter-selected' : ''}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('active'); setSelectedIds(new Set()); setSearch(''); }}>
                    Active {counts['All'] !== undefined && `(${counts['All']})`}
                  </a>
                </li>
                <li className={activeView === 'deleted' ? 'dj-filter-selected' : ''}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setActiveView('deleted'); setSelectedIds(new Set()); setSearch(''); }}>
                    Deleted {counts.deletedView !== undefined && `(${counts.deletedView})`}
                  </a>
                </li>
              </ul>

              {/* User type filter */}
              <h3>By user type</h3>
              <ul>
                {TAB_KEYS.map((t) => (
                  <li key={t} className={activeTab === t ? 'dj-filter-selected' : ''}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(t); setSearch(''); }}>
                      {t === 'All' ? 'All' : badgeLabel(t)} ({counts[t]})
                    </a>
                  </li>
                ))}
              </ul>

              {/* Date range filter */}
              <h3>By date range</h3>
              <ul>
                {[
                  ['all', 'All Time'],
                  ['today', 'Today'],
                  ['week', 'This Week'],
                  ['year', 'This Year'],
                ].map(([key, label]) => (
                  <li key={key} className={activeDateRange === key ? 'dj-filter-selected' : ''}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setActiveDateRange(key); setSearch(''); }}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && <div className="dj-toast">{toast}</div>}
    </div>
  );
}
