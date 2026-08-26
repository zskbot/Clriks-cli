# Clriks-cli

Giao diện Clriks-cli hiện là một Agent Console tĩnh mô phỏng luồng tự động hóa GitHub giống Codex:

- GitHub OAuth Device Flow (`login`) với mã xác nhận và polling token.
- Router lệnh tự nhiên qua mô phỏng LLM function calling.
- Các action cốt lõi: tạo Task/GitHub Issue, tạo PR, chạy Bash và review code.
- SPA panel cho Tài liệu, Cấu hình, API Kết nối và Cộng đồng.
- Đồng bộ trạng thái repo, token demo, memory và region qua `localStorage`.

## Lệnh demo

```text
login
task thêm API kết nối GitHub
pr sửa lỗi giao diện dashboard
bash gh pr list
review 12
set repo owner/project
set memory 256MB
```

## Kiến trúc backend đề xuất

Frontend tĩnh nên gọi một backend Node.js/Python bảo vệ secret và quyền ghi repository:

1. `/auth/device-code` và `/auth/poll` gọi GitHub OAuth Device Authorization Grant.
2. `/agent/plan` gọi LLM với yêu cầu trả JSON có cấu trúc.
3. `/github/issues`, `/github/pulls`, `/github/reviews` thực thi qua Octokit hoặc GitHub CLI.
4. `/bash/run` stream `stdout`/`stderr` từ process sandboxed về terminal log.
