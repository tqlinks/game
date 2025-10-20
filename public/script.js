const BOARD_SIZE = 15;
const WIN_COUNT = 5;
const board = [];
let currentPlayer = 'X';
let isGameOver = false;

const caroBoardElement = document.getElementById('caro-board');
const currentPlayerElement = document.getElementById('current-player');
const messageElement = document.getElementById('message');

/** Chuyển màn hình từ đăng nhập sang game */
function startGameDemo() {
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    initGame();
}

/** Khởi tạo bàn cờ và logic game */
function initGame() {
    caroBoardElement.innerHTML = ''; // Xóa bàn cờ cũ
    board.length = 0; // Xóa mảng logic cũ
    isGameOver = false;
    currentPlayer = 'X';
    currentPlayerElement.textContent = 'X';
    messageElement.textContent = '';

    // Tạo mảng 2 chiều đại diện cho bàn cờ và các ô HTML
    for (let i = 0; i < BOARD_SIZE; i++) {
        board[i] = [];
        for (let j = 0; j < BOARD_SIZE; j++) {
            board[i][j] = ''; // 'X' hoặc 'O'
            
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.addEventListener('click', handleCellClick);
            caroBoardElement.appendChild(cell);
        }
    }
}

/** Xử lý khi người chơi click vào một ô */
function handleCellClick(event) {
    if (isGameOver) {
        messageElement.textContent = "Ván đấu đã kết thúc. Nhấn 'Chơi lại'!";
        return;
    }

    const row = parseInt(event.target.dataset.row);
    const col = parseInt(event.target.dataset.col);

    // Kiểm tra ô đã được đi chưa
    if (board[row][col] !== '') {
        return; 
    }

    // 1. Cập nhật logic
    board[row][col] = currentPlayer;

    // 2. Cập nhật giao diện
    event.target.textContent = currentPlayer;
    event.target.classList.add('occupied', currentPlayer);

    // 3. Kiểm tra thắng
    if (checkWin(row, col, currentPlayer)) {
        messageElement.textContent = `Người chơi ${currentPlayer} ĐÃ THẮNG! 🎉`;
        isGameOver = true;
    } else {
        // 4. Chuyển lượt
        currentPlayer = (currentPlayer === 'X') ? 'O' : 'X';
        currentPlayerElement.textContent = currentPlayer;
    }
}

/** Kiểm tra chiến thắng */
function checkWin(r, c, player) {
    // Định nghĩa 4 hướng kiểm tra (Ngang, Dọc, Chéo chính, Chéo phụ)
    const directions = [
        [0, 1],   // Ngang (col + 1)
        [1, 0],   // Dọc (row + 1)
        [1, 1],   // Chéo chính (row + 1, col + 1)
        [1, -1]   // Chéo phụ (row + 1, col - 1)
    ];

    for (const [dr, dc] of directions) {
        let count = 1; // Tính cả quân vừa đánh
        
        // Kiểm tra về 1 phía
        for (let i = 1; i < WIN_COUNT; i++) {
            const newR = r + dr * i;
            const newC = c + dc * i;
            if (newR >= 0 && newR < BOARD_SIZE && newC >= 0 && newC < BOARD_SIZE && board[newR][newC] === player) {
                count++;
            } else {
                break;
            }
        }

        // Kiểm tra về phía đối diện
        for (let i = 1; i < WIN_COUNT; i++) {
            const newR = r - dr * i;
            const newC = c - dc * i;
            if (newR >= 0 && newR < BOARD_SIZE && newC >= 0 && newC < BOARD_SIZE && board[newR][newC] === player) {
                count++;
            } else {
                break;
            }
        }

        if (count >= WIN_COUNT) {
            return true;
        }
    }
    return false;
}

/** Thiết lập lại trò chơi */
function resetGame() {
    initGame();
}

// Khởi tạo bàn cờ lần đầu (khi vào màn hình game demo)
// initGame(); // Bỏ comment nếu muốn hiển thị bàn cờ ngay khi load trang

// Lưu ý: Gọi startGameDemo() khi nhấn nút để bắt đầu game
