// D:\pos-system-new\ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "aura-brain",
      script: "ollama",
      args: "serve",
      env: { OLLAMA_MODELS: "D:\\ollama_models" },
      autorestart: true
    },
    {
      name: "aura-search-engine",
      // ✅ Using your sovereign virtual environment
      interpreter: "D:\\AuraEnv\\Scripts\\python.exe",
      script: "D:\\aura_search_node.py",
      autorestart: true,
      error_file: "D:\\aura_search_error.log",
      out_file: "D:\\aura_search_out.log"
    },
    {
      name: "aura-brain-tunnel",
      script: "cloudflared",
      args: "tunnel --url http://localhost:11434",
      autorestart: true
    },
    {
      name: "aura-search-tunnel",
      script: "cloudflared",
      args: "tunnel --url http://localhost:8080",
      autorestart: true
    },
    {
      name: "aura-site-tunnel",
      script: "cloudflared",
      args: "tunnel --url http://localhost:3001",
      autorestart: true
    },
    {
      name: "aura-erp",
      cwd: "D:\\pos-system-new",
      // ✅ ROOT FIX: Bypass npm.cmd and run the Next.js engine directly via Node
      script: "./node_modules/next/dist/bin/next",
      args: "start -p 3001", 
      env: { 
        NODE_ENV: "production",
        PORT: 3001
      },
      exec_mode: "fork",
      autorestart: true,
      error_file: "D:\\aura_erp_error.log",
      out_file: "D:\\aura_erp_out.log"
    }
  ]
};