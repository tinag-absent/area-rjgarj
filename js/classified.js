// Classified Page Script
(function() {
  // Check access
  if (!ProgressSystem.checkPageAccess('classified.html')) {
    renderAccessDenied();
    return;
  }

  let currentFilter = 'all';
  let currentQuery = '';

  function updateStats() {
    const stats = window.PersonnelDatabase.getStatistics();
    const container = document.getElementById('statsGrid');
    
    container.innerHTML = `
      <div class="stat-box">
        <div class="stat-number">${stats.total}</div>
        <div class="stat-label">総機関員数</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${stats.avgAge}</div>
        <div class="stat-label">平均年齢</div>
      </div>
      ${Object.entries(stats.divisions).map(([div, count]) => `
        <div class="stat-box">
          <div class="stat-number">${count}</div>
          <div class="stat-label">${div}</div>
        </div>
      `).join('')}
    `;
  }

  function renderPersonnel() {
    let personnel = window.PersonnelDatabase.personnel;
    if (currentFilter !== 'all') {
      personnel = window.PersonnelDatabase.filterByDivision(currentFilter);
    }
    if (currentQuery) {
      personnel = window.PersonnelDatabase.searchPersonnel(currentQuery);
    }
    const container = document.getElementById('personnelGrid');
    const resultCount = document.getElementById('resultCount');
    resultCount.textContent = personnel.length;

    if (personnel.length === 0) {
      container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--muted-foreground);"><p>該当する機関員が見つかりませんでした</p></div>';
      return;
    }

    container.innerHTML = personnel.map(p => `
      <div class="personnel-card" onclick="window.location.href='personnel-detail.html?id=${p.id}'">
        <div class="personnel-id">${p.id}</div>
        <div class="personnel-name">${p.name}</div>
        <div class="personnel-division">${p.division} / ${p.rank}</div>
        <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.5rem;">${p.specialization}</div>
        <div class="personnel-meta">
          <div class="meta-item"><span class="meta-label">年齢</span><span class="meta-value">${p.age}歳</span></div>
          <div class="meta-item"><span class="meta-label">入局日</span><span class="meta-value">${p.joinDate}</span></div>
          <div class="meta-item"><span class="meta-label">心理評価</span><span class="meta-value" style="color: ${getStatusColor(p.psychEval.status)};">${p.psychEval.status}</span></div>
          <div class="meta-item"><span class="meta-label">日記エントリ</span><span class="meta-value">${p.diary.length}件</span></div>
        </div>
      </div>
    `).join('');
  }

  function getStatusColor(status) {
    const colors = {'良好': 'rgb(16, 185, 129)', '軽度注意': 'rgb(245, 158, 11)', '注意観察': 'rgb(245, 158, 11)', '要注意': 'var(--destructive)'};
    return colors[status] || 'var(--muted-foreground)';
  }

  function renderAccessDenied() {
    document.querySelector('.container').innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid var(--destructive); padding: 3rem; text-align: center;">
        <svg style="width: 80px; height: 80px; margin: 0 auto 1.5rem; color: var(--destructive);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: var(--destructive); margin-bottom: 1rem; text-transform: uppercase;">ACCESS DENIED</div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 2rem;">LEVEL 5の権限が必要です。</div>
        <a href="./dashboard.html" style="display: inline-block; padding: 0.75rem 2rem; background: var(--destructive); color: white; text-decoration: none;">ダッシュボードに戻る</a>
      </div>
    `;
  }

  document.getElementById('searchBtn').addEventListener('click', () => {
    currentQuery = document.getElementById('searchInput').value;
    renderPersonnel();
  });

  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      currentQuery = document.getElementById('searchInput').value;
      renderPersonnel();
    }
  });

  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderPersonnel();
    });
  });

  updateStats();
  renderPersonnel();
})();
