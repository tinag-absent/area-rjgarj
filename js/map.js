// Map Page Script
(function() {
  // Check if user has access to this page
    if (!ProgressSystem.checkPageAccess('map.html')) {
    ModalSystem.warning(
      'このページにアクセスするには LEVEL 1 が必要です。',
      'ACCESS DENIED'
    ).then(() => {
      window.location.href = './dashboard.html';
    });
    return;
  }

  const mapWrapper = document.getElementById('mapWrapper');
  const popup = document.getElementById('incidentPopup');
  let activeMarker = null;

  // Update statistics
  function updateStats() {
    const stats = window.MapData.getStatistics();
    document.getElementById('totalIncidents').textContent = stats.total;
    document.getElementById('criticalCount').textContent = stats.critical;
    document.getElementById('warningCount').textContent = stats.warning;
    
    // Update last update time
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Create markers on map
  function createMarkers() {
    const incidents = window.MapData.incidents;
    
    incidents.forEach(incident => {
      const marker = document.createElement('div');
      marker.className = `incident-marker ${incident.severity}`;
      marker.style.left = `${incident.position.x}%`;
      marker.style.top = `${incident.position.y}%`;
      marker.dataset.incidentId = incident.id;
      
      const icon = document.createElement('div');
      icon.className = 'marker-icon';
      icon.innerHTML = `
        <svg width="12" height="12" fill="white" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8"/>
        </svg>
      `;
      
      marker.appendChild(icon);
      mapWrapper.appendChild(marker);
      
      // Add click event
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        showIncidentPopup(incident, marker);
      });
      
      // Add hover effect
      marker.addEventListener('mouseenter', () => {
        if (activeMarker !== marker) {
          marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
        }
      });
      
      marker.addEventListener('mouseleave', () => {
        if (activeMarker !== marker) {
          marker.style.transform = 'translate(-50%, -50%) scale(1)';
        }
      });
    });
  }

  // Show popup
  function showIncidentPopup(incident, marker) {
    activeMarker = marker;
    
    const severityLabels = {
      critical: '重大',
      warning: '警戒',
      safe: '観察'
    };

    const severityColors = {
      critical: 'var(--destructive)',
      warning: 'rgb(245, 158, 11)',
      safe: 'var(--primary)'
    };
    
    document.getElementById('popupTitle').innerHTML = `
      <span style="color: ${severityColors[incident.severity]};">[${severityLabels[incident.severity]}]</span> ${incident.name}
    `;
    
    document.getElementById('popupContent').innerHTML = `
      <div class="popup-stat">
        <span>発生場所:</span>
        <span style="color: white;">${incident.location}</span>
      </div>
      <div class="popup-stat">
        <span>状態:</span>
        <span style="color: ${severityColors[incident.severity]};">${incident.status}</span>
      </div>
      <div class="popup-stat">
        <span>GSI値:</span>
        <span style="color: var(--primary);">${incident.gsi}</span>
      </div>
      <div class="popup-stat">
        <span>実体:</span>
        <span style="color: white;">${incident.entity}</span>
      </div>
      <div class="popup-stat">
        <span>担当部門:</span>
        <span style="color: white;">${incident.assignedDivision}</span>
      </div>
      <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(255, 255, 255, 0.1);">
        <div style="color: var(--muted-foreground); font-size: 0.75rem; margin-bottom: 0.5rem;">概要:</div>
        <div style="color: white; font-size: 0.8rem; line-height: 1.5;">
          ${incident.description}
        </div>
      </div>
      <div style="margin-top: 0.5rem; font-size: 0.7rem; color: var(--muted-foreground);">
        検知時刻: ${incident.timestamp}
      </div>
    `;
    
    // Position popup
    const rect = marker.getBoundingClientRect();
    const mapRect = mapWrapper.getBoundingClientRect();
    
    let left = rect.left - mapRect.left + rect.width / 2;
    let top = rect.top - mapRect.top - 10;
    
    // Adjust if popup goes off screen
    if (left + 350 > mapRect.width) {
      left = left - 350;
    }
    
    if (top < 0) {
      top = rect.bottom - mapRect.top + 10;
    }
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
    popup.classList.add('active');
  }

  // Hide popup
  function hidePopup() {
    popup.classList.remove('active');
    activeMarker = null;
  }

  // Create incident list
  function createIncidentList() {
    const list = document.getElementById('incidentList');
    const incidents = window.MapData.incidents;
    
    const severityOrder = { critical: 0, warning: 1, safe: 2 };
    const sorted = [...incidents].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    
    list.innerHTML = sorted.map(incident => {
      const severityLabels = {
        critical: '重大',
        warning: '警戒',
        safe: '観察'
      };

      const severityColors = {
        critical: 'var(--destructive)',
        warning: 'rgb(245, 158, 11)',
        safe: 'var(--primary)'
      };
      
      return `
        <div class="incident-card ${incident.severity}" data-incident-id="${incident.id}">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
            <div>
              <div style="font-weight: 600; color: white; margin-bottom: 0.25rem;">${incident.name}</div>
              <div class="font-mono" style="font-size: 0.7rem; color: var(--muted-foreground);">${incident.id}</div>
            </div>
            <div class="badge" style="background: ${severityColors[incident.severity]}; color: white; border: none; font-size: 0.65rem; padding: 0.25rem 0.5rem;">
              ${severityLabels[incident.severity]}
            </div>
          </div>
          <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 0.75rem;">
            ${incident.description}
          </div>
          <div style="display: flex; gap: 1rem; font-size: 0.75rem; font-family: 'JetBrains Mono', monospace;">
            <div>
              <span style="color: var(--muted-foreground);">場所:</span>
              <span style="color: white;">${incident.location}</span>
            </div>
            <div>
              <span style="color: var(--muted-foreground);">GSI:</span>
              <span style="color: var(--primary);">${incident.gsi}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click events to cards
    document.querySelectorAll('.incident-card').forEach(card => {
      card.addEventListener('click', function() {
        const incidentId = this.dataset.incidentId;
        const incident = window.MapData.getIncidentById(incidentId);
        const marker = document.querySelector(`[data-incident-id="${incidentId}"]`);
        
        if (marker && incident) {
          // Scroll map into view
          mapWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Show popup after scroll
          setTimeout(() => {
            showIncidentPopup(incident, marker);
            marker.style.transform = 'translate(-50%, -50%) scale(1.3)';
            setTimeout(() => {
              marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
            }, 300);
          }, 500);
        }
      });
    });
  }

  // Close popup when clicking outside
  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && !e.target.closest('.incident-marker')) {
      hidePopup();
    }
  });

  // Initialize
  updateStats();
  createMarkers();
  createIncidentList();

  // Update stats every 30 seconds
  setInterval(updateStats, 30000);

})();
