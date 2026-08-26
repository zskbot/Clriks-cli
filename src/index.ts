import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { Octokit } from '@octokit/core';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
let userAccessToken: string | null = null;

// ==========================================
// 1. AUTHENTICATION FLOW (ĐĂNG NHẬP)
// ==========================================

// BƯỚC A: POST /auth/device-code
app.post('/auth/device-code', (req: Request, res: Response) => {
    console.log('[17:47:58] POST /auth/device-code → GitHub device code.');
    // Giả lập mã phản hồi từ GitHub API gửi về thiết bị
    res.json({
        device_code: "3584d83530557fdd1f46af82899",
        user_code: "WDTS-XGPH",
        verification_uri: "https://github.com",
        expires_in: 900,
        interval: 5
    });
});

// BƯỚC B: POST /auth/poll
app.post('/auth/poll', (req: Request, res: Response) => {
    console.log('[17:47:58] POST /auth/poll → access_token.');
    // Giả lập sau khi người dùng nhấn đồng ý trên trình duyệt, server nhận token
    userAccessToken = "gho_mock_access_token_1234567890abcdef";
    res.json({
        access_token: userAccessToken,
        token_type: "bearer",
        scope: "repo,user"
    });
});

// ==========================================
// 2. LLM BRAIN (BỘ NÃO LLM)
// ==========================================

// BƯỚC C: POST /agent/plan (LLM nhận lệnh tự nhiên và lập kế hoạch cấu trúc JSON)
app.post('/agent/plan', (req: Request, res: Response) => {
    console.log('[17:47:58] POST /agent/plan → LLM trả JSON action.');
    const { prompt } = req.body;

    console.log(`[LLM] Đang phân tích yêu cầu: "${prompt || 'Hãy tạo một issue báo lỗi db'}"`);

    // Giả lập cấu trúc dữ liệu JSON mà LLM thông minh trả về
    const mockLLMResponse = {
        action: "CHAT_OR_PLAN",
        summary: "LLM phân tích ý định tự nhiên và yêu cầu xác nhận trước khi ghi repository.",
        plan: {
            target: "github/issues",
            payload: {
                owner: "clriks",
                repo: "my-app",
                title: "Bug: Kết nối Database thất bại",
                body: "Hệ thống bị mất kết nối tới DB vào lúc 17:40. Cần kiểm tra lại cấu hình kết nối mạng."
            }
        }
    };

    res.json(mockLLMResponse);
});

// ==========================================
// 3. EXECUTION FLOW (THỰC THI QUA GITHUB API)
// ==========================================

// BƯỚC D: POST /github/issues (Octokit thực thi ghi dữ liệu lên repo)
app.post('/github/issues', async (req: Request, res: Response) => {
    console.log('[17:47:58] POST /github/issues → Octokit thực thi.');
    const { owner, repo, title, body, confirmed } = req.body;

    // Cơ chế an toàn (Guardrail) ngăn chặn việc ghi nếu chưa có xác nhận từ CLI
    if (!confirmed) {
        return res.status(400).json({ 
            error: "Security Block", 
            message: "Hành động ghi bị từ chối. Vui lòng xác nhận trên CLI trước!" 
        });
    }

    try {
        // Khởi tạo Octokit với Token của User (Ở đây dùng token giả định để minh họa)
        const octokit = new Octokit({ auth: userAccessToken || 'mock_token' });
        
        console.log(`[Octokit] Đang tiến hành tạo Issue "${title}" trên repository ${owner}/${repo}...`);
        
        /* 
        MÃ THỰC TẾ SẼ CHẠY KHI CÓ TOKEN THẬT:
        const response = await octokit.request('POST /repos/{owner}/{repo}/issues', {
            owner,
            repo,
            title,
            body
        });
        */

        res.json({
            status: "success",
            message: "Issue đã được tạo thành công trên GitHub bằng Octokit!",
            issue_url: `https://github.com{owner}/${repo}/issues/1`
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Khởi chạy server
app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(` AI AGENT BACKEND SERVER IS RUNNING ON PORT ${PORT}`);
    console.log(`=================================================`);
});
