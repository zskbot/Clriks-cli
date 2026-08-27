const CLRICKS_BACKEND_URL =
    window.CLRICKS_BACKEND_URL ||
    'https://united-leasing-tmp-neural.trycloudflare.com';

const CLRICKS_WS_URL =
    CLRICKS_BACKEND_URL
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:');

let clriksSocket = null;
let clriksSocketReady = false;
let clriksReconnectTimer = null;

const inputElement = document.querySelector('input');
const consoleLogElement =
    document.querySelector('.console-log-box');

function appendConsole(text, type = 'stdout') {
    if (!consoleLogElement) return;

    const line = document.createElement('div');

    line.innerText =
        `[${new Date().toLocaleTimeString()}] ${text}`;

    if (type === 'stderr' || type === 'design_error') {
        line.style.color = '#ff5555';
    } else if (type === 'design_status') {
        line.style.color = '#f1c21b';
    } else if (type === 'design_result') {
        line.style.color = '#24a148';
    } else {
        line.style.color = '#a6e22e';
    }

    consoleLogElement.appendChild(line);

    // Luôn cuộn tới log mới nhất
    requestAnimationFrame(() => {
        consoleLogElement.scrollTop =
            consoleLogElement.scrollHeight;
    });
}

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

    try {
        clriksSocket = new WebSocket(CLRICKS_WS_URL);

        window.clriksSocket = clriksSocket;

        clriksSocket.onopen = () => {
            clriksSocketReady = true;

            console.log(
                'Clriks WebSocket CONNECTED'
            );

            appendConsole(
                'WebSocket backend đã kết nối.',
                'stdout'
            );
        };

        clriksSocket.onmessage = (event) => {
            let response;

            try {
                response = JSON.parse(event.data);
            } catch {
                appendConsole(
                    event.data,
                    'stdout'
                );
                return;
            }

            const type = response.type;

            if (type === 'system') {
                appendConsole(
                    response.data || '',
                    'stdout'
                );
                return;
            }

            if (type === 'design_status') {
                appendConsole(
                    '[Design] Python Design Engine đang tạo thiết kế...',
                    'design_status'
                );
                return;
            }

            if (type === 'design_result') {
                const data = response.data || {};

                appendConsole(
                    '[Design] Tạo thiết kế thành công: ' +
                    (
                        data.url ||
                        data.file ||
                        'design generated'
                    ),
                    'design_result'
                );

                return;
            }

            if (type === 'design_error') {
                appendConsole(
                    '[Design] Lỗi: ' +
                    (
                        response.error ||
                        'Unknown design error'
                    ),
                    'design_error'
                );
                return;
            }

            if (type === 'stderr') {
                appendConsole(
                    response.data || '',
                    'stderr'
                );
                return;
            }

            appendConsole(
                response.data || '',
                'stdout'
            );
        };

        clriksSocket.onerror = (error) => {
            clriksSocketReady = false;

            console.error(
                'Clriks WebSocket ERROR',
                error
            );
        };

        clriksSocket.onclose = () => {
            clriksSocketReady = false;

            console.log(
                'Clriks WebSocket CLOSED'
            );

            clearTimeout(
                clriksReconnectTimer
            );

            clriksReconnectTimer = setTimeout(
                connectClriksWebSocket,
                1500
            );
        };

    } catch (error) {
        clriksSocketReady = false;

        console.error(
            'WebSocket create error:',
            error
        );

        clearTimeout(
            clriksReconnectTimer
        );

        clriksReconnectTimer = setTimeout(
            connectClriksWebSocket,
            1500
        );
    }
}

function sendClriksCommand(command) {
    if (
        clriksSocket &&
        clriksSocket.readyState === WebSocket.OPEN
    ) {
        clriksSocket.send(command);
        return true;
    }

    appendConsole(
        '[WebSocket] Đang kết nối backend, thử lại...',
        'stderr'
    );

    connectClriksWebSocket();

    setTimeout(() => {
        if (
            clriksSocket &&
            clriksSocket.readyState === WebSocket.OPEN
        ) {
            clriksSocket.send(command);
        }
    }, 500);

    return false;
}

window.sendClriksCommand =
    sendClriksCommand;

window.connectClriksWebSocket =
    connectClriksWebSocket;

// Kết nối ngay khi script được tải
connectClriksWebSocket();

if (inputElement) {
    inputElement.addEventListener(
        'keypress',
        (e) => {
            if (
                e.key === 'Enter' &&
                inputElement.value.trim() !== ''
            ) {
                const cmd =
                    inputElement.value.trim();

                if (consoleLogElement) {
                    const userLog =
                        document.createElement('div');

                    userLog.innerText =
                        `[${new Date().toLocaleTimeString()}] usr@clriks:~$ ${cmd}`;

                    consoleLogElement.appendChild(
                        userLog
                    );

                    consoleLogElement.scrollTop =
                        consoleLogElement.scrollHeight;
                }

                sendClriksCommand(cmd);

                inputElement.value = '';
            }
        }
    );
}
