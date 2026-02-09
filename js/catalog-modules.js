// Module Catalog Page Script
(function() {
  // Check if user has access to this page
  if (!ProgressSystem.checkPageAccess('modules.html')) {
    ModalSystem.warning(
      'このページにアクセスするには LEVEL 2 が必要です。<br><br>部門情報の閲覧やチャット機能を使用して経験値を獲得してください。',
      'ACCESS DENIED'
    ).then(() => {
      window.location.href = './dashboard.html';
    });
    return;
  }

  // Render modules
  function renderModules(filter = 'all') {
    const catalog = document.getElementById('moduleCatalog');
    const modules = window.CatalogData.modules;
    
    const filtered = filter === 'all' 
      ? modules 
      : modules.filter(m => m.classification === filter);

    if (filtered.length === 0) {
      catalog.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--muted-foreground);">
          <p class="font-mono">該当するモジュールが見つかりませんでした</p>
        </div>
      `;
      return;
    }

    const classMap = {
      safe: 'class-safe',
      caution: 'class-caution',
      danger: 'class-danger',
      classified: 'class-classified'
    };

    const classLabelMap = {
      safe: 'SAFE',
      caution: 'CAUTION',
      danger: 'DANGER',
      classified: 'CLASSIFIED'
    };

    catalog.innerHTML = filtered.map(module => {
      return `
        <div class="catalog-item" onclick="showModuleDetail('${module.id}')">
          <div class="catalog-item-header">
            <div class="module-icon">
              <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <div style="text-align: center; margin-bottom: 0.5rem;">
              <span class="classification-badge ${classMap[module.classification]}">
                ${classLabelMap[module.classification]}
              </span>
            </div>
            <h3 style="font-size: 1.125rem; font-weight: 600; color: white; text-align: center; margin-bottom: 0.25rem;">
              ${module.name}
            </h3>
            <p class="font-mono text-muted" style="font-size: 0.75rem; text-align: center;">
              ${module.code}
            </p>
          </div>
          
          <div class="catalog-item-content">
            <p style="font-size: 0.875rem; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 1rem;">
              ${module.description}
            </p>
            
            <div class="stat-row">
              <span class="text-muted">効果範囲:</span>
              <span style="color: var(--primary); font-family: 'JetBrains Mono', monospace;">${module.range}</span>
            </div>
            <div class="stat-row">
              <span class="text-muted">持続時間:</span>
              <span style="color: var(--primary); font-family: 'JetBrains Mono', monospace;">${module.duration}</span>
            </div>
            <div class="stat-row">
              <span class="text-muted">エネルギー消費:</span>
              <span style="color: var(--primary); font-family: 'JetBrains Mono', monospace;">${module.energy}</span>
            </div>
          </div>

          <div class="catalog-item-footer">
            <div style="font-size: 0.75rem; color: var(--muted-foreground);">
              <strong style="color: var(--foreground);">開発部門:</strong> ${module.developer}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Show detail modal
  function showModuleDetail(moduleId) {
    const module = window.CatalogData.modules.find(m => m.id === moduleId);
    if (!module) return;

    const classLabelMap = {
      safe: 'SAFE',
      caution: 'CAUTION',
      danger: 'DANGER',
      classified: 'CLASSIFIED'
    };

    ModalSystem.alert(`
      <div style="text-align: left;">
        <div style="margin-bottom: 1rem;">
          <strong style="color: var(--primary);">コード:</strong> ${module.code}<br>
          <strong style="color: var(--primary);">分類:</strong> ${classLabelMap[module.classification]}<br>
          <strong style="color: var(--primary);">開発:</strong> ${module.developer}
        </div>
        <div style="margin-bottom: 1rem;">
          <strong style="color: var(--primary);">詳細:</strong><br>
          ${module.details}
        </div>
        <div style="background: rgba(0, 0, 0, 0.3); padding: 1rem; border-left: 3px solid var(--destructive); font-size: 0.875rem;">
          <strong style="color: var(--destructive);">警告:</strong><br>
          ${module.warning}
        </div>
      </div>
    `, `${module.name} - 詳細情報`);
  }

  // Make function global
  window.showModuleDetail = showModuleDetail;

  // Filter functionality
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderModules(this.dataset.filter);
    });
  });

  // Initial render
  renderModules();
})();
