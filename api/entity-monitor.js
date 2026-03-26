// PA CROP Services — Entity Status Monitor
// POST /api/entity-monitor { entityName, entityNumber, clientEmail }
// Checks PA DOS entity status via web search scraping

import { authenticateRequest } from './services/auth.js';
import { setCors } from './services/auth.js';
import { createLogger } from './_log.js';

const log = createLogger('entity-monitor');
export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const adminKey = req.headers['x-admin-key'];
  const isAdmin = adminKey === (process.env.ADMIN_SECRET_KEY);
  const session = !isAdmin ? await authenticateRequest(req) : { valid: true };
  if (!isAdmin && !session.valid) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { entityName, entityNumber, clientEmail } = req.body || {};
  if (!entityName && !entityNumber) {
    return res.status(400).json({ success: false, error: 'entityName or entityNumber required' });
  }

  try {
    // Strategy 1: Try the PA DOS ECORP search page (public)
    const searchParam = entityNumber || entityName;
    const searchType = entityNumber ? 'number' : 'name';
    const dosUrl = `https://www.corporations.pa.gov/search/corpsearch?searchType=${searchType}&searchValue=${encodeURIComponent(searchParam)}`;
    
    let status = 'unknown';
    let details = {
      entityName: entityName || '',
      entityNumber: entityNumber || '',
      searchUrl: dosUrl,
      method: 'direct_api'
    };

    // Strategy 2: Use AI to reason about entity status based on known data
    // For entities we manage, we know their filing status from SuiteDash
    const GROQ_KEY = process.env.GROQ_API_KEY;
    
    // Try fetching the PA DOS search results page
    const searchUrl2 = `https://www.corporations.pa.gov/Search/GetResults?searchValue=${encodeURIComponent(searchParam)}&searchType=1`;
    
    let fetchSuccess = false;
    try {
      const dosRes = await fetch(searchUrl2, {
        headers: { 
          'Accept': 'application/json, text/html',
          'User-Agent': 'PA-CROP-Services-Monitor/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });
      
      if (dosRes.ok) {
        const text = await dosRes.text();
        
        // Try JSON parse
        try {
          const data = JSON.parse(text);
          if (data && (Array.isArray(data) || data.results)) {
            const results = Array.isArray(data) ? data : data.results || [];
            const match = results.find(r => {
              if (entityNumber && String(r.entityNumber || r.fileNumber || '') === String(entityNumber)) return true;
              if (entityName && (r.entityName || r.name || '').toLowerCase().includes(entityName.toLowerCase())) return true;
              return false;
            });
            if (match) {
              status = (match.status || match.entityStatus || 'active').toLowerCase();
              details = { ...details, ...match, method: 'dos_api_json' };
              fetchSuccess = true;
            }
          }
        } catch {
          // HTML response — try to extract status
          const statusMatch = text.match(/(?:status|standing)[:\s]*<[^>]*>([^<]+)</i) ||
                             text.match(/(active|dissolved|cancelled|suspended|good standing|forfeited|revoked)/i);
          if (statusMatch) {
            status = statusMatch[1].toLowerCase().trim();
            details.method = 'dos_html_scrape';
            fetchSuccess = true;
          }
        }
      }
    } catch (fetchErr) {
      details.fetchError = fetchErr.message;
    }

    // If direct fetch failed, use known entity data
    if (!fetchSuccess) {
      // For our own entity, we know it's active
      if (entityNumber === '0015295203' || (entityName && entityName.includes('PA Registered Office'))) {
        status = 'active';
        details.method = 'known_entity';
      } else {
        // Flag as needing manual check
        status = 'needs_verification';
        details.method = 'manual_check_required';
        details.checkUrl = `https://www.corporations.pa.gov/search/corpsearch`;
        details.instructions = `Search for "${searchParam}" at the PA DOS business search portal`;
      }
    }

    // Determine alert level
    const isGood = ['active', 'good standing', 'current'].some(s => status.includes(s));
    const isBad = ['dissolved', 'cancelled', 'revoked', 'suspended', 'delinquent', 'forfeited'].some(s => status.includes(s));
    const alertLevel = isBad ? 'critical' : (isGood ? 'ok' : 'warning');

    return res.status(200).json({
      success: true,
      entityName: entityName || details.entityName,
      entityNumber: entityNumber || details.entityNumber,
      clientEmail,
      status,
      alertLevel,
      details,
      checkedAt: new Date().toISOString()
    });
  } catch (err) {
    log.error('entity_monitor_error', {}, err instanceof Error ? err : new Error(String(err)));
    return res.status(200).json({
      success: true,
      entityName, entityNumber, clientEmail,
      status: 'check_failed',
      alertLevel: 'warning',
      error: err.message,
      checkedAt: new Date().toISOString()
    });
  }
}
