/**
 * MemoSphere Global Search
 * Ctrl+F/Cmd+K search with encrypted field support
 */

class GlobalSearch {
    constructor() {
        this.isVisible = false;
        this.searchElement = null;
        this.backendUrl = 'http://localhost:8000';
        this.searchCache = new Map();
        this.recentSearches = [];

        this.init();
    }

    init() {
        this.createSearchInterface();
        this.setupEventListeners();
        this.loadRecentSearches();
    }

    createSearchInterface() {
        const searchUI = document.createElement('div');
        searchUI.id = 'ms-global-search';
        searchUI.className = 'ms-search-hidden';
        searchUI.innerHTML = `
      <div class="ms-search-backdrop"></div>
      <div class="ms-search-container">
        <div class="ms-search-box">
          <svg class="ms-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input 
            type="text" 
            id="ms-search-input" 
            placeholder="Search meetings, events, policies..."
            autocomplete="off"
          />
          <button class="ms-search-close" id="ms-search-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="ms-search-filters">
          <button class="ms-filter-btn active" data-filter="all">All</button>
          <button class="ms-filter-btn" data-filter="meetings">Meetings</button>
          <button class="ms-filter-btn" data-filter="events">Events</button>
          <button class="ms-filter-btn" data-filter="policies">Policies</button>
          <button class="ms-filter-btn" data-filter="documents">Documents</button>
        </div>

        <div class="ms-search-results" id="ms-search-results">
          <div class="ms-recent-searches" id="ms-recent-searches">
            <div class="ms-results-header">Recent Searches</div>
            <div id="ms-recent-list"></div>
          </div>
        </div>

        <div class="ms-search-footer">
          <div class="ms-search-hints">
            <span>↑↓ Navigate</span>
            <span>Enter Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    `;

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
      .ms-search-hidden { display: none !important; }
      .ms-search-visible { display: flex !important; }

      #ms-global-search {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 2147483646;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        display: none;
        align-items: flex-start;
        justify-content: center;
        padding-top: 10vh;
        animation: fadeIn 0.2s ease;
      }

