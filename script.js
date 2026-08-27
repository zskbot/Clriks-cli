// Kết nối tới Backend Node.js đang chạy ở máy tính cá nhân của bạn
const CLRICKS_BACKEND_URL =
    window.CLRICKS_BACKEND_URL ||
    'https://united-leasing-tmp-neural.trycloudflare.com';

const CLRICKS_WS_URL =
    CLRICKS_BACKEND_URL.replace(/^https:/, 'wss:')
                      .replace(/^http:/, 'ws:');

let clriksSocket = null;
let clriksReconnectTimer = null;

function connectClriksWebSocket() {
    if (
        clriksSocket &&
        (
            clriksSocket.readyState === WebSocket.OPEN ||
            clriksSocket.readyState === WebSocket.CONNECTING
        )
    ) {
        return;
    }

    const wsUrl =
        window.CLRICKS_WS_URL ||
        CLRICKS_WS_URL;

    console.log("[Clriks] Connecting WebSocket:", wsUrl);

    try {
        clriksSocket = new WebSocket(wsUrl);
        window.clriksSocket = clriksSocket;
        window.clriksSocketReady = false;

        clriksSocket.onopen = () => {
            window.clriksSocketReady = true;
            console.log("[Clriks] WebSocket CONNECTED");

            if (typeof consoleLogElement !== "undefined" && consoleLogElement) {
                const el = document.createElement("div");
                el.innerText =
                    `[${new Date().toLocaleTimeString()}] [OK] WebSocket backend connected`;
                el.style.color = "#24a148";
                consoleLogElement.appendChild(el);
                consoleLogElement.scrollTop = consoleLogElement.scrollHeight;
            }
        };

        clriksSocket.onmessage = (event) => {
            let response;

            try {
                response = JSON.parse(event.data);
            } catch {
                response = {
                    type: "stdout",
                    data: event.data
                };
            }

            if (typeof consoleLogElement !== "undefined" && consoleLogElement) {
                const newLog = document.createElement("div");
                newLog.innerText =
                    `[${new Date().toLocaleTimeString()}] ${response.data ?? ""}`;

                newLog.style.color =
                    response.type === "stderr"
                        ? "#ff5555"
                        : "#a6e22e";

                consoleLogElement.appendChild(newLog);

                // Luôn tự động theo log mới nhất
                requestAnimationFrame(() => {
                    consoleLogElement.scrollTop =
                        consoleLogElement.scrollHeight;
                });
            }
        };

        clriksSocket.onerror = (err) => {
            window.clriksSocketReady = false;
            console.error("[Clriks] WebSocket ERROR", err);
        };

        clriksSocket.onclose = () => {
            window.clriksSocketReady = false;
            console.warn("[Clriks] WebSocket CLOSED");

            clearTimeout(clriksReconnectTimer);

            clriksReconnectTimer = setTimeout(() => {
                connectClriksWebSocket();
            }, 1500);
        };

    } catch (err) {
        window.clriksSocketReady = false;
        console.error("[Clriks] WebSocket INIT ERROR:", err);

        clearTimeout(clriksReconnectTimer);

        clriksReconnectTimer = setTimeout(() => {
            connectClriksWebSocket();
        }, 1500);
    }
}

window.clriksSocket = null;
window.clriksSocketReady = false;

connectClriksWebSocket();

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
        if (
            window.clriksSocket &&
            window.clriksSocket.readyState === WebSocket.OPEN
        ) {
            window.clriksSocket.send(cmd);
        } else {
            const el = document.createElement('div');
            el.innerText =
                `[${new Date().toLocaleTimeString()}] [ERROR] WebSocket backend chưa kết nối`;
            el.style.color = '#ff5555';
            consoleLogElement.appendChild(el);
        }

        requestAnimationFrame(() => {
            consoleLogElement.scrollTop =
                consoleLogElement.scrollHeight;
        });
        
        inputElement.value = ''; // Xóa trống ô nhập để gõ lệnh tiếp theo
    }
});
