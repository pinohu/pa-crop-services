import * as db from '../services/db.js';

export default async function handler(req, res) {
  const id = req.query.id;
  // Return SVG badge
  const org = await db.getOrganization(id);
  const verified = org?.entity_status === 'active';
  const label = verified ? 'Compliance Verified' : 'Unverified';
  const color = verified ? '#15803d' : '#dc2626';
  const bg = verified ? '#f0fdf4' : '#fef2f2';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="36" viewBox="0 0 240 36">
    <rect width="240" height="36" rx="6" fill="${bg}" stroke="${color}" stroke-width="1"/>
    <text x="28" y="23" font-family="system-ui,sans-serif" font-size="12" font-weight="600" fill="${color}">${label} — PA CROP Services</text>
    <circle cx="14" cy="18" r="6" fill="${color}"/>
    <path d="M11 18l2 2 4-4" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).send(svg);
}
