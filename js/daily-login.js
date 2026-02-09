/**
 * Daily Login UI Component
 * デイリーログイン機能のUIを提供
 */

class DailyLoginUI {
  constructor() {
    this.modalId = 'daily-login-modal';
    this.isShown = false;
  }

  /**
   * Format time duration
   */
  formatTime(milliseconds) {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  }

  /**
   * Show daily login modal
   */
  show(status) {
    if (this.isShown) return;
    this.isShown = true;

    // Remove existing modal if any
    const existing = document.getElementById(this.modalId);
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = this.modalId;
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease-out;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, rgba(26, 39, 56, 0.95), rgba(15, 23, 42, 0.95));
      border: 2px solid var(--primary);
      max-width: 500px;
      width: 90%;
      padding: 2rem;
      position: relative;
      box-shadow: 0 0 50px rgba(0, 255, 255, 0.3);
      animation: slideUp 0.3s ease-out;
    `;

    if (status.canClaim) {
      modal.innerHTML = this.getClaimableContent(status);
    } else if (status.alreadyClaimed) {
      modal.innerHTML = this.getAlreadyClaimedContent(status);
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add event listeners
    this.attachEventListeners(overlay, status);

    // Add animations
    this.addAnimationStyles();
  }

  /**
   * Get content for claimable reward
   */
  getClaimableContent(status) {
    const streakDay = status.streak > 0 ? ((status.streak - 1) % 7) + 1 : 1;
    const nextStreakDay = (streakDay % 7) + 1;
    const reward = ProgressSystem.DAILY_LOGIN_REWARDS[streakDay] || 25;
    const nextReward = ProgressSystem.DAILY_LOGIN_REWARDS[nextStreakDay] || 25;

    // Get level-specific message
    const user = ProgressSystem.getUserData();
    const userLevel = user ? (user.level || 0) : 0;
    let loginMessage = {
      title: 'デイリーログイン',
      description: '日々の活動が記録されています'
    };
    
    if (typeof LevelMessages !== 'undefined') {
      loginMessage = LevelMessages.getDailyLoginMessage(userLevel);
    }

    let streakMessage = '';
    if (status.streakWillBreak && status.streak > 0) {
      streakMessage = `
        <div style="padding: 0.75rem; background-color: rgba(239, 68, 68, 0.1); border-left: 3px solid rgb(239, 68, 68); margin-bottom: 1rem;">
          <div style="font-size: 0.875rem; color: rgb(239, 68, 68); font-family: 'JetBrains Mono', monospace;">
            ⚠ 連続ログインが途切れました。ストリークがリセットされます。
          </div>
        </div>
      `;
    }

    return `
      <div style="text-align: center;">
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; color: var(--primary); margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 0.1em;">
          ${loginMessage.title}
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 1.5rem;">
          ${loginMessage.description}
        </div>

        ${streakMessage}

        <div style="margin-bottom: 2rem;">
          <div style="font-size: 4rem; color: white; font-weight: 700; font-family: 'Space Grotesk', sans-serif; line-height: 1;">
            +${reward}
          </div>
          <div style="font-size: 1.125rem; color: var(--primary); font-family: 'JetBrains Mono', monospace; margin-top: 0.5rem;">
            経験値
          </div>
        </div>

