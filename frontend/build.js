/**
 * Build Script for Vercel / Netlify / CI Deployments
 * Injects Environment Variables into env.js if provided
 */

const fs = require('fs');
const path = require('path');

const rawApiUrl =
  process.env.VITE_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.REACT_APP_API_URL ||
  process.env.API_URL ||
  process.env.RENDER_BACKEND_URL ||
  process.env.BACKEND_URL ||
  'https://smart-clinic-ai-backend.onrender.com';

const normalizedHost = rawApiUrl.trim().replace(/\/+$/, '').replace(/\/api\/?$/, '');

const content = `/**
 * MediFlow AI - Runtime Environment Config
 * Automatically generated during deployment build
 */
window.__ENV__ = {
  API_URL: '${normalizedHost}'
};
`;

const outputPath = path.join(__dirname, 'env.js');
try {
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`[BUILD] Generated env.js with API_URL: ${normalizedHost}`);
} catch (err) {
  console.error(`[BUILD ERROR] Failed to write env.js:`, err);
  process.exit(1);
}
