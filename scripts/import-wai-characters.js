const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// 数据库路径
const DB_PATH = path.join(__dirname, '../.data/comfyflow.db');
const CSV_PATH = path.join(__dirname, '../.data/wai_characters.csv');

// 生成wai开头的5位随机数值编码
function generateWaiId() {
  const randomNum = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `wai${randomNum}`;
}

// 检查ID是否已存在
function isIdExists(db, kyeid) {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM keywords WHERE kyeid = ?');
  const result = stmt.get(kyeid);
  return result.count > 0;
}

// 生成唯一的wai ID
function generateUniqueWaiId(db) {
  let waiId;
  do {
    waiId = generateWaiId();
  } while (isIdExists(db, waiId));
  return waiId;
}

// 解析CSV行
function parseCSVLine(line) {
  // 简单的CSV解析，处理逗号分隔
  const parts = line.split(',');
  if (parts.length >= 2) {
    return {
      chinese: parts[0].trim(),
      english: parts.slice(1).join(',').trim() // 处理英文名称中可能包含逗号的情况
    };
  }
  return null;
}

// 主函数
async function importWaiCharacters() {
  console.log('🚀 开始导入WAI角色数据...\n');

  try {
    // 检查文件是否存在
    if (!fs.existsSync(CSV_PATH)) {
      throw new Error(`CSV文件不存在: ${CSV_PATH}`);
    }

    if (!fs.existsSync(DB_PATH)) {
      throw new Error(`数据库文件不存在: ${DB_PATH}`);
    }

    // 连接数据库
    const db = new Database(DB_PATH);
    
    // 确保keywords表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS keywords (
        id TEXT PRIMARY KEY,
        kyeid TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL,
        keyword_en TEXT NOT NULL,
        keyword_cn TEXT,
        tags TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 读取CSV文件
    console.log('📖 读取CSV文件...');
    const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = csvContent.trim().split('\n');
    
    console.log(`📊 发现 ${lines.length} 行数据\n`);

    // 准备插入语句
    const insertStmt = db.prepare(`
      INSERT INTO keywords (id, kyeid, type, keyword_en, keyword_cn, tags, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // 开始事务
    const transaction = db.transaction(() => {
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          const parsed = parseCSVLine(line);
          if (!parsed) {
            throw new Error('无法解析CSV行');
          }

          const { chinese, english } = parsed;
          
          if (!chinese || !english) {
            throw new Error('中文或英文名称为空');
          }

          // 生成唯一ID
          const waiId = generateUniqueWaiId(db);
          const uuid = uuidv4();
          const now = new Date().toISOString();

          // 插入数据
          insertStmt.run(
            uuid,                    // id (UUID)
            waiId,                   // kyeid (wai开头的5位随机数)
            'person',                // type (人物类型)
            english,                 // keyword_en (英文名称)
            chinese,                 // keyword_cn (中文名称)
            null,                    // tags (暂时为空)
            null,                    // description (暂时为空)
            now,                     // created_at
            now                      // updated_at
          );

          successCount++;
          
          // 每100条显示一次进度
          if (successCount % 100 === 0) {
            console.log(`✅ 已处理 ${successCount} 条记录...`);
          }

        } catch (error) {
          errorCount++;
          errors.push({
            line: i + 1,
            content: line,
            error: error.message
          });
          
          // 只显示前10个错误
          if (errors.length <= 10) {
            console.log(`❌ 第 ${i + 1} 行错误: ${error.message}`);
          }
        }
      }

      return { successCount, errorCount, errors };
    });

    // 执行事务
    console.log('💾 开始导入数据库...');
    const result = transaction();

    // 关闭数据库连接
    db.close();

    // 显示结果
    console.log('\n🎉 导入完成！');
    console.log(`✅ 成功导入: ${result.successCount} 条`);
    console.log(`❌ 失败记录: ${result.errorCount} 条`);
    
    if (result.errorCount > 0) {
      console.log(`\n前10个错误详情:`);
      result.errors.slice(0, 10).forEach(err => {
        console.log(`  行 ${err.line}: ${err.error}`);
        console.log(`    内容: ${err.content}`);
      });
      
      if (result.errors.length > 10) {
        console.log(`  ... 还有 ${result.errors.length - 10} 个错误未显示`);
      }
    }

    // 验证导入结果
    console.log('\n🔍 验证导入结果...');
    const verifyDb = new Database(DB_PATH);
    const countStmt = verifyDb.prepare('SELECT COUNT(*) as count FROM keywords WHERE kyeid LIKE "wai%"');
    const totalWaiRecords = countStmt.get().count;
    verifyDb.close();
    
    console.log(`📊 数据库中现有WAI角色记录: ${totalWaiRecords} 条`);
    
    if (totalWaiRecords > 0) {
      console.log('\n🎯 示例记录:');
      const sampleDb = new Database(DB_PATH);
      const sampleStmt = sampleDb.prepare('SELECT kyeid, keyword_cn, keyword_en FROM keywords WHERE kyeid LIKE "wai%" LIMIT 5');
      const samples = sampleStmt.all();
      samples.forEach(sample => {
        console.log(`  ${sample.kyeid}: ${sample.keyword_cn} → ${sample.keyword_en}`);
      });
      sampleDb.close();
    }

  } catch (error) {
    console.error('❌ 导入过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  importWaiCharacters();
}

module.exports = { importWaiCharacters };
