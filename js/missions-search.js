// Missions Search Page Script
(function() {
  // Check if user has access to this page
  if (!ProgressSystem.checkPageAccess('missions.html')) {
    ModalSystem.warning(
      'このページにアクセスするには LEVEL 2 が必要です。',
      'ACCESS DENIED'
    ).then(() => {
      window.location.href = './dashboard.html';
    });
    return;
  }

  let currentFilters = {
    status: 'all',
    priority: 'all',
    sort: 'date-desc',
    searchText: ''
  };

  // Update statistics
  function updateStats() {
    const stats = window.MissionData.getStatistics();
    const container = document.getElementById('statsSummary');
    
    container.innerHTML = `
      <div class="stat-card">
        <div class="stat-number">${stats.total}</div>
        <div class="stat-label">総案件数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--destructive);">${stats.active}</div>
        <div class="stat-label">対応中</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: rgb(245, 158, 11);">${stats.monitoring}</div>
        <div class="stat-label">監視中</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: rgb(16, 185, 129);">${stats.completed}</div>
        <div class="stat-label">収束済み</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--destructive);">${stats.critical}</div>
        <div class="stat-label">重大事案</div>
      </div>
    `;
  }

  // Render mission list
  function renderMissions() {
    const missions = window.MissionData.searchMissions(currentFilters);
    
    // Sort
    const sorted = [...missions].sort((a, b) => {
      switch (currentFilters.sort) {
        case 'date-desc':
          return new Date(b.startDate) - new Date(a.startDate);
        case 'date-asc':
          return new Date(a.startDate) - new Date(b.startDate);
        case 'severity':
          const severityOrder = { critical: 0, warning: 1, safe: 2 };
          return severityOrder[a.priority] - severityOrder[b.priority];
        default:
          return 0;
      }
    });

    const container = document.getElementById('missionList');
    const resultCount = document.getElementById('resultCount');

    resultCount.textContent = sorted.length;

    if (sorted.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 4rem; color: var(--muted-foreground);">
          <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin: 0 auto 1rem; opacity: 0.3;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="font-mono" style="font-size: 0.875rem;">該当する案件が見つかりませんでした</p>
        </div>
      `;
      return;
    }

    const statusLabels = {
      active: '対応中',
      monitoring: '監視中',
      completed: '収束済み',
      failed: '失敗'
    };

    const priorityLabels = {
      critical: '重大',
      warning: '警戒',
      safe: '観察'
    };

    container.innerHTML = sorted.map(mission => {
      return `
        <div class="mission-card ${mission.status}" onclick="window.location.href='mission-detail.html?id=${mission.id}'">
          <div class="mission-header">
            <div>
              <div class="mission-title">${mission.title}</div>
              <div class="mission-code">${mission.id}</div>
            </div>
            <div class="mission-badges">
              <span class="status-badge status-${mission.status}">
                ${statusLabels[mission.status]}
              </span>
              <span class="status-badge severity-${mission.priority}">
                ${priorityLabels[mission.priority]}
              </span>
            </div>
          </div>
          
          <div style="font-size: 0.875rem; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 1rem;">
            ${mission.description}
          </div>

          <div class="mission-info">
            <div class="info-item">
              <div class="info-label">発生場所</div>
              <div class="info-value">${mission.location}</div>
            </div>
            <div class="info-item">
              <div class="info-label">開始日時</div>
              <div class="info-value">${new Date(mission.startDate).toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">GSI値</div>
              <div class="info-value" style="color: var(--primary);">${mission.gsi}%</div>
            </div>
            <div class="info-item">
              <div class="info-label">実体</div>
              <div class="info-value">${mission.entity}</div>
            </div>
            <div class="info-item">
              <div class="info-label">担当部門</div>
              <div class="info-value">${mission.assignedDivisions[0]}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Search functionality
  document.getElementById('searchBtn').addEventListener('click', () => {
    currentFilters.searchText = document.getElementById('searchInput').value;
    renderMissions();
  });

  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      currentFilters.searchText = document.getElementById('searchInput').value;
      renderMissions();
    }
  });

  // Filter functionality
  document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentFilters.status = e.target.value;
    renderMissions();
  });

  document.getElementById('severityFilter').addEventListener('change', (e) => {
    currentFilters.priority = e.target.value;
    renderMissions();
  });

  document.getElementById('sortFilter').addEventListener('change', (e) => {
    currentFilters.sort = e.target.value;
    renderMissions();
  });

  // Initialize
  updateStats();
  renderMissions();

})();
