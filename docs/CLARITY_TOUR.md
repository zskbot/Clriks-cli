# Clarity Tour — Hướng dẫn tham quan dự án (DeeplyClear style)

Tệp này mô tả "Clarity Tour" cho dự án ShellGrid (Clriks-cli) dưới dạng tài liệu tham quan có cấu trúc. Mục tiêu: cung cấp bản trình bày từng bước (slides/steps) và schema dữ liệu mà nhóm hoặc người đóng góp có thể dùng để xuất bản một tour trực quan (ví dụ trên DeeplyClear hoặc trình xem JSON cục bộ). **Tài liệu này KHÔNG chứa dữ liệu demo hoặc khóa/secret giả.**

## Tổng quan

- Tiêu đề tour: "Clriks-cli — Agent IDE Shell (Tour kỹ thuật)"
- Mục tiêu: giải thích nhanh ý tưởng, kiến trúc và luồng chính (UI terminal, agent planning, GitHub integration, backend đề xuất, sandbox & security) bằng các bước có chú thích và định vị trực quan.
- Link tham khảo gốc (tour gốc): https://www.deeplyclear.com/m/dfdbcb26-6113-4b83-9e90-db88c25c511c?mode=tour

## Cấu trúc tour (slide / step đề xuất)

1. Start — Overview
   - Tiêu đề: "Mục tiêu & Tóm tắt"
   - Nội dung: Mục tiêu dự án, ai là đối tượng sử dụng, tóm tắt 1 câu.
   - Gợi ý caption: "Agent IDE Shell (Clriks-cli): UI tĩnh + backend demo để thử tự động hóa GitHub."

2. UI Terminal
   - Tiêu đề: "Giao diện Terminal"
   - Nội dung: index.html, terminal log, input command, các trạng thái lưu localStorage.
   - Gợi ý caption: "Terminal mô phỏng Termux; localStorage lưu token/repo/memory."

3. Agent Flows
   - Tiêu đề: "Luồng Agent (task / pr / review / bash)"
   - Nội dung: planWithLlm() mô phỏng action (CREATE_TASK / CREATE_PR / RUN_BASH / REVIEW_CODE).
   - Gợi ý caption: "LLM trả JSON kế hoạch → Octokit/gh để thực hiện."

4. GitHub Auth & Integration
   - Tiêu đề: "Xác thực GitHub"
   - Nội dung: OAuth Device Flow (simulateDeviceFlow), endpoints đề xuất: /auth/device-code, /auth/poll, /github/*.
   - Gợi ý caption: "Dùng Device Authorization cho demo; backend giữ tokens an toàn."

5. Backend Endpoints & Responsibilities
   - Tiêu đề: "API backend đề xuất"
   - Nội dung: /agent/plan (LLM → JSON), /bash/run (stream stdout/stderr), /github/issues, /github/pulls, /github/reviews.
   - Gợi ý caption: "Backend chạy container/VM cho sandbox, không chạy lệnh trực tiếp trên host."

6. Sandboxing & Security
   - Tiêu đề: "Bảo mật và sandbox"
   - Nội dung: allowlist lệnh shell, tách môi trường (container/VM), giữ keys ngoài client, audit log, timeout, confirmations cho thao tác ghi.
   - Gợi ý caption: "KHÔNG đặt key thật vào index.html. Dùng file .env private cho backend."

7. State & Persistence
   - Tiêu đề: "Trạng thái phiên"
   - Nội dung: Các key localStorage: clriks.githubToken, clriks.repo, clriks.memory, clriks.region, package list.
   - Gợi ý caption: "Phiên demo lưu trạng thái cục bộ; production cần server-side storage nếu cần share."

8. Cách chạy & đóng góp
   - Tiêu đề: "Chạy nhanh và đóng góp"
   - Nội dung: cách mở index.html tĩnh, ý tưởng triển khai backend, nơi để mở PR, testing checklist cơ bản.

9. Roadmap / Next Steps
   - Tiêu đề: "Bước tiếp theo"
   - Nội dung: thêm endpoints thực, tích hợp LLM function-calling, viewer tour, export/import mindmap JSON, audit & safety review.

## Schema dữ liệu tour (không chứa dữ liệu mẫu)

Dưới đây là schema tham khảo để lưu tour. Tệp JSON thực sẽ theo schema này nhưng tệp này KHÔNG chứa dữ liệu demo.

- tour: { id, title, description, cover_image (url | optional), steps: [] }
- step: { id, nodeId, title, caption, camera: { x?, y?, zoom? }, durationMs?, notes? }
- node: { id, title, body, image? }
- edges: [ { from, to, label? } ]

Ví dụ cấu trúc (ví dụ minh hoạ schema, không chứa nội dung thực):

```json
{
  "tour": {
    "id": "string",
    "title": "string",
    "description": "string",
    "cover_image": "https://...",
    "nodes": [],
    "edges": [],
    "steps": []
  }
}
```

## Hướng dẫn để xem tour cục bộ

1. Tạo một tệp JSON tuân theo schema ở trên (nên lưu ngoài repo nếu có nội dung nhạy cảm).
2. Mở trình duyệt vào một viewer đơn giản (ví dụ: local HTML + JS giúp pan/zoom + caption). Nếu muốn, nhóm có thể phát triển scripts/preview.html để load JSON và chơi từng step.
3. Ngoài ra có thể xuất lên dịch vụ như DeeplyClear để có trải nghiệm Clarity Tour giàu tính năng.

## Ghi chú về bản quyền & nội dung

- Hãy giữ đường link gốc tới tour DeeplyClear trong README và credit cho DeeplyClear nếu bạn sử dụng ảnh/asset từ dịch vụ đó (kiểm tra chính sách sử dụng bên thứ ba trước khi lưu ảnh vào repo).
- Không lưu secrets/keys/token thật trong repo. Sử dụng file .env local và .gitignore để bảo vệ.

---

Nếu bạn muốn, mình sẽ: (chỉ khi bạn tiếp tục cho phép)
- tạo tệp docs/CLARITY_TOUR.md trong repo (không thêm tệp demo hoặc dữ liệu mẫu),
- cập nhật README.md để trỏ tới tài liệu này.

Xác nhận một lần nữa và mình sẽ commit chỉ file docs/CLARITY_TOUR.md và cập nhật README.md (không chèn dữ liệu demo).