// PA CROP Services — Unified AppSumo Tool Connector Hub
// POST /api/tool-connector { tool, action, data }
// Connects to all 11 AppSumo tools via their APIs
// Each tool needs its API key in Vercel env vars

const TOOLS = {
  vadoo: {
    name: 'Vadoo AI', envKey: 'VADOO_API_KEY', baseUrl: 'https://api.vadoo.tv/v1',
    actions: {
      create_video: { method: 'POST', path: '/videos', desc: 'Generate video from script' },
      list_videos: { method: 'GET', path: '/videos', desc: 'List all generated videos' },
    }
  },
  fliki: {
    name: 'Fliki', envKey: 'FLIKI_API_KEY', baseUrl: 'https://api.fliki.ai/v1',
    actions: {
      create_video: { method: 'POST', path: '/generate', desc: 'Generate video from text' },
      voices: { method: 'GET', path: '/voices', desc: 'List available voices' },
    }
  },
  castmagic: {
    name: 'Castmagic', envKey: 'CASTMAGIC_API_KEY', baseUrl: 'https://api.castmagic.io/v1',
    actions: {
      create_episode: { method: 'POST', path: '/episodes', desc: 'Generate podcast episode' },
    }
  },
  subscribr: {
    name: 'Subscribr', envKey: 'SUBSCRIBR_API_KEY', baseUrl: 'https://api.subscribr.ai/v1',
    actions: {
      analyze_channel: { method: 'POST', path: '/analyze', desc: 'Analyze YouTube channel strategy' },
      generate_ideas: { method: 'POST', path: '/ideas', desc: 'Generate content ideas' },
    }
  },
  taja: {
    name: 'Taja AI', envKey: 'TAJA_API_KEY', baseUrl: 'https://api.taja.ai/v1',
    actions: {
      optimize_video: { method: 'POST', path: '/optimize', desc: 'Optimize YouTube video SEO' },
    }
  },
  viloud: {
    name: 'Viloud', envKey: 'VILOUD_API_KEY', baseUrl: 'https://api.viloud.tv/v1',
    actions: {
      create_channel: { method: 'POST', path: '/channels', desc: 'Create 24/7 streaming channel' },
      add_content: { method: 'POST', path: '/content', desc: 'Add content to channel' },
    }
  },
  scribebuilder: {
    name: 'ScribeBuilder', envKey: 'SCRIBEBUILDER_API_KEY', baseUrl: 'https://api.scribebuilder.com/v1',
    actions: {
      generate_posts: { method: 'POST', path: '/generate', desc: 'Generate social media posts' },
      schedule_post: { method: 'POST', path: '/schedule', desc: 'Schedule a post' },
    }
  },
  konnectzit: {
    name: 'KonnectzIT', envKey: 'KONNECTZIT_API_KEY', baseUrl: 'https://api.konnectzit.com/v1',
    actions: {
      create_flow: { method: 'POST', path: '/flows', desc: 'Create automation flow' },
      list_flows: { method: 'GET', path: '/flows', desc: 'List active flows' },
    }
  },
  activepieces: {
    name: 'Activepieces', envKey: 'ACTIVEPIECES_API_KEY', baseUrl: 'https://cloud.activepieces.com/api/v1',
    actions: {
      create_flow: { method: 'POST', path: '/flows', desc: 'Create automation flow' },
      list_flows: { method: 'GET', path: '/flows', desc: 'List flows' },
    }
  },
  brizy: {
    name: 'Brizy Cloud', envKey: 'BRIZY_API_KEY', baseUrl: 'https://api.brizy.cloud/v1',
    actions: {
      create_page: { method: 'POST', path: '/pages', desc: 'Create landing page' },
      list_pages: { method: 'GET', path: '/pages', desc: 'List pages' },
    }
  },
  usps: {
    name: 'USPS Informed Delivery', envKey: 'USPS_API_KEY', baseUrl: 'https://iv.usps.com/api',
    actions: {
      check_mail: { method: 'GET', path: '/notifications', desc: 'Check incoming mail' },
    }
  },
};

export default async function handler(req, res) {
  const _o = req.headers.origin || '';
  const _origins = ['https://pacropservices.com','https://www.pacropservices.com','https://pa-crop-services.vercel.app'];
  res.setHeader('Access-Control-Allow-Origin', _origins.includes(_o) ? _o : _origins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const adminKey = req.headers['x-admin-key'] || req.query?.key;
  if (adminKey !== (process.env.ADMIN_SECRET_KEY)) return res.status(401).json({ error: 'Unauthorized' });

  // GET: List all tools and their connection status
  if (req.method === 'GET') {
    const status = {};
    for (const [id, tool] of Object.entries(TOOLS)) {
      status[id] = {
        name: tool.name,
        connected: !!process.env[tool.envKey],
        envKey: tool.envKey,
        actions: Object.keys(tool.actions),
      };
    }
    const connected = Object.values(status).filter(t => t.connected).length;
    return res.status(200).json({
      success: true,
      tools: status,
      summary: { total: Object.keys(TOOLS).length, connected, disconnected: Object.keys(TOOLS).length - connected },
      instructions: 'Add API keys as Vercel environment variables to connect tools. Each tool uses the envKey shown.'
    });
  }

  // POST: Execute tool action
  const { tool, action, data } = req.body || {};
  if (!tool || !action) return res.status(400).json({ error: 'tool and action required' });

  const toolConfig = TOOLS[tool];
  if (!toolConfig) return res.status(400).json({ error: `Unknown tool: ${tool}. Available: ${Object.keys(TOOLS).join(', ')}` });

  const actionConfig = toolConfig.actions[action];
  if (!actionConfig) return res.status(400).json({ error: `Unknown action: ${action}. Available: ${Object.keys(toolConfig.actions).join(', ')}` });

  const apiKey = process.env[toolConfig.envKey];
  if (!apiKey) {
    return res.status(503).json({
      error: `${toolConfig.name} not connected`,
      envKey: toolConfig.envKey,
      instruction: `Add ${toolConfig.envKey} to Vercel environment variables to enable this tool.`,
      vercelUrl: 'https://vercel.com/polycarpohu-gmailcoms-projects/pa-crop-services/settings/environment-variables'
    });
  }

  // Execute the API call
  try {
    const url = `${toolConfig.baseUrl}${actionConfig.path}`;
    const r = await fetch(url, {
      method: actionConfig.method,
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      ...(actionConfig.method === 'POST' ? { body: JSON.stringify(data || {}) } : {})
    });
    const result = await r.json().catch(() => ({}));
    return res.status(r.ok ? 200 : r.status).json({ success: r.ok, tool: toolConfig.name, action, result });
  } catch (e) {
    return res.status(502).json({ error: `${toolConfig.name} API error: ${e.message}` });
  }
}
