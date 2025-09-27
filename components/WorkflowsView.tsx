import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayIcon,
  Api as ApiIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  Stop as StopIcon,
  CheckCircle as ActiveIcon,
  Error as ErrorIcon,
  Pause as PauseIcon,
  Description as DocIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import ApiDocDialog from './ApiDocDialog';

interface WorkflowsViewProps {
  onCreateClick: () => void;
  onEditClick: (workflow: any) => void;
  onMappingClick: (workflow: any) => void;
  onTestClick?: (workflow: any) => void; // 新增测试回调
}

export interface WorkflowsViewRef {
  refresh: () => void;
}

const WorkflowsView = forwardRef<WorkflowsViewRef, WorkflowsViewProps>(({ onCreateClick, onEditClick, onMappingClick, onTestClick }, ref) => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [apiDocDialogOpen, setApiDocDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // 加载工作流数据
    fetchWorkflows();
  }, []);

  // 暴露refresh方法给父组件
  useImperativeHandle(ref, () => ({
    refresh: fetchWorkflows
  }));

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, workflow: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorkflow(workflow);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorkflow(null);
  };

  const handleToggleWorkflow = async (workflowId: string, enabled: boolean) => {
    setToggleLoading(workflowId);
    setError(null);
    try {
      const response = await fetch(`/api/workflows`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: workflowId, enabled }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSuccessMessage(`工作流${enabled ? '已启用' : '已禁用'}`);
        fetchWorkflows();
        // 清除成功消息
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || t('messages.error'));
      }
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
      setError('网络错误，请重试');
    } finally {
      setToggleLoading(null);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!selectedWorkflow) {
      console.error('[前端] 尝试删除工作流但未选择工作流');
      setError('未选择要删除的工作流');
      return;
    }

    console.log(`[前端] 开始删除工作流: ${selectedWorkflow.name} (${selectedWorkflow.id})`);

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/workflows?id=${selectedWorkflow.id}`, {
        method: 'DELETE',
      });

      console.log(`[前端] 删除请求响应状态: ${response.status}`);

      const result = await response.json();
      console.log('[前端] 删除请求响应数据:', result);

      if (response.ok) {
        console.log(`[前端] 工作流删除成功: ${selectedWorkflow.name}`);
        setSuccessMessage(`工作流 "${selectedWorkflow.name}" 已删除`);
        fetchWorkflows();
        setDeleteDialogOpen(false);
        setSelectedWorkflow(null); // 清除选中的工作流
        // 清除成功消息
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        console.error(`[前端] 工作流删除失败: ${result.error}`);
        setError(result.error || t('messages.deleteError'));
      }
    } catch (error) {
      console.error('[前端] 删除工作流时发生网络错误:', error);
      setError('网络错误，无法删除工作流');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setDeleteDialogOpen(true);
    setAnchorEl(null); // 只关闭菜单，不清除选中的工作流
  };

  const openViewDialog = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setViewDialogOpen(true);
    setAnchorEl(null); // 只关闭菜单，不清除选中的工作流
  };

  const openApiDocDialog = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setApiDocDialogOpen(true);
    setAnchorEl(null); // 只关闭菜单，不清除选中的工作流
  };

  const getWorkflowStatus = (workflow: any) => {
    if (workflow.enabled === false) {
      return { icon: <PauseIcon />, text: '已禁用', color: 'default' as const };
    }
    if (workflow.mappings?.length === 0) {
      return { icon: <ErrorIcon />, text: '未配置', color: 'error' as const };
    }
    return { icon: <ActiveIcon />, text: '运行中', color: 'success' as const };
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography>加载中...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* 错误和成功消息 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h4" gutterBottom>
            {t('workflowManagement.title')}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {t('workflowManagement.description')}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateClick}
          size="large"
        >
          {t('workflowManagement.createWorkflow')}
        </Button>
      </Box>

      {workflows.length === 0 ? (
        <Card sx={{ textAlign: 'center', py: 8 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t('workflowManagement.noWorkflows')}
            </Typography>
            <Typography variant="body1" color="text.secondary" mb={4}>
              {t('workflowManagement.noWorkflowsDescription')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateClick}
              size="large"
            >
              {t('workflowManagement.createFirstWorkflow')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {workflows.map((workflow: any) => {
            const status = getWorkflowStatus(workflow);
            return (
              <Grid item xs={12} md={6} lg={4} key={workflow.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: workflow.enabled === false ? '1px solid' : 'none',
                    borderColor: 'grey.300',
                    opacity: workflow.enabled === false ? 0.7 : 1,
                  }}
                >
                  <CardContent sx={{ flex: 1 }}>
                    {/* 头部：标题、状态、操作菜单 */}
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                          <Typography variant="h6" component="h3">
                            {workflow.name}
                          </Typography>
                          <Badge 
                            badgeContent={status.icon} 
                            color={status.color}
                            variant="dot"
                          >
                            <Tooltip title={status.text}>
                              <Box sx={{ width: 8, height: 8 }} />
                            </Tooltip>
                          </Badge>
                        </Box>
                        
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={workflow.enabled !== false}
                              onChange={(e) => handleToggleWorkflow(workflow.id, e.target.checked)}
                              disabled={toggleLoading === workflow.id}
                            />
                          }
                          label={
                            <Typography variant="caption" color="text.secondary">
                              {toggleLoading === workflow.id ? '处理中...' : 
                               (workflow.enabled !== false ? '已启用' : '已禁用')}
                            </Typography>
                          }
                        />
                      </Box>
                      
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, workflow)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>

                    {/* 描述 */}
                    <Typography variant="body2" color="text.secondary" mb={2}>
                      {workflow.description || '暂无描述'}
                    </Typography>

                    {/* API端点 */}
                    <Box display="flex" gap={1} mb={2}>
                      <Chip
                        label={workflow.endpoint}
                        size="small"
                        variant="outlined"
                        icon={<ApiIcon />}
                      />
                      {workflow.mappings?.length > 0 && (
                        <Chip
                          label={`${workflow.mappings.length}个参数`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      )}
                    </Box>

                    {/* 统计信息 */}
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        节点数: {Object.keys(workflow.json || {}).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        参数映射: {workflow.mappings?.length || 0} 个
                      </Typography>
                    </Box>

                    {/* 创建时间 */}
                    <Typography variant="caption" color="text.secondary">
                      创建时间: {new Date(workflow.createdAt).toLocaleString()}
                    </Typography>
                  </CardContent>

                  <Divider />
                  
                  {/* 操作按钮 */}
                  <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                    <Box>
                      <Tooltip title="查看详情">
                        <IconButton
                          size="small"
                          onClick={() => openViewDialog(workflow)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title={t('workflowManagement.editWorkflow')}>
                        <IconButton
                          size="small"
                          onClick={() => onEditClick(workflow)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="参数映射">
                        <IconButton
                          size="small"
                          onClick={() => onMappingClick(workflow)}
                          color={workflow.mappings?.length > 0 ? 'primary' : 'default'}
                        >
                          <SettingsIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PlayIcon />}
                      disabled={workflow.enabled === false || !workflow.mappings?.length}
                      onClick={() => {
                        // 跳转到API测试页面
                        if (onTestClick) {
                          onTestClick(workflow);
                        }
                      }}
                    >
                      测试
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* 右键菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedWorkflow && openViewDialog(selectedWorkflow)}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} />
          查看详情
        </MenuItem>
        <MenuItem onClick={() => selectedWorkflow && onEditClick(selectedWorkflow)}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          {t('workflowManagement.editWorkflow')}
        </MenuItem>
        <MenuItem onClick={() => selectedWorkflow && onMappingClick(selectedWorkflow)}>
          <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
          参数映射
        </MenuItem>
        <MenuItem onClick={() => selectedWorkflow && openApiDocDialog(selectedWorkflow)}>
          <DocIcon fontSize="small" sx={{ mr: 1 }} />
          生成接口文档
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => selectedWorkflow && openDeleteDialog(selectedWorkflow)}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          {t('workflowManagement.deleteWorkflow')}
        </MenuItem>
      </Menu>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        setSelectedWorkflow(null);
      }}>
        <DialogTitle>{t('workflowManagement.deleteWorkflow')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('workflowManagement.confirmDelete', { name: selectedWorkflow?.name })}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            {t('workflowManagement.deleteWarning')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedWorkflow(null);
          }} disabled={deleting}>
            取消
          </Button>
          <Button 
            onClick={handleDeleteWorkflow} 
            color="error" 
            variant="contained"
            disabled={deleting}
          >
            {deleting ? t('messages.loading') : t('buttons.delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 详情查看对话框 */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {t('workflowManagement.workflowDetails')}: {selectedWorkflow?.name}
            <IconButton onClick={() => setViewDialogOpen(false)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Grid container spacing={3}>
              {/* 基本信息 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>基本信息</Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    名称: {selectedWorkflow.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    端点: {selectedWorkflow.endpoint}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    状态: {selectedWorkflow.enabled !== false ? '已启用' : '已禁用'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    描述: {selectedWorkflow.description || '暂无描述'}
                  </Typography>
                </Box>
              </Grid>
              
              {/* 统计信息 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>统计信息</Typography>
                <Box mb={2}>
                  <Typography variant="body2" color="text.secondary">
                    节点数量: {Object.keys(selectedWorkflow.json || {}).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    参数映射: {selectedWorkflow.mappings?.length || 0} 个
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    创建时间: {new Date(selectedWorkflow.createdAt).toLocaleString()}
                  </Typography>
                </Box>
              </Grid>
              
              {/* 参数映射 */}
              {selectedWorkflow.mappings?.length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>参数映射</Typography>
                  <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {selectedWorkflow.mappings.map((mapping: any, index: number) => (
                      <Box key={index} mb={1} p={2} border={1} borderColor="divider" borderRadius={1}>
                        <Typography variant="body2">
                          <strong>{mapping.paramName}</strong> ({mapping.type})
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          节点: {mapping.nodeId} | 字段: {mapping.field}
                        </Typography>
                        {mapping.description && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            描述: {mapping.description}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>关闭</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setViewDialogOpen(false);
              selectedWorkflow && onEditClick(selectedWorkflow);
            }}
          >
            编辑
          </Button>
        </DialogActions>
      </Dialog>

      {/* API文档对话框 */}
      <ApiDocDialog
        open={apiDocDialogOpen}
        workflow={selectedWorkflow}
        onClose={() => {
          setApiDocDialogOpen(false);
          setSelectedWorkflow(null);
        }}
      />
    </Container>
  );
});

WorkflowsView.displayName = 'WorkflowsView';

export default WorkflowsView;
