import { v4 as uuidv4 } from 'uuid';
import { Keyword, KeywordQueryParams, KeywordImportResult } from './types';
import getDatabase from './database';

// 数据库行转换为Keyword对象
function convertDbRowToKeyword(row: any): Keyword {
  return {
    id: row.id,
    kyeid: row.kyeid,
    type: row.type,
    keyword_en: row.keyword_en,
    keyword_cn: row.keyword_cn,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    description: row.description,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// 分页查询关键词
export function getKeywords(params: KeywordQueryParams = {}) {
  const db = getDatabase();
  const { page = 1, limit = 20, type, search } = params;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const whereParams: any[] = [];

  if (type) {
    whereClause += ' WHERE type = ?';
    whereParams.push(type);
  }

  if (search) {
    const searchClause = whereClause ? ' AND' : ' WHERE';
    whereClause += `${searchClause} (keyword_en LIKE ? OR keyword_cn LIKE ? OR kyeid LIKE ?)`;
    const searchPattern = `%${search}%`;
    whereParams.push(searchPattern, searchPattern, searchPattern);
  }

  // 查询总数
  const countQuery = `SELECT COUNT(*) as total FROM keywords${whereClause}`;
  const countResult = db.prepare(countQuery).get(...whereParams) as { total: number };

  // 查询数据
  const dataQuery = `
    SELECT * FROM keywords${whereClause} 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(dataQuery).all(...whereParams, limit, offset);

  return {
    data: rows.map(convertDbRowToKeyword),
    total: countResult.total,
    page,
    limit,
    totalPages: Math.ceil(countResult.total / limit),
  };
}

// 根据ID获取单个关键词
export function getKeyword(id: string): Keyword | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM keywords WHERE id = ?').get(id);
  return row ? convertDbRowToKeyword(row) : null;
}

// 根据kyeid获取关键词
export function getKeywordByKyeid(kyeid: string): Keyword | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM keywords WHERE kyeid = ?').get(kyeid);
  return row ? convertDbRowToKeyword(row) : null;
}

// 创建关键词
export function createKeyword(data: Omit<Keyword, 'id' | 'created_at' | 'updated_at'>): Keyword {
  const db = getDatabase();
  const keywordId = uuidv4();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO keywords (
      id, kyeid, type, keyword_en, keyword_cn, tags, description, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    keywordId,
    data.kyeid,
    data.type,
    data.keyword_en,
    data.keyword_cn || null,
    data.tags ? JSON.stringify(data.tags) : null,
    data.description || null,
    now,
    now
  );

  const newKeyword = getKeyword(keywordId);
  if (!newKeyword) {
    throw new Error('Failed to create keyword');
  }

  return newKeyword;
}

// 更新关键词
export function updateKeyword(id: string, data: Partial<Omit<Keyword, 'id' | 'created_at' | 'updated_at'>>): Keyword | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (data.kyeid !== undefined) {
    updateFields.push('kyeid = ?');
    updateValues.push(data.kyeid);
  }
  if (data.type !== undefined) {
    updateFields.push('type = ?');
    updateValues.push(data.type);
  }
  if (data.keyword_en !== undefined) {
    updateFields.push('keyword_en = ?');
    updateValues.push(data.keyword_en);
  }
  if (data.keyword_cn !== undefined) {
    updateFields.push('keyword_cn = ?');
    updateValues.push(data.keyword_cn);
  }
  if (data.tags !== undefined) {
    updateFields.push('tags = ?');
    updateValues.push(data.tags ? JSON.stringify(data.tags) : null);
  }
  if (data.description !== undefined) {
    updateFields.push('description = ?');
    updateValues.push(data.description);
  }

  if (updateFields.length === 0) {
    return getKeyword(id);
  }

  updateFields.push('updated_at = ?');
  updateValues.push(now);
  updateValues.push(id);

  const stmt = db.prepare(`
    UPDATE keywords SET ${updateFields.join(', ')} WHERE id = ?
  `);

  const result = stmt.run(...updateValues);
  
  if (result.changes === 0) {
    return null;
  }

  return getKeyword(id);
}

// 删除关键词
export function deleteKeyword(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM keywords WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// 批量删除关键词
export function deleteKeywords(ids: string[]): number {
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM keywords WHERE id IN (${placeholders})`);
  const result = stmt.run(...ids);
  return result.changes;
}

// CSV导入关键词
export function importKeywordsFromCSV(csvData: string): KeywordImportResult {
  const lines = csvData.trim().split('\n');
  const result: KeywordImportResult = {
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  };

  // 跳过标题行
  const dataLines = lines.slice(1);
  result.total = dataLines.length;

  const db = getDatabase();
  const transaction = db.transaction(() => {
    dataLines.forEach((line, index) => {
      try {
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        
        if (columns.length < 3) {
          throw new Error('CSV格式错误：至少需要kyeid、type、keyword_en三列');
        }

        const [kyeid, type, keyword_en, keyword_cn, tags, description] = columns;

        if (!kyeid || !type || !keyword_en) {
          throw new Error('必填字段不能为空：kyeid、type、keyword_en');
        }

        if (!['person', 'action', 'style'].includes(type)) {
          throw new Error('type字段必须是person、action或style之一');
        }

        const keywordData: Omit<Keyword, 'id' | 'created_at' | 'updated_at'> = {
          kyeid,
          type: type as 'person' | 'action' | 'style',
          keyword_en,
          keyword_cn: keyword_cn || undefined,
          tags: tags ? tags.split(';').map(tag => tag.trim()) : undefined,
          description: description || undefined,
        };

        createKeyword(keywordData);
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: index + 2, // +2 因为跳过了标题行，且行号从1开始
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    });
  });

  try {
    transaction();
  } catch (error) {
    // 如果事务失败，重置计数器
    result.success = 0;
    result.failed = result.total;
    result.errors = [{
      row: 0,
      error: error instanceof Error ? error.message : '导入事务失败'
    }];
  }

  return result;
}
