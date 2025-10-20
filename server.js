const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your_super_secret_key_change_me'; // THAY ĐỔI KHÓA BÍ MẬT NÀY!

// MÔ PHỎNG DATABASE (Sử dụng mảng cho demo)
const DUMMY_DB = []; 

// Khai báo trạng thái phòng chơi
let rooms = {}; 
const BOARD_SIZE = 5;
const WINNING_LENGTH = 3; // 3 ô liên tiếp để thắng

// -----------------------------------------------------
// HÀM HỖ TRỢ
// -----------------------------------------------------

const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null;
    }
};

// HÀM KIỂM TRA THẮNG THUA (Cần thiết cho game lớn hơn 3x3)
const checkWin = (board, index, role) => {
    const size = BOARD_SIZE;
    const len = WINNING_LENGTH;
    const row = Math.floor(index / size);
    const col = index % size;
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]; // Ngang, Dọc, Chéo chính, Chéo phụ

    for (const [dr, dc] of directions) {
        // Kiểm tra 3 vị trí liên tiếp (tính từ vị trí vừa đánh)
        for (let start = 0; start <= len - 1; start++) {
            let count = 0;
            for (let k = 0; k < len; k++) {
                const checkRow = row + dr * (k - start);
                const checkCol = col + dc * (k - start);
                const checkIndex = checkRow * size + checkCol;

                if (checkRow >= 0 && checkRow < size && checkCol >= 0 && checkCol < size) {
                    if (board[checkIndex] === role) {
                        count++;
                    } else {
                        count = 0;
                        break;
                    }
                } else {
                    count = 0;
                    break;
                }
            }
            if (count === len) {
                return true;
            }
        }
    }
    return false;
};

// -----------------------------------------------------
// CẤU HÌNH EXPRESS & SOCKET.IO
// -----------------------------------------------------

// Phục vụ file tĩnh từ thư mục 'public' (chứa index.html)
app.use(express.static('public'));

