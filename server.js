// server.js (Phần logic mới)

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Thay thế bằng secret key của riêng bạn!
const JWT_SECRET = 'mot_chuoi_bi_mat_va_dai_cua_ban'; 
const DUMMY_DB = []; // Mô phỏng Database: [{ username: '...', hash: '...' }]

// Hàm Middleware xác minh Token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return null; // Token không hợp lệ
    }
};

io.on('connection', (socket) => {
    // ------------------
    // LOGIC XÁC THỰC
    // ------------------
    
    // ĐĂNG KÝ
    socket.on('signup', async ({ username, password }) => {
        if (DUMMY_DB.find(u => u.username === username)) {
            socket.emit('authError', 'Tên người dùng đã tồn tại.');
            return;
        }
        const hash = await bcrypt.hash(password, 10);
        DUMMY_DB.push({ username, hash });
        
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        socket.emit('authSuccess', { username, token });
        console.log(`Người dùng mới đăng ký: ${username}`);
    });

    // ĐĂNG NHẬP
    socket.on('login', async ({ username, password }) => {
        const user = DUMMY_DB.find(u => u.username === username);
        if (!user || !(await bcrypt.compare(password, user.hash))) {
            socket.emit('authError', 'Sai tên người dùng hoặc mật khẩu.');
            return;
        }
        
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
        socket.emit('authSuccess', { username, token });
    });
    
    // XÁC THỰC LẠI TOKEN CŨ (khi userToken có sẵn)
    socket.on('authenticate', (token) => {
        const payload = verifyToken(token);
        if (payload) {
            // Token hợp lệ, đưa user vào Lobby
            socket.emit('authSuccess', { username: payload.username, token });
        } else {
            socket.emit('authError', 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.');
        }
    });

    // ------------------
    // LOGIC JOIN GAME (Cần xác minh token)
    // ------------------
    
    socket.on('joinGame', ({ roomId, token }) => {
        const payload = verifyToken(token);
        if (!payload) {
            socket.emit('lobbyError', 'Token không hợp lệ. Vui lòng đăng nhập lại.');
            return;
        }
        const username = payload.username;
        // ... (Logic tìm phòng cũ, nhưng thay 'username' vào)
        // ...
        
        // Gửi tín hiệu thành công
        socket.emit('joinSuccess', { roomId: roomId });
    });
    
    // ------------------
    // LOGIC makeMove (Cần xác minh token)
    // ------------------
    
    socket.on('makeMove', ({ index, role, roomId, token }) => {
        const payload = verifyToken(token);
        if (!payload) return; // Bỏ qua nếu token không hợp lệ
        
        // ... (Tiếp tục xử lý logic makeMove như cũ)
        // ...
    });
    
    // ... (các logic khác giữ nguyên, đảm bảo token luôn được kiểm tra nếu cần)
});
