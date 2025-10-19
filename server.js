// server.js
const express = require('express');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3000;

// Khai báo trạng thái phòng chơi (đơn giản hóa)
let rooms = {}; // Ví dụ: { 'room_id': { players: ['id1', 'id2'], board: [], turn: 'X' } }

// Serve các file tĩnh từ thư mục 'public' (nơi chứa index.html và script.js)
app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Người chơi mới kết nối: ${socket.id}`);

    // Logic: Khi người chơi muốn tham gia/tạo phòng
    socket.on('joinGame', (roomId = 'defaultRoom') => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            // Tạo phòng mới và người chơi là X
            rooms[roomId] = {
                players: [socket.id],
                board: Array(25).fill(''), // Ví dụ 5x5
                turn: 'X'
            };
            socket.emit('playerRole', 'X');
            socket.emit('status', 'Đang chờ người chơi O...');

        } else if (rooms[roomId].players.length === 1 && rooms[roomId].players[0] !== socket.id) {
            // Tham gia phòng và người chơi là O
            rooms[roomId].players.push(socket.id);
            socket.emit('playerRole', 'O');
            io.to(roomId).emit('startGame', rooms[roomId].board);
            io.to(roomId).emit('status', 'Trận đấu bắt đầu! Lượt của X');

        } else {
            // Phòng đầy hoặc đã tham gia
            socket.emit('status', 'Phòng đầy hoặc đã tham gia!');
        }
    });

    // Logic: Khi người chơi đánh cờ
    socket.on('makeMove', ({ index, role, roomId }) => {
        const room = rooms[roomId];
        if (!room) return;

        // 1. Kiểm tra lượt
        if (role !== room.turn) {
            socket.emit('status', 'Không phải lượt của bạn.');
            return;
        }

        // 2. Kiểm tra ô trống
        if (room.board[index] !== '') {
            return;
        }

        // 3. Thực hiện nước đi
        room.board[index] = room.turn;
        
        // 4. Kiểm tra thắng (logic kiểm tra thắng cần được thêm vào đây!)
        // Ví dụ: const winner = checkWin(room.board);

        // 5. Cập nhật trạng thái và chuyển lượt
        room.turn = room.turn === 'X' ? 'O' : 'X';
        
        // Gửi trạng thái mới đến TẤT CẢ người chơi trong phòng
        io.to(roomId).emit('updateBoard', {
            board: room.board,
            nextTurn: room.turn,
            // ... có thể gửi cả thông tin người thắng
        });

        io.to(roomId).emit('status', `Lượt của Người chơi ${room.turn}`);
    });

    socket.on('disconnect', () => {
        console.log(`Người chơi ngắt kết nối: ${socket.id}`);
        // Thêm logic xử lý khi người chơi ngắt kết nối (ví dụ: thông báo cho người còn lại)
    });
});

server.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});