import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import {
    spawn,
    ChildProcessWithoutNullStreams
} from 'child_process';
import dotenv from 'dotenv';
import path from 'path';
import {
    prepareWorkspace,
    readPullRequestDiff,
    runWorkspaceCommand
} from './github-workflow';

dotenv.config();

const app = express();

const PORT =
    Number(process.env.PORT || 3000);

const PYTHON_DESIGN_ENGINE =
    process.env.CLRICKS_PYTHON_DESIGN_URL ||
    'http://127.0.0.1:8789';

const DESIGN_DIR =
    path.resolve(
        process.cwd(),
        'data/designs'
    );

app.use(express.json());

function githubClientId(): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId || clientId.startsWith('Iv1.demo_')) {
        throw new Error('GITHUB_CLIENT_ID must be configured on the backend');
    }
    return clientId;
}

function bearerToken(header?: string): string {
    const match = header?.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new Error('GitHub access token is required');
    return match[1];
}

/* =========================================================
   GITHUB AUTH + ISOLATED REPOSITORY WORKFLOW
   ========================================================= */

app.post('/auth/github/device-code', async (req, res) => {
    try {
        const response = await fetch('https://github.com/login/device/code', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: githubClientId(), scope: req.body?.scope || 'repo read:user' })
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        res.status(500).json({ ok: false, error: error.message || String(error) });
    }
});

app.post('/auth/github/poll', async (req, res) => {
    try {
        const deviceCode = String(req.body?.deviceCode || '');
        if (!deviceCode) throw new Error('deviceCode is required');
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: githubClientId(),
                device_code: deviceCode,
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
            })
        });
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error: any) {
        res.status(400).json({ ok: false, error: error.message || String(error) });
    }
});

app.post('/workspaces', async (req, res) => {
    try {
        const repository = String(req.body?.repository || '');
        const ref = req.body?.ref ? String(req.body.ref) : undefined;
        const workspace = await prepareWorkspace(repository, ref);
        res.status(201).json({ ok: true, workspace: { id: workspace.id, repository: workspace.repository } });
    } catch (error: any) {
        res.status(400).json({ ok: false, error: error.message || String(error) });
    }
});

app.post('/workspaces/:workspaceId/run', async (req, res) => {
    try {
        const result = await runWorkspaceCommand(
            req.params.workspaceId,
            String(req.body?.command || '')
        );
        res.status(result.exitCode === 0 ? 200 : 422).json({ ok: result.exitCode === 0, result });
    } catch (error: any) {
        res.status(400).json({ ok: false, error: error.message || String(error) });
    }
});

app.post('/github/pulls/:pullNumber/review-context', async (req, res) => {
    try {
        const repository = String(req.body?.repository || '');
        const accessToken = bearerToken(req.header('authorization'));
        const diff = await readPullRequestDiff(repository, Number(req.params.pullNumber), accessToken);
        res.json({ ok: true, repository, pullNumber: Number(req.params.pullNumber), diff });
    } catch (error: any) {
        res.status(400).json({ ok: false, error: error.message || String(error) });
    }
});

/* =========================================================
   DESIGN ENGINE
   ========================================================= */

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

app.get(
    '/design/health',
    async (_req, res) => {
        try {
            const response = await fetch(
                `${PYTHON_DESIGN_ENGINE}/health`
            );

            const data =
                await response.json();

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
                error:
                    error?.message ||
                    String(error)
            });
        }
    }
);

