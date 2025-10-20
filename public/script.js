// script.js

const socket = io(); 

// Định nghĩa các phần tử DOM MỚI
const lobby = document.getElementById('lobby');
const gameContainer = document.getElementById('game-container');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const joinButton = document.getElementById('join-button');
const lobbyMessage = document.getElementById('lobby-message');

// Định nghĩa các phần tử DOM GAME CŨ
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const playerInfoDisplay = document.getElementById('player-info');
const resetButton = document.getElementById('reset-button');

let myRole = null; 
let currentRoomId = null;
let myUsername = null;

// Xử lý sự kiện khi nhấn nút Tham Gia
joinButton.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomId = roomInput.value.trim();

    if (!username || !roomId) {
        lobbyMessage.textContent = 'Vui lòng nhập tên và tên phòng.';
        return;
    }

    myUsername = username;
    currentRoomId = roomId;
    lobbyMessage.textContent = 'Đang tham gia...';
    
    // Gửi tên người dùng và tên phòng lên Server
    socket.emit('joinGame', { username, roomId });
});

// ------------------
// 1. Logic Kết nối và Phòng Chờ
// ------------------

socket.on('connect', () => {
    playerInfoDisplay.textContent = 'Đang chờ bạn tham gia phòng...';
});

// NHẬN VAI TRÒ TỪ SERVER (THÀNH CÔNG)
socket.on('playerRole', ({ role, playerX, playerO }) => {
    myRole = role;
    
    // Ẩn Lobby, hiện Game
    lobby.style.display = 'none';
    gameContainer.style.display = 'block';

    updatePlayerInfo(playerX, playerO);
});

// Cập nhật thông tin người chơi
const updatePlayerInfo = (playerX, playerO) => {
    const infoX = playerX ? playerX.username : 'Chờ đối thủ X';
    const infoO = playerO ? playerO.username : 'Chờ đối thủ O';
    
    // Hiển thị vai trò và tên người chơi
    playerInfoDisplay.innerHTML = `Bạn: <b>${myUsername} (${myRole})</b> &nbsp;|&nbsp; X: ${infoX} &nbsp;|&nbsp; O: ${infoO}`;
}

// ------------------
// 2. Logic Trò Chơi
// ------------------

// Cập nhật các hàm xử lý Socket.IO cũ để dùng currentRoomId

// 3. Nhận thông báo trạng thái từ Server
socket.on('status', (message) => {
    statusDisplay.textContent = message;
});

// 4. Nhận cập nhật bàn cờ từ Server
socket.on('updateBoard', ({ board, nextTurn, winner, draw, playerX, playerO }) => {
    // Cập nhật thông tin người chơi (vì có thể có người mới tham gia/rời đi)
    updatePlayerInfo(playerX, playerO); 
    
    // Cập nhật giao diện bàn cờ
    board.forEach((value, index) => {
        cells[index].textContent = value;
    });

    // Cập nhật trạng thái lượt chơi
    if (winner) {
        statusDisplay.textContent = `Người chơi ${winner} đã thắng! 🎉`;
    } else if (draw) {
        statusDisplay.textContent = `Trò chơi hòa! 🤝`;
    } else {
        statusDisplay.textContent = `Lượt của Người chơi ${nextTurn}`;
    }
});

// 5. Xử lý click (Gửi nước đi lên Server)
const handleCellClick = (event) => {
    if (!myRole) return;
    
    const clickedCellIndex = parseInt(event.target.getAttribute('data-index'));

    socket.emit('makeMove', { 
        index: clickedCellIndex, 
        role: myRole, 
        roomId: currentRoomId // Dùng biến phòng mới
    });
};

// 6. Xử lý nút Chơi Lại
resetButton.addEventListener('click', () => {
     socket.emit('resetGame', currentRoomId); 
});

// Thiết lập lắng nghe sự kiện click trên các ô
cells.forEach(cell => cell.addEventListener('click', handleCellClick));

// NHẬN LỖI TỪ SERVER
socket.on('lobbyError', (message) => {
    lobbyMessage.textContent = message;
});
