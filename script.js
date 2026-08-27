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
    const message = String(text ?? '');

    let css = 'text-[#a6e22e]';

    if (type === 'stderr' || type === 'design_error') {
        css = 'text-[#da1e28]';
    } else if (type === 'design_status') {
        css = 'text-[#f1c21b]';
    } else if (type === 'design_result') {
        css = 'text-[#24a148]';
    }

    if (typeof window.logLine === 'function') {
        window.logLine(
            escapeHtml(message),
            css
        );
    } else {
        const log =
            document.querySelector('.console-log-box') ||
            document.querySelector('.console-log');

        if (!log) return;

        const line = document.createElement('div');
        line.className = css;
        line.textContent = message;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    }
}

function connectClriksWebSocket() {
    // Chỉ cho phép MỘT WebSocket duy nhất.
    if (
        clriksSocket &&
        (
            clriksSocket.readyState === WebSocket.OPEN ||
            clriksSocket.readyState === WebSocket.CONNECTING
        )
    ) {
        return clriksSocket;
    }

    try {
        clriksSocket = new WebSocket(CLRICKS_WS_URL);

        clriksSocket.onopen = () => {
            appendConsole(
                '[WebSocket] Backend connected',
                'stdout'
            );
        };

        clriksSocket.onmessage = (event) => {
            let response;

            try {
                response = JSON.parse(event.data);
            } catch {
                appendConsole(event.data, 'stdout');
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

            appendConsole(
                response.data ||
                response.error ||
                JSON.stringify(response),
                type === 'stderr' ? 'stderr' : 'stdout'
            );
        };

        clriksSocket.onerror = (error) => {
            console.error('[Clriks WS] error', error);
        };

        clriksSocket.onclose = (event) => {
            console.log(
                '[Clriks WS] closed:',
                event.code,
                event.reason || ''
            );

            // Chỉ reconnect nếu đây vẫn là socket hiện tại.
            if (clriksSocket) {
                clriksSocket = null;

                clearTimeout(clriksReconnectTimer);

                clriksReconnectTimer = setTimeout(() => {
                    connectClriksWebSocket();
                }, 1500);
            }
        };

        return clriksSocket;

    } catch (error) {
        console.error(
            '[Clriks WS] connection failed:',
            error
        );

        clriksSocket = null;
        return null;
    }
}


function sendClriksCommand(command) {
    const socket = connectClriksWebSocket();

    if (!socket) {
        appendConsole(
            '[WebSocket] Không tạo được kết nối backend.',
            'stderr'
        );
        return false;
    }

    if (socket.readyState === WebSocket.OPEN) {
        socket.send(command);
        return true;
    }

    appendConsole(
        '[WebSocket] Đang kết nối backend, chờ socket OPEN...',
        'stderr'
    );

    const sendWhenOpen = () => {
        if (
            clriksSocket === socket &&
            socket.readyState === WebSocket.OPEN
        ) {
            socket.send(command);
        }
    };

    socket.addEventListener(
        'open',
        sendWhenOpen,
        { once: true }
    );

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
