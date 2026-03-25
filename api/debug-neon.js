// Debug endpoint — tests Neon connection and query methods
// DELETE THIS FILE after debugging is complete

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const results = {};

  // Check env
  results.has_database_url = !!process.env.DATABASE_URL;
  results.db_url_prefix = (process.env.DATABASE_URL || '').slice(0, 30) + '...';
  results.neon_version = 'unknown';

  try {
    const pkg = await import('@neondatabase/serverless');
    results.neon_exports = Object.keys(pkg);
  } catch (e) {
    results.neon_import_error = e.message;
  }

  if (!process.env.DATABASE_URL) {
    return res.status(200).json({ results, error: 'no DATABASE_URL' });
  }

  const sql = neon(process.env.DATABASE_URL);
  results.sql_type = typeof sql;
  results.sql_has_query = typeof sql.query;
  results.sql_keys = Object.keys(sql);

  // Test 1: Tagged template
  try {
    const r1 = await sql`SELECT 1 as test`;
    results.tagged_template = { success: true, data: r1 };
  } catch (e) {
    results.tagged_template = { success: false, error: e.message.slice(0, 200) };
  }

  // Test 2: .query() method
  try {
    const r2 = await sql.query('SELECT count(*) as c FROM rules');
    results.query_method = { success: true, data: r2 };
  } catch (e) {
    results.query_method = { success: false, error: e.message.slice(0, 200) };
  }

  // Test 3: Tagged template with table
  try {
    const r3 = await sql`SELECT count(*) as c FROM rules`;
    results.rules_count = { success: true, data: r3 };
  } catch (e) {
    results.rules_count = { success: false, error: e.message.slice(0, 200) };
  }

  // Test 4: List tables
  try {
    const r4 = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    results.tables = { success: true, data: r4 };
  } catch (e) {
    results.tables = { success: false, error: e.message.slice(0, 200) };
  }

  return res.status(200).json(results);
}
