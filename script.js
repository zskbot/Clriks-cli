const CLRICKS_BACKEND_URL =
    window.CLRICKS_BACKEND_URL ||
    window.location.origin;

const CLRICKS_WS_URL =
    CLRICKS_BACKEND_URL
        .replace(/^http:/, 'ws:')
        .replace(/^https:/, 'wss:');

let clriksSocket = null;
let clriksReconnectTimer = null;
let terminalCommandPending = false;
let terminalCommandTimer = null;
const terminalHistory = [];
let terminalHistoryIndex = -1;

const inputElement =
    document.getElementById('command-input');

const consoleLogElement =
    document.querySelector('.console-log-box') ||
    document.querySelector('.console-log');

function appendConsole(
    text,
    type = 'stdout'
) {

    const message =
        String(text ?? '');

    let css =
        'text-[#a6e22e]';

    if (
        type === 'stderr' ||
        type === 'design_error'
    ) {
        css =
            'text-[#da1e28]';
    }

    else if (
        type === 'design_status'
    ) {
        css =
            'text-[#f1c21b]';
    }

    else if (
        type === 'design_result'
    ) {
        css =
            'text-[#24a148]';
    }

    if (typeof window.appendClriksTerminalOutput === 'function') {
        window.appendClriksTerminalOutput(message, type, css);
        return;
    }

    const log =
        consoleLogElement ||
        document.querySelector(
            '.console-log-box'
        ) ||
        document.querySelector(
            '.console-log'
        );

    if (!log) return;

    const line =
        document.createElement('div');

    line.className = css;
    line.textContent = message;

    log.appendChild(line);

    log.scrollTop =
        log.scrollHeight;
}

function setTerminalConnectionStatus(status) {
    const element = document.getElementById('terminal-connection');
    if (!element) return;
    element.textContent = status;
    element.className = status === 'CONNECTED'
        ? 'text-[#24a148]'
        : status === 'CONNECTING'
            ? 'text-[#f1c21b]'
            : 'text-[#da1e28]';
}

function startTerminalActivity() {
    terminalCommandPending = true;
    clearTimeout(terminalCommandTimer);
    window.setTerminalActivity?.('running');
    terminalCommandTimer = setTimeout(() => {
        if (!terminalCommandPending) return;
        terminalCommandPending = false;
        window.setTerminalActivity?.('error');
    }, 30000);
}

function finishTerminalActivity(output, type) {
    if (!terminalCommandPending) return;
    const value = String(output ?? '');
    const failed = type === 'stderr' || window.isTerminalError?.(value);
    if (!failed && !value.includes('u0@termux:')) return;
    terminalCommandPending = false;
    clearTimeout(terminalCommandTimer);
    window.setTerminalActivity?.(failed ? 'error' : 'success');
}

/* =========================================================
   WEBSOCKET
   ========================================================= */

