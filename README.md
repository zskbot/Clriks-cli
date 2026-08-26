[![Preview of Clarity Tour](https://www.deeplyclear.com/m/dfdbcb26-6113-4b83-9e90-db88c25c511c/preview.png?v=1787732363528)](docs/CLARITY_TOUR.md)

Frontend tĩnh nên gọi một backend Node.js/Python bảo vệ secret và quyền ghi repository:

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
login
task thêm API kết nối GitHub
pr sửa lỗi giao diện dashboard
bash gh pr list
review 12
set repo owner/project
set memory 256MB
```

## Kiến trúc backend đề xuất

1. `/auth/device-code` và `/auth/poll` gọi GitHub OAuth Device Authorization Grant.
2. `/agent/plan` gọi LLM với yêu cầu trả JSON có cấu trúc.
3. `/github/issues`, `/github/pulls`, `/github/reviews` thực thi qua Octokit hoặc GitHub CLI.
4. `/bash/run` stream `stdout`/`stderr` từ process sandboxed về terminal log.
5. `/packages/install` chạy package manager trong container hoặc VM sandbox thay vì chạy trực tiếp trên host.

## Lưu ý bảo mật

Không đưa key thật vào `index.html`. Hãy copy `config/keys.demo.env` thành file local/private và để backend đọc bằng biến môi trường. Shell production cần allowlist, timeout, container sandbox và confirmation trước khi ghi repository.

## Clarity Tour

Xem tài liệu tham quan kỹ thuật (Clarity Tour) để có bản trình bày từng bước, schema và hướng dẫn xem tour:

- docs/CLARITY_TOUR.md

