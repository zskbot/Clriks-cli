// Clriks-cli Agent API demo skeleton
// Copy file này thành server.js rồi thay key trong process.env hoặc .env.local.
// Đây là mẫu tối giản để bạn biết nơi dán key và nối GitHub + LLM + shell sandbox.

const config = {
  githubClientId: process.env.GITHUB_CLIENT_ID || 'Iv1.demo_client_id_here',
  githubToken: process.env.GITHUB_TOKEN || 'ghp_demo_token_paste_here',
  openAiKey: process.env.OPENAI_API_KEY || 'sk-demo_paste_your_openai_key_here',
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  repo: process.env.CLRICKS_DEFAULT_REPO || 'owner/repository',
  sandbox: process.env.CLRICKS_AGENT_SANDBOX || 'enabled'
};

const allowedShellCommands = [
  'apt update',
  'apt upgrade',
  'pkg update',
  'pkg upgrade',
  'pkg install',
  'pkg uninstall',
  'node --version',
  'npm --version',
  'git status',
  'git diff',
  'gh pr list'
];

function buildAgentPrompt(userCommand, repoTree = []) {
  return {
    role: 'system',
    content: [
      'Bạn là Clriks Agent IDE, một assistant tự động hóa GitHub workflow.',
      'Luôn trả JSON có action, safety, commands, files_to_edit và summary.',
      'Không chạy lệnh nguy hiểm ngoài allowlist nếu chưa có xác nhận.',
      `Repo mặc định: ${config.repo}`,
      `Repo tree: ${repoTree.join(', ')}`,
      `User command: ${userCommand}`
    ].join('\n')
  };
}

function isAllowedShellCommand(command) {
  return allowedShellCommands.some(prefix => command === prefix || command.startsWith(prefix + ' '));
}

module.exports = {
  config,
  allowedShellCommands,
  buildAgentPrompt,
  isAllowedShellCommand
};