app.post(
    '/design/generate',
    async (req, res) => {

        try {

            const prompt =
                String(
                    req.body?.prompt || ''
                ).trim();

            const format =
                String(
                    req.body?.format || 'svg'
                ).toLowerCase();

            if (!prompt) {
                res.status(400).json({
                    ok: false,
                    error:
                        'prompt is required'
                });
                return;
            }

            if (
                !['svg', 'html']
                    .includes(format)
            ) {
                res.status(400).json({
                    ok: false,
                    error:
                        'format must be svg or html'
                });
                return;
            }

            const result =
                await generateDesign(
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
    }
);

app.use(
    '/designs',
    express.static(DESIGN_DIR)
);

/* =========================================================
   HTTP
   ========================================================= */

const server =
    app.listen(
        PORT,
        () => {

            console.log(
                `[Clriks] Backend listening on ${PORT}`
            );

            console.log(
                `[Design] Python Engine: ${PYTHON_DESIGN_ENGINE}`
            );

            console.log(
                '[Shell] Persistent interactive Bash PTY enabled'
            );
        }
    );

/* =========================================================
   PERSISTENT BASH SESSION
   ========================================================= */

interface ShellSession {
    process:
        ChildProcessWithoutNullStreams;

    cwd: string;
}

function send(
    ws: WebSocket,
    type: string,
    data: unknown
) {
    if (
        ws.readyState ===
        WebSocket.OPEN
    ) {
        ws.send(
            JSON.stringify({
                type,
                data
            })
        );
    }
}

function createShell(
    ws: WebSocket
): ShellSession {

    /*
     * `script` allocates a real pseudo-terminal.
     *
     * Bash remains alive for the lifetime of
     * the WebSocket connection.
     */
    const shell =
        spawn(
            'script',
            [
                '-q',
                '/dev/null',
                '-c',
                'bash --noprofile --norc -i'
            ],
            {
                cwd: process.cwd(),

                env: {
                    ...process.env,

                    TERM:
                        'xterm-256color',

                    COLORTERM:
                        'truecolor',

                    LANG:
                        process.env.LANG ||
                        'en_US.UTF-8',

                    LC_ALL:
                        process.env.LC_ALL ||
                        process.env.LANG ||
                        'en_US.UTF-8',

                    FORCE_COLOR:
                        '1'
                },

                stdio: [
                    'pipe',
                    'pipe',
                    'pipe'
                ]
            }
        );

    const session: ShellSession = {
        process: shell,
        cwd: process.cwd()
    };

    shell.stdout.on(
        'data',
        (data: Buffer) => {

            send(
                ws,
                'stdout',
                data.toString()
            );
        }
    );

    shell.stderr.on(
        'data',
        (data: Buffer) => {

            send(
                ws,
                'stderr',
                data.toString()
            );
        }
    );

    shell.on(
        'error',
        (error) => {

            send(
                ws,
                'stderr',
                error.message
            );
        }
    );

    shell.on(
        'exit',
        (code, signal) => {

            send(
                ws,
                'shell_exit',
                {
                    code,
                    signal
                }
            );
        }
    );

    /*
     * Keep Bash output clean and make the
     * working directory obvious.
     */
    setTimeout(() => {

        if (!shell.stdin.writable) {
            return;
        }

        shell.stdin.write(
            'export PS1="usr@clriks:\\w$ "\n'
        );

        shell.stdin.write(
            'export PS2="> "\n'
        );

        shell.stdin.write(
            'export TERM="xterm-256color"\n'
        );

    }, 50);

    return session;
}

/* =========================================================
   WEBSOCKET
   ========================================================= */

const wss =
    new WebSocketServer({
        server
    });

wss.on(
    'connection',
    (ws: WebSocket) => {

        console.log(
            '[Shell] Persistent terminal connected'
        );

        const session =
            createShell(ws);

        const shell =
            session.process;

        send(
            ws,
            'system',
            'Clriks persistent Bash session connected'
        );

        ws.on(
            'message',
            async (message) => {

                if (
                    shell.exitCode !== null ||
                    !shell.stdin.writable
                ) {
                    return;
                }

                const raw =
                    message.toString();

                /*
                 * JSON protocol:
                 *
                 * input:
                 *   arbitrary stdin
                 *
                 * signal:
                 *   SIGINT / SIGTSTP / etc.
                 */
                let parsed:
                    any = null;

                try {
                    parsed =
                        JSON.parse(raw);
                } catch {
                    parsed = null;
                }

                if (
                    parsed &&
                    typeof parsed === 'object'
                ) {

                    if (
                        parsed.type === 'input'
                    ) {

                        const data =
                            String(
                                parsed.data ?? ''
                            );

                        if (data) {
                            shell.stdin.write(
                                data
                            );
                        }

                        return;
                    }

                    if (
                        parsed.type === 'signal'
                    ) {

                        const signal =
                            String(
                                parsed.signal ||
                                'SIGINT'
                            ) as NodeJS.Signals;

                        try {
                            shell.kill(signal);
                        } catch {}

                        return;
                    }

                    return;
                }

                /*
                 * Backward compatibility:
                 * plain WebSocket text = stdin.
                 */
                shell.stdin.write(raw);
            }
        );

        ws.on(
            'close',
            () => {

                console.log(
                    '[Shell] Terminal disconnected'
                );

                try {
                    shell.kill(
                        'SIGTERM'
                    );
                } catch {}
            }
        );

        ws.on(
            'error',
            () => {

                try {
                    shell.kill(
                        'SIGTERM'
                    );
                } catch {}
            }
        );
    }
);

console.log(
    '[Clriks] Persistent Bash PTY initialized'
);
