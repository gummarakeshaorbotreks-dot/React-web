import React, { useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Chart from 'chart.js/auto';
import './SearchAnalyticsDashboard.css';

// Converted from aorboweb/templates/admin/searchlog_changelist.html
// Requires `chart.js` — run `npm install chart.js` in aorbo-frontend.
//
// Props mirror the template context Django's admin view builds today:
// totalSearches, topQuery/topQueryCount, topTag/topTagCount,
// topTrek/topTrekCount, availableYears, selectedYear, plus the four
// chart data arrays. `period` drives which filter pill is active and
// is read/written via the ?period= query param, same as the original
// server-rendered links.
export default function SearchAnalyticsDashboard({
  totalSearches,
  topQuery,
  topQueryCount,
  topTag,
  topTagCount,
  topTrek,
  topTrekCount,
  availableYears = [],
  queryLabels = [],
  queryData = [],
  tagLabels = [],
  tagData = [],
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const period = searchParams.get('period') || '30days';
  const selectedYear = searchParams.get('year') || '';
  const queryCanvasRef = useRef(null);
  const tagCanvasRef = useRef(null);

  const setPeriod = (next, extra = {}) => {
    const params = new URLSearchParams(searchParams);
    params.set('period', next);
    Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    setSearchParams(params);
  };

  useEffect(() => {
    let queryChart;
    if (queryCanvasRef.current && queryLabels.length > 0) {
      queryChart = new Chart(queryCanvasRef.current, {
        type: 'bar',
        data: {
          labels: queryLabels,
          datasets: [{ label: 'Searches', data: queryData, backgroundColor: '#378ADD', borderRadius: 4 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { autoSkip: false, maxRotation: 35, font: { size: 11 } } },
            y: { beginAtZero: true, ticks: { stepSize: 1 } },
          },
        },
      });
    }
    return () => queryChart?.destroy();
  }, [queryLabels, queryData]);

  useEffect(() => {
    let tagChart;
    if (tagCanvasRef.current && tagLabels.length > 0) {
      tagChart = new Chart(tagCanvasRef.current, {
        type: 'doughnut',
        data: {
          labels: tagLabels,
          datasets: [
            {
              data: tagData,
              backgroundColor: ['#1D9E75', '#378ADD', '#BA7517', '#D4537E', '#7F77DD', '#D85A30'],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '60%',
          plugins: { legend: { position: 'bottom', labels: { font: { size: 12 }, padding: 12 } } },
        },
      });
    }
    return () => tagChart?.destroy();
  }, [tagLabels, tagData]);

  const isYearActive = period === 'year' || period === 'custom_year';

  return (
    <div className="analytics-wrap">
      <div className="analytics-filter">
        <button className={period === 'today' ? 'active' : ''} onClick={() => setPeriod('today')}>
          Today
        </button>
        <button className={period === '7days' ? 'active' : ''} onClick={() => setPeriod('7days')}>
          Last 7 days
        </button>
        <button className={period === '30days' ? 'active' : ''} onClick={() => setPeriod('30days')}>
          Last 30 days
        </button>
        <div className={`year-group ${isYearActive ? 'active' : ''}`}>
          <button className="year-btn" onClick={() => setPeriod('year')}>
            This Year
          </button>
          <select
            value={selectedYear}
            onChange={(e) => e.target.value && setPeriod('custom_year', { year: e.target.value })}
          >
            <option value="">-</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button className={period === 'all' ? 'active' : ''} onClick={() => setPeriod('all')}>
          All time
        </button>
      </div>

      <div className="analytics-metrics">
        <div className="analytics-metric">
          <p className="analytics-metric-label">Total searches</p>
          <p className="analytics-metric-value">{totalSearches}</p>
          <p className="analytics-metric-sub">in selected period</p>
        </div>
        <div className="analytics-metric">
          <p className="analytics-metric-label">Top query</p>
          <p className="analytics-metric-value">{topQuery || '-'}</p>
          <p className="analytics-metric-sub">{topQueryCount} searches</p>
        </div>
        <div className="analytics-metric">
          <p className="analytics-metric-label">Top tag</p>
          <p className="analytics-metric-value">{topTag || '-'}</p>
          <p className="analytics-metric-sub">{topTagCount} clicks</p>
        </div>
        <div className="analytics-metric">
          <p className="analytics-metric-label">Top trek</p>
          <p className="analytics-metric-value" style={{ fontSize: 16 }}>
            {topTrek || '-'}
          </p>
          <p className="analytics-metric-sub">{topTrekCount} clicks</p>
        </div>
      </div>

      <div className="analytics-charts">
        <div className="analytics-card">
          <p className="analytics-card-title">Top Viewed Treks</p>
          <div style={{ position: 'relative', height: 280 }}>
            <canvas ref={queryCanvasRef} role="img" aria-label="Top viewed treks bar chart" />
          </div>
        </div>
        <div className="analytics-card">
          <p className="analytics-card-title">Searches by tag</p>
          <div style={{ position: 'relative', height: 280 }}>
            <canvas ref={tagCanvasRef} role="img" aria-label="Searches by tag donut chart" />
          </div>
        </div>
      </div>

      <hr className="analytics-divider" />
    </div>
  );
}
