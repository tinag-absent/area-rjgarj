// Modal System
const ModalSystem = (function() {
  let modalContainer = null;

  function createModalContainer() {
    if (modalContainer) return modalContainer;

    modalContainer = document.createElement('div');
    modalContainer.id = 'modal-system';
    modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 10000;
      display: none;
      align-items: center;
      justify-content: center;
      background-color: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      animation: fadeIn 0.3s ease-out;
    `;

    document.body.appendChild(modalContainer);
    return modalContainer;
  }

  function createModal(options) {
    const {
      title = 'SYSTEM MESSAGE',
      message = '',
      type = 'info', // 'info', 'warning', 'error', 'success', 'confirm'
      confirmText = '了解',
      cancelText = 'キャンセル',
      onConfirm = null,
      onCancel = null,
      closeOnOverlay = false
    } = options;

    const container = createModalContainer();

    // Determine colors based on type
    let borderColor, iconColor, icon;
    switch(type) {
      case 'error':
      case 'warning':
        borderColor = 'var(--destructive)';
        iconColor = 'var(--destructive)';
        icon = `
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        `;
        break;
      case 'success':
        borderColor = 'rgb(16, 185, 129)';
        iconColor = 'rgb(16, 185, 129)';
        icon = `
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        `;
        break;
      case 'confirm':
        borderColor = 'var(--primary)';
        iconColor = 'var(--primary)';
        icon = `
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        `;
        break;
      default: // info
        borderColor = 'var(--primary)';
        iconColor = 'var(--primary)';
        icon = `
          <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        `;
    }

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, rgba(26, 39, 56, 0.95), rgba(15, 23, 42, 0.95));
      border: 2px solid ${borderColor};
      max-width: 500px;
      width: 90%;
      padding: 0;
      box-shadow: 0 0 50px rgba(0, 255, 255, 0.3);
      animation: modalSlideIn 0.3s ease-out;
      font-family: 'Inter', sans-serif;
    `;

    const showCancel = type === 'confirm';

    modal.innerHTML = `
      <div style="
        padding: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.3);
      ">
        <div style="
          font-family: 'Space Grotesk', sans-serif;
          font-size: 0.875rem;
          color: ${iconColor};
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-weight: 600;
        ">
          ${title}
        </div>
      </div>
      
      <div style="padding: 2rem 1.5rem; text-align: center;">
        <div style="color: ${iconColor}; margin-bottom: 1rem; display: flex; justify-content: center;">
          ${icon}
        </div>
        <div style="
          color: var(--foreground);
          font-size: 1rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        ">
          ${message}
        </div>
      </div>

      <div style="
        padding: 1rem 1.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
      ">
        ${showCancel ? `
          <button class="modal-btn modal-btn-cancel" style="
            padding: 0.75rem 1.5rem;
            background-color: transparent;
            color: var(--muted-foreground);
            border: 1px solid rgba(255, 255, 255, 0.2);
            cursor: pointer;
            font-family: 'JetBrains Mono', monospace;
            font-weight: 600;
            transition: all 0.3s;
            text-transform: uppercase;
            font-size: 0.875rem;
            letter-spacing: 0.05em;
          ">
            ${cancelText}
          </button>
        ` : ''}
        <button class="modal-btn modal-btn-confirm" style="
          padding: 0.75rem 1.5rem;
          background-color: ${borderColor};
          color: white;
          border: 1px solid ${borderColor};
          cursor: pointer;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 600;
          transition: all 0.3s;
          text-transform: uppercase;
          font-size: 0.875rem;
          letter-spacing: 0.05em;
        ">
          ${confirmText}
        </button>
      </div>
    `;

    // Add hover effects
    const buttons = modal.querySelectorAll('.modal-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', function() {
        if (this.classList.contains('modal-btn-cancel')) {
          this.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          this.style.color = 'white';
        } else {
          this.style.opacity = '0.8';
        }
      });
      btn.addEventListener('mouseleave', function() {
        if (this.classList.contains('modal-btn-cancel')) {
          this.style.backgroundColor = 'transparent';
          this.style.color = 'var(--muted-foreground)';
        } else {
          this.style.opacity = '1';
        }
      });
    });

    container.innerHTML = '';
    container.appendChild(modal);

    // Event handlers
    const confirmBtn = modal.querySelector('.modal-btn-confirm');
    const cancelBtn = modal.querySelector('.modal-btn-cancel');

    confirmBtn.addEventListener('click', () => {
      closeModal();
      if (onConfirm) onConfirm();
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        closeModal();
        if (onCancel) onCancel();
      });
    }

    // Close on overlay click
    if (closeOnOverlay) {
  container.addEventListener('click', (e) => {
    if (e.target === container) {
      closeModal();
      if (onCancel) onCancel();
    }
  });
}
    // Add animations
    if (!document.getElementById('modal-animations')) {
      const style = document.createElement('style');
      style.id = 'modal-animations';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Show modal
    container.style.display = 'flex';

    return modal;
  }

  function closeModal() {
    if (modalContainer) {
      modalContainer.style.display = 'none';
      modalContainer.innerHTML = '';
    }
  }

  // Convenience methods
  function alert(message, title = 'SYSTEM MESSAGE') {
    return new Promise(resolve => {
      createModal({
        title,
        message,
        type: 'info',
        confirmText: '了解',
        onConfirm: resolve
      });
    });
  }

  function confirm(message, title = 'CONFIRMATION REQUIRED') {
    return new Promise((resolve) => {
      createModal({
        title,
        message,
        type: 'confirm',
        confirmText: '確認',
        cancelText: 'キャンセル',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  function error(message, title = 'ERROR') {
    return new Promise(resolve => {
      createModal({
        title,
        message,
        type: 'error',
        confirmText: '了解',
        onConfirm: resolve
      });
    });
  }

  function warning(message, title = 'WARNING') {
    return new Promise(resolve => {
      createModal({
        title,
        message,
        type: 'warning',
        confirmText: '了解',
        onConfirm: resolve
      });
    });
  }

  function success(message, title = 'SUCCESS') {
    return new Promise(resolve => {
      createModal({
        title,
        message,
        type: 'success',
        confirmText: '了解',
        onConfirm: resolve
      });
    });
  }

  // Public API
  return {
    alert,
    confirm,
    error,
    warning,
    success,
    close: closeModal
  };
})();

// Make it globally accessible
window.ModalSystem = ModalSystem;

// Override native alert/confirm (optional)
window.customAlert = ModalSystem.alert;
window.customConfirm = ModalSystem.confirm;
