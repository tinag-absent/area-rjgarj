// Chat functionality
(function() {
  const CURRENT_USER_KEY = 'kaishoku_current_user';
  const USERS_KEY = 'kaishoku_users';
  const MESSAGES_KEY = 'kaishoku_messages';
  
  let currentUser = null;
  let activeChat = null;
  let users = [];
  let messages = {};
  let typingTimeouts = {};

  // Initialize
  function init() {
    currentUser = getCurrentUser();
    
    if (!currentUser) {
      window.location.href = './login.html';
      return;
    }

    // Update sidebar
    const sidebarName = document.getElementById('sidebarUserName');
    const sidebarLevel = document.getElementById('sidebarUserLevel');
    if (sidebarName) sidebarName.textContent = currentUser.name;
    if (sidebarLevel) sidebarLevel.textContent = `LEVEL ${currentUser.level}`;

    // Load data
    loadUsers();
    loadMessages();
    renderUserList();

    // Event listeners
    document.getElementById('chatForm').addEventListener('submit', handleSendMessage);
    document.getElementById('messageInput').addEventListener('keydown', handleKeyDown);
    document.getElementById('messageInput').addEventListener('input', handleTyping);

    // Auto-scroll new messages
    setInterval(checkNewMessages, 2000);
  }

  function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  function loadUsers() {
    const usersData = localStorage.getItem(USERS_KEY);
    users = usersData ? JSON.parse(usersData) : [];
    
    // Filter out current user
    users = users.filter(u => u.id !== currentUser.id);
  }

  function loadMessages() {
    const messagesData = localStorage.getItem(MESSAGES_KEY);
    messages = messagesData ? JSON.parse(messagesData) : {};
  }

  function saveMessages() {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }

  function getChatId(userId1, userId2) {
    return [userId1, userId2].sort().join('_');
  }

  function renderUserList() {
    const userList = document.getElementById('userList');
    const onlineCount = document.getElementById('onlineCount');
    
    if (users.length === 0) {
      userList.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--muted-foreground);">
          <p class="font-mono" style="font-size: 0.875rem;">他の機関員が登録されていません</p>
        </div>
      `;
      onlineCount.textContent = '0';
      return;
    }

    onlineCount.textContent = users.length;

    const divisionNames = {
      'convergence': '収束部門',
      'support': '支援部門',
      'engineering': '工作部門',
      'foreign': '外事部門',
      'port': '港湾部門'
    };

    userList.innerHTML = users.map(user => {
      const chatId = getChatId(currentUser.id, user.id);
      const userMessages = messages[chatId] || [];
      const hasUnread = userMessages.some(m => m.senderId === user.id && !m.read);
      const lastMessage = userMessages[userMessages.length - 1];
      
      return `
        <div class="chat-user-item ${activeChat === user.id ? 'active' : ''} ${hasUnread ? 'unread' : ''}" 
             data-user-id="${user.id}"
             onclick="window.chatApp.selectUser('${user.id}')">
          <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;">
            <div style="width: 2rem; height: 2rem; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-weight: 600; font-size: 0.75rem; color: white;">
              ${user.name.charAt(0)}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; color: white; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${user.name}
              </div>
              <div class="font-mono" style="font-size: 0.7rem; color: var(--muted-foreground);">
                ${user.id}
              </div>
            </div>
          </div>
          <div style="font-size: 0.75rem; color: var(--muted-foreground); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${divisionNames[user.division] || user.division}
          </div>
          ${lastMessage ? `
            <div style="font-size: 0.7rem; color: var(--muted-foreground); margin-top: 0.25rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${lastMessage.senderId === currentUser.id ? '自分: ' : ''}${lastMessage.text.substring(0, 30)}${lastMessage.text.length > 30 ? '...' : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  function selectUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    activeChat = userId;
    
    // Mark messages as read
    const chatId = getChatId(currentUser.id, userId);
    if (messages[chatId]) {
      messages[chatId].forEach(m => {
        if (m.senderId === userId) {
          m.read = true;
        }
      });
      saveMessages();
    }

    // Update UI
    renderUserList();
    updateChatHeader(user);
    renderMessages(userId);
    
    // Enable input
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendButton').disabled = false;
    document.getElementById('messageInput').focus();
  }

  function updateChatHeader(user) {
    const divisionNames = {
      'convergence': '収束部門',
      'support': '支援部門',
      'engineering': '工作部門',
      'foreign': '外事部門',
      'port': '港湾部門'
    };

    document.getElementById('chatHeaderContent').innerHTML = `
      <div class="flex items-center gap-3">
        <div style="width: 2.5rem; height: 2.5rem; border-radius: 50%; background: linear-gradient(135deg, var(--primary), var(--accent)); display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: white;">
          ${user.name.charAt(0)}
        </div>
        <div>
          <div style="font-weight: 600; color: white; font-size: 1rem;">${user.name}</div>
          <div class="font-mono" style="font-size: 0.75rem; color: var(--muted-foreground);">
            ${user.id} • ${divisionNames[user.division] || user.division}
          </div>
        </div>
      </div>
    `;
  }

  function renderMessages(userId) {
    const chatMessages = document.getElementById('chatMessages');
    const chatId = getChatId(currentUser.id, userId);
    const chatMessages_data = messages[chatId] || [];

    if (chatMessages_data.length === 0) {
      chatMessages.innerHTML = `
        <div class="chat-empty">
          <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="opacity: 0.3;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <p class="font-mono" style="font-size: 0.875rem;">
            メッセージを送信して会話を開始しましょう
          </p>
        </div>
      `;
      return;
    }

    const user = users.find(u => u.id === userId);
    
    chatMessages.innerHTML = chatMessages_data.map(msg => {
      const isSent = msg.senderId === currentUser.id;
      const sender = isSent ? currentUser : user;
      const time = new Date(msg.timestamp).toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return `
        <div class="chat-message ${isSent ? 'sent' : ''}">
          <div class="chat-message-avatar">
            ${sender.name.charAt(0)}
          </div>
          <div class="chat-message-content">
            <div class="chat-message-header">
              <span class="chat-message-name">${sender.name}</span>
              <span class="chat-message-time">${time}</span>
            </div>
            <div class="chat-message-text">
              ${escapeHtml(msg.text)}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleSendMessage(e) {
    e.preventDefault();
    
    if (!activeChat) return;

    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) return;

    const chatId = getChatId(currentUser.id, activeChat);
    
    if (!messages[chatId]) {
      messages[chatId] = [];
    }

    const message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      text: text,
      timestamp: new Date().toISOString(),
      read: false
    };

    messages[chatId].push(message);
    saveMessages();

    input.value = '';
    renderMessages(activeChat);
    renderUserList();

    // Award XP for sending message
    if (window.ProgressSystem) {
      ProgressSystem.trackActivity('chat_message');
    }

    // Simulate response after delay (for demo purposes)
    simulateResponse(activeChat, chatId);
  }

  function simulateResponse(userId, chatId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Show typing indicator after 1 second
    setTimeout(() => {
      if (activeChat === userId) {
        showTypingIndicator(user);
      }
    }, 1000);

    // Send response after 3 seconds
    setTimeout(() => {
      const responses = [
        '了解しました。',
        'すぐに確認します。',
        'ありがとうございます。',
        '報告を受領しました。',
        'こちらでも調査を開始します。',
        'データを送信しました。',
        '次の任務の詳細を確認してください。',
        '収束モジュールの準備が完了しました。'
      ];

      const response = {
        id: Date.now().toString(),
        senderId: userId,
        text: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString(),
        read: activeChat === userId
      };

      messages[chatId].push(response);
      saveMessages();

      if (activeChat === userId) {
        hideTypingIndicator();
        renderMessages(userId);
      }
      
      renderUserList();
    }, 3000);
  }

  function showTypingIndicator(user) {
    const chatMessages = document.getElementById('chatMessages');
    const existingIndicator = document.getElementById('typing-indicator');
    
    if (existingIndicator) return;

    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'chat-message';
    indicator.innerHTML = `
      <div class="chat-message-avatar">
        ${user.name.charAt(0)}
      </div>
      <div class="chat-message-content">
        <div class="chat-message-header">
          <span class="chat-message-name">${user.name}</span>
        </div>
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    `;

    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      document.getElementById('chatForm').dispatchEvent(new Event('submit'));
    }
  }

  function handleTyping(e) {
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
  }

  function checkNewMessages() {
    if (!activeChat) return;
    
    // This would check for new messages from the server in a real app
    // For now, just re-render to update read status
    const chatId = getChatId(currentUser.id, activeChat);
    if (messages[chatId]) {
      messages[chatId].forEach(m => {
        if (m.senderId === activeChat) {
          m.read = true;
        }
      });
      saveMessages();
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Expose functions to window for onclick handlers
  window.chatApp = {
    selectUser: selectUser
  };

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
