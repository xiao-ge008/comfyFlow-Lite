import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Fab,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import KeywordListView from '@/components/KeywordListView';
import KeywordCreateDialog from '@/components/KeywordCreateDialog';
import KeywordImportDialog from '@/components/KeywordImportDialog';
import { Keyword } from '@/lib/types';

const KeywordAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 对话框状态
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Keyword | null>(null);
  
  // 分页和筛选状态
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 加载关键词列表
  const loadKeywords = async (currentPage = page, type = typeFilter, search = searchQuery) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });
      
      if (type) params.append('type', type);
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/keywords?${params}`);
      const result = await response.json();
      
      if (result.success) {
        setKeywords(result.data.data);
        setTotalPages(result.data.totalPages);
        setTotal(result.data.total);
        setPage(result.data.page);
      } else {
        setError(result.error || 'Failed to load keywords');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadKeywords();
  }, []);

  // 处理创建关键词
  const handleCreateClick = () => {
    setEditingKeyword(null);
    setCreateDialogOpen(true);
  };

  // 处理编辑关键词
  const handleEditClick = (keyword: Keyword) => {
    setEditingKeyword(keyword);
    setCreateDialogOpen(true);
  };

  // 处理删除关键词
  const handleDeleteClick = async (keyword: Keyword) => {
    if (!confirm(t('keywordManagement.confirmDeleteKeyword', { kyeid: keyword.kyeid }))) {
      return;
    }

    try {
      const response = await fetch(`/api/keywords?id=${keyword.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        setSuccess(t('keywordManagement.deleteSuccess'));
        loadKeywords();
      } else {
        setError(result.error || 'Failed to delete keyword');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  // 处理批量删除
  const handleBatchDelete = async (selectedIds: string[]) => {
    if (!confirm(t('keywordManagement.confirmBatchDelete', { count: selectedIds.length }))) {
      return;
    }

    try {
      const response = await fetch(`/api/keywords?ids=${selectedIds.join(',')}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      
      if (result.success) {
        setSuccess(t('keywordManagement.batchDeleteSuccess', { count: result.data.deletedCount }));
        loadKeywords();
      } else {
        setError(result.error || 'Failed to delete keywords');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  // 处理保存关键词
  const handleSaveKeyword = async (keywordData: Omit<Keyword, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const isEdit = !!editingKeyword;
      const url = isEdit ? `/api/keywords?id=${editingKeyword.id}` : '/api/keywords';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keywordData),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(isEdit ? t('keywordManagement.updateSuccess') : t('keywordManagement.createSuccess'));
        setCreateDialogOpen(false);
        setEditingKeyword(null);
        loadKeywords();
      } else {
        setError(result.error || 'Failed to save keyword');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  // 处理CSV导入
  const handleImportCSV = async (csvData: string) => {
    try {
      const response = await fetch('/api/keywords?action=import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ csvData }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { total, success: successCount, failed } = result.data;
        setSuccess(t('keywordManagement.importComplete', { 
          successCount, 
          total, 
          failed 
        }));
        setImportDialogOpen(false);
        loadKeywords();
      } else {
        setError(result.error || 'Import failed');
      }
    } catch (err) {
      setError('Network error occurred');
    }
  };

  // 处理筛选和搜索
  const handleFilter = (type: string, search: string) => {
    setTypeFilter(type);
    setSearchQuery(search);
    setPage(1);
    loadKeywords(1, type, search);
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadKeywords(newPage);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          关键词管理
        </Typography>
        <Typography variant="body1" color="text.secondary">
          管理AI生成工作流中使用的关键词库，支持人物、动作、风格等类型的关键词
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
          >
            新增关键词
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportDialogOpen(true)}
          >
            CSV导入
          </Button>
        </Box>

        <KeywordListView
          keywords={keywords}
          loading={loading}
          total={total}
          page={page}
          totalPages={totalPages}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onBatchDelete={handleBatchDelete}
          onFilter={handleFilter}
          onPageChange={handlePageChange}
        />
      </Paper>

      {/* 创建/编辑对话框 */}
      <KeywordCreateDialog
        open={createDialogOpen}
        keyword={editingKeyword}
        onClose={() => {
          setCreateDialogOpen(false);
          setEditingKeyword(null);
        }}
        onSave={handleSaveKeyword}
      />

      {/* CSV导入对话框 */}
      <KeywordImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImport={handleImportCSV}
      />

      {/* 成功提示 */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success">
          {success}
        </Alert>
      </Snackbar>

      {/* 错误提示 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default KeywordAdminPage;
