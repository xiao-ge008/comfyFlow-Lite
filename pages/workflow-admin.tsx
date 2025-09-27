import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Button,
  AppBar,
  Toolbar,
  IconButton,
  Fab,
  Snackbar,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import WorkflowsView, { WorkflowsViewRef } from '@/components/WorkflowsView';
import WorkflowCreateDialog from '@/components/WorkflowCreateDialog';
import WorkflowMappingDialog from '@/components/WorkflowMappingDialog';

const WorkflowAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const workflowsViewRef = useRef<WorkflowsViewRef>(null);
  
  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null);
  
  // 通知状态
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleCreateClick = () => {
    setCreateDialogOpen(true);
  };

  const handleEditClick = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setCreateDialogOpen(true);
  };

  const handleMappingClick = (workflow: any) => {
    setSelectedWorkflow(workflow);
    setMappingDialogOpen(true);
  };

  const handleTestClick = (workflow: any) => {
    showNotification(`${t('notifications.testFeatureNotImplemented')}: ${workflow.name}`, 'info');
  };

  const handleCreateSuccess = () => {
    showNotification(
      selectedWorkflow ? t('notifications.workflowUpdateSuccess') : t('notifications.workflowCreateSuccess'),
      'success'
    );
    setCreateDialogOpen(false);
    setSelectedWorkflow(null);
    workflowsViewRef.current?.refresh();
  };

  const handleMappingSave = async (mappings: any[]) => {
    if (!selectedWorkflow) return;

    try {
      const response = await fetch('/api/workflows', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: selectedWorkflow.id,
          mappings,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showNotification(t('notifications.mappingConfigSaved', { count: mappings.length }), 'success');
        setMappingDialogOpen(false);
        setSelectedWorkflow(null);
        workflowsViewRef.current?.refresh();
      } else {
        throw new Error(result.error || t('errors.saveFailed'));
      }
    } catch (error) {
      console.error('Save mapping error:', error);
      throw error; // 让对话框处理错误显示
    }
  };

  const handleRefresh = () => {
    workflowsViewRef.current?.refresh();
    showNotification(t('notifications.dataRefreshed'), 'info');
  };

  const handleCloseDialog = () => {
    setCreateDialogOpen(false);
    setMappingDialogOpen(false);
    setSelectedWorkflow(null);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', backgroundColor: 'grey.50' }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => router.push('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('workflowManagement.centerTitle')}
          </Typography>
          
          <Button 
            color="inherit" 
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            刷新
          </Button>
          
          <Button 
            color="inherit" 
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            {t('workflowManagement.newWorkflow')}
          </Button>
        </Toolbar>
      </AppBar>

      {/* 面包屑导航 */}
      <Container maxWidth="xl" sx={{ py: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            color="inherit"
            href="/"
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              router.push('/');
            }}
            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            首页
          </Link>
          <Typography color="text.primary">{t('workflowManagement.title')}</Typography>
        </Breadcrumbs>
      </Container>

      {/* 主要内容 */}
      <Container maxWidth="xl" sx={{ pb: 10 }}>
        <WorkflowsView
          ref={workflowsViewRef}
          onCreateClick={handleCreateClick}
          onEditClick={handleEditClick}
          onMappingClick={handleMappingClick}
          onTestClick={handleTestClick}
        />
      </Container>

      {/* 浮动操作按钮 */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={handleCreateClick}
      >
        <AddIcon />
      </Fab>

      {/* 对话框 */}
      <WorkflowCreateDialog
        open={createDialogOpen}
        editWorkflow={selectedWorkflow}
        onClose={handleCloseDialog}
        onSuccess={handleCreateSuccess}
      />

      <WorkflowMappingDialog
        open={mappingDialogOpen}
        workflow={selectedWorkflow}
        onClose={handleCloseDialog}
        onSave={handleMappingSave}
      />

      {/* 通知 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default WorkflowAdminPage;