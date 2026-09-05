import readline from 'readline';

// Giả lập localStorage trong môi trường Node.js (Hoặc dùng window.localStorage nếu chạy trên trình duyệt)
const mockLocalStorage: Record<string, string> = {};

console.log("[18:01:12] Initializing Clriks-cli Agent Console...");
console.log("[18:01:12] [OK] Command input, GitHub automation router và localStorage đã sẵn sàng.");
console.log("[18:01:12] Gõ \"login\", \"task thêm API\", \"pr sửa UI\", \"bash gh pr list\" hoặc \"review 12\".\n");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showDocs() {
    console.log("\n[18:01:20] Mở panel DOCS trong SPA state");
    console.log("[18:01:20] # Tài liệu Agent");
    console.log("[18:01:20] login: bắt đầu GitHub OAuth Device Flow.");
    console.log("[18:01:20] task <mô tả>: tạo GitHub Issue từ yêu cầu tự nhiên.");
    console.log("[18:01:20] pr <mô tả>: lập kế hoạch nhánh, sửa file, commit, push và mở PR.");
    console.log("[18:01:20] bash <lệnh>: chạy lệnh terminal qua backend Node.js child_process.");
    console.log("[18:01:20] review <pr>: lấy diff và yêu cầu LLM review bảo mật/hiệu năng.\n");
}

function startConsole() {
    // Tự động mở tài liệu khi khởi tạo giống như log của bạn
    showDocs();

    const askCommand = () => {
        rl.question('usr@clriks:~$ ', async (input) => {
            const command = input.trim();

            if (command === 'gh auth login' || command === 'login') {
                console.log("[18:01:33] usr@clriks:~$ gh auth login");
                // Gọi sang bộ não LLM để chặn lại và phân tích ý định bảo mật
                console.log('[18:01:33] LLM function_call → {"action":"CHAT_OR_PLAN","summary":"LLM phân tích ý định tự nhiên và yêu cầu xác nhận trước khi ghi repository."}');
                console.log("\n[Hệ thống]: Vui lòng xác nhận (Y/N) để tiếp tục thực hiện hành động ghi vào repo.");
            } 
            else if (command.startsWith('bash ')) {
                const execCmd = command.replace('bash ', '');
                console.log(`[18:01:20] Đang kích hoạt backend child_process để thực thi lệnh: "${execCmd}"`);
                // Luồng này sẽ gọi file executor bên dưới
            }
            else if (command === 'exit') {
                rl.close();
                return;
            } 
            else {
                console.log(`[Agent]: Nhận lệnh tự nhiên -> "${command}". Đang chuyển tiếp sang router tự động hóa...`);
            }
            
            askCommand();
        });
    };

    askCommand();
}

startConsole();
