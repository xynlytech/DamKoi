/**
 * DamKoi — Extension Visualization Engine
 *
 * Lightweight, vanilla JavaScript logic to render SVG charts and gauges.
 * No external dependencies.
 */

import { getScoreColor, formatBDT } from './utils.js';

const Visualizer = {
  /**
   * Renders a Deal Score Gauge (Speedometer)
   * @param {number} score - Deal score from 0 to 10
   * @param {string} containerId - ID of the container element
   */
  renderDealGauge(score, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const normalizedScore = Math.min(Math.max(score, 0), 10);
    const percentage = normalizedScore / 10;

    // Use shared color mapping function
    const color = getScoreColor(score);

    const radius = 40;
    const circumference = Math.PI * radius; // Half circle
    const offset = circumference * (1 - percentage);

    container.innerHTML = `
      <div class="damkoi-gauge-container">
        <svg width="100" height="60" viewBox="0 0 100 60">
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="8"
            stroke-linecap="round" />
          <path d="M10 50 A40 40 0 0 1 90 50"
            fill="none"
            stroke="${color}"
            stroke-width="8"
            stroke-linecap="round"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${offset}"
            class="damkoi-gauge-fill" />
        </svg>
        <div class="damkoi-gauge-value" style="color: ${color}">${score}</div>
        <div class="damkoi-gauge-label">Deal Score</div>
      </div>
    `;
  },

  /**
   * Renders a Price Trend Sparkline
   * @param {Array} history - Array of price snapshot objects
   * @param {string} containerId - ID of the container element
   */
  renderPriceChart(history, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !history || history.length < 2) {
      container.innerHTML = '<div class="damkoi-no-data">Not enough data for chart</div>';
      return;
    }

    // Sort by date (ascending)
    const points = [...history].sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));
    const prices = points.map(p => p.price);
    const min = Math.min(...prices) * 0.95;
    const max = Math.max(...prices) * 1.05;
    const range = max - min;

    const width = 280;
    const height = 120;
    const padding = 10;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);

    // Calculate coordinates
    const coords = points.map((p, i) => {
      const x = padding + (i * (chartWidth / (points.length - 1)));
      const y = padding + (chartHeight - ((p.price - min) / range * chartHeight));
      return { x, y };
    });

    // Create SVG Path
    const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

    // Create Gradient Area Path
    const areaD = `${d} L ${coords[coords.length-1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`;

    container.innerHTML = `
      <div class="damkoi-chart-container">
        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="chart-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style="stop-color:rgba(167, 139, 250, 0.4);stop-opacity:1" />
              <stop offset="100%" style="stop-color:rgba(167, 139, 250, 0);stop-opacity:1" />
            </linearGradient>
          </defs>
          <path d="${areaD}" fill="url(#chart-grad)" />
          <path d="${d}" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

          <!-- Tooltip dots for each point (hidden by default) -->
          ${coords.map((c, i) => `
            <circle cx="${c.x}" cy="${c.y}" r="3" fill="#fff" class="damkoi-chart-dot" style="opacity: ${i === coords.length-1 ? 1 : 0}">
              <title>${new Date(points[i].scraped_at).toLocaleDateString()}: ${formatBDT(points[i].price)}</title>
            </circle>
          `).join('')}
        </svg>
      </div>
    `;
  }
};

export default Visualizer;
