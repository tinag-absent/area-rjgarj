// Personnel Detail Page Script
(function() {
  if (!ProgressSystem.checkPageAccess('classified.html')) {
    window.location.href = './dashboard.html';
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const personnelId = urlParams.get('id');

  if (!personnelId) {
    ModalSystem.error('機関員IDが指定されていません。', 'ERROR').then(() => {
      window.location.href = './classified.html';
    });
    return;
  }

  const personnel = window.PersonnelDatabase.getPersonnelById(personnelId);

  if (!personnel) {
    ModalSystem.error('指定された機関員が見つかりませんでした。', 'NOT FOUND').then(() => {
      window.location.href = './classified.html';
    });
    return;
  }

  renderPersonnelDetail(personnel);

  function renderPersonnelDetail(p) {
    const container = document.getElementById('personnelDetail');
    
    container.innerHTML = `
      <div class="personnel-header">
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: rgb(139, 92, 246); margin-bottom: 0.5rem; font-weight: 700;">
          LEVEL 5 CLASSIFIED - ${p.id}
        </div>
        <h1 style="font-size: 2.5rem; font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: white; margin-bottom: 0.5rem;">
          ${p.name}
        </h1>
        <p style="color: var(--muted-foreground); font-size: 1.125rem;">
          ${p.division} / ${p.rank}
        </p>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">年齢</div>
            <div class="info-value">${p.age}歳</div>
          </div>
          <div class="info-item">
            <div class="info-label">入局日</div>
            <div class="info-value">${p.joinDate}</div>
          </div>
          <div class="info-item">
            <div class="info-label">専門分野</div>
            <div class="info-value" style="font-size: 0.875rem;">${p.specialization}</div>
          </div>
        </div>
      </div>

      <div class="tab-nav">
        <button class="tab-btn active" data-tab="resume">履歴書</button>
        <button class="tab-btn" data-tab="diary">私的日記</button>
        <button class="tab-btn" data-tab="psych">心理評価</button>
      </div>

      <div class="tab-content active" id="resume">
        <div class="resume-section">
          <div class="section-title">学歴</div>
          <ul class="resume-list">
            ${p.resume.education.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>

        <div class="resume-section">
          <div class="section-title">職歴</div>
          <ul class="resume-list">
            ${p.resume.experience.map(e => `<li>${e}</li>`).join('')}
          </ul>
        </div>

        <div class="resume-section">
          <div class="section-title">主な実績</div>
          <ul class="resume-list">
            ${p.resume.achievements.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>

        <div class="resume-section">
          <div class="section-title">スキル・資格</div>
          <ul class="resume-list">
            ${p.resume.skills.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      </div>

      <div class="tab-content" id="diary">
        <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid var(--destructive); padding: 1rem; margin-bottom: 2rem; text-align: center;">
          <div style="font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: var(--destructive); margin-bottom: 0.5rem;">
            ⚠ 個人情報保護警告
          </div>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: var(--muted-foreground);">
            以下の内容は機関員の私的な日記です。閲覧には最高レベルの機密保持義務が伴います。
          </div>
        </div>

        ${p.diary.map(entry => `
          <div class="diary-entry">
            <div class="diary-date">${entry.date}</div>
            <div class="diary-text">${entry.entry}</div>
          </div>
        `).join('')}
      </div>

      <div class="tab-content" id="psych">
        <div class="psych-eval-box">
          <div class="section-title">心理評価レポート</div>
          
          <div class="info-grid" style="margin-top: 1.5rem;">
            <div class="info-item">
              <div class="info-label">最終評価日</div>
              <div class="info-value">${p.psychEval.lastEval}</div>
            </div>
            <div class="info-item">
              <div class="info-label">ステータス</div>
              <div class="info-value" style="color: ${getStatusColor(p.psychEval.status)};">
                ${p.psychEval.status}
              </div>
            </div>
          </div>

          <div style="margin-top: 2rem; padding: 1.5rem; background: rgba(0, 0, 0, 0.3); border-left: 3px solid rgb(139, 92, 246);">
            <div style="font-weight: 700; color: rgb(139, 92, 246); margin-bottom: 0.75rem;">評価コメント:</div>
            <div style="line-height: 1.6; color: var(--foreground);">${p.psychEval.notes}</div>
          </div>
        </div>
      </div>
    `;

    setupTabs();
  }

  function getStatusColor(status) {
    const colors = {
      '良好': 'rgb(16, 185, 129)',
      '軽度注意': 'rgb(245, 158, 11)',
      '注意観察': 'rgb(245, 158, 11)',
      '要注意': 'var(--destructive)'
    };
    return colors[status] || 'var(--muted-foreground)';
  }

  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.getElementById(tabId).classList.add('active');
      });
    });
  }

})();
