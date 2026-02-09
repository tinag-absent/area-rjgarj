// Entity Catalog Page Script
(function() {
  // Check if user has access to this page
  if (!ProgressSystem.checkPageAccess('entities.html')) {
    ModalSystem.warning(
      'このページにアクセスするには LEVEL 3 が必要です。<br><br>より多くの経験値を獲得してレベルアップしてください。',
      'ACCESS DENIED'
    ).then(() => {
      window.location.href = './dashboard.html';
    });
    return;
  }

  // Render entities
  function renderEntities(filter = 'all') {
    const catalog = document.getElementById('entityCatalog');
    const entities = window.CatalogData.entities;
    
    const filtered = filter === 'all' 
      ? entities 
      : entities.filter(e => e.classification === filter);

    if (filtered.length === 0) {
      catalog.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem; color: var(--muted-foreground);">
          <p class="font-mono">該当する実体が見つかりませんでした</p>
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

    catalog.innerHTML = filtered.map(entity => {
      return `
        <div class="catalog-item" onclick="showEntityDetail('${entity.id}')">
          <div class="catalog-item-header">
            <div class="entity-icon">
              <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div style="text-align: center; margin-bottom: 0.5rem;">
              <span class="classification-badge ${classMap[entity.classification]}">
                ${classLabelMap[entity.classification]}
              </span>
            </div>
            <h3 style="font-size: 1.125rem; font-weight: 600; color: white; text-align: center; margin-bottom: 0.25rem;">
              ${entity.name}
            </h3>
            <p class="font-mono text-muted" style="font-size: 0.75rem; text-align: center;">
              ${entity.code}
            </p>
          </div>
          
          <div class="catalog-item-content">
            <p style="font-size: 0.875rem; color: var(--muted-foreground); line-height: 1.6; margin-bottom: 1rem;">
              ${entity.description}
            </p>
            
            <div class="stat-row">
              <span class="text-muted">脅威度:</span>
              <span style="color: var(--destructive); font-family: 'JetBrains Mono', monospace; font-weight: 600;">${entity.threat}</span>
            </div>
            <div class="stat-row">
              <span class="text-muted">知性:</span>
              <span style="color: var(--primary); font-family: 'JetBrains Mono', monospace;">${entity.intelligence}</span>
            </div>
            <div class="stat-row">
              <span class="text-muted">起源:</span>
              <span style="color: var(--primary); font-family: 'JetBrains Mono', monospace; font-size: 0.75rem;">${entity.origin}</span>
            </div>
          </div>

          <div class="catalog-item-footer">
            <div style="font-size: 0.7rem; font-family: 'JetBrains Mono', monospace; color: var(--destructive); text-transform: uppercase;">
              ⚠ クリックして詳細を表示
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Show detail modal
  function showEntityDetail(entityId) {
    const entity = window.CatalogData.entities.find(e => e.id === entityId);
    if (!entity) return;

    const classLabelMap = {
      safe: 'SAFE',
      caution: 'CAUTION',
      danger: 'DANGER',
      classified: 'CLASSIFIED'
    };

    ModalSystem.alert(`
      <div style="text-align: left;">
        <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
          <strong style="color: var(--destructive);">コード:</strong> ${entity.code}<br>
          <strong style="color: var(--destructive);">分類:</strong> ${classLabelMap[entity.classification]}<br>
          <strong style="color: var(--destructive);">起源:</strong> ${entity.origin}
        </div>
        
        <div style="margin-bottom: 1rem;">
          <strong style="color: var(--primary);">外見:</strong><br>
          <div style="background: rgba(0, 0, 0, 0.2); padding: 0.75rem; margin-top: 0.5rem; font-size: 0.875rem;">
            ${entity.appearance}
          </div>
        </div>
        
        <div style="margin-bottom: 1rem;">
          <strong style="color: var(--primary);">行動パターン:</strong><br>
          <div style="background: rgba(0, 0, 0, 0.2); padding: 0.75rem; margin-top: 0.5rem; font-size: 0.875rem;">
            ${entity.behavior}
          </div>
        </div>
        
        <div style="background: rgba(0, 0, 0, 0.3); padding: 1rem; border-left: 3px solid var(--destructive); font-size: 0.875rem;">
          <strong style="color: var(--destructive);">収束プロトコル:</strong><br>
          ${entity.containment}
        </div>
      </div>
    `, `${entity.name} - 詳細情報`);
  }

  // Make function global
  window.showEntityDetail = showEntityDetail;

  // Filter functionality
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      renderEntities(this.dataset.filter);
    });
  });

  // Initial render
  renderEntities();
})();
