// server.js (Phần cần thay đổi)
// ... (các dòng require và khai báo app/server/io giữ nguyên)

// Khai báo trạng thái phòng chơi mới: lưu thông tin người chơi (username)
let rooms = {}; 
const BOARD_SIZE = 5;

io.on('connection', (socket) => {
    console.log(`Người chơi mới kết nối: ${socket.id}`);

    // LOGIC: Khi người chơi muốn tham gia/tạo phòng
    socket.on('joinGame', ({ username, roomId }) => {
        if (!roomId || !username) {
            socket.emit('lobbyError', 'Tên phòng và tên người dùng không được để trống.');
            return;
        }

        socket.join(roomId);
        const playerInfo = { id: socket.id, username: username };

        if (!rooms[roomId]) {
            // TẠO PHÒNG MỚI (Người chơi X)
            rooms[roomId] = {
                players: { X: playerInfo, O: null }, // Lưu thông tin người chơi X
                board: Array(BOARD_SIZE * BOARD_SIZE).fill(''), 
                turn: 'X',
                gameActive: true
            };
            socket.emit('playerRole', { role: 'X', playerX: rooms[roomId].players.X, playerO: rooms[roomId].players.O });
            socket.emit('status', `Chào ${username}! Đang chờ đối thủ O...`);

        } else if (!rooms[roomId].players.O) {
            // THAM GIA PHÒNG (Người chơi O)
            rooms[roomId].players.O = playerInfo;
            
            // Bắt đầu game
            rooms[roomId].gameActive = true;
            io.to(roomId).emit('playerRole', { role: 'X', playerX: rooms[roomId].players.X, playerO: rooms[roomId].players.O });
            io.to(roomId).emit('playerRole', { role: 'O', playerX: rooms[roomId].players.X, playerO: rooms[roomId].players.O });
            
            io.to(roomId).emit('startGame', rooms[roomId].board);
            io.to(roomId).emit('status', 'Trận đấu bắt đầu! Lượt của X');

        } else {
            // PHÒNG ĐẦY
            socket.emit('lobbyError', 'Phòng này đã đầy. Vui lòng chọn phòng khác.');
            socket.leave(roomId);
            return;
        }
    });

    // LOGIC: Khi người chơi đánh cờ (cần thêm logic kiểm tra thắng/hòa chi tiết)
    socket.on('makeMove', ({ index, role, roomId }) => {
        const room = rooms[roomId];
        if (!room || !room.gameActive) return;

        // 1. Kiểm tra lượt và người chơi hợp lệ
        if (room.players[role].id !== socket.id || role !== room.turn) {
            socket.emit('status', 'Không phải lượt của bạn.');
            return;
        }

        // 2. Kiểm tra ô trống
        if (room.board[index] !== '') return;

        // 3. Thực hiện nước đi
        room.board[index] = room.turn;
        
        // 4. KIỂM TRA THẮNG/HÒA (Cần hàm checkWin và logic kiểm tra hòa)
        let winner = null;
        let draw = false;
        
        // GIẢ SỬ HÀM checkWin(board, index) TỒN TẠI VÀ ĐƯỢC THÊM VÀO
        // if (checkWin(room.board, index)) { winner = room.turn; room.gameActive = false; }
        // else if (!room.board.includes('')) { draw = true; room.gameActive = false; }
        
        // 5. Cập nhật trạng thái và chuyển lượt
        if (!winner && !draw) {
            room.turn = room.turn === 'X' ? 'O' : 'X';
        }

        // Gửi trạng thái mới đến TẤT CẢ người chơi trong phòng
        io.to(roomId).emit('updateBoard', {
            board: room.board,
            nextTurn: room.turn,
            winner: winner,
            draw: draw,
            playerX: room.players.X,
            playerO: room.players.O
        });
    });

    // LOGIC: Reset Game
    socket.on('resetGame', (roomId) => {
        const room = rooms[roomId];
        if (!room) return;

        // Chỉ cho phép X reset game (hoặc người đang ở trong phòng)
        if (room.players.X && room.players.X.id === socket.id) {
            room.board = Array(BOARD_SIZE * BOARD_SIZE).fill('');
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
        }
    });

    // LOGIC: Xử lý ngắt kết nối
    socket.on('disconnect', () => {
        // Tìm phòng mà người chơi này đang tham gia
        for (const roomId in rooms) {
            const room = rooms[roomId];
            let disconnectedRole = null;
            
            if (room.players.X && room.players.X.id === socket.id) {
                disconnectedRole = 'X';
                room.players.X = null; // Đặt chỗ trống
            } else if (room.players.O && room.players.O.id === socket.id) {
                disconnectedRole = 'O';
                room.players.O = null; // Đặt chỗ trống
            }

            if (disconnectedRole) {
                room.gameActive = false; // Ngừng game
                io.to(roomId).emit('status', `Người chơi ${disconnectedRole} đã rời phòng. Game tạm dừng. Đang chờ người chơi mới...`);
                // Cập nhật lại thông tin người chơi cho người còn lại
                io.to(roomId).emit('updateBoard', { 
                    board: room.board, 
                    nextTurn: room.turn, 
                    winner: null, 
                    draw: false,
                    playerX: room.players.X, 
                    playerO: room.players.O 
                });
                break;
            }
        }
    });
});

// ... (phần server.listen giữ nguyên)