function connectClriksWebSocket() {

    if (
        clriksSocket &&
        (
            clriksSocket.readyState ===
                WebSocket.OPEN ||
            clriksSocket.readyState ===
                WebSocket.CONNECTING
        )
    ) {
        return clriksSocket;
    }

    clearTimeout(
        clriksReconnectTimer
    );

    setTerminalConnectionStatus('CONNECTING');

    const socket =
        new WebSocket(
            CLRICKS_WS_URL
        );

    clriksSocket =
        socket;

    socket.onopen =
        () => {

            setTerminalConnectionStatus('CONNECTED');

            appendConsole(
                '[WebSocket] Persistent Bash connected',
                'stdout'
            );
        };

    socket.onmessage =
        (event) => {

            let response;

            try {
                response =
                    JSON.parse(
                        event.data
                    );
            } catch {

                appendConsole(
                    event.data,
                    'stdout'
                );

                return;
            }

            const type =
                response.type;

            if (
                type === 'system'
            ) {

                appendConsole(
                    response.data || '',
                    'stdout'
                );

                return;
            }

            if (
                type === 'design_status'
            ) {

                appendConsole(
                    '[Design] Python Design Engine đang tạo thiết kế...',
                    'design_status'
                );

                return;
            }

            if (
                type === 'design_result'
            ) {

                const data =
                    response.data || {};

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

            if (
                type === 'design_error'
            ) {

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

            if (
                type === 'shell_exit'
            ) {

                appendConsole(
                    '[Shell] Bash process exited: ' +
                    JSON.stringify(
                        response.data
                    ),
                    'stderr'
                );

                return;
            }

            const output = response.data ?? response.error ?? '';
            const outputType = type === 'stderr' ? 'stderr' : 'stdout';
            finishTerminalActivity(output, outputType);
            appendConsole(output, outputType);
        };

    socket.onerror =
        (error) => {

            setTerminalConnectionStatus('OFFLINE');

            console.error(
                '[Command Prompt WS] error',
                error
            );
        };

    socket.onclose =
        () => {

            setTerminalConnectionStatus('OFFLINE');

            if (
                clriksSocket === socket
            ) {
                clriksSocket =
                    null;
            }

            clearTimeout(
                clriksReconnectTimer
            );

            clriksReconnectTimer =
                setTimeout(
                    () => {
                        connectClriksWebSocket();
                    },
                    1500
                );
        };

    return socket;
}

/* =========================================================
   RAW TERMINAL INPUT
   ========================================================= */

function sendTerminalInput(
    data
) {

    if (
        data === null ||
        data === undefined ||
        data === ''
    ) {
        return;
    }

    const socket =
        connectClriksWebSocket();

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {

        appendConsole(
            '[Terminal] Backend chưa kết nối.',
            'stderr'
        );

        return false;
    }

    startTerminalActivity();

    socket.send(
        JSON.stringify({
            type: 'input',
            data: String(data)
        })
    );

    return true;
}

function sendSignal(
    signal
) {

    const socket =
        connectClriksWebSocket();

    if (
        !socket ||
        socket.readyState !==
            WebSocket.OPEN
    ) {
        return false;
    }

    socket.send(
        JSON.stringify({
            type: 'signal',
            signal
        })
    );

    return true;
}

/* =========================================================
   COMMAND INPUT
   ========================================================= */

function submitCommand() {

    if (!inputElement) {
        return;
    }

    const value = inputElement.value;

    if (value.trim()) {
        terminalHistory.push(value);
        terminalHistoryIndex = terminalHistory.length;
    }

    if (typeof window.executeClriksCommand === 'function') {
        window.executeClriksCommand(value);
        inputElement.value = '';
        window.setTerminalComposer?.('');
        inputElement.focus();
        return;
    }

    if (!value) {
        sendTerminalInput('\n');
        return;
    }

    sendTerminalInput(value + '\n');
    inputElement.value = '';
    window.setTerminalComposer?.('');
    inputElement.focus();
}

if (inputElement) {

    inputElement.addEventListener(
        'keydown',
        (event) => {

            /*
             * Ctrl+C
             */
            if (
                event.ctrlKey &&
                event.key.toLowerCase() === 'c'
            ) {

                event.preventDefault();

                sendTerminalInput(
                    '\u0003'
                );

                return;
            }

            /*
             * Ctrl+D
             */
            if (
                event.ctrlKey &&
                event.key.toLowerCase() === 'd'
            ) {

                event.preventDefault();

                sendTerminalInput(
                    '\u0004'
                );

                return;
            }

            /*
             * Ctrl+Z
             */
            if (
                event.ctrlKey &&
                event.key.toLowerCase() === 'z'
            ) {

                event.preventDefault();

                sendTerminalInput(
                    '\u001a'
                );

                return;
            }

            /*
             * Ctrl+L
             */
            if (
                event.ctrlKey &&
                event.key.toLowerCase() === 'l'
            ) {

                event.preventDefault();

                sendTerminalInput(
                    '\u000c'
                );

                return;
            }

            /*
             * TAB
             */
            if (
                event.key === 'Tab'
            ) {

                event.preventDefault();

                sendTerminalInput(
                    '\t'
                );

                return;
            }

            if (event.key === 'ArrowUp') {
                if (!terminalHistory.length) return;
                event.preventDefault();
                terminalHistoryIndex = Math.max(0, terminalHistoryIndex - 1);
                inputElement.value = terminalHistory[terminalHistoryIndex] || '';
                return;
            }

            if (event.key === 'ArrowDown') {
                if (!terminalHistory.length) return;
                event.preventDefault();
                terminalHistoryIndex = Math.min(terminalHistory.length, terminalHistoryIndex + 1);
                inputElement.value = terminalHistory[terminalHistoryIndex] || '';
                return;
            }

            /*
             * ENTER
             */
            if (
                event.key === 'Enter' &&
                !event.shiftKey
            ) {

                event.preventDefault();

                submitCommand();

                return;
            }

            /*
             * Shift+Enter =
             * multiline command buffer.
             */
            if (
                event.key === 'Enter' &&
                event.shiftKey
            ) {

                event.preventDefault();

                const start =
                    inputElement.selectionStart ??
                    inputElement.value.length;

                const end =
                    inputElement.selectionEnd ??
                    inputElement.value.length;

                inputElement.value =
                    inputElement.value.slice(
                        0,
                        start
                    ) +
                    '\n' +
                    inputElement.value.slice(
                        end
                    );

                inputElement.selectionStart =
                    start + 1;

                inputElement.selectionEnd =
                    start + 1;
            }
        }
    );

    /*
     * Mobile keyboard:
     * tapping the shell input focuses it.
     */
    inputElement.addEventListener(
        'focus',
        () => {
            document.documentElement
                .classList
                .add(
                    'clriks-ime-open'
                );
        }
    );
}

/* =========================================================
   SEND BUTTON
   ========================================================= */

const sendButton =
    document.getElementById(
        'send-command'
    );

if (sendButton) {

    sendButton.addEventListener(
        'click',
        (event) => {

            event.preventDefault();

            submitCommand();
        }
    );
}

/* =========================================================
   PUBLIC API
   ========================================================= */

window.sendClriksCommand =
    sendTerminalInput;

window.clriksSendTerminalInput =
    sendTerminalInput;

window.clriksSendSignal =
    sendSignal;

window.clriksSubmitCommand =
    submitCommand;

window.connectClriksWebSocket =
    connectClriksWebSocket;
window.focusCommandPrompt = () => inputElement?.focus({ preventScroll: true });
window.CLRICKS_TERMINAL_CONTROLS_INPUT = true;

/* =========================================================
   START
   ========================================================= */

connectClriksWebSocket();
