# Clriks-cli

Clriks-cli là giao diện **Agent IDE Shell** mô phỏng trải nghiệm Termux/shell ngay trong UI web, đồng thời tích hợp luồng agent để tự động hóa GitHub giống Codex.

## Tính năng UI hiện có

- Terminal log động với prompt kiểu shell (`u0@clriks:~$`).
- Package manager demo giống Termux: `pkg update`, `pkg upgrade`, `pkg install`, `pkg remove`, `pkg list`.
- File-system command demo: `ls`, `pwd`, `cd`, `mkdir`, `touch`, `cat`, `echo`, `clear`.
- Agent IDE command: `agent task ...`, `agent pr ...`, `review <pr>`, `bash <command>`.
- Trang/lệnh tự động hóa môi trường: `setup <tiêu đề>` hoặc `env <từ khoá>` để đề xuất stack, package, file scaffold và checklist bảo mật.
- Menu 3 gạch mở drawer bên phải với các trang Docs, Packages, Agent IDE, Settings, Roadmap và Security.
- Quick action buttons để chạy nhanh `pkg update`, `pkg install nodejs`, tạo PR bằng agent và review PR.
- Trạng thái shell được lưu bằng `localStorage`: package đã cài, thư mục hiện tại, repo, token demo và memory.

## Lệnh demo

```text
help
pkg update
pkg install python openai
pkg list
setup web react github agent
env python fastapi ai
ls
mkdir demo
cd ~/config
cat keys.demo.env
login
set repo owner/project
agent task thêm API kết nối GitHub
agent pr sửa lỗi giao diện dashboard
bash gh pr list
review 12
clear
```

## File mẫu để dán key/API

- `config/keys.demo.env`: mẫu biến môi trường để bạn copy thành `.env.local` và dán GitHub/OpenAI key thật ở backend.
- `agent/api-agent.demo.js`: mẫu module Node.js cho agent API, prompt builder và allowlist lệnh shell an toàn.

## Tự động hoá setup môi trường

Người dùng có thể nhập tiêu đề hoặc từ khoá tự nhiên, ví dụ `setup web react github agent`, `env python fastapi ai`, hoặc `setup mobile android termux`. UI sẽ sinh kế hoạch môi trường gồm:

- Stack phù hợp với từ khoá.
- Danh sách package cần cài.
- File scaffold nên tạo.
- Lệnh bootstrap tiếp theo.
- Checklist bảo mật trước khi chạy thật trên backend.

## Kiến trúc backend đề xuất

Frontend tĩnh chỉ nên là console điều khiển. Phần thực thi thật nên nằm trong backend Node.js/Python để bảo vệ secret và giới hạn quyền:

1. `/auth/device-code` và `/auth/poll` gọi GitHub OAuth Device Authorization Grant.
2. `/agent/plan` gọi LLM với yêu cầu trả JSON có cấu trúc.
3. `/github/issues`, `/github/pulls`, `/github/reviews` thực thi qua Octokit hoặc GitHub CLI.
4. `/bash/run` stream `stdout`/`stderr` từ process sandboxed về terminal log.
5. `/packages/install` chạy package manager trong container hoặc VM sandbox thay vì chạy trực tiếp trên host.

## Lưu ý bảo mật

Không đưa key thật vào `index.html`. Hãy copy `config/keys.demo.env` thành file local/private và để backend đọc bằng biến môi trường. Shell production cần allowlist, timeout, container sandbox và xác nhận người dùng trước các thao tác ghi như commit/push/PR.
