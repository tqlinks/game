// script.js (Logic Client)
// Kết nối tới Server (mặc định là server đang phục vụ trang này)
const socket = io(); 

// Định nghĩa
const cells = document.querySelectorAll('.cell');
const statusDisplay = document.getElementById('status');
const resetButton = document.getElementById('reset-button');
const roomId = 'CaroRoom1'; // Đơn giản hóa: Mọi người đều vào 1 phòng này
let myRole = null; // Vai trò của người chơi hiện tại ('X' hoặc 'O')

// 1. Gửi yêu cầu tham gia phòng khi trang tải
socket.on('connect', () => {
    socket.emit('joinGame', roomId);
});

// 2. Nhận vai trò từ Server
socket.on('playerRole', (role) => {
    myRole = role;
    statusDisplay.textContent = `Bạn là Người chơi ${myRole}`;
});

// 3. Nhận thông báo trạng thái từ Server
socket.on('status', (message) => {
    statusDisplay.textContent = message;
});

// 4. Nhận cập nhật bàn cờ từ Server
socket.on('updateBoard', ({ board, nextTurn }) => {
    // Cập nhật giao diện bàn cờ
    board.forEach((value, index) => {
        cells[index].textContent = value;
    });

    // Cập nhật trạng thái lượt chơi
    if (statusDisplay.textContent.includes('thắng') || statusDisplay.textContent.includes('hòa')) {
        return; // Giữ nguyên thông báo thắng/hòa
    }
    statusDisplay.textContent = `Lượt của Người chơi ${nextTurn}`;
});

// 5. Xử lý click (Gửi nước đi lên Server)
const handleCellClick = (event) => {
    if (!myRole) {
        statusDisplay.textContent = 'Đang chờ vai trò từ Server...';
        return;
    }
    
    const clickedCellIndex = parseInt(event.target.getAttribute('data-index'));

    // Gửi dữ liệu nước đi lên Server. Server sẽ xử lý logic và gửi lại kết quả.
    socket.emit('makeMove', { 
        index: clickedCellIndex, 
        role: myRole, 
        roomId: roomId 
    });
};

// Thiết lập lắng nghe sự kiện
cells.forEach(cell => cell.addEventListener('click', handleCellClick));
// Nút reset (cần gửi yêu cầu reset đến Server, Server reset trạng thái game)
resetButton.addEventListener('click', () => {
    // Tạm thời, reset cục bộ (cần thay bằng lệnh socket.emit('resetGame', roomId))
    socket.emit('resetGame', roomId); 
});