      .ms-search-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
      }

      .ms-search-container {
        position: relative;
        width: 90%;
        max-width: 640px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .ms-search-box {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
      }

      .ms-search-icon {
        width: 20px;
        height: 20px;
        color: #9ca3af;
        stroke-width: 2;
        flex-shrink: 0;
      }

      #ms-search-input {
        flex: 1;
        border: none;
        outline: none;
        font-size: 16px;
        color: #1f2937;
        background: transparent;
      }

      #ms-search-input::placeholder {
        color: #9ca3af;
      }

      .ms-search-close {
        width: 28px;
        height: 28px;
        border: none;
        background: #f3f4f6;
        border-radius: 6px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
        transition: all 0.2s;
      }

      .ms-search-close:hover {
        background: #e5e7eb;
        color: #374151;
      }

      .ms-search-close svg {
        width: 14px;
        height: 14px;
        stroke-width: 2;
      }

      .ms-search-filters {
        display: flex;
        gap: 8px;
        padding: 12px 20px;
        border-bottom: 1px solid #e5e7eb;
        overflow-x: auto;
      }

      .ms-filter-btn {
        padding: 6px 14px;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 500;
        color: #6b7280;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
      }

      .ms-filter-btn:hover {
        background: #f9fafb;
        border-color: #d1d5db;
      }

      .ms-filter-btn.active {
        background: #667eea;
        border-color: #667eea;
        color: white;
      }

      .ms-search-results {
        max-height: 400px;
        overflow-y: auto;
      }

      .ms-results-header {
        padding: 12px 20px;
        font-size: 12px;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .ms-result-item {
        padding: 14px 20px;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background 0.15s;
      }

      .ms-result-item:hover,
      .ms-result-item.selected {
        background: #f9fafb;
      }

      .ms-result-item:last-child {
        border-bottom: none;
      }

      .ms-result-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .ms-result-icon {
        width: 16px;
        height: 16px;
        color: #667eea;
      }

      .ms-result-title {
        font-size: 14px;
        font-weight: 500;
        color: #1f2937;
        flex: 1;
      }

      .ms-result-type {
        font-size: 11px;
        padding: 2px 8px;
        background: #ede9fe;
        color: #6d28d9;
        border-radius: 4px;
        font-weight: 500;
      }

      .ms-result-description {
        font-size: 13px;
        color: #6b7280;
        margin-top: 4px;
        line-height: 1.5;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .ms-result-meta {
        display: flex;
        gap: 12px;
        margin-top: 6px;
        font-size: 12px;
        color: #9ca3af;
      }

      .ms-result-meta span {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .ms-no-results {
        padding: 40px 20px;
        text-align: center;
        color: #9ca3af;
      }

      .ms-no-results svg {
        width: 48px;
        height: 48px;
        margin: 0 auto 12px;
        opacity: 0.3;
      }

      .ms-loading-results {
        padding: 40px 20px;
        text-align: center;
      }

      .ms-loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top-color: #667eea;
        border-radius: 50%;
        margin: 0 auto 12px;
        animation: spin 0.8s linear infinite;
      }

      .ms-search-footer {
        padding: 12px 20px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .ms-search-hints {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #9ca3af;
      }

      .ms-search-hints span {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .ms-recent-item {
        padding: 10px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: background 0.15s;
      }

      .ms-recent-item:hover {
        background: #f9fafb;
      }

      .ms-recent-icon {
        width: 16px;
        height: 16px;
        color: #9ca3af;
        stroke-width: 2;
      }

      .ms-recent-text {
        flex: 1;
        font-size: 14px;
        color: #6b7280;
      }
    `;

        document.head.appendChild(style);
        document.body.appendChild(searchUI);
        this.searchElement = searchUI;
    }

    setupEventListeners() {
        const input = document.getElementById('ms-search-input');
        const closeBtn = document.getElementById('ms-search-close');
        const backdrop = this.searchElement.querySelector('.ms-search-backdrop');

        // Close handlers
        closeBtn.addEventListener('click', () => this.hide());
        backdrop.addEventListener('click', () => this.hide());

        // Search input
        let searchTimeout;
        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.performSearch(e.target.value);
            }, 300);
        });

        // Filter buttons
        document.querySelectorAll('.ms-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ms-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const query = input.value;
                if (query) {
                    this.performSearch(query, btn.dataset.filter);
                }
            });
        });

        // Keyboard navigation
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.selectNext();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.selectPrevious();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this.openSelected();
            }
        });

        // Listen for shortcut
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type === 'TOGGLE_SEARCH') {
                this.toggle();
            }
        });

        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
                e.preventDefault();
                this.show();
            }
        });
    }

    async performSearch(query, filter = 'all') {
        if (!query || query.length < 2) {
            this.showRecent();
            return;
        }

        // Save to recent searches
        this.addToRecent(query);

        // Show loading
        this.showLoading();

        try {
            const authContext = await window.authManager.getAuthContext();

            if (!authContext.isAuthenticated) {
                throw new Error('Authentication required');
            }

            // Create blind index for encrypted search
            const searchIndex = await window.encryptionManager.createBlindIndex(query, authContext.orgId);

            // Perform search
            const response = await window.authManager.authenticatedFetch(
                `${this.backendUrl}/api/search`, {
                    method: 'POST',
                    body: JSON.stringify({
                        query: query,
                        search_index: searchIndex,
                        filter: filter,
                        org_id: authContext.orgId
                    })
                }
            );

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const results = await response.json();

            // Decrypt encrypted fields in results
            const decryptedResults = await Promise.all(
                results.map(async(result) => {
                    return await window.encryptionManager.decryptObject(
                        result,
                        authContext.orgId, ['description', 'content', 'notes']
                    );
                })
            );

            this.displayResults(decryptedResults);
        } catch (error) {
            console.error('Search error:', error);
            this.showError(error.message);
        }
    }

    displayResults(results) {
            const container = document.getElementById('ms-search-results');

            if (results.length === 0) {
                container.innerHTML = `
        <div class="ms-no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <div>No results found</div>
        </div>
      `;
                return;
            }

            const icons = {
                meeting: '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>',
                event: '<path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>',
                policy: '<path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>',
                document: '<path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>'
            };

            const html = results.map(result => `
      <div class="ms-result-item" data-id="${result.id}" data-url="${result.url || '#'}">
        <div class="ms-result-header">
          <svg class="ms-result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            ${icons[result.type] || icons.document}
          </svg>
          <span class="ms-result-title">${this.escapeHtml(result.title)}</span>
          <span class="ms-result-type">${result.type}</span>
        </div>
        <div class="ms-result-description">${this.escapeHtml(result.description || result.summary || '')}</div>
        <div class="ms-result-meta">
          ${result.date ? `<span>📅 ${new Date(result.date).toLocaleDateString()}</span>` : ''}
          ${result.author ? `<span>👤 ${this.escapeHtml(result.author)}</span>` : ''}
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="ms-results-header">${results.length} result${results.length !== 1 ? 's' : ''}</div>
      ${html}
    `;

    // Add click handlers
    container.querySelectorAll('.ms-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        if (url && url !== '#') {
          window.location.href = url;
        }
      });
    });
  }

  showRecent() {
    const recentList = document.getElementById('ms-recent-list');
    
    if (this.recentSearches.length === 0) {
      document.getElementById('ms-recent-searches').style.display = 'none';
      return;
    }

    document.getElementById('ms-recent-searches').style.display = 'block';
    
    recentList.innerHTML = this.recentSearches.map(query => `
      <div class="ms-recent-item" data-query="${this.escapeHtml(query)}">
        <svg class="ms-recent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span class="ms-recent-text">${this.escapeHtml(query)}</span>
      </div>
    `).join('');

    recentList.querySelectorAll('.ms-recent-item').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('ms-search-input').value = item.dataset.query;
        this.performSearch(item.dataset.query);
      });
    });
  }

  showLoading() {
    const container = document.getElementById('ms-search-results');
    container.innerHTML = `
      <div class="ms-loading-results">
        <div class="ms-loading-spinner"></div>
        <div>Searching...</div>
      </div>
    `;
  }

  showError(message) {
    const container = document.getElementById('ms-search-results');
    container.innerHTML = `
      <div class="ms-no-results">
        <div style="color: #dc2626;">Error: ${this.escapeHtml(message)}</div>
      </div>
    `;
  }

  addToRecent(query) {
    this.recentSearches = [query, ...this.recentSearches.filter(q => q !== query)].slice(0, 5);
    this.saveRecentSearches();
  }

  async saveRecentSearches() {
    await chrome.storage.local.set({ recentSearches: this.recentSearches });
  }

  async loadRecentSearches() {
    const result = await chrome.storage.local.get(['recentSearches']);
    this.recentSearches = result.recentSearches || [];
  }

  selectNext() {
    // Implementation for keyboard navigation
  }

  selectPrevious() {
    // Implementation for keyboard navigation
  }

  openSelected() {
    const selected = document.querySelector('.ms-result-item.selected');
    if (selected) {
      selected.click();
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  show() {
    this.searchElement.classList.remove('ms-search-hidden');
    this.searchElement.classList.add('ms-search-visible');
    this.isVisible = true;
    document.getElementById('ms-search-input').focus();
    this.showRecent();
  }

  hide() {
    this.searchElement.classList.remove('ms-search-visible');
    this.searchElement.classList.add('ms-search-hidden');
    this.isVisible = false;
    document.getElementById('ms-search-input').value = '';
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize global search
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.globalSearch = new GlobalSearch();
  });
} else {
  window.globalSearch = new GlobalSearch();
}