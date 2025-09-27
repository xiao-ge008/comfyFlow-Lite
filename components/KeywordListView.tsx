import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Chip,
  Typography,
  Pagination,
  Toolbar,
  Tooltip,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { Keyword } from '@/lib/types';

interface KeywordListViewProps {
  keywords: Keyword[];
  loading: boolean;
  total: number;
  page: number;
  totalPages: number;
  onEdit: (keyword: Keyword) => void;
  onDelete: (keyword: Keyword) => void;
  onBatchDelete: (selectedIds: string[]) => void;
  onFilter: (type: string, search: string) => void;
  onPageChange: (page: number) => void;
}

const KeywordListView: React.FC<KeywordListViewProps> = ({
  keywords,
  loading,
  total,
  page,
  totalPages,
  onEdit,
  onDelete,
  onBatchDelete,
  onFilter,
  onPageChange,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 处理全选
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelected(keywords.map(k => k.id));
    } else {
      setSelected([]);
    }
  };

  // 处理单选
  const handleSelectOne = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  // 处理搜索
  const handleSearch = () => {
    onFilter(typeFilter, searchQuery);
  };

  // 处理重置筛选
  const handleReset = () => {
    setTypeFilter('');
    setSearchQuery('');
    onFilter('', '');
  };

  // 获取类型显示文本
  const getTypeText = (type: string) => {
    switch (type) {
      case 'person': return t('keywordTypes.person');
      case 'action': return t('keywordTypes.action');
      case 'style': return t('keywordTypes.style');
      default: return type;
    }
  };

  // 获取类型颜色
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'person': return 'primary';
      case 'action': return 'secondary';
      case 'style': return 'success';
      default: return 'default';
    }
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;
  const numSelected = selected.length;
  const rowCount = keywords.length;

  return (
    <Box>
      {/* 筛选工具栏 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>类型筛选</InputLabel>
          <Select
            value={typeFilter}
            label={t('labels.typeFilter')}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="person">人物</MenuItem>
            <MenuItem value="action">动作</MenuItem>
            <MenuItem value="style">风格</MenuItem>
          </Select>
        </FormControl>
        
        <TextField
          size="small"
          placeholder={t('labels.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          sx={{ minWidth: 200 }}
        />
        
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={handleSearch}
        >
          搜索
        </Button>
        
        <Button
          variant="text"
          onClick={handleReset}
        >
          重置
        </Button>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Typography variant="body2" color="text.secondary">
          共 {total} 条记录
        </Typography>
      </Box>

      {/* 批量操作工具栏 */}
      {numSelected > 0 && (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            bgcolor: 'action.selected',
            borderRadius: 1,
            mb: 2,
          }}
        >
          <Typography
            sx={{ flex: '1 1 100%' }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            已选择 {numSelected} 项
          </Typography>
          <Tooltip title={t('labels.batchDelete')}>
            <IconButton onClick={() => onBatchDelete(selected)}>
              <DeleteSweepIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      )}

      {/* 表格 */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={numSelected > 0 && numSelected < rowCount}
                  checked={rowCount > 0 && numSelected === rowCount}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>{t('tableHeaders.keywordId')}</TableCell>
              <TableCell>{t('tableHeaders.type')}</TableCell>
              <TableCell>{t('tableHeaders.englishKeyword')}</TableCell>
              <TableCell>{t('tableHeaders.chineseKeyword')}</TableCell>
              <TableCell>{t('tableHeaders.tags')}</TableCell>
              <TableCell>{t('tableHeaders.description')}</TableCell>
              <TableCell>{t('tableHeaders.createdTime')}</TableCell>
              <TableCell align="center">{t('tableHeaders.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  {t('tableHeaders.loading')}
                </TableCell>
              </TableRow>
            ) : keywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  {t('tableHeaders.noData')}
                </TableCell>
              </TableRow>
            ) : (
              keywords.map((keyword) => {
                const isItemSelected = isSelected(keyword.id);
                return (
                  <TableRow
                    key={keyword.id}
                    hover
                    selected={isItemSelected}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onChange={() => handleSelectOne(keyword.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {keyword.kyeid}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeText(keyword.type)}
                        color={getTypeColor(keyword.type) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {keyword.keyword_en}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {keyword.keyword_cn || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {keyword.tags?.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                          />
                        )) || '-'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={keyword.description}
                      >
                        {keyword.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {keyword.created_at ? new Date(keyword.created_at).toLocaleDateString() : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={() => onEdit(keyword)}
                        color="primary"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => onDelete(keyword)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 分页 */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => onPageChange(newPage)}
            color="primary"
          />
        </Box>
      )}
    </Box>
  );
};

export default KeywordListView;
