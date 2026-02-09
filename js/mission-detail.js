// Mission Detail Page Script
(function() {
  // Check access
  if (!ProgressSystem.checkPageAccess('missions.html')) {
    ModalSystem.warning(
      'このページにアクセスするには LEVEL 2 が必要です。',
      'ACCESS DENIED'
    ).then(() => {
      window.location.href = './dashboard.html';
    });
    return;
  }

  // Get mission ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const missionId = urlParams.get('id');

  if (!missionId) {
    ModalSystem.error('案件IDが指定されていません。', 'ERROR').then(() => {
      window.location.href = './missions.html';
    });
    return;
  }

  const mission = window.MissionData.getMissionById(missionId);

  if (!mission) {
    ModalSystem.error('指定された案件が見つかりませんでした。', 'NOT FOUND').then(() => {
      window.location.href = './missions.html';
    });
    return;
  }

  // Check security level
  const currentUser = JSON.parse(localStorage.getItem('kaishoku_current_user'));
  const userLevel = currentUser ? currentUser.level : 0;

  if (userLevel < mission.securityLevel) {
    renderAccessDenied(mission.securityLevel);
    return;
  }

  // Render mission detail
  renderMissionDetail(mission);

  function renderAccessDenied(requiredLevel) {
    document.getElementById('missionDetail').innerHTML = `
      <div class="security-warning">
        <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
        </svg>
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--destructive); margin-bottom: 0.5rem; text-transform: uppercase;">
          ACCESS DENIED
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--muted-foreground);">
          この案件にアクセスするには LEVEL ${requiredLevel} 以上の権限が必要です。
        </div>
        <div style="margin-top: 1rem;">
          <a href="./missions.html" class="back-button">
            案件一覧に戻る
          </a>
        </div>
      </div>
    `;
  }

  function renderMissionDetail(mission) {
    const statusLabels = {
      'active': '対応中',
      'monitoring': '監視中',
      'completed': '収束済み',
      'failed': '失敗'
    };

    const priorityLabels = {
      'critical': '重大',
      'warning': '警戒',
      'safe': '観察'
    };

    const typeLabels = {
      'alert': '警報',
      'deployment': '出動',
      'discovery': '発見',
      'action': '行動',
      'ongoing': '進行中',
      'success': '成功',
      'completed': '完了'
    };

    const container = document.getElementById('missionDetail');

    container.innerHTML = `
      <!-- Header -->
      <div class="detail-header">
        <div class="font-mono" style="font-size: 0.875rem; color: var(--primary); margin-bottom: 0.5rem;">
          ${mission.id}
        </div>
        <div class="detail-title">${mission.title}</div>
        <div style="color: var(--muted-foreground); margin-top: 0.5rem;">
          ${mission.description}
        </div>
        <div class="detail-meta">
          <span class="meta-badge status-${mission.status}">
            ${statusLabels[mission.status]}
          </span>
          <span class="meta-badge priority-${mission.priority}">
            ${priorityLabels[mission.priority]}
          </span>
          <span class="meta-badge" style="background: rgba(0, 0, 0, 0.3); border-color: var(--primary); color: var(--primary);">
            GSI: ${mission.gsi}%
          </span>
          <span class="meta-badge" style="background: rgba(0, 0, 0, 0.3); border-color: var(--muted-foreground); color: var(--muted-foreground);">
            LEVEL ${mission.securityLevel}
          </span>
        </div>
      </div>

      <!-- Info Grid -->
      <div class="detail-grid">
        <!-- Location Info -->
        <div class="detail-card">
          <div class="card-title">発生場所</div>
          <div class="info-row">
            <span class="info-label">場所</span>
            <span class="info-value">${mission.location}</span>
          </div>
          <div class="info-row">
            <span class="info-label">座標</span>
            <span class="info-value">${mission.coordinates}</span>
          </div>
        </div>

        <!-- Time Info -->
        <div class="detail-card">
          <div class="card-title">時間情報</div>
          <div class="info-row">
            <span class="info-label">開始日時</span>
            <span class="info-value">${new Date(mission.startDate).toLocaleString('ja-JP')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">終了日時</span>
            <span class="info-value">${mission.endDate ? new Date(mission.endDate).toLocaleString('ja-JP') : '継続中'}</span>
          </div>
          ${mission.endDate ? `
          <div class="info-row">
            <span class="info-label">所要時間</span>
            <span class="info-value">${calculateDuration(mission.startDate, mission.endDate)}</span>
          </div>
          ` : ''}
        </div>

        <!-- Entity Info -->
        <div class="detail-card">
          <div class="card-title">実体情報</div>
          <div class="info-row">
            <span class="info-label">確認実体</span>
            <span class="info-value">${mission.entity}</span>
          </div>
          <div class="info-row">
            <span class="info-label">GSI値</span>
            <span class="info-value" style="color: var(--primary);">${mission.gsi}%</span>
          </div>
        </div>

        <!-- Personnel Info -->
        <div class="detail-card">
          <div class="card-title">人員情報</div>
          <div class="info-row">
            <span class="info-label">担当部門</span>
            <span class="info-value">${mission.assignedDivisions.join('<br>')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">死傷者</span>
            <span class="info-value" style="color: ${mission.casualties > 0 ? 'var(--destructive)' : 'rgb(16, 185, 129)'};">
              ${mission.casualties}名
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">避難者</span>
            <span class="info-value">${mission.civilianEvacuation}名</span>
          </div>
        </div>
      </div>

      <!-- Modules Used -->
      ${mission.modules.length > 0 ? `
      <div class="detail-card">
        <div class="card-title">使用モジュール</div>
        <div style="padding: 0.5rem 0;">
          ${mission.modules.map(m => `<span class="module-tag">${m}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Timeline -->
      <div class="detail-card">
        <div class="card-title">タイムライン</div>
        <div class="timeline">
          ${mission.timeline.map((item, index) => `
            <div class="timeline-item ${index === mission.timeline.length - 1 && mission.status !== 'completed' ? 'ongoing' : ''}">
              <div class="timeline-time">${new Date(item.time).toLocaleString('ja-JP')}</div>
              <div class="timeline-event">
                <span style="color: var(--primary); font-size: 0.75rem; text-transform: uppercase; margin-right: 0.5rem;">
                  [${typeLabels[item.type] || item.type}]
                </span>
                ${item.event}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Reports -->
      ${mission.reports.length > 0 ? `
      <div class="detail-card">
        <div class="card-title">現場レポート</div>
        ${mission.reports.map(report => `
          <div class="report-item">
            <div class="report-header">
              <span class="report-author">${report.author}</span>
              <span class="report-time">${new Date(report.time).toLocaleString('ja-JP')}</span>
            </div>
            <div class="report-content">${report.content}</div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- Notes -->
      ${mission.notes ? `
      <div class="detail-card">
        <div class="card-title">備考</div>
        <div style="color: var(--foreground); line-height: 1.6;">
          ${mission.notes}
        </div>
      </div>
      ` : ''}

      <!-- Result (for completed missions) -->
      ${mission.result ? `
      <div class="result-box">
        <div class="result-title">任務結果</div>
        <div class="result-content">${mission.result}</div>
      </div>
      ` : ''}
    `;
  }

  function calculateDuration(start, end) {
    const duration = new Date(end) - new Date(start);
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    } else {
      return `${minutes}分`;
    }
  }

})();
