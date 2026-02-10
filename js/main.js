// Main JavaScript
// モバイルメニューはsidebar.jsで処理されます

document.addEventListener('DOMContentLoaded', function() {
  // Update sidebar with logged in user info
  // この処理はsidebar.jsで行われるため、ここでは不要
  // updateSidebarUserInfo();
});

// Auth utility functions
const AUTH_UTILS = {
  CURRENT_USER_KEY: 'kaishoku_current_user',
  
  getCurrentUser: function() {
    const user = localStorage.getItem(this.CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  
  isLoggedIn: function() {
    return this.getCurrentUser() !== null;
  },
  
  logout: function() {
    localStorage.removeItem(this.CURRENT_USER_KEY);
    window.location.href = './login.html';
  }
};

// Terminal Logs Animation (for home page)
function initTerminalLogs() {
  const logContainer = document.getElementById('terminal-logs');
  if (!logContainer) return;

  const logs = [];
  const maxLogs = 6;

  function generateHex() {
    return Math.random().toString(16).substr(2, 8).toUpperCase();
  }

  function addLog() {
    const now = new Date();
    const time = now.toTimeString().split(' ')[0];
    const amp = Math.floor(Math.random() * 100);
    const log = `[LOG ${time}] SIG: ${generateHex()} // AMP: ${amp}%`;
    
    logs.unshift(log);
    if (logs.length > maxLogs) {
      logs.pop();
    }

    renderLogs();
  }

  function renderLogs() {
    logContainer.innerHTML = logs.map(log => 
      `<div class="terminal-log">${log}</div>`
    ).join('');
  }

  // Initial logs
  addLog();
  addLog();

  // Add new log every 2 seconds
  setInterval(addLog, 2000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initTerminalLogs);

// Glitch Text Animation
function initGlitchEffect() {
  const glitchElements = document.querySelectorAll('.glitch-text');
  glitchElements.forEach(element => {
    const text = element.textContent;
    element.setAttribute('data-text', text);
  });
}

document.addEventListener('DOMContentLoaded', initGlitchEffect);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  });
});

// Page transition animation
window.addEventListener('load', function() {
  document.body.classList.add('animate-fadeIn');
});
