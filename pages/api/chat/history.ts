import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatMessage, ChatConversation } from '../../../lib/types';
import getDatabase from '../../../lib/database';
import { v4 as uuidv4 } from 'uuid';

interface ChatHistoryRequest {
  action: 'list' | 'get' | 'save' | 'delete' | 'clear';
  conversationId?: string;
  conversation?: ChatConversation;
}

interface ConversationSummary {
  id: string;
  title: string;
  configId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatHistoryResponse {
  success: boolean;
  conversations?: ConversationSummary[];
  conversation?: ChatConversation;
  error?: string;
  deleted?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatHistoryResponse>
) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: '仅支持POST和GET请求'
    });
  }

  try {
    // 初始化数据库表
    const db = getDatabase();
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        config_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        tool_calls TEXT,
        tool_results TEXT,
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations (id) ON DELETE CASCADE
      )
    `);
    
    let action: string;
    let conversationId: string | undefined;
    let conversation: ChatConversation | undefined;

    if (req.method === 'GET') {
      action = req.query.action as string || 'list';
      conversationId = req.query.conversationId as string;
    } else {
      const body = req.body as ChatHistoryRequest;
      action = body.action;
      conversationId = body.conversationId;
      conversation = body.conversation;
    }

    switch (action) {
      case 'list':
        // 返回所有会话（只包含基本信息）
        const conversationListStmt = db.prepare(`
          SELECT c.*, COUNT(m.id) as message_count
          FROM chat_conversations c
          LEFT JOIN chat_messages m ON c.id = m.conversation_id
          GROUP BY c.id
          ORDER BY c.updated_at DESC
        `);
        const conversationRows = conversationListStmt.all() as any[];
        
        const conversationList = conversationRows.map((row: any) => ({
          id: row.id,
          title: row.title,
          configId: row.config_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          messageCount: row.message_count
        }));

        return res.status(200).json({
          success: true,
          conversations: conversationList
        });

      case 'get':
        if (!conversationId) {
          return res.status(400).json({
            success: false,
            error: '需要提供conversationId'
          });
        }

        // 获取会话基本信息
        const conversationStmt = db.prepare('SELECT * FROM chat_conversations WHERE id = ?');
        const conversationRow = conversationStmt.get(conversationId) as any;
        
        if (!conversationRow) {
          return res.status(404).json({
            success: false,
            error: '未找到指定的会话'
          });
        }
        
        // 获取会话消息
        const messagesStmt = db.prepare('SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC');
        const messageRows = messagesStmt.all(conversationId) as any[];
        
        const messages: ChatMessage[] = messageRows.map((row: any) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          timestamp: row.timestamp,
          toolCalls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
          toolResults: row.tool_results ? JSON.parse(row.tool_results) : undefined
        }));
        
        const fullConversation: ChatConversation = {
          id: conversationRow.id,
          title: conversationRow.title,
          configId: conversationRow.config_id,
          createdAt: conversationRow.created_at,
          updatedAt: conversationRow.updated_at,
          messages
        };

        return res.status(200).json({
          success: true,
          conversation: fullConversation
        });

      case 'save':
        if (!conversation) {
          return res.status(400).json({
            success: false,
            error: '需要提供conversation数据'
          });
        }

        const now = new Date().toISOString();
        
        // 检查会话是否已存在
        const existingConversationStmt = db.prepare('SELECT id FROM chat_conversations WHERE id = ?');
        const existingConversation = existingConversationStmt.get(conversation.id);
        
        const transaction = db.transaction(() => {
          if (existingConversation) {
            // 更新现有会话
            const updateConversationStmt = db.prepare(`
              UPDATE chat_conversations 
              SET title = ?, config_id = ?, updated_at = ?
              WHERE id = ?
            `);
            updateConversationStmt.run(
              conversation.title,
              conversation.configId,
              now,
              conversation.id
            );
            
            // 删除旧消息
            const deleteMessagesStmt = db.prepare('DELETE FROM chat_messages WHERE conversation_id = ?');
            deleteMessagesStmt.run(conversation.id);
          } else {
            // 创建新会话
            const insertConversationStmt = db.prepare(`
              INSERT INTO chat_conversations (id, title, config_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?)
            `);
            insertConversationStmt.run(
              conversation.id,
              conversation.title,
              conversation.configId,
              conversation.createdAt || now,
              now
            );
          }
          
          // 插入消息
          const insertMessageStmt = db.prepare(`
            INSERT INTO chat_messages (id, conversation_id, role, content, timestamp, tool_calls, tool_results)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          
          for (const message of conversation.messages) {
            insertMessageStmt.run(
              message.id,
              conversation.id,
              message.role,
              message.content,
              message.timestamp,
              message.toolCalls ? JSON.stringify(message.toolCalls) : null,
              message.toolResults ? JSON.stringify(message.toolResults) : null
            );
          }
        });
        
        transaction();

        return res.status(200).json({
          success: true,
          conversation: {
            ...conversation,
            updatedAt: now
          }
        });

      case 'delete':
        if (!conversationId) {
          return res.status(400).json({
            success: false,
            error: '需要提供conversationId'
          });
        }

        // 删除指定会话（级联删除会自动删除消息）
        const deleteConversationStmt = db.prepare('DELETE FROM chat_conversations WHERE id = ?');
        const result = deleteConversationStmt.run(conversationId);

        return res.status(200).json({
          success: true,
          deleted: result.changes > 0
        });

      case 'clear':
        // 清空所有会话（级联删除会自动删除消息）
        const clearConversationsStmt = db.prepare('DELETE FROM chat_conversations');
        clearConversationsStmt.run();

        return res.status(200).json({
          success: true
        });

      default:
        return res.status(400).json({
          success: false,
          error: '不支持的操作'
        });
    }

  } catch (error) {
    console.error('Chat history API error:', error);
    res.status(500).json({
      success: false,
      error: `聊天历史服务错误: ${(error as Error).message}`
    });
  }
}