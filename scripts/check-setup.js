#!/usr/bin/env node
/**
 * 检查项目设置和依赖
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 检查 ComfyFlow-Lite 项目设置...\n');

// 检查 Node.js 版本
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
console.log(`📦 Node.js 版本: ${nodeVersion}`);
if (majorVersion < 18) {
  console.log('⚠️  警告: 建议使用 Node.js 18 或更高版本');
} else {
  console.log('✅ Node.js 版本符合要求');
}

// 检查必要文件
console.log('\n📁 检查项目文件:');
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'lib/database/schema.sql',
  '.env.local.example'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - 缺失`);
    allFilesExist = false;
  }
}

// 检查 .data 目录
console.log('\n💾 检查数据目录:');
const dataDir = path.join(process.cwd(), '.data');
if (!fs.existsSync(dataDir)) {
  console.log('📁 .data 目录不存在，将在首次启动时自动创建');
} else {
  console.log('✅ .data 目录已存在');
  
  const dbFile = path.join(dataDir, 'comfyflow.db');
  if (fs.existsSync(dbFile)) {
    console.log('✅ 数据库文件已存在');
  } else {
    console.log('📄 数据库文件不存在，将在首次启动时自动创建');
  }
}

// 检查环境变量
console.log('\n⚙️  检查环境配置:');
if (fs.existsSync('.env.local')) {
  console.log('✅ .env.local 文件已存在');
} else {
  console.log('📝 .env.local 文件不存在');
  console.log('   如需自定义 ComfyUI 地址，请复制 .env.local.example 为 .env.local');
}

// 检查 ComfyUI 连接
console.log('\n🔗 检查 ComfyUI 连接:');
const comfyUrl = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
console.log(`   尝试连接: ${comfyUrl}`);

const url = new URL(comfyUrl);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: '/system_stats',
  method: 'GET',
  timeout: 3000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ ComfyUI 连接成功');
  } else {
    console.log(`⚠️  ComfyUI 响应状态码: ${res.statusCode}`);
  }
  
  printSummary();
});

req.on('error', (err) => {
  console.log('❌ 无法连接到 ComfyUI');
  console.log('   请确保 ComfyUI 正在运行，或在 .env.local 中配置正确的地址');
  
  printSummary();
});

req.on('timeout', () => {
  console.log('⏱️  连接 ComfyUI 超时');
  req.destroy();
  printSummary();
});

req.end();

function printSummary() {
  console.log('\n📋 设置总结:');
  
  if (allFilesExist) {
    console.log('✅ 所有必要文件都存在');
  } else {
    console.log('❌ 部分文件缺失，请检查项目完整性');
  }
  
  console.log('\n🚀 启动命令:');
  console.log('   开发模式: npm run dev');
  console.log('   生产模式: npm run build && npm run start');
  console.log('\n📖 访问地址:');
  console.log('   主界面: http://localhost:3000');
  console.log('   工作流管理: http://localhost:3000/workflow-admin');
  console.log('   关键词管理: http://localhost:3000/keyword-admin');
}
