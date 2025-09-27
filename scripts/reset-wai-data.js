const fs = require('fs');
const path = require('path');

// 重置WAI数据 - 删除所有WAI关键词并重新导入
async function resetWaiData() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('🔄 重置WAI角色数据...\n');
  
  try {
    // 1. 获取所有WAI关键词
    console.log('1. 获取所有WAI关键词...');
    let allWaiKeywords = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(`${baseUrl}/api/keywords?page=${page}&limit=1000&search=wai`);
      if (!response.ok) {
        throw new Error('无法获取关键词数据');
      }
      
      const result = await response.json();
      const waiKeywords = result.data.data.filter(k => k.kyeid.startsWith('wai'));
      allWaiKeywords = allWaiKeywords.concat(waiKeywords);
      
      hasMore = result.data.data.length === 1000;
      page++;
      
      console.log(`   页面 ${page-1}: 找到 ${waiKeywords.length} 个WAI关键词`);
    }
    
    console.log(`📊 总共找到 ${allWaiKeywords.length} 个WAI关键词需要删除`);
    
    // 2. 删除所有WAI关键词
    if (allWaiKeywords.length > 0) {
      console.log('\n2. 删除所有WAI关键词...');
      let deleteCount = 0;
      
      for (const keyword of allWaiKeywords) {
        try {
          const deleteResponse = await fetch(`${baseUrl}/api/keywords/${keyword.id}`, {
            method: 'DELETE'
          });
          
          if (deleteResponse.ok) {
            deleteCount++;
            if (deleteCount % 100 === 0) {
              console.log(`   已删除 ${deleteCount}/${allWaiKeywords.length} 个关键词...`);
            }
          }
        } catch (error) {
          console.log(`   ❌ 删除失败: ${keyword.kyeid}`);
        }
      }
      
      console.log(`✅ 删除完成，共删除 ${deleteCount} 个WAI关键词`);
    }
    
    // 3. 验证删除结果
    console.log('\n3. 验证删除结果...');
    const verifyResponse = await fetch(`${baseUrl}/api/keywords?page=1&limit=1`);
    const verifyResult = await verifyResponse.json();
    console.log(`📊 数据库中剩余关键词: ${verifyResult.data.total} 个`);
    
    // 4. 重新导入WAI数据
    console.log('\n4. 重新导入WAI角色数据...');
    await importWaiCharactersWithSequentialId();
    
  } catch (error) {
    console.error('❌ 重置过程中发生错误:', error.message);
  }
}

// 使用顺序ID导入WAI角色数据
async function importWaiCharactersWithSequentialId() {
  const baseUrl = 'http://localhost:3000';
  const csvPath = path.join(__dirname, '../.data/wai_characters.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error('CSV文件不存在:', csvPath);
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  
  console.log(`   读取到 ${lines.length} 行数据`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(',');
    if (parts.length >= 2) {
      const chinese = parts[0].trim();
      const english = parts.slice(1).join(',').trim();
      
      if (chinese && english) {
        // 使用顺序ID：wai + 5位数字（从00001开始）
        const sequentialId = `wai${(i + 1).toString().padStart(5, '0')}`;
        
        const keyword = {
          kyeid: sequentialId,
          type: 'person',
          keyword_en: english,
          keyword_cn: chinese,
          tags: [],
          description: ''
        };
        
        try {
          const response = await fetch(`${baseUrl}/api/keywords`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(keyword)
          });
          
          if (response.ok) {
            successCount++;
            if (successCount % 100 === 0) {
              console.log(`   ✅ 已导入 ${successCount}/${lines.length} 个关键词...`);
            }
          } else {
            const error = await response.json();
            errorCount++;
            if (errorCount <= 5) {
              console.log(`   ❌ 导入失败: ${sequentialId} - ${error.error}`);
            }
          }
        } catch (error) {
          errorCount++;
          if (errorCount <= 5) {
            console.log(`   ❌ 网络错误: ${sequentialId} - ${error.message}`);
          }
        }
      }
    }
  }
  
  console.log(`\n✅ 导入完成！`);
  console.log(`   成功: ${successCount} 个`);
  console.log(`   失败: ${errorCount} 个`);
  console.log(`   成功率: ${((successCount / lines.length) * 100).toFixed(1)}%`);
  
  // 验证最终结果
  const finalResponse = await fetch(`${baseUrl}/api/keywords?page=1&limit=1`);
  const finalResult = await finalResponse.json();
  console.log(`\n📊 数据库中现有关键词总数: ${finalResult.data.total} 个`);
}

// 如果直接运行此脚本
if (require.main === module) {
  resetWaiData();
}

module.exports = { resetWaiData, importWaiCharactersWithSequentialId };