io.on('connection', (socket) => {
    // ------------------ LOGIC XÁC THỰC ------------------
    
    socket.on('signup', async ({ username, password }) => {
        if (DUMMY_DB.find(u => u.username === username)) {
            return socket.emit('authError', 'Tên người dùng đã tồn tại.');
        }
        if (password.length < 6) {
            return socket.emit('authError', 'Mật khẩu phải từ 6 ký tự trở lên.');
        }
        const hash = await bcrypt.hash(password, 10);
        DUMMY_DB.push({ username, hash });
        
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        socket.emit('authSuccess', { username, token });
        console.log(`[AUTH] Đăng ký thành công: ${username}`);
    });

    socket.on('login', async ({ username, password }) => {
        const user = DUMMY_DB.find(u => u.username === username);
        if (!user || !(await bcrypt.compare(password, user.hash))) {
            return socket.emit('authError', 'Sai tên người dùng hoặc mật khẩu.');
        }
        
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        socket.emit('authSuccess', { username, token });
        console.log(`[AUTH] Đăng nhập thành công: ${username}`);
    });
    
    socket.on('authenticate', (token) => {
        const payload = verifyToken(token);
        if (payload) {
            socket.emit('authSuccess', { username: payload.username, token });
        } else {
            socket.emit('authError', 'Phiên làm việc hết hạn.');
        }
    });

    // ------------------ LOGIC PHÒNG CHỜ ------------------
    
    socket.on('joinGame', ({ roomId, token, username }) => {
        const payload = verifyToken(token);
        if (!payload || payload.username !== username) {
            return socket.emit('lobbyError', 'Xác thực thất bại. Vui lòng đăng nhập lại.');
        }

        let room = rooms[roomId];
        const playerInfo = { id: socket.id, username: username };
        let role;
        
        if (!room) {
            // TẠO PHÒNG MỚI (X)
            role = 'X';
            rooms[roomId] = {
                players: { X: playerInfo, O: null },
                board: Array(BOARD_SIZE * BOARD_SIZE).fill(''), 
                turn: 'X',
                gameActive: false // Chờ đối thủ
            };
            socket.join(roomId);
            socket.emit('joinSuccess', { roomId, role, playerX: rooms[roomId].players.X, playerO: rooms[roomId].players.O });
            io.to(roomId).emit('status', `Phòng ${roomId} đã được tạo. Chờ người chơi O...`);

        } else if (!room.players.O) {
            // THAM GIA PHÒNG (O)
            role = 'O';
            room.players.O = playerInfo;
            room.gameActive = true; 
            socket.join(roomId);

            // Gửi thông tin đầy đủ về cho cả hai người chơi
            io.to(room.players.X.id).emit('joinSuccess', { roomId, role: 'X', playerX: room.players.X, playerO: room.players.O });
            io.to(room.players.O.id).emit('joinSuccess', { roomId, role: 'O', playerX: room.players.X, playerO: room.players.O });
            
            io.to(roomId).emit('status', 'Trận đấu bắt đầu! Lượt của X');

        } else {
            return socket.emit('lobbyError', 'Phòng này đã đầy.');
        }
    });

    // ------------------ LOGIC GAME ------------------
    
    socket.on('makeMove', ({ index, role, roomId, token }) => {
        const payload = verifyToken(token);
        const room = rooms[roomId];
        
        if (!room || !room.gameActive || !payload || payload.username !== room.players[role].username) {
            return; 
        }

        // Kiểm tra lượt, ô trống và thực hiện nước đi
        if (role !== room.turn || room.board[index] !== '') {
            return socket.emit('status', 'Nước đi không hợp lệ.');
        }

        room.board[index] = room.turn;
        
        let winner = null;
        let draw = false;
        
        if (checkWin(room.board, index, room.turn)) { 
            winner = room.turn; room.gameActive = false; 
        } else if (!room.board.includes('')) { 
            draw = true; room.gameActive = false; 
        }
        
        if (!winner && !draw) {
            room.turn = room.turn === 'X' ? 'O' : 'X';
        }

        // Phát sóng trạng thái mới
        io.to(roomId).emit('updateBoard', {
            board: room.board,
            nextTurn: room.turn,
            winner: winner,
            draw: draw,
            playerX: room.players.X,
            playerO: room.players.O
        });
    });

    socket.on('resetGame', (roomId) => {
        const room = rooms[roomId];
        if (!room || !room.players.X || room.players.X.id !== socket.id) return; // Chỉ cho X reset

        room.board.fill('');
        room.turn = 'X';
        room.gameActive = true; 
        
        io.to(roomId).emit('updateBoard', {
            board: room.board,
            nextTurn: room.turn,
            winner: null,
            draw: false,
            playerX: room.players.X,
            playerO: room.players.O
        });
        io.to(roomId).emit('status', 'Trận đấu mới bắt đầu! Lượt của X');
    });
    
    // ------------------ XỬ LÝ NGẮT KẾT NỐI ------------------
    
    socket.on('disconnect', () => {
        // Tương tự logic cũ: tìm và xóa người chơi khỏi phòng
        for (const roomId in rooms) {
            const room = rooms[roomId];
            let disconnectedRole = null;
            
            if (room.players.X && room.players.X.id === socket.id) {
                disconnectedRole = 'X';
                room.players.X = null;
            } else if (room.players.O && room.players.O.id === socket.id) {
                disconnectedRole = 'O';
                room.players.O = null;
            }

            if (disconnectedRole) {
                room.gameActive = false; 
                io.to(roomId).emit('status', `Người chơi ${disconnectedRole} đã rời phòng. Chờ người chơi mới...`);
                io.to(roomId).emit('updateBoard', { 
                    board: room.board, 
                    nextTurn: room.turn, 
                    winner: null, 
                    draw: false,
                    playerX: room.players.X, 
                    playerO: room.players.O 
                });
                // Nếu cả hai đều rời, xóa phòng
                if (!room.players.X && !room.players.O) delete rooms[roomId];
                break;
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server đang chạy trên http://localhost:${PORT}`);
});
