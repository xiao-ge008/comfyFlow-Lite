import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  AccountTree as WorkflowIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Chat as ChatIcon,
  SmartToy as BotIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';

interface DashboardViewProps {
  onTabChange?: (tabIndex: number) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ onTabChange }) => {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [comfyuiConnected, setComfyuiConnected] = useState(false);
  const [systemStats, setSystemStats] = useState(null);

  useEffect(() => {
    // 加载真实工作流数据
    const fetchWorkflows = async () => {
      try {
        const response = await fetch('/api/workflows');
        if (response.ok) {
          const data = await response.json();
          setWorkflows(data.data || []);
        } else {
          setWorkflows([]);
        }
      } catch (error) {
        console.error('Failed to load workflows:', error);
        setWorkflows([]);
      }
    };

    fetchWorkflows();

    // 检查ComfyUI连接状态
    fetch('/api/mcp', { method: 'GET' })
      .then(response => response.ok)
      .then(connected => setComfyuiConnected(connected))
      .catch(() => setComfyuiConnected(false));
  }, []);

  const stats = {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.length, // 假设所有工作流都是活跃的
    totalMappings: workflows.reduce((sum: number, w: any) => sum + (w.mappings?.length || 0), 0),
    recentTests: 0,
  };

  return (
    <Container maxWidth="xl">
      <Box mb={4}>
        <Typography variant="h4" gutterBottom>
          {t('dashboard.title')}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t('dashboard.systemStatus')}
        </Typography>
      </Box>

      {/* 统计卡片 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.totalWorkflows')}
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalWorkflows}
                  </Typography>
                </Box>
                <WorkflowIcon sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
              <Box mt={2}>
                <LinearProgress 
                  variant="determinate" 
                  value={(stats.activeWorkflows / Math.max(stats.totalWorkflows, 1)) * 100} 
                />
                <Typography variant="body2" color="text.secondary" mt={0.5}>
                  {stats.activeWorkflows} {t('dashboard.activeWorkflows')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.parameterMapping')}
                  </Typography>
                  <Typography variant="h4">
                    {stats.totalMappings}
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: 'secondary.main' }} />
              </Box>
              <Typography variant="body2" color="text.secondary" mt={2}>
                {t('dashboard.averagePerWorkflow')} {(stats.totalMappings / Math.max(stats.totalWorkflows, 1)).toFixed(1)} 个
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.recentTests')}
                  </Typography>
                  <Typography variant="h4">
                    {stats.recentTests}
                  </Typography>
                </Box>
                <SpeedIcon sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
              <Typography variant="body2" color="text.secondary" mt={2}>
                {t('dashboard.sessionExecution')}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="text.secondary" gutterBottom>
                    {t('dashboard.comfyuiStatus')}
                  </Typography>
                  <Typography variant="h5">
                    {comfyuiConnected ? t('dashboard.connected') : t('dashboard.disconnected')}
                  </Typography>
                </Box>
                <StorageIcon 
                  sx={{ 
                    fontSize: 40, 
                    color: comfyuiConnected ? 'success.main' : 'error.main' 
                  }} 
                />
              </Box>
              <Chip
                label={comfyuiConnected ? t('messages.success') : t('settings.systemConfig')}
                color={comfyuiConnected ? 'success' : 'error'}
                size="small"
                sx={{ mt: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI聊天快捷入口 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={6}>
          <Card 
            onClick={() => onTabChange?.(3)} // AI聊天是第3个标签（索引3）
            sx={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)'
              }
            }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h5" gutterBottom sx={{ color: 'white' }}>
                    {t('dashboard.aiChat')}
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
                    {t('dashboard.aiChatDescription')}
                  </Typography>
                  <Box display="flex" alignItems="center" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <BotIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">
                      {t('dashboard.clickToStartChat')}
                    </Typography>
                  </Box>
                </Box>
                <LaunchIcon sx={{ fontSize: 48, opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{
            border: '2px dashed',
            borderColor: 'primary.main',
            backgroundColor: 'rgba(99, 102, 241, 0.04)',
          }}>
            <CardContent>
              <Box textAlign="center" py={2}>
                <ChatIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom color="primary.main">
                  {t('dashboard.quickStart')}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {t('dashboard.quickStartSteps')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 最近工作流 */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t('dashboard.recentWorkflows')}
              </Typography>
              {workflows.length > 0 ? (
                <List>
                  {workflows.slice(0, 5).map((workflow: any) => (
                    <ListItem key={workflow.id}>
                      <ListItemIcon>
                        <WorkflowIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={workflow.name}
                        secondary={workflow.description}
                      />
                      <Chip
                        label={workflow.endpoint}
                        size="small"
                        variant="outlined"
                      />
                      <Box ml={2}>
                        <SuccessIcon color="success" />
                      </Box>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    {t('dashboard.noWorkflowsMessage')}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardView;