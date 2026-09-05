import { exec } from 'child_process';

/**
 * Hàm thực thi các lệnh hệ thống an toàn (Ví dụ: `gh pr list`, `git status`)
 * @param command Câu lệnh terminal cần chạy
 */
export function executeTerminalCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
        // Giới hạn các lệnh nguy hiểm nếu cần thiết (Guardrail ngăn chặn rm -rf, v.v.)
        if (command.includes('rm ') || command.includes('del ')) {
            return reject(new Error("Hành động bị từ chối: Lệnh chứa từ khóa nguy hiểm xóa dữ liệu."));
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`[Lỗi thực thi]: ${stderr || error.message}`);
                return;
            }
            resolve(stdout);
        });
    });
}
