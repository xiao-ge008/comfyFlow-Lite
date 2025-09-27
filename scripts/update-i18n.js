#!/usr/bin/env node

/**
 * 批量更新组件以支持国际化的脚本
 * 这个脚本会自动为组件添加 useTranslation hook 和替换常见的硬编码文本
 */

const fs = require('fs');
const path = require('path');

// 需要更新的组件列表
const componentsToUpdate = [
  'components/DashboardView.tsx',
  'components/WorkflowsView.tsx',
  'components/ApiTestView.tsx',
  'components/AIChatView.tsx',
  'components/KeywordManagementView.tsx',
  'components/AIConfigView.tsx',
  'components/WorkflowCreateDialog.tsx',
  'components/WorkflowMappingDialog.tsx',
  'components/KeywordCreateDialog.tsx',
  'components/KeywordImportDialog.tsx',
  'components/KeywordListView.tsx',
  'components/ApiDocDialog.tsx',
  'components/ImageModal.tsx'
];

// 常见的文本替换映射
const textReplacements = {
  // 按钮文本
  '创建': "t('buttons.create')",
  '编辑': "t('buttons.edit')",
  '删除': "t('buttons.delete')",
  '保存': "t('buttons.save')",
  '取消': "t('buttons.cancel')",
  '确认': "t('buttons.confirm')",
  '关闭': "t('buttons.close')",
  '上传': "t('buttons.upload')",
  '导入': "t('buttons.import')",
  '导出': "t('buttons.export')",
  '测试': "t('buttons.test')",
  '运行': "t('buttons.run')",
  '刷新': "t('buttons.refresh')",
  '重置': "t('buttons.reset')",
  '清空': "t('buttons.clear')",
  '搜索': "t('buttons.search')",
  
  // 消息文本
  '操作成功': "t('messages.success')",
  '操作失败': "t('messages.error')",
  '加载中...': "t('messages.loading')",
  '暂无数据': "t('messages.noData')",
  '保存成功': "t('messages.saveSuccess')",
  '保存失败': "t('messages.saveError')",
  '删除成功': "t('messages.deleteSuccess')",
  '删除失败': "t('messages.deleteError')",
  
  // 表单文本
  '名称': "t('forms.name')",
  '描述': "t('forms.description')",
  '类型': "t('forms.type')",
  '状态': "t('forms.status')",
  '操作': "t('forms.actions')",
  '必填': "t('forms.required')",
  '可选': "t('forms.optional')",
};

function updateComponent(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // 检查是否已经导入了 useTranslation
    if (!content.includes("import { useTranslation }") && !content.includes("useTranslation")) {
      // 找到 React 相关的导入语句后添加 useTranslation 导入
      const reactImportMatch = content.match(/import.*from ['"]react['"];?\n/);
      if (reactImportMatch) {
        const insertIndex = content.indexOf(reactImportMatch[0]) + reactImportMatch[0].length;
        content = content.slice(0, insertIndex) + 
                 "import { useTranslation } from 'react-i18next';\n" + 
                 content.slice(insertIndex);
        modified = true;
      }
    }

    // 检查是否已经在组件中使用了 useTranslation hook
    if (!content.includes("const { t } = useTranslation()")) {
      // 找到组件函数的开始位置并添加 hook
      const componentMatch = content.match(/(const \w+.*?= .*?\(.*?\) => \{|function \w+.*?\(.*?\) \{)/);
      if (componentMatch) {
        const hookLine = "  const { t } = useTranslation();\n";
        const insertIndex = content.indexOf(componentMatch[0]) + componentMatch[0].length + 1;
        content = content.slice(0, insertIndex) + hookLine + content.slice(insertIndex);
        modified = true;
      }
    }

    // 替换硬编码的文本
    for (const [original, replacement] of Object.entries(textReplacements)) {
      const regex = new RegExp(`(['"\`])${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\1`, 'g');
      if (regex.test(content)) {
        content = content.replace(regex, `{${replacement}}`);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.log(`⏭️  Skipped: ${filePath} (no changes needed)`);
    }

  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
  }
}

function main() {
  console.log('🚀 Starting i18n update process...\n');
  
  componentsToUpdate.forEach(updateComponent);
  
  console.log('\n✨ I18n update process completed!');
  console.log('\n📝 Next steps:');
  console.log('1. Review the updated files');
  console.log('2. Test the application');
  console.log('3. Add any missing translations to the locale files');
}

if (require.main === module) {
  main();
}

module.exports = { updateComponent, textReplacements };
