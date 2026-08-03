import './VisitorStats.css';

// Converted from aorboweb/templates/admin/visitor_changelist.html
// Pass the same values Django's admin view computes today
// (total_visitors, unique_sessions, today_unique, daily_unique list).
export default function VisitorStats({ totalVisitors, uniqueSessions, todayUnique, dailyUnique = [] }) {
  return (
    <div className="vs-wrap">
      <h2 className="vs-heading">Visitor Stats</h2>

      <div className="vs-metrics">
        <div className="vs-metric">
          <p className="vs-metric-label">Total visitors</p>
          <p className="vs-metric-value">{totalVisitors}</p>
        </div>
        <div className="vs-metric">
          <p className="vs-metric-label">Unique sessions</p>
          <p className="vs-metric-value">{uniqueSessions}</p>
        </div>
        <div className="vs-metric">
          <p className="vs-metric-label">Today's unique sessions</p>
          <p className="vs-metric-value">{todayUnique}</p>
        </div>
      </div>

      <h3 className="vs-chart-title">Last 14 days unique sessions</h3>
      <table className="vs-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Unique Sessions</th>
          </tr>
        </thead>
        <tbody>
          {dailyUnique.length === 0 ? (
            <tr>
              <td colSpan={2} className="vs-empty">No data available</td>
            </tr>
          ) : (
            dailyUnique.map((day) => (
              <tr key={day.day}>
                <td>{day.day}</td>
                <td>{day.unique}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
