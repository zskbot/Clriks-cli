[![Preview of Clarity Tour](https://www.deeplyclear.com/m/dfdbcb26-6113-4b83-9e90-db88c25c511c/preview.png?v=1787732363528)](docs/CLARITY_TOUR.md)

Frontend tĩnh nên gọi backend Node.js/Python bảo vệ secret và quyền ghi repository. Repository này hiện đã có backend Node.js cho OAuth GitHub, checkout repository tạm thời và chạy test theo allow-list.

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

## Kiến trúc backend

1. `/auth/github/device-code` và `/auth/github/poll` gọi GitHub OAuth Device Authorization Grant.
2. `/agent/plan` gọi LLM với yêu cầu trả JSON có cấu trúc.
3. `/github/issues`, `/github/pulls`, `/github/reviews` thực thi qua Octokit hoặc GitHub CLI.
4. `/workspaces/:workspaceId/run` stream `stdout`/`stderr` từ process sandboxed về terminal log.
5. `/packages/install` chạy package manager trong container hoặc VM sandbox thay vì chạy trực tiếp trên host.

## Quy trình GitHub, PR review và chạy test

Khởi động backend bằng `npm run dev`, sau đó frontend gọi các API sau. Token OAuth chỉ đi trong header `Authorization`; backend không lưu token vào workspace hoặc log.

1. `POST /auth/github/device-code` nhận `device_code`, `user_code` và `verification_uri` của GitHub Device Flow. Hiển thị `user_code` để người dùng xác thực tài khoản GitHub.
2. Poll `POST /auth/github/poll` với `{ "deviceCode": "..." }` theo `interval` GitHub trả về cho đến khi nhận `access_token`.
3. `POST /workspaces` với `{ "repository": "owner/repo", "ref": "main" }` để clone shallow vào thư mục tạm riêng biệt. Chỉ repository/ref hợp lệ mới được chấp nhận.
4. `POST /workspaces/:workspaceId/run` với `{ "command": "npm test" }` để chạy install/test/lint đã allow-list. Lệnh được gọi bằng argv (không qua `bash -c`), giới hạn 10 phút và tối đa 256 KiB output.
5. `POST /github/pulls/:pullNumber/review-context` với body `{ "repository": "owner/repo" }` và `Authorization: Bearer <access_token>` để lấy diff PR phục vụ LLM review. Endpoint này chỉ đọc; việc ghi review phải là một endpoint riêng có xác nhận người dùng.

Ví dụ chạy test:

```bash
curl -X POST http://localhost:3000/workspaces/<workspaceId>/run \
  -H 'content-type: application/json' \
  -d '{"command":"npm test"}'
```

## Lưu ý bảo mật

Không đưa key thật vào `index.html`. Hãy copy `env.template` thành `.env` local/private và để backend đọc bằng biến môi trường. Device Flow dùng `GITHUB_CLIENT_ID`; không đưa client secret hoặc access token vào frontend. Workspace hiện là thư mục tạm với command allow-list; production vẫn nên chạy service này trong container/VM không đặc quyền, đặt quota CPU/RAM/network và confirmation trước khi ghi repository.

## Clarity Tour

Xem tài liệu tham quan kỹ thuật (Clarity Tour) để có bản trình bày từng bước, schema và hướng dẫn xem tour:

- docs/CLARITY_TOUR.md
