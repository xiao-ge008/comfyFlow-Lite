#!/usr/bin/env node

/**
 * CLI工具：列出所有可用的端点
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(process.cwd(), '.data', 'workflows.json');

function readWorkflows() {
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }

  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading workflows:', error.message);
    return [];
  }
}

function toPascalCase(str) {
  return str
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function main() {
  console.log('🚀 ComfyFlow-Lite 端点列表\n');

  const workflows = readWorkflows();

  if (workflows.length === 0) {
    console.log('❌ 没有找到任何工作流');
    console.log('💡 提示：首先通过 Web 界面创建一个工作流');
    return;
  }

  console.log(`📊 共找到 ${workflows.length} 个工作流:\n`);

  workflows.forEach((workflow, index) => {
    const restEndpoint = `/api/generate/${workflow.endpoint}`;
    const mcpMethod = `generate${toPascalCase(workflow.endpoint)}`;
    
    console.log(`${index + 1}. ${workflow.name}`);
    console.log(`   📄 描述: ${workflow.description || '无描述'}`);
    console.log(`   🔗 REST: POST localhost:3000${restEndpoint}`);
    console.log(`   🔧 MCP:  ${mcpMethod}()`);
    
    if (workflow.mappings && workflow.mappings.length > 0) {
      console.log(`   📝 参数: ${workflow.mappings.map(m => m.paramName).join(', ')}`);
    } else {
      console.log(`   📝 参数: 无`);
    }
    
    console.log('');
  });

  console.log('🌐 Web 管理界面: http://localhost:3000');
  console.log('📖 使用帮助: npm run cli:call <endpoint> <json>');
}

main();