// Kết nối tới Backend Node.js đang chạy ở máy tính cá nhân của bạn
const CLRICKS_BACKEND_URL =
    window.CLRICKS_BACKEND_URL ||
    'https://united-leasing-tmp-neural.trycloudflare.com';

const CLRICKS_WS_URL =
    CLRICKS_BACKEND_URL.replace(/^https:/, 'wss:')
                      .replace(/^http:/, 'ws:');

const socket = new WebSocket(CLRICKS_WS_URL);

socket.onopen = () => {
    console.log('[Clriks] WebSocket connected:', CLRICKS_WS_URL);
};

socket.onerror = (error) => {
    console.error('[Clriks] WebSocket error:', error);
};

socket.onclose = () => {
    console.warn('[Clriks] WebSocket closed');
};

const inputElement = document.querySelector('input'); // Ô nhập lệnh màu xanh trong ảnh
const consoleLogElement = document.querySelector('.console-log-box'); // Vùng hiển thị log chữ xanh

socket.onopen = () => {
    console.log("Đã thông tuyến tới Backend thành công!");
};

socket.onmessage = (event) => {
    const response = JSON.parse(event.data);
    
    // Tạo dòng text mới hiển thị kết quả terminal trả về từ máy tính
    const newLog = document.createElement('div');
    newLog.innerText = `[${new Date().toLocaleTimeString()}] ${response.data}`;
    
    if (response.type === 'stderr') {
        newLog.style.color = '#ff5555'; // Hiện màu đỏ nếu lệnh lỗi
    } else {
        newLog.style.color = '#a6e22e'; // Hiện màu xanh lá nếu lệnh chạy tốt
    }
    
    consoleLogElement.appendChild(newLog);
};

// Lắng nghe sự kiện gõ phím Enter trên ô nhập lệnh
inputElement.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && inputElement.value.trim() !== '') {
        const cmd = inputElement.value;
        
        // Hiển thị lệnh vừa gõ lên màn hình console
        const userLog = document.createElement('div');
        userLog.innerText = `[${new Date().toLocaleTimeString()}] usr@clriks:~$ ${cmd}`;
        consoleLogElement.appendChild(userLog);
        
        // Gửi lệnh qua WebSocket về máy tính để thực thi bằng child_process
        socket.send(cmd);
        
        inputElement.value = ''; // Xóa trống ô nhập để gõ lệnh tiếp theo
    }
});
