import { useEffect, useState } from 'react';

import ContactSubmissionsManager from '../admin-reference/ContactSubmissionsManager';
import SearchAnalyticsDashboard from '../admin-reference/SearchAnalyticsDashboard';
import VisitorStats from '../admin-reference/VisitorStats';

async function fetchJson(url) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [contactData, setContactData] = useState([]);
  const [visitorStats, setVisitorStats] = useState({
    totalVisitors: 0,
    uniqueSessions: 0,
    todayUnique: 0,
    dailyUnique: [],
  });
  const [searchAnalytics, setSearchAnalytics] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        // Staff-only JSON endpoints (return JSON 403 instead of the HTML
        // admin-login redirect when unauthenticated — no more "<DOCTYPE" parse errors)
        const [who, visitor, analytics, submissions] = await Promise.all([
          fetchJson('/api/admin/whoami/'),
          fetchJson('/api/admin/visitor-stats/'),
          fetchJson('/api/admin/search-analytics/'),
          fetchJson('/api/admin/contact-submissions/'),
        ]);

        if (!who?.is_staff) {
          throw new Error('Not authorized');
        }

        if (cancelled) return;

        setContactData(submissions?.submissions || submissions || []);
        setVisitorStats(visitor);
        setSearchAnalytics(analytics);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load admin dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div style={{ padding: 24 }}>Loading admin dashboard…</div>;
  if (error) return <div style={{ padding: 24, color: '#b91c1c' }}>Error: {error}</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ margin: '8px 0 16px' }}>Admin Dashboard</h1>

      <VisitorStats
        totalVisitors={visitorStats.totalVisitors}
        uniqueSessions={visitorStats.uniqueSessions}
        todayUnique={visitorStats.todayUnique}
        dailyUnique={visitorStats.dailyUnique}
      />

      <div style={{ marginTop: 24 }}>
        <SearchAnalyticsDashboard
          totalSearches={searchAnalytics.totalSearches}
          topQuery={searchAnalytics.topQuery}
          topQueryCount={searchAnalytics.topQueryCount}
          topTag={searchAnalytics.topTag}
          topTagCount={searchAnalytics.topTagCount}
          topTrek={searchAnalytics.topTrek}
          topTrekCount={searchAnalytics.topTrekCount}
          availableYears={searchAnalytics.availableYears || []}
          queryLabels={searchAnalytics.queryLabels || []}
          queryData={searchAnalytics.queryData || []}
          tagLabels={searchAnalytics.tagLabels || []}
          tagData={searchAnalytics.tagData || []}
        />
      </div>

      <div style={{ marginTop: 24 }}>
        <ContactSubmissionsManager initialData={contactData} />
      </div>
    </div>
  );
}

