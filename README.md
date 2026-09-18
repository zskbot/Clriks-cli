[![Preview of Clarity Tour](https://www.deeplyclear.com/m/dfdbcb26-6113-4b83-9e90-db88c25c511c/preview.png?v=1787732363528)](docs/CLARITY_TOUR.md)

Frontend tĩnh nên gọi backend Node.js/Python bảo vệ secret và quyền ghi repository. Repository này hiện đã có backend Node.js cho OAuth GitHub, checkout repository tạm thời và chạy test theo allow-list.

Command Prompt là giao diện **web shell** mô phỏng trải nghiệm Termux/shell ngay trong UI web, đồng thời tích hợp luồng agent để tự động hóa GitHub giống Codex.

## Tính năng UI hiện có

- Command Prompt web kết nối WebSocket vào Bash PTY của backend. Chạm bất kỳ vị trí nào trên màn hình terminal đen để mở bàn phím ảo; dòng lệnh được hiển thị trực tiếp trong terminal, không có khung nhập riêng.
- Package manager demo giống Termux: `pkg update`, `pkg upgrade`, `pkg install`, `pkg remove`, `pkg list`.
- File-system command demo: `ls`, `pwd`, `cd`, `mkdir`, `touch`, `cat`, `echo`, `clear`. Lệnh nhập hiển thị màu trắng, lệnh thành công màu xanh, lỗi màu đỏ; trạng thái **RUNNING** có spinner khi backend đang xử lý. Có nút **Sao chép** (vùng chọn hoặc toàn bộ log) và **Dán** (đưa clipboard vào dòng lệnh) trên màn hình terminal.
- Agent IDE command: `agent task ...`, `agent pr ...`, `review <pr>`, `bash <command>`.
- Trang/lệnh tự động hóa môi trường: `setup <tiêu đề>` hoặc `env <từ khoá>` để đề xuất stack, package, file scaffold và checklist bảo mật.
- Menu 3 gạch mở drawer bên phải với các trang Docs, Packages, Agent IDE, Settings, Roadmap và Security.
- Quick action buttons để chạy nhanh `pkg update`, `pkg install nodejs`, tạo PR bằng agent và review PR.
- Trạng thái shell được lưu bằng `localStorage`: package đã cài, thư mục hiện tại, repo, token demo và memory.


## Quy tắc sử dụng bắt buộc

Trước khi chạy lệnh lần đầu, người dùng **phải** gõ `rules`, đọc quy tắc và gõ `accept rules`. Command Prompt chặn mọi lệnh khác cho đến khi xác nhận.

1. Chỉ sử dụng môi trường và repository mà bạn được ủy quyền.
2. Không nhập token, mật khẩu, private key hoặc dữ liệu bí mật vào terminal hay log.
3. Kiểm tra kỹ lệnh trước khi chạy; không chạy lệnh xóa/phá hủy dữ liệu hoặc lệnh không rõ nguồn gốc.
4. Xác minh `owner/repository` trước mọi thao tác GitHub có thể thay đổi dữ liệu.
5. Lỗi terminal hiển thị **màu đỏ**. Đọc và sửa nguyên nhân thay vì lặp lại thao tác nguy hiểm.

## Lệnh demo

```text
rules
accept rules
login
task thêm API kết nối GitHub
pr sửa lỗi giao diện dashboard
ls -la
git status
npm test
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
3. `GET /github/account` kiểm tra access token và trả về tài khoản GitHub đang kết nối; `GET /github/repositories/:owner/:repo` xác nhận repository mà tài khoản có thể truy cập trước khi lưu lựa chọn trên giao diện.
4. `POST /workspaces` với `{ "repository": "owner/repo", "ref": "main" }` để clone shallow vào thư mục tạm riêng biệt. Chỉ repository/ref hợp lệ mới được chấp nhận.
5. `POST /workspaces/:workspaceId/run` với `{ "command": "npm test" }` để chạy install/test/lint đã allow-list. Lệnh được gọi bằng argv (không qua `bash -c`), giới hạn 10 phút và tối đa 256 KiB output.
6. `POST /github/pulls/:pullNumber/review-context` với body `{ "repository": "owner/repo" }` và `Authorization: Bearer <access_token>` để lấy diff PR phục vụ LLM review. Endpoint này chỉ đọc; việc ghi review phải là một endpoint riêng có xác nhận người dùng.

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
