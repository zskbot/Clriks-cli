import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { exec } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

const PYTHON_DESIGN_ENGINE =
    process.env.CLRICKS_PYTHON_DESIGN_URL ||
    'http://127.0.0.1:8789';

const DESIGN_DIR = path.resolve(
    process.cwd(),
    'data/designs'
);

app.use(express.json());

/*
 * ==========================================
 * CLRICKS PYTHON DESIGN ENGINE
 * ==========================================
 */

async function generateDesign(
    prompt: string,
    format: string = 'svg'
): Promise<any> {
    const response = await fetch(
        `${PYTHON_DESIGN_ENGINE}/design/generate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt,
                format
            })
        }
    );

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(
            data.error ||
            `Python Design Engine HTTP ${response.status}`
        );
    }

    return data;
}

/*
 * Python Engine health
 */

app.get('/design/health', async (_req, res) => {
    try {
        const response = await fetch(
            `${PYTHON_DESIGN_ENGINE}/health`
        );

        const data = await response.json();

        res.json({
            ok: true,
            node: 'online',
            python: data
        });
    } catch (error: any) {
        res.status(503).json({
            ok: false,
            node: 'online',
            python: 'offline',
            error: error?.message || String(error)
        });
    }
});

/*
 * Generate design through Python
 */

app.post('/design/generate', async (req, res) => {
    try {
        const prompt = String(
            req.body?.prompt || ''
        ).trim();

        const format = String(
            req.body?.format || 'svg'
        ).toLowerCase();

        if (!prompt) {
            res.status(400).json({
                ok: false,
                error: 'prompt is required'
            });
            return;
        }

        if (!['svg', 'html'].includes(format)) {
            res.status(400).json({
                ok: false,
                error: 'format must be svg or html'
            });
            return;
        }

        const result = await generateDesign(
            prompt,
            format
        );

        res.json({
            ok: true,
            source: 'nodejs',
            engine: 'python',
            data: result
        });

    } catch (error: any) {
        res.status(502).json({
            ok: false,
            error:
                error?.message ||
                String(error)
        });
    }
});

/*
 * Serve generated designs
 */

app.use(
    '/designs',
    express.static(DESIGN_DIR)
);

/*
 * ==========================================
 * HTTP SERVER
 * ==========================================
 */

const server = app.listen(
    PORT,
    () => {
        console.log(
            `[Hệ thống] Backend đang chạy tại http://localhost:${PORT}`
        );

        console.log(
            `[Design] Python Engine: ${PYTHON_DESIGN_ENGINE}`
        );
    }
);

/*
 * ==========================================
 * WEBSOCKET SERVER
 * ==========================================
 */

const wss = new WebSocketServer({
    server
});

wss.on(
    'connection',
    (ws: WebSocket) => {

        console.log(
            '[Kết nối] Giao diện Web Agent Console đã kết nối thành công!'
        );

        ws.send(
            JSON.stringify({
                type: 'system',
                data: 'Clriks Agent Console connected'
            })
        );

        ws.on(
            'message',
            async (message) => {

                const command =
                    message
                        .toString()
                        .trim();

                console.log(
                    `[Lệnh nhận được]: ${command}`
                );

                /*
                 * ==================================
                 * AGENT DESIGN
                 * ==================================
                 */

                const designPrefix =
                    'agent design';

                if (
                    command
                        .toLowerCase()
                        .startsWith(designPrefix)
                ) {

                    const prompt =
                        command
                            .slice(
                                designPrefix.length
                            )
                            .trim();

                    if (!prompt) {
                        ws.send(
                            JSON.stringify({
                                type: 'design_error',
                                error:
                                    'Thiếu mô tả thiết kế.'
                            })
                        );

                        return;
                    }

                    try {

                        ws.send(
                            JSON.stringify({
                                type: 'design_status',
                                status: 'generating',
                                prompt
                            })
                        );

                        const result =
                            await generateDesign(
                                prompt,
                                'svg'
                            );

                        ws.send(
                            JSON.stringify({
                                type: 'design_result',
                                data: result
                            })
                        );

                    } catch (error: any) {

                        ws.send(
                            JSON.stringify({
                                type: 'design_error',
                                error:
                                    error?.message ||
                                    String(error)
                            })
                        );
                    }

                    return;
                }

                /*
                 * ==================================
                 * SECURITY GUARDRAIL
                 * ==================================
                 */

                if (
                    command.includes('rm ') ||
                    command.includes('del ')
                ) {

                    ws.send(
                        JSON.stringify({
                            type: 'stderr',
                            data:
                                'Lỗi: Không được phép dùng lệnh xóa hệ thống!'
                        })
                    );

                    return;
                }

                /*
                 * ==================================
                 * NORMAL TERMINAL COMMAND
                 * ==================================
                 */

                exec(
                    command,
                    (error, stdout, stderr) => {

                        if (error) {

                            ws.send(
                                JSON.stringify({
                                    type: 'stderr',
                                    data:
                                        stderr ||
                                        error.message
                                })
                            );

                            return;
                        }

                        ws.send(
                            JSON.stringify({
                                type: 'stdout',
                                data: stdout
                            })
                        );
                    }
                );
            }
        );
    }
);