        <div style="background-color: rgba(255, 255, 255, 0.05); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 0.25rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="color: var(--muted-foreground); font-size: 0.875rem;">連続ログイン</span>
            <span style="color: white; font-weight: 600; font-family: 'Space Grotesk', sans-serif;">${status.streakWillBreak ? 1 : (status.streak || 0) + 1} 日</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="color: var(--muted-foreground); font-size: 0.875rem;">累計ログイン</span>
            <span style="color: white; font-weight: 600; font-family: 'Space Grotesk', sans-serif;">${(status.totalLogins || 0) + 1} 日</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--muted-foreground); font-size: 0.875rem;">次回報酬</span>
            <span style="color: var(--primary); font-weight: 600; font-family: 'Space Grotesk', sans-serif;">+${nextReward} XP</span>
          </div>
        </div>

        ${this.getStreakProgress(status.streakWillBreak ? 0 : status.streak)}

        <button id="claim-daily-reward" style="
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.1));
          border: 2px solid var(--primary);
          color: var(--primary);
          font-family: 'Space Grotesk', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.backgroundColor='rgba(0, 255, 255, 0.3)'" onmouseout="this.style.backgroundColor='transparent'">
          報酬を受け取る
        </button>

        <button id="close-daily-modal" style="
          width: 100%;
          padding: 0.75rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--muted-foreground);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: all 0.3s;
        " onmouseover="this.style.borderColor='rgba(255, 255, 255, 0.4)'" onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.2)'">
          後で受け取る
        </button>
      </div>
    `;
  }

  /**
   * Get content for already claimed reward
   */
  getAlreadyClaimedContent(status) {
    const streakDay = ((status.streak - 1) % 7) + 1;
    const nextStreakDay = (streakDay % 7) + 1;
    const nextReward = ProgressSystem.DAILY_LOGIN_REWARDS[nextStreakDay] || 25;

    return `
      <div style="text-align: center;">
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; color: var(--primary); margin-bottom: 1.5rem; text-transform: uppercase; letter-spacing: 0.1em;">
          デイリーログイン
        </div>

        <div style="margin-bottom: 2rem;">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" style="margin: 0 auto 1rem;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <div style="font-size: 1.25rem; color: white; font-family: 'Space Grotesk', sans-serif;">
            本日のログインボーナスは<br>既に受け取り済みです
          </div>
        </div>

        <div style="background-color: rgba(255, 255, 255, 0.05); padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 0.25rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="color: var(--muted-foreground); font-size: 0.875rem;">現在のストリーク</span>
            <span style="color: white; font-weight: 600; font-family: 'Space Grotesk', sans-serif;">${status.streak} 日</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
            <span style="color: var(--muted-foreground); font-size: 0.875rem;">累計ログイン</span>
            <span style="color: white; font-weight: 600; font-family: 'Space Grotesk', sans-serif;">${status.totalLogins} 日</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--muted-foreground); font-size: 0.875rem;">次回報酬まで</span>
            <span style="color: var(--primary); font-weight: 600; font-family: 'JetBrains Mono', monospace;">${this.formatTime(status.nextRewardIn)}</span>
          </div>
        </div>

        ${this.getStreakProgress(status.streak)}

        <div style="padding: 1rem; background-color: rgba(0, 255, 255, 0.05); border: 1px solid rgba(0, 255, 255, 0.2); margin-bottom: 1rem; border-radius: 0.25rem;">
          <div style="font-size: 0.875rem; color: var(--muted-foreground); font-family: 'JetBrains Mono', monospace;">
            次回ログインで <span style="color: var(--primary); font-weight: 600;">+${nextReward} XP</span> を獲得
          </div>
        </div>

        <button id="close-daily-modal" style="
          width: 100%;
          padding: 1rem;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: var(--muted-foreground);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s;
        " onmouseover="this.style.borderColor='rgba(255, 255, 255, 0.4)'" onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.2)'">
          閉じる
        </button>
      </div>
    `;
  }

  /**
   * Get streak progress display
   */
  getStreakProgress(currentStreak) {
    const days = [1, 2, 3, 4, 5, 6, 7];
    const streakDay = ((currentStreak) % 7) || 7;

    const dayBoxes = days.map(day => {
      const reward = ProgressSystem.DAILY_LOGIN_REWARDS[day];
      const isCompleted = day < streakDay;
      const isCurrent = day === streakDay;
      const isBonus = day === 7;

      return `
        <div style="text-align: center; position: relative;">
          <div style="
            width: 50px;
            height: 50px;
            border: 2px solid ${isCompleted || isCurrent ? 'var(--primary)' : 'rgba(255, 255, 255, 0.2)'};
            background-color: ${isCompleted ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 0.5rem;
            position: relative;
            ${isCurrent ? 'box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);' : ''}
          ">
            ${isCompleted ? `
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            ` : `
              <span style="color: ${isCurrent ? 'var(--primary)' : 'var(--muted-foreground)'}; font-weight: 600; font-family: 'Space Grotesk', sans-serif;">
                ${day}
              </span>
            `}
            ${isBonus ? `
              <div style="position: absolute; top: -8px; right: -8px; background: linear-gradient(135deg, rgb(234, 179, 8), rgb(202, 138, 4)); width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 10px;">★</span>
              </div>
            ` : ''}
          </div>
          <div style="font-size: 0.75rem; color: var(--muted-foreground); font-family: 'JetBrains Mono', monospace;">
            ${reward}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 2rem;">
        <div style="font-size: 0.875rem; color: var(--muted-foreground); margin-bottom: 1rem; text-align: center; font-family: 'JetBrains Mono', monospace;">
          週間ストリーク進捗
        </div>
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.5rem;">
          ${dayBoxes}
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  attachEventListeners(overlay, status) {
    const claimButton = overlay.querySelector('#claim-daily-reward');
    const closeButton = overlay.querySelector('#close-daily-modal');

    if (claimButton) {
      claimButton.addEventListener('click', () => {
        this.claimReward();
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.close();
      });
    }

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.close();
      }
    });
  }

  /**
   * Claim daily reward
   */
  claimReward() {
    const result = ProgressSystem.checkDailyLogin();

    if (result.success) {
      // Update UI to show success
      const modal = document.getElementById(this.modalId);
      if (modal) {
        const content = modal.querySelector('div > div');
        if (content) {
          content.innerHTML = `
            <div style="text-align: center; padding: 2rem 0;">
              <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" style="margin: 0 auto 1.5rem; animation: checkPulse 0.5s ease-out;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <div style="font-size: 1.5rem; color: white; margin-bottom: 0.5rem; font-family: 'Space Grotesk', sans-serif;">
                報酬を獲得しました！
              </div>
              <div style="font-size: 1.125rem; color: var(--primary); font-family: 'JetBrains Mono', monospace;">
                +${result.reward} XP
              </div>
              ${result.leveledUp ? `
                <div style="margin-top: 1rem; padding: 1rem; background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.1)); border: 1px solid var(--primary);">
                  <div style="color: var(--primary); font-size: 0.875rem; font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.1em;">
                    レベルアップ!
                  </div>
                  <div style="color: white; font-size: 1.5rem; font-weight: 700; font-family: 'Space Grotesk', sans-serif;">
                    LEVEL ${result.newLevel}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }
      }

      // Show notifications
      if (result.leveledUp) {
        // Level up notification will be shown automatically
        setTimeout(() => {
          this.close();
          window.location.reload(); // Reload to update sidebar
        }, 2000);
      } else {
        setTimeout(() => {
          this.close();
          // Dispatch event to update UI
          window.dispatchEvent(new CustomEvent('dailyLoginClaimed', { detail: result }));
        }, 1500);
      }
    } else {
      alert(result.message);
    }
  }

  /**
   * Close modal
   */
  close() {
    const modal = document.getElementById(this.modalId);
    if (modal) {
      modal.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        modal.remove();
        this.isShown = false;
      }, 300);
    }
  }

  /**
   * Add animation styles
   */
  addAnimationStyles() {
    if (document.getElementById('daily-login-styles')) return;

    const style = document.createElement('style');
    style.id = 'daily-login-styles';
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes checkPulse {
        0% { transform: scale(0.5); opacity: 0; }
        50% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Auto-show on page load
   */
  static autoShow() {
    const status = ProgressSystem.getDailyLoginStatus();
    if (status && status.canClaim) {
      const ui = new DailyLoginUI();
      // Show after a short delay
      setTimeout(() => {
        ui.show(status);
      }, 1000);
    }
  }
}

// Make it globally accessible
window.DailyLoginUI = DailyLoginUI;

// Auto-show on page load if user is logged in
document.addEventListener('DOMContentLoaded', function() {
  const user = ProgressSystem.getUserData();
  if (user) {
    DailyLoginUI.autoShow();
  }
});
