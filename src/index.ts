import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { exec } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Khởi chạy HTTP Server
const server = app.listen(PORT, () => {
    console.log(`[Hệ thống] Backend đang chạy tại http://localhost:${PORT}`);
});

// Khởi chạy WebSocket Server kết nối tới giao diện Web
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
    console.log('[Kết nối] Giao diện Web Agent Console đã kết nối thành công!');

    ws.on('message', (message: string) => {
        const command = message.toString().trim();
        console.log(`[Lệnh nhận được]: ${command}`);

        // Cơ chế bảo mật Guardrail cơ bản
        if (command.includes('rm ') || command.includes('del ')) {
            ws.send(JSON.stringify({ type: 'stderr', data: 'Lỗi: Không được phép dùng lệnh xóa hệ thống!' }));
            return;
        }

        // Thực thi lệnh trực tiếp trên máy tính của bạn thông qua child_process
        exec(command, (error, stdout, stderr) => {
            if (error) {
                ws.send(JSON.stringify({ type: 'stderr', data: stderr || error.message }));
                return;
            }
            // Trả kết quả stdout về giao diện Web hiển thị
            ws.send(JSON.stringify({ type: 'stdout', data: stdout }));
        });
    });
});
