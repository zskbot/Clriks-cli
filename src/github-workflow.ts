import { spawn } from 'child_process';
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const WORKSPACE_ROOT = path.resolve(
    process.env.CLRICKS_WORKSPACE_ROOT ||
    path.join(os.tmpdir(), 'clriks-workspaces')
);

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const WORKSPACE_PATTERN = /^[a-f0-9-]{36}$/;
const MAX_OUTPUT_BYTES = 256 * 1024;
const COMMAND_TIMEOUT_MS = 10 * 60 * 1000;

export interface CommandResult {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface Workspace {
    id: string;
    repository: string;
    directory: string;
}

function safeRepository(repository: string): string {
    if (!REPOSITORY_PATTERN.test(repository)) {
        throw new Error('repository must use the owner/repository format');
    }

    return repository;
}

function safeWorkspaceId(workspaceId: string): string {
    if (!WORKSPACE_PATTERN.test(workspaceId)) {
        throw new Error('workspaceId is invalid');
    }

    return workspaceId;
}

function capture(
    command: string,
    args: string[],
    cwd: string
): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            cwd,
            env: {
                ...process.env,
                GIT_TERMINAL_PROMPT: '0',
                CI: 'true'
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';
        let outputBytes = 0;
        let timedOut = false;

        const append = (current: string, chunk: Buffer): string => {
            outputBytes += chunk.length;
            if (outputBytes > MAX_OUTPUT_BYTES) {
                child.kill('SIGTERM');
                return `${current}\n[output truncated: limit reached]\n`;
            }
            return current + chunk.toString();
        };

        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
        }, COMMAND_TIMEOUT_MS);

        child.stdout.on('data', (chunk: Buffer) => {
            stdout = append(stdout, chunk);
        });
        child.stderr.on('data', (chunk: Buffer) => {
            stderr = append(stderr, chunk);
        });
        child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        child.on('close', (exitCode) => {
            clearTimeout(timeout);
            resolve({
                command: [command, ...args].join(' '),
                exitCode: exitCode ?? 1,
                stdout,
                stderr: timedOut
                    ? `${stderr}\n[command timed out after ${COMMAND_TIMEOUT_MS}ms]`
                    : stderr
            });
        });
    });
}

export async function prepareWorkspace(
    repository: string,
    ref?: string
): Promise<Workspace> {
    safeRepository(repository);
    if (ref && !/^[A-Za-z0-9._/-]+$/.test(ref)) {
        throw new Error('ref contains unsupported characters');
    }

    await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
    const id = crypto.randomUUID();
    const directory = path.join(WORKSPACE_ROOT, id);
    const cloneArgs = ['clone', '--depth', '1'];
    if (ref) cloneArgs.push('--branch', ref);
    cloneArgs.push(`https://github.com/${repository}.git`, directory);

    const result = await capture('git', cloneArgs, WORKSPACE_ROOT);
    if (result.exitCode !== 0) {
        await fs.rm(directory, { recursive: true, force: true });
        throw new Error(`Unable to clone repository: ${result.stderr || result.stdout}`);
    }

    return { id, repository, directory };
}

export function workspaceDirectory(workspaceId: string): string {
    return path.join(WORKSPACE_ROOT, safeWorkspaceId(workspaceId));
}

/**
 * Runs a deliberately small command allow-list. Shell syntax is never passed
 * to a shell, preventing command chaining, redirection, and interpolation.
 */
export async function runWorkspaceCommand(
    workspaceId: string,
    command: string
): Promise<CommandResult> {
    const directory = workspaceDirectory(workspaceId);
    const requested = command.trim();
    const allowed = [
        /^npm (?:ci|install|test|run [A-Za-z0-9:_-]+)$/,
        /^pnpm (?:install|test|run [A-Za-z0-9:_-]+)$/,
        /^yarn (?:install|test|run [A-Za-z0-9:_-]+)$/,
        /^pytest(?: [A-Za-z0-9_./:-]+)?$/,
        /^go test(?: [A-Za-z0-9_./:-]+)?$/,
        /^cargo test(?: [A-Za-z0-9_./:-]+)?$/,
        /^make (?:test|check|lint)$/,
        /^git (?:status|diff --check)$/
    ];

    if (!allowed.some((pattern) => pattern.test(requested))) {
        throw new Error('command is not in the workspace allow-list');
    }

    const [program, ...args] = requested.split(/\s+/);
    return capture(program, args, directory);
}

export async function readPullRequestDiff(
    repository: string,
    pullNumber: number,
    accessToken: string
): Promise<string> {
    safeRepository(repository);
    if (!Number.isInteger(pullNumber) || pullNumber < 1) {
        throw new Error('pullNumber must be a positive integer');
    }

    const response = await fetch(
        `https://api.github.com/repos/${repository}/pulls/${pullNumber}`,
        {
            headers: {
                Accept: 'application/vnd.github.v3.diff',
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': 'clriks-cli'
            }
        }
    );

    const diff = await response.text();
    if (!response.ok) {
        throw new Error(`GitHub PR request failed (${response.status}): ${diff}`);
    }
    return diff.slice(0, MAX_OUTPUT_BYTES);
}
