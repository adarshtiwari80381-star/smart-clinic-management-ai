/**
 * ==========================================================================
 * MEDIFLOW AI - API CONFIGURATION
 * Centralized API endpoint resolution for Local Development and Production
 * Supports Vercel, Netlify, Render, and Localhost
 * ==========================================================================
 */

(function (window) {
  'use strict';

  // Extract base URL from build-injected environment variable (window.__ENV__) if available
  const injectedUrl = (window.__ENV__ && (window.__ENV__.API_URL || window.__ENV__.VITE_API_URL))
    ? (window.__ENV__.API_URL || window.__ENV__.VITE_API_URL).trim()
    : '';

  // Configured Backend URLs
  const PRODUCTION_RENDER_URL = (injectedUrl || 'https://smart-clinic-ai-backend.onrender.com')
    .replace(/\/+$/, '')
    .replace(/\/api\/?$/, '');

  const LOCAL_DEV_URL = 'http://localhost:5000';

  /**
   * Determine if the current client is running in local development
   * (localhost, 127.0.0.1, file:// protocol)
   */
  function isLocalEnvironment() {
    const host = window.location.hostname;
    const proto = window.location.protocol;
    return (
      proto === 'file:' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    );
  }

  /**
   * Resolves the active API base URL (guaranteed to end with /api)
   */
  function getApiBase() {
    // 1. Production environment (Vercel, Netlify, custom domain): STRICTLY use Render!
    if (!isLocalEnvironment()) {
      const savedCustom = localStorage.getItem('mediflow_custom_api_base');
      if (savedCustom && savedCustom.trim()) {
        let custom = savedCustom.trim().replace(/\/+$/, '');
        // Clear any accidental localhost entries from localStorage in production
        if (custom.includes('localhost') || custom.includes('127.0.0.1')) {
          localStorage.removeItem('mediflow_custom_api_base');
        } else {
          return custom.endsWith('/api') ? custom : `${custom}/api`;
        }
      }
      return `${PRODUCTION_RENDER_URL}/api`;
    }

    // 2. Local development: Allow local developer to use localhost or toggle to Render
    const savedCustom = localStorage.getItem('mediflow_custom_api_base');
    if (savedCustom && savedCustom.trim()) {
      let custom = savedCustom.trim().replace(/\/+$/, '');
      return custom.endsWith('/api') ? custom : `${custom}/api`;
    }

    const forcedMode = localStorage.getItem('mediflow_api_mode');
    if (forcedMode === 'render' || (window.location.search && window.location.search.includes('api=render'))) {
      return `${PRODUCTION_RENDER_URL}/api`;
    }

    return `${LOCAL_DEV_URL}/api`;
  }

  /**
   * Returns host origin without the /api suffix
   */
  function getBackendHost() {
    return getApiBase().replace(/\/api\/?$/, '');
  }

  /**
   * Check if current configuration is targeting the production Render backend
   */
  function isProductionMode() {
    return getApiBase().includes('onrender.com') || !isLocalEnvironment();
  }

  /**
   * Set API mode explicitly: 'render' or 'local'
   */
  function setApiMode(mode) {
    if (mode === 'render' || (mode === 'local' && isLocalEnvironment())) {
      localStorage.setItem('mediflow_api_mode', mode);
      localStorage.removeItem('mediflow_custom_api_base');
    }
  }

  /**
   * Save a custom API base URL
   */
  function setCustomApiBase(customUrl) {
    if (customUrl && customUrl.trim()) {
      let formatted = customUrl.trim().replace(/\/+$/, '');
      if (!isLocalEnvironment() && (formatted.includes('localhost') || formatted.includes('127.0.0.1'))) {
        localStorage.removeItem('mediflow_custom_api_base');
        return;
      }
      if (!formatted.endsWith('/api')) {
        formatted += '/api';
      }
      localStorage.setItem('mediflow_custom_api_base', formatted);
      localStorage.removeItem('mediflow_api_mode');
    } else {
      localStorage.removeItem('mediflow_custom_api_base');
    }
  }

  /**
   * Reset configuration to auto-detection
   */
  function resetToDefault() {
    localStorage.removeItem('mediflow_api_mode');
    localStorage.removeItem('mediflow_custom_api_base');
  }

  // Export to global window object
  window.APP_CONFIG = {
    PRODUCTION_RENDER_URL,
    LOCAL_DEV_URL,
    isLocalEnvironment,
    getApiBase,
    getBackendHost,
    isProductionMode,
    setApiMode,
    setCustomApiBase,
    resetToDefault
  };
})(window);
