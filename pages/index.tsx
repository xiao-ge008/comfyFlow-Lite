import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  Dashboard as DashboardIcon,
  AccountTree as WorkflowIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Api as ApiIcon,
  Chat as ChatIcon,
  Label as KeywordIcon,
} from '@mui/icons-material';
import { Toaster, toast } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';

// 组件导入（需要适配）
import DashboardView from '../components/DashboardView';
import WorkflowsView, { WorkflowsViewRef } from '../components/WorkflowsView';
import WorkflowCreateDialog from '../components/WorkflowCreateDialog';
import WorkflowMappingDialog from '../components/WorkflowMappingDialog';
import ApiTestView from '../components/ApiTestView';
import AIChatView from '../components/AIChatView';
import AIConfigView from '../components/AIConfigView';
import KeywordManagementView from '../components/KeywordManagementView';
import LanguageSwitcher from '../components/LanguageSwitcher';

// 导入国际化配置
import '../lib/i18n';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const [currentTab, setCurrentTab] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingWorkflow, setMappingWorkflow] = useState<any>(null);

  // 创建 WorkflowsView 的 ref
  const workflowsViewRef = useRef<WorkflowsViewRef>(null);

  // 响应式设计
  const isMobile = useMediaQuery('(max-width:768px)');

  // 检测系统主题偏好
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
  }, []);

  // 创建主题
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          primary: {
            main: '#6366f1',
          },
          secondary: {
            main: '#10b981',
          },
          background: {
            default: darkMode ? '#0f172a' : '#f8fafc',
            paper: darkMode ? '#1e293b' : '#ffffff',
          },
        },
        typography: {
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
        shape: {
          borderRadius: 12,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 500,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: darkMode
                  ? '0 1px 3px 0 rgba(0, 0, 0, 0.5), 0 1px 2px 0 rgba(0, 0, 0, 0.3)'
                  : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              },
            },
          },
        },
      }),
    [darkMode]
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleEditWorkflow = (workflow: any) => {
    setEditingWorkflow(workflow);
    setCreateDialogOpen(true);
  };

  const handleMappingWorkflow = (workflow: any) => {
    setMappingWorkflow(workflow);
    setMappingDialogOpen(true);
  };

  const handleMappingSave = async (mappings: any[]) => {
    if (!mappingWorkflow) return;
    
    try {
      const response = await fetch('/api/workflows', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: mappingWorkflow.id,
          mappings,
        }),
      });
      
      if (response.ok) {
        setMappingDialogOpen(false);
        setMappingWorkflow(null);
        // 刷新工作流列表
        workflowsViewRef.current?.refresh();
        toast.success(t('messages.parameterMappingSaveSuccess'));
      } else {
        const errorData = await response.json();
        toast.error(t('errors.saveFailed') + ': ' + (errorData.error || t('errors.unknownError')));
      }
    } catch (error) {
      console.error('Failed to save mappings:', error);
    }
  };

  const handleDialogClose = () => {
    setCreateDialogOpen(false);
    setEditingWorkflow(null);
  };

  const handleWorkflowSuccess = () => {
    // 工作流创建/编辑成功后的回调
    workflowsViewRef.current?.refresh();
    toast.success(t('messages.workflowSaveSuccess'));
  };

  const handleTestWorkflow = (workflow: any) => {
    // 跳转到API测试页面
    setCurrentTab(2); // API测试的索引是2
    // 可以在这里添加额外的逻辑，比如设置默认的测试工作流
    console.log('Testing workflow:', workflow.name, workflow.endpoint);
  };

  const tabs = [
    { label: t('tabs.dashboard'), icon: <DashboardIcon /> },
    { label: t('tabs.workflows'), icon: <WorkflowIcon /> },
    { label: t('tabs.apiTest'), icon: <ApiIcon /> },
    { label: t('tabs.aiChat'), icon: <ChatIcon /> },
    { label: t('tabs.keywords'), icon: <KeywordIcon /> },
    { label: t('tabs.settings'), icon: <SettingsIcon /> },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* 页头 */}
        <Box mb={4} textAlign="center">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ flex: 1 }} />
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography
                variant="h3"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #6366f1, #10b981)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {t('title')}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <LanguageSwitcher />
            </Box>
          </Box>
          <Typography variant="h6" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>

        {/* 导航标签 */}
        <Card sx={{ mb: 3 }}>
          <Tabs 
            value={currentTab} 
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 72,
                textTransform: 'none',
              }
            }}
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                iconPosition="start"
                sx={{ gap: 1 }}
              />
            ))}
          </Tabs>
        </Card>

        {/* 标签内容 */}
        <TabPanel value={currentTab} index={0}>
          <DashboardView onTabChange={setCurrentTab} />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <WorkflowsView 
            ref={workflowsViewRef}
            onCreateClick={() => setCreateDialogOpen(true)}
            onEditClick={handleEditWorkflow}
            onMappingClick={handleMappingWorkflow}
            onTestClick={handleTestWorkflow}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <ApiTestView />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <AIChatView />
        </TabPanel>

        <TabPanel value={currentTab} index={4}>
          <KeywordManagementView />
        </TabPanel>

        <TabPanel value={currentTab} index={5}>
          <AIConfigView />
        </TabPanel>

        {/* 创建/编辑工作流对话框 */}
        <WorkflowCreateDialog
          open={createDialogOpen}
          onClose={handleDialogClose}
          editWorkflow={editingWorkflow}
          onSuccess={() => {
            handleDialogClose();
            handleWorkflowSuccess(); // 使用新的成功回调
            setCurrentTab(1); // 切换到工作流标签
          }}
        />

        {/* 参数映射对话框 */}
        <WorkflowMappingDialog
          open={mappingDialogOpen}
          workflow={mappingWorkflow}
          onClose={() => {
            setMappingDialogOpen(false);
            setMappingWorkflow(null);
          }}
          onSave={handleMappingSave}
        />

        {/* 浮动操作按钮 */}
        {currentTab === 1 && (
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
            }}
            onClick={() => setCreateDialogOpen(true)}
          >
            <AddIcon />
          </Fab>
        )}
      </Container>

      {/* 通知组件 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            background: darkMode ? '#1e293b' : '#fff',
            color: darkMode ? '#f1f5f9' : '#0f172a',
          },
        }}
      />
    </ThemeProvider>
  );
}