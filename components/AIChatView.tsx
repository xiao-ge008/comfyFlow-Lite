import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  Avatar,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Divider,
  Paper,
  Grid,
  useTheme,
  useMediaQuery,
  Collapse,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Menu,
  MenuList,
  ListItemButton,
} from '@mui/material';
import {
  Send as SendIcon,
  Person as PersonIcon,
  SmartToy as BotIcon,
  Settings as SettingsIcon,
  Clear as ClearIcon,
  Build as ToolIcon,
  Image as ImageIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  History as HistoryIcon,
  Add as AddIcon,
  AccountTree as WorkflowIcon,
  CheckBox,
  CheckBoxOutlineBlank,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { AIConfig, ChatMessage, ChatConversation, ToolCall, ToolResult } from '../lib/types';

interface AIChatViewProps {}

const AIChatView: React.FC<AIChatViewProps> = () => {
  const { t } = useTranslation();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 状态管理
  const [configs, setConfigs] = useState<AIConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [conversations, setConversations] = useState<any[]>([]);
  const [currentConversation, setCurrentConversation] = useState<ChatConversation | null>(null);

  // 对话框状态
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  
  // MCP工具配置状态
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [mcpToolsOpen, setMcpToolsOpen] = useState<boolean>(false);

  // 系统提示词
  const [systemPrompt, setSystemPrompt] = useState<string>(
    t('aiChat.defaultSystemPrompt')
  );

  // 加载AI配置
  useEffect(() => {
    loadAIConfigs();
    loadConversations();
    loadWorkflows();
    loadSelectedTools();
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAIConfigs = async () => {
    try {
      const response = await fetch('/api/ai-config?action=list');
      const data = await response.json();
      
      if (data.success) {
        const configList = data.configs || [];
        setConfigs(configList);
        // 自动选择第一个启用的配置
        const enabledConfig = configList.find((c: AIConfig) => c.enabled);
        if (enabledConfig && !selectedConfigId) {
          setSelectedConfigId(enabledConfig.id!);
        }
      } else {
        setError(t('aiChat.errors.loadConfigsFailed') + ': ' + data.error);
        setConfigs([]);
      }
    } catch (error) {
      setError(t('aiChat.errors.loadConfigsError') + ': ' + (error as Error).message);
      setConfigs([]);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/chat/history?action=list');
      const data = await response.json();
      
      if (data.success) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error(t('aiChat.errors.loadConversationsFailed') + ':', error);
    }
  };

  const saveConversation = async () => {
    if (!currentConversation && messages.length === 0) return;

    const conversation: ChatConversation = currentConversation || {
      id: `conv_${Date.now()}`,
      title: messages.length > 0 ? 
        (messages[0].content.substring(0, 30) + (messages[0].content.length > 30 ? '...' : '')) : 
        t('aiChat.newConversation'),
      configId: selectedConfigId,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    conversation.messages = messages;
    conversation.updatedAt = new Date().toISOString();

    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'save',
          conversation
        }),
      });

      if (response.ok) {
        setCurrentConversation(conversation);
        loadConversations();
      }
    } catch (error) {
      console.error(t('errors.saveConversationFailed'), error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/history?action=get&conversationId=${conversationId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.conversation.messages);
        setSelectedConfigId(data.conversation.configId);
        setCurrentConversation(data.conversation);
        setHistoryOpen(false);
      }
    } catch (error) {
      console.error(t('errors.loadConversationFailed'), error);
    }
  };
  
  const loadWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      
      if (data.success) {
        setWorkflows(data.data || []);
      } else {
        console.error(t('errors.loadWorkflowsFailed'), data.error);
        setWorkflows([]);
      }
    } catch (error) {
      console.error(t('errors.loadWorkflowsError'), error);
      setWorkflows([]);
    }
  };
  
  const loadSelectedTools = () => {
    try {
      const saved = localStorage.getItem('selectedMCPTools');
      if (saved) {
        const toolIds = JSON.parse(saved);
        setSelectedTools(new Set(toolIds));
      }
    } catch (error) {
      console.error(t('errors.loadToolSelectionFailed'), error);
    }
  };
  
  const handleToolToggle = (workflowId: string) => {
    const newSelection = new Set(selectedTools);
    if (newSelection.has(workflowId)) {
      newSelection.delete(workflowId);
    } else {
      newSelection.add(workflowId);
    }
    setSelectedTools(newSelection);
  };
  
  const saveToolSelection = () => {
    try {
      localStorage.setItem('selectedMCPTools', JSON.stringify(Array.from(selectedTools)));
      setMcpToolsOpen(false);
    } catch (error) {
      console.error(t('errors.saveToolSelectionFailed'), error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !selectedConfigId || isLoading) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 添加用户消息
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: inputText.trim(),
        timestamp: new Date().toISOString()
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInputText('');

      // 发送到AI
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configId: selectedConfigId,
          messages: newMessages,
          systemPrompt
        }),
      });

      const data = await response.json();

      if (data.success) {
        const updatedMessages = [...newMessages, data.message];
        setMessages(updatedMessages);
        
        // 自动保存会话
        setTimeout(() => {
          saveConversation();
        }, 1000);
      } else {
        setError(t('aiChat.errors.sendMessageFailed') + ': ' + data.error);
      }
    } catch (error) {
      setError(t('aiChat.errors.sendMessageError') + ': ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentConversation(null);
    setError('');
  };

  const newChat = () => {
    setMessages([]);
    setCurrentConversation(null);
    setError('');
  };

  // 删除单个会话
  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          conversationId
        }),
      });

      if (response.ok) {
        // 如果删除的是当前会话，清空聊天界面
        if (currentConversation?.id === conversationId) {
          newChat();
        }
        // 重新加载会话列表
        loadConversations();
      }
    } catch (error) {
      console.error(t('errors.deleteConversationFailed'), error);
      setError(t('errors.deleteConversationFailed') + ': ' + (error as Error).message);
    }
  };

  // 清空所有会话
  const clearAllConversations = async () => {
    if (!window.confirm(t('aiChat.confirmClearAllConversations'))) {
      return;
    }
    
    try {
      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'clear'
        }),
      });

      if (response.ok) {
        // 清空当前聊天
        newChat();
        // 重新加载会话列表
        loadConversations();
      }
    } catch (error) {
      console.error(t('errors.clearConversationsFailed'), error);
      setError(t('errors.clearConversationsFailed') + ': ' + (error as Error).message);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const toggleToolExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedTools);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedTools(newExpanded);
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const hasTools = message.toolCalls && message.toolCalls.length > 0;
    const hasResults = message.toolResults && message.toolResults.length > 0;

    return (
      <ListItem
        key={message.id}
        sx={{
          flexDirection: 'column',
          alignItems: 'stretch',
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            mb: 1,
          }}
        >
          <Paper
            elevation={1}
            sx={{
              maxWidth: '70%',
              p: 2,
              bgcolor: isUser ? 'primary.main' : 'background.paper',
              color: isUser ? 'primary.contrastText' : 'text.primary',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                  mr: 1,
                  bgcolor: isUser ? 'primary.dark' : 'secondary.main',
                }}
              >
                {isUser ? <PersonIcon fontSize="small" /> : <BotIcon fontSize="small" />}
              </Avatar>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {isUser ? t('aiChat.user') : t('aiChat.aiAssistant')} • {formatTimestamp(message.timestamp)}
              </Typography>
            </Box>
            
            <Typography variant="body1" sx={{ mb: hasTools || hasResults ? 2 : 0 }}>
              {message.content}
            </Typography>

            {/* 工具调用 */}
            {hasTools && (
              <Box sx={{ mt: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    mb: 1,
                  }}
                  onClick={() => toggleToolExpansion(message.id)}
                >
                  <ToolIcon fontSize="small" sx={{ mr: 1 }} />
                  <Typography variant="body2" sx={{ mr: 1 }}>
                    {t('aiChat.toolCalls')} ({message.toolCalls!.length})
                  </Typography>
                  {expandedTools.has(message.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Box>
                
                <Collapse in={expandedTools.has(message.id)}>
                  {message.toolCalls!.map((toolCall, index) => (
                    <Card key={index} variant="outlined" sx={{ mb: 1, p: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {toolCall.name}
                      </Typography>
                      <Box component="pre" sx={{ 
                        fontSize: '0.75rem', 
                        mt: 1, 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {JSON.stringify(toolCall.arguments, null, 2)}
                      </Box>
                    </Card>
                  ))}
                </Collapse>
              </Box>
            )}

            {/* 工具结果 */}
            {hasResults && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                  <ImageIcon fontSize="small" sx={{ mr: 1 }} />
                  {t('aiChat.toolResults')}
                </Typography>
                
                {message.toolResults!.map((result, index) => (
                  <Card key={index} variant="outlined" sx={{ mb: 1 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Chip
                        label={result.success ? t('aiChat.success') : t('aiChat.failed')}
                        color={result.success ? 'success' : 'error'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      
                      {result.success ? (
                        <Box>
                          {result.result?.imageUrl && (
                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                              <img
                                src={result.result.imageUrl}
                                alt="Generated"
                                style={{
                                  maxWidth: '100%',
                                  height: 'auto',
                                  borderRadius: theme.shape.borderRadius,
                                  boxShadow: theme.shadows[2]
                                }}
                              />
                              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                {result.result.prompt || t('aiChat.generatedImage')}
                              </Typography>
                            </Box>
                          )}
                          
                          {result.result && !result.result.imageUrl && (
                            <Box component="pre" sx={{ 
                              fontSize: '0.75rem', 
                              mt: 1,
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all'
                            }}>
                              {JSON.stringify(result.result, null, 2)}
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="error">
                          ❌ {t('aiChat.executionFailed')}：{result.error}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Paper>
        </Box>
      </ListItem>
    );
  };

  return (
    <Grid container spacing={3} sx={{ height: 'calc(100vh - 200px)' }}>
      {/* 左侧边栏（桌面版） */}
      {!isMobile && (
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">{t('navigation.aiChat')}</Typography>
                <Box>
                  <IconButton size="small" onClick={() => setHistoryOpen(true)}>
                    <HistoryIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                    <SettingsIcon />
                  </IconButton>
                </Box>
              </Box>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>{t('aiChat.aiModel')}</InputLabel>
                <Select
                  value={selectedConfigId}
                  onChange={(e) => setSelectedConfigId(e.target.value)}
                  label={t('aiChat.aiModel')}
                >
                  {configs?.map((config) => (
                    <MenuItem key={config.id} value={config.id} disabled={!config.enabled}>
                      {config.name} ({config.provider})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={newChat}
                sx={{ mb: 2 }}
              >
                {t('aiChat.newConversation')}
              </Button>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ToolIcon />}
                onClick={() => setMcpToolsOpen(true)}
                sx={{ mb: 2 }}
                color="secondary"
              >
                {t('aiChat.toolConfiguration')} ({selectedTools.size})
              </Button>

              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  {t('aiChat.recentConversations')}
                </Typography>
                {conversations.length > 0 && (
                  <IconButton 
                    size="small" 
                    onClick={clearAllConversations}
                    title={t('aiChat.clearAllConversations')}
                    color="error"
                    sx={{ ml: 1 }}
                  >
                    <DeleteSweepIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </CardContent>

            <Box sx={{ flex: 1, overflow: 'auto', px: 2, pb: 2 }}>
              {conversations.slice(0, 10).map((conv) => (
                <Card
                  key={conv.id}
                  variant="outlined"
                  sx={{
                    mb: 1,
                    position: 'relative',
                    '&:hover': { 
                      bgcolor: 'action.hover',
                      '& .conversation-delete-btn': {
                        opacity: 1
                      }
                    },
                    bgcolor: currentConversation?.id === conv.id ? 'action.selected' : 'transparent'
                  }}
                >
                  <CardContent 
                    sx={{ 
                      p: 1.5, 
                      '&:last-child': { pb: 1.5 },
                      cursor: 'pointer'
                    }}
                    onClick={() => loadConversation(conv.id)}
                  >
                    <Typography variant="body2" noWrap sx={{ pr: 4 }}>
                      {conv.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {conv.messageCount} {t('aiChat.messages')}
                    </Typography>
                  </CardContent>
                  
                  <IconButton
                    className="conversation-delete-btn"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(t('aiChat.confirmDeleteConversation', { title: conv.title }))) {
                        deleteConversation(conv.id);
                      }
                    }}
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      bgcolor: 'background.paper',
                      '&:hover': {
                        bgcolor: 'error.main',
                        color: 'error.contrastText'
                      }
                    }}
                    title={t('aiChat.deleteConversation')}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Card>
              ))}
            </Box>
          </Card>
        </Grid>
      )}

      {/* 主聊天区域 */}
      <Grid item xs={12} md={isMobile ? 12 : 9}>
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 移动端顶部工具栏 */}
          {isMobile && (
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={selectedConfigId}
                    onChange={(e) => setSelectedConfigId(e.target.value)}
                    displayEmpty
                  >
                    {configs?.map((config) => (
                      <MenuItem key={config.id} value={config.id} disabled={!config.enabled}>
                        {config.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <Box>
                  <IconButton size="small" onClick={newChat}>
                    <AddIcon />
                  </IconButton>
                  <IconButton 
                    size="small" 
                    onClick={() => setMcpToolsOpen(true)}
                    color={selectedTools.size > 0 ? "secondary" : "default"}
                  >
                    <ToolIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => setHistoryOpen(true)}>
                    <HistoryIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => setSettingsOpen(true)}>
                    <SettingsIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          )}

          <Divider />

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          )}

          {/* 消息列表 */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            {messages.length === 0 ? (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  p: 3,
                }}
              >
                <Box>
                  <BotIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {t('aiChat.startNewConversation')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('aiChat.conversationHint')}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {messages.map(renderMessage)}
                {isLoading && (
                  <ListItem>
                    <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('aiChat.aiThinking')}
                      </Typography>
                    </Box>
                  </ListItem>
                )}
                <div ref={messagesEndRef} />
              </List>
            )}
          </Box>

          <Divider />

          {/* 输入区域 */}
          <CardContent sx={{ pt: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('aiChat.inputPlaceholder')}
                variant="outlined"
                size="small"
                disabled={!selectedConfigId || isLoading}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <IconButton
                  color="primary"
                  onClick={sendMessage}
                  disabled={!inputText.trim() || !selectedConfigId || isLoading}
                  sx={{ p: 1 }}
                >
                  <SendIcon />
                </IconButton>
                <IconButton
                  onClick={clearChat}
                  disabled={messages.length === 0}
                  sx={{ p: 1 }}
                >
                  <ClearIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* 设置对话框 */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{t('aiChat.chatSettings')}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={6}
            label={t('aiChat.systemPrompt')}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            helperText={t('aiChat.systemPromptHelper')}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>{t('buttons.cancel')}</Button>
          <Button onClick={() => setSettingsOpen(false)} variant="contained">{t('buttons.save')}</Button>
        </DialogActions>
      </Dialog>

      {/* 历史记录对话框 */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {t('aiChat.chatHistory')}
            {conversations.length > 0 && (
              <IconButton 
                onClick={clearAllConversations}
                color="error"
                title={t('aiChat.clearAllConversations')}
              >
                <DeleteSweepIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          {conversations.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
              {t('aiChat.noChatHistory')}
            </Typography>
          ) : (
            conversations.map((conv) => (
              <Card
                key={conv.id}
                variant="outlined"
                sx={{
                  mb: 1,
                  position: 'relative',
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    '& .dialog-conversation-delete-btn': {
                      opacity: 1
                    }
                  }
                }}
              >
                <CardContent 
                  sx={{ 
                    p: 2, 
                    cursor: 'pointer',
                    pr: 6
                  }}
                  onClick={() => loadConversation(conv.id)}
                >
                  <Typography variant="body1" gutterBottom>
                    {conv.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {conv.messageCount} {t('aiChat.messages')} • {new Date(conv.updatedAt).toLocaleString()}
                  </Typography>
                </CardContent>
                
                <IconButton
                  className="dialog-conversation-delete-btn"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(t('aiChat.confirmDeleteConversation', { title: conv.title }))) {
                      deleteConversation(conv.id);
                    }
                  }}
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'error.main',
                      color: 'error.contrastText'
                    }
                  }}
                  title={t('aiChat.deleteConversation')}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Card>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>{t('buttons.close')}</Button>
        </DialogActions>
      </Dialog>
      
      {/* MCP工具配置对话框 */}
      <Dialog open={mcpToolsOpen} onClose={() => setMcpToolsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ToolIcon sx={{ mr: 1, color: 'secondary.main' }} />
            <Typography variant="h6">{t('aiChat.mcpToolConfiguration')}</Typography>
            <Chip
              label={t('aiChat.selectedCount', { count: selectedTools.size })}
              size="small"
              color="secondary"
              sx={{ ml: 2 }}
            />
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              {t('aiChat.mcpToolsDescription')}
            </Typography>
          </Alert>
          
          {workflows.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <WorkflowIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {t('aiChat.noWorkflowsAvailable')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('aiChat.createWorkflowsFirst')}
              </Typography>
            </Box>
          ) : (
            <Box>
              <Typography variant="subtitle1" gutterBottom>
                {t('aiChat.availableWorkflowTools', { count: workflows.length })}
              </Typography>
              
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {workflows.map((workflow) => {
                  const isSelected = selectedTools.has(workflow.id);
                  const isEnabled = workflow.enabled;
                  
                  return (
                    <ListItem 
                      key={workflow.id} 
                      sx={{ 
                        px: 0,
                        opacity: isEnabled ? 1 : 0.5,
                        bgcolor: isSelected ? 'action.selected' : 'transparent'
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => isEnabled && handleToolToggle(workflow.id)}
                          disabled={!isEnabled}
                          icon={<CheckBoxOutlineBlank />}
                          checkedIcon={<CheckBox />}
                        />
                      </ListItemIcon>
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <WorkflowIcon fontSize="small" color={isEnabled ? 'primary' : 'disabled'} />
                            <Typography 
                              variant="body1" 
                              fontWeight={isSelected ? 'bold' : 'normal'}
                              color={isEnabled ? 'text.primary' : 'text.secondary'}
                            >
                              {workflow.name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              {workflow.description || t('aiChat.noDescription')}
                            </Typography>
                            
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                              <Chip
                                label={t('aiChat.endpoint') + `: ${workflow.endpoint}`}
                                size="small"
                                variant="outlined"
                                color={isSelected ? 'secondary' : 'default'}
                              />
                              
                              <Chip
                                label={t('aiChat.parametersCount', { count: workflow.mappings?.length || 0 })}
                                size="small"
                                variant="outlined"
                                color={isSelected ? 'secondary' : 'default'}
                              />
                              
                              <Chip
                                label={isEnabled ? t('aiChat.enabled') : t('aiChat.disabled')}
                                size="small"
                                color={isEnabled ? 'success' : 'error'}
                                variant={isSelected ? 'filled' : 'outlined'}
                              />
                            </Box>
                            
                            {isSelected && workflow.mappings && workflow.mappings.length > 0 && (
                              <Box sx={{ mt: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                <Typography variant="caption" color="secondary.main" fontWeight="bold">
                                  {t('aiChat.parameterDescription')}：
                                </Typography>
                                {workflow.mappings.slice(0, 3).map((mapping: any) => (
                                  <Typography key={mapping.id} variant="caption" display="block" sx={{ mt: 0.5 }}>
                                    • {mapping.api_parameter}: {mapping.description}
                                  </Typography>
                                ))}
                                {workflow.mappings.length > 3 && (
                                  <Typography variant="caption" color="text.secondary">
                                    {t('aiChat.moreParameters', { count: workflow.mappings.length - 3 })}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                  );
                })}
              </List>
              
              {selectedTools.size > 0 && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ToolIcon color="secondary" />
                      <Typography variant="subtitle2" color="secondary.main">
                        {t('aiChat.previewSelectedTools', { count: selectedTools.size })}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {workflows
                        .filter(w => selectedTools.has(w.id))
                        .map(workflow => (
                          <Chip
                            key={workflow.id}
                            label={workflow.name}
                            icon={<WorkflowIcon />}
                            variant="filled"
                            color="secondary"
                            onDelete={() => handleToolToggle(workflow.id)}
                            sx={{ mb: 1 }}
                          />
                        ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setMcpToolsOpen(false)} variant="outlined">
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={saveToolSelection}
            variant="contained"
            color="secondary"
            startIcon={<ToolIcon />}
          >
            {t('aiChat.saveConfiguration', { count: selectedTools.size })}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default AIChatView;
