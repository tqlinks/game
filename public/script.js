// script.js (Logic Client)

// Khai báo biến
let userToken = localStorage.getItem('caroToken'); // Lưu Token cục bộ
let myUsername = null; 

// DOM Elements MỚI
const authContainer = document.getElementById('auth-container');
const lobbyContainer = document.getElementById('lobby-container');
const authUsernameInput = document.getElementById('auth-username');
const authPasswordInput = document.getElementById('auth-password');
const loginButton = document.getElementById('login-button');
const signupButton = document.getElementById('signup-button');
const authMessage = document.getElementById('auth-message');
const loggedInUserDisplay = document.getElementById('logged-in-user');
const logoutButton = document.getElementById('logout-button');

// ... (Các phần tử game cũ giữ nguyên) ...

// Hàm chuyển đổi trạng thái giao diện
const updateUI = (state) => {
    authContainer.style.display = 'none';
    lobbyContainer.style.display = 'none';
    gameContainer.style.display = 'none';

    if (state === 'AUTH') {
        authContainer.style.display = 'block';
        authMessage.textContent = '';
    } else if (state === 'LOBBY') {
        lobbyContainer.style.display = 'block';
        loggedInUserDisplay.textContent = `Chào mừng, ${myUsername}!`;
        lobbyMessage.textContent = '';
    } else if (state === 'GAME') {
        gameContainer.style.display = 'flex';
    }
};

// ------------------
// 1. LOGIC XÁC THỰC (AUTH)
// ------------------

// Chạy kiểm tra Token khi kết nối
socket.on('connect', () => {
    if (userToken) {
        socket.emit('authenticate', userToken);
    } else {
        updateUI('AUTH'); // Mở màn hình đăng nhập nếu không có token
    }
});

// Xử lý đăng nhập/đăng ký
const handleAuth = (type) => {
    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();

    if (!username || !password) {
        authMessage.textContent = 'Vui lòng điền đủ tên và mật khẩu.';
        return;
    }

    authMessage.textContent = type === 'login' ? 'Đang đăng nhập...' : 'Đang đăng ký...';
    
    socket.emit(type, { username, password });
};

loginButton.addEventListener('click', () => handleAuth('login'));
signupButton.addEventListener('click', () => handleAuth('signup'));

// Nhận phản hồi xác thực từ Server
socket.on('authSuccess', ({ username, token }) => {
    userToken = token;
    myUsername = username;
    localStorage.setItem('caroToken', token);
    updateUI('LOBBY'); // Chuyển sang màn hình Lobby
});

socket.on('authError', (message) => {
    authMessage.textContent = message;
    userToken = null; // Xóa token nếu bị lỗi xác thực
    localStorage.removeItem('caroToken');
    updateUI('AUTH');
});

// Xử lý Đăng Xuất
logoutButton.addEventListener('click', () => {
    userToken = null;
    myUsername = null;
    localStorage.removeItem('caroToken');
    // Cần reload trang hoặc chuyển hẳn về trạng thái AUTH
    location.reload(); 
});

// ------------------
// 2. LOGIC PHÒNG CHỜ VÀ GAME
// ------------------

joinButton.addEventListener('click', () => {
    const roomId = roomInput.value.trim();
    if (!roomId) {
        lobbyMessage.textContent = 'Vui lòng nhập tên phòng.';
        return;
    }
    
    lobbyMessage.textContent = 'Đang tham gia...';
    // Gửi token và room ID lên Server
    socket.emit('joinGame', { roomId, token: userToken });
});

socket.on('joinSuccess', (data) => {
    currentRoomId = data.roomId;
    updateUI('GAME'); // Chuyển sang màn hình Game
    // ... Cập nhật player info và status như logic cũ ...
});

socket.on('lobbyError', (message) => {
    lobbyMessage.textContent = message;
});

// ... (các hàm xử lý game makeMove, updateBoard, resetGame giữ nguyên logic) ...
// Cần đảm bảo hàm makeMove gửi token lên server để server xác minh
const handleCellClick = (event) => {
    // ...
    socket.emit('makeMove', { 
        index: clickedCellIndex, 
        role: myRole, 
        roomId: currentRoomId,
        token: userToken // Gửi token lên server
    });
};
