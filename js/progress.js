// Progress and Level System
const ProgressSystem = (function() {
  const CURRENT_USER_KEY = 'kaishoku_current_user';
  const USERS_KEY = 'kaishoku_users';
  
  // Experience points required for each level
  const LEVEL_THRESHOLDS = {
    0: 0,
    1: 100,
    2: 250,
    3: 500,
    4: 1000,
    5: 2000
  };

  // Pages that unlock at each level
  const LEVEL_UNLOCKS = {
    0: ['index.html', 'login.html', 'dashboard.html'],
    1: ['divisions.html', 'chat.html'],
    2: ['division-convergence.html', 'division-support.html', 'division-engineering.html', 'division-foreign.html', 'division-port.html'],
    3: ['phenomenon.html'],
    4: ['missions.html'],
    5: ['classified.html']
  };

  // Activities that give XP
  const XP_REWARDS = {
    'first_login': 50,
    'profile_view': 10,
    'chat_message': 5,
    'division_view': 20,
    'phenomenon_view': 30,
    'mission_complete': 100,
    'daily_login': 25
  };

  // Daily login rewards (base XP + streak bonus)
  const DAILY_LOGIN_REWARDS = {
    1: 25,   // Day 1
    2: 30,   // Day 2
    3: 35,   // Day 3
    4: 40,   // Day 4
    5: 45,   // Day 5
    6: 50,   // Day 6
    7: 100   // Day 7 (weekly bonus)
  };

  function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }

  function getUsers() {
    const users = localStorage.getItem(USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  /**
   * Simple hash function for data integrity check
   */
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generate checksum for login data
   */
  function generateChecksum(timestamp, streak, userId) {
    const data = `${timestamp}:${streak}:${userId}:kaishoku_secret_salt`;
    return simpleHash(data);
  }

  /**
   * Validate daily login data integrity
   */
  function validateLoginData(loginData, userId) {
    if (!loginData || !loginData.lastLogin || !loginData.checksum) {
      return false;
    }

    // Verify checksum
    const expectedChecksum = generateChecksum(
      loginData.lastLogin,
      loginData.streak || 0,
      userId
    );

    if (loginData.checksum !== expectedChecksum) {
      console.warn('Login data integrity check failed');
      return false;
    }

    // Check if timestamp is not in the future (with 5 min tolerance)
    const now = Date.now();
    if (loginData.lastLogin > now + 300000) {
      console.warn('Login timestamp is in the future');
      return false;
    }

    // Check if timestamp is reasonable (not too far in past)
    const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);
    if (loginData.lastLogin < oneYearAgo) {
      console.warn('Login timestamp is too old');
      return false;
    }

    return true;
  }

  /**
   * Get days between two dates
   */
  function getDaysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Set to start of day for accurate comparison
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    return Math.round((d2 - d1) / oneDay);
  }

  /**
   * Check and process daily login
   */
  function checkDailyLogin() {
    const user = getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: 'ログインが必要です'
      };
    }

    // Initialize or get login data
    if (!user.dailyLogin) {
      user.dailyLogin = {
        lastLogin: 0,
        streak: 0,
        totalLogins: 0,
        checksum: ''
      };
    }

    const loginData = user.dailyLogin;
    const now = Date.now();

    // Validate existing login data
    if (loginData.lastLogin > 0 && !validateLoginData(loginData, user.id)) {
      // Data corruption detected - reset but keep total count
      console.error('Daily login data corrupted, resetting streak');
      const totalLogins = loginData.totalLogins || 0;
      user.dailyLogin = {
        lastLogin: 0,
        streak: 0,
        totalLogins: totalLogins,
        checksum: ''
      };
      loginData.lastLogin = 0;
      loginData.streak = 0;
    }

    // Check if already logged in today
    if (loginData.lastLogin > 0) {
      const daysSinceLastLogin = getDaysBetween(loginData.lastLogin, now);
      
      if (daysSinceLastLogin === 0) {
        // Already logged in today
        return {
          success: false,
          alreadyClaimed: true,
          streak: loginData.streak,
          nextRewardIn: getTimeUntilNextDay(),
          message: '本日のログインボーナスは既に受け取り済みです'
        };
      } else if (daysSinceLastLogin === 1) {
        // Consecutive day - increment streak
        loginData.streak = (loginData.streak || 0) + 1;
      } else if (daysSinceLastLogin > 1) {
        // Streak broken - reset to 1
        loginData.streak = 1;
      } else {
        // daysSinceLastLogin < 0 means time went backwards (clock manipulation)
        console.error('Time manipulation detected');
        return {
          success: false,
          message: 'システムエラー: 時刻の不整合が検出されました'
        };
      }
    } else {
      // First login ever
      loginData.streak = 1;
    }

    // Update login data
    loginData.lastLogin = now;
    loginData.totalLogins = (loginData.totalLogins || 0) + 1;
    
    // Generate new checksum
    loginData.checksum = generateChecksum(loginData.lastLogin, loginData.streak, user.id);

    // Calculate reward
    const streakDay = ((loginData.streak - 1) % 7) + 1; // 1-7
    const reward = DAILY_LOGIN_REWARDS[streakDay] || DAILY_LOGIN_REWARDS[1];

    // Add XP
    user.xp = (user.xp || 0) + reward;

    // Check for level up
    const oldLevel = user.level || 0;
    const newLevel = calculateLevel(user.xp);
    let leveledUp = false;

    if (newLevel > oldLevel) {
      user.level = newLevel;
      leveledUp = true;
    }

    // Save user data
    updateUserInStorage(user);

    return {
      success: true,
      reward: reward,
      streak: loginData.streak,
      totalLogins: loginData.totalLogins,
      nextRewardIn: getTimeUntilNextDay(),
      leveledUp: leveledUp,
      oldLevel: oldLevel,
      newLevel: newLevel,
      message: `デイリーログインボーナス: +${reward} XP`
    };
  }

  /**
   * Get time until next day (in milliseconds)
   */
  function getTimeUntilNextDay() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow - now;
  }

  /**
   * Get daily login status without claiming
   */
  function getDailyLoginStatus() {
    const user = getCurrentUser();
    if (!user) {
      return null;
    }

    const loginData = user.dailyLogin || {
      lastLogin: 0,
      streak: 0,
      totalLogins: 0
    };

    // Validate data
    if (loginData.lastLogin > 0 && !validateLoginData(loginData, user.id)) {
      return {
        canClaim: true,
        streak: 0,
        totalLogins: loginData.totalLogins || 0,
        corrupted: true
      };
    }

    const now = Date.now();
    const daysSinceLastLogin = loginData.lastLogin > 0 ? 
      getDaysBetween(loginData.lastLogin, now) : 999;

    const canClaim = daysSinceLastLogin !== 0;
    const streakWillBreak = daysSinceLastLogin > 1;

    return {
      canClaim: canClaim,
      streak: loginData.streak || 0,
      totalLogins: loginData.totalLogins || 0,
      lastLogin: loginData.lastLogin,
      nextRewardIn: canClaim ? 0 : getTimeUntilNextDay(),
      streakWillBreak: streakWillBreak,
      daysSinceLastLogin: daysSinceLastLogin
    };
  }

  function updateUserInStorage(updatedUser) {
    // Update in users list
    const users = getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      saveUsers(users);
    }
    
    // Update current user
    setCurrentUser(updatedUser);
  }

  function addExperience(activity) {
    const user = getCurrentUser();
    if (!user) return null;

    const xpGained = XP_REWARDS[activity] || 0;
    if (xpGained === 0) return user;

    // Initialize XP if not exists
    if (typeof user.xp === 'undefined') {
      user.xp = 0;
    }

    user.xp += xpGained;

    // Check for level up
    const oldLevel = user.level || 0;
    const newLevel = calculateLevel(user.xp);

    if (newLevel > oldLevel) {
      user.level = newLevel;
      updateUserInStorage(user);
      return {
        user: user,
        leveledUp: true,
        oldLevel: oldLevel,
        newLevel: newLevel,
        xpGained: xpGained
      };
    }

    updateUserInStorage(user);
    return {
      user: user,
      leveledUp: false,
      xpGained: xpGained
    };
  }

  function calculateLevel(xp) {
    let level = 0;
    for (let l = 5; l >= 0; l--) {
      if (xp >= LEVEL_THRESHOLDS[l]) {
        level = l;
        break;
      }
    }
    return level;
  }

  function getUnlockedPages(level) {
    const unlocked = [];
    for (let l = 0; l <= level; l++) {
      if (LEVEL_UNLOCKS[l]) {
        unlocked.push(...LEVEL_UNLOCKS[l]);
      }
    }
    return unlocked;
  }

  function isPageUnlocked(pageName, userLevel) {
    if (typeof userLevel === 'undefined') userLevel = 0;
    const unlockedPages = getUnlockedPages(userLevel);
    return unlockedPages.includes(pageName);
  }

  function getNextLevelInfo(user) {
    const currentLevel = user.level || 0;
    const currentXP = user.xp || 0;
    const nextLevel = currentLevel + 1;
    
    if (nextLevel > 5) {
      return {
        isMaxLevel: true,
        currentXP: currentXP,
        maxXP: LEVEL_THRESHOLDS[5]
      };
    }

    const nextLevelXP = LEVEL_THRESHOLDS[nextLevel];
    const currentLevelXP = LEVEL_THRESHOLDS[currentLevel];
    const xpNeeded = nextLevelXP - currentXP;
    const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

    return {
      isMaxLevel: false,
      currentLevel: currentLevel,
      nextLevel: nextLevel,
      currentXP: currentXP,
      currentLevelXP: currentLevelXP,
      nextLevelXP: nextLevelXP,
      xpNeeded: xpNeeded,
      progress: Math.max(0, Math.min(100, progress))
    };
  }

  function showLevelUpNotification(oldLevel, newLevel) {
    // LevelMessagesが利用可能な場合、詳細メッセージを使用
    let levelUpInfo = null;
    if (typeof LevelMessages !== 'undefined') {
      levelUpInfo = LevelMessages.getLevelUpMessage(newLevel);
    }

    const notification = document.createElement('div');
    notification.id = 'levelup-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 255, 255, 0.1));
      border: 2px solid var(--primary);
      padding: 2rem 3rem;
      z-index: 10000;
      text-align: center;
      animation: levelUpPulse 0.5s ease-in-out;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 50px rgba(0, 255, 255, 0.5);
      max-width: 500px;
    `;

    if (levelUpInfo) {
      notification.innerHTML = `
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 0.5rem;">
          LEVEL UP
        </div>
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 2.5rem; font-weight: 700; color: white; margin-bottom: 1rem;">
          ${levelUpInfo.title}
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--muted-foreground); line-height: 1.75; margin-bottom: 1rem;">
          ${levelUpInfo.message}
        </div>
        <div style="padding: 1rem; background-color: rgba(0, 255, 255, 0.1); border-left: 3px solid var(--primary); text-align: left;">
          <div style="font-size: 0.75rem; color: var(--primary); margin-bottom: 0.5rem; font-family: 'Space Grotesk', sans-serif; text-transform: uppercase; letter-spacing: 0.1em;">
            新規アンロック
          </div>
          <div style="font-size: 0.875rem; color: white; font-family: 'JetBrains Mono', monospace;">
            ${levelUpInfo.unlocked}
          </div>
        </div>
      `;
    } else {
      notification.innerHTML = `
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 1rem; color: var(--primary); text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 0.5rem;">
          LEVEL UP
        </div>
        <div style="font-family: 'Space Grotesk', sans-serif; font-size: 3rem; font-weight: 700; color: white; margin-bottom: 1rem;">
          LEVEL ${newLevel}
        </div>
        <div style="font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; color: var(--muted-foreground);">
          新しいコンテンツがアンロックされました
        </div>
      `;
    }

    // Add animation keyframes
    if (!document.getElementById('levelup-styles')) {
      const style = document.createElement('style');
      style.id = 'levelup-styles';
      style.textContent = `
        @keyframes levelUpPulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
          50% { transform: translate(-50%, -50%) scale(1.05); }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  function showXPGainNotification(xp) {
    const notification = document.createElement('div');
    notification.className = 'xp-gain-notification';
    notification.style.cssText = `
      position: fixed;
      top: 6rem;
      right: 2rem;
      background-color: rgba(0, 255, 255, 0.1);
      border: 1px solid var(--primary);
      padding: 0.75rem 1.5rem;
      z-index: 9999;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--primary);
      animation: slideInRight 0.3s ease-out, fadeOut 0.3s ease-in 2.7s;
      pointer-events: none;
    `;

    notification.textContent = `+${xp} XP`;

    // Add animation keyframes
    if (!document.getElementById('xp-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'xp-notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 3000);
  }

  function trackActivity(activity) {
    const result = addExperience(activity);
    
    if (!result) return;

    if (result.leveledUp) {
      showLevelUpNotification(result.oldLevel, result.newLevel);
    } else if (result.xpGained > 0) {
      showXPGainNotification(result.xpGained);
    }

    // Dispatch event for other components to listen to
    window.dispatchEvent(new CustomEvent('userProgressUpdated', { 
      detail: result 
    }));
  }

  function checkPageAccess(pageName) {
    const user = getCurrentUser();
    if (!user) {
      // Not logged in - allow access to public pages
      const publicPages = ['index.html', 'login.html'];
      return publicPages.includes(pageName);
    }

    return isPageUnlocked(pageName, user.level);
  }

  function getLockedPages(userLevel) {
    const allPages = [];
    Object.values(LEVEL_UNLOCKS).forEach(pages => {
      allPages.push(...pages);
    });
    
    const unlockedPages = getUnlockedPages(userLevel);
    return allPages.filter(page => !unlockedPages.includes(page));
  }

  // Public API
  return {
    addExperience,
    trackActivity,
    getNextLevelInfo,
    isPageUnlocked,
    checkPageAccess,
    getUnlockedPages,
    getLockedPages,
    getUserData: getCurrentUser,
    checkDailyLogin,
    getDailyLoginStatus,
    LEVEL_UNLOCKS,
    XP_REWARDS,
    DAILY_LOGIN_REWARDS
  };
})();

// Make it globally accessible
window.ProgressSystem = ProgressSystem;
