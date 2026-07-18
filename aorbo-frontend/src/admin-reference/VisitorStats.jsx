import React from 'react';

// Converted from aorboweb/templates/admin/visitor_changelist.html
// Pass the same values Django's admin view computes today
// (total_visitors, unique_sessions, today_unique, daily_unique list).
export default function VisitorStats({ totalVisitors, uniqueSessions, todayUnique, dailyUnique = [] }) {
  return (
    <div style={{ marginTop: '2em', padding: '1em', border: '1px solid #ccc', background: '#f9f9f9' }}>
      <h2>Visitor Stats</h2>
      <p>
        <strong>Total visitors:</strong> {totalVisitors}
      </p>
      <p>
        <strong>Unique sessions:</strong> {uniqueSessions}
      </p>
      <p>
        <strong>Today's unique sessions:</strong> {todayUnique}
      </p>

      <h3>Last 14 days unique sessions</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', padding: '0.5em' }}>Date</th>
            <th style={{ borderBottom: '1px solid #ccc', padding: '0.5em' }}>Unique Sessions</th>
          </tr>
        </thead>
        <tbody>
          {dailyUnique.length === 0 ? (
            <tr>
              <td colSpan={2}>No data available</td>
            </tr>
          ) : (
            dailyUnique.map((day) => (
              <tr key={day.day}>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5em' }}>{day.day}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: '0.5em' }}>{day.unique}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
