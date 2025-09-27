import { NextApiRequest, NextApiResponse } from 'next';
import { 
  getKeywords, 
  getKeyword, 
  createKeyword, 
  updateKeyword, 
  deleteKeyword,
  deleteKeywords,
  importKeywordsFromCSV
} from '@/lib/keywordService';
import { ApiResponse, KeywordQueryParams } from '@/lib/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  try {
    switch (req.method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'PUT':
        return handlePut(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({
          success: false,
          error: 'Method not allowed'
        });
    }
  } catch (error) {
    console.error('Keywords API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// 获取关键词列表或单个关键词
async function handleGet(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { id, page, limit, type, search } = req.query;

  if (id) {
    // 获取单个关键词
    const keyword = getKeyword(id as string);
    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: keyword
    });
  } else {
    // 获取关键词列表
    const queryParams: KeywordQueryParams = {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      type: type as string,
      search: search as string,
    };

    const result = getKeywords(queryParams);
    return res.status(200).json({
      success: true,
      data: result
    });
  }
}

// 创建关键词或导入CSV
async function handlePost(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { action } = req.query;

  if (action === 'import') {
    // CSV导入
    const { csvData } = req.body;
    
    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'CSV data is required'
      });
    }

    try {
      const result = importKeywordsFromCSV(csvData);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Import failed'
      });
    }
  } else {
    // 创建单个关键词
    const { kyeid, type, keyword_en, keyword_cn, tags, description } = req.body;

    // 验证必填字段
    if (!kyeid || !type || !keyword_en) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: kyeid, type, keyword_en'
      });
    }

    // 验证类型
    if (!['person', 'action', 'style'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Type must be one of: person, action, style'
      });
    }

    try {
      const keyword = createKeyword({
        kyeid,
        type,
        keyword_en,
        keyword_cn,
        tags,
        description,
      });

      return res.status(201).json({
        success: true,
        data: keyword
      });
    } catch (error) {
      // 处理唯一约束错误
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({
          success: false,
          error: 'Keyword ID already exists'
        });
      }

      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create keyword'
      });
    }
  }
}

// 更新关键词
async function handlePut(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Keyword ID is required'
    });
  }

  const { kyeid, type, keyword_en, keyword_cn, tags, description } = req.body;

  // 验证类型（如果提供）
  if (type && !['person', 'action', 'style'].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Type must be one of: person, action, style'
    });
  }

  try {
    const keyword = updateKeyword(id as string, {
      kyeid,
      type,
      keyword_en,
      keyword_cn,
      tags,
      description,
    });

    if (!keyword) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: keyword
    });
  } catch (error) {
    // 处理唯一约束错误
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({
        success: false,
        error: 'Keyword ID already exists'
      });
    }

    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update keyword'
    });
  }
}

// 删除关键词
async function handleDelete(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const { id, ids } = req.query;

  if (ids) {
    // 批量删除
    const idArray = (ids as string).split(',');
    const deletedCount = deleteKeywords(idArray);
    
    return res.status(200).json({
      success: true,
      data: { deletedCount }
    });
  } else if (id) {
    // 删除单个关键词
    const success = deleteKeyword(id as string);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Keyword not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: { deleted: true }
    });
  } else {
    return res.status(400).json({
      success: false,
      error: 'Keyword ID or IDs are required'
    });
  }
}
