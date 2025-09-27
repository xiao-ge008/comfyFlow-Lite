import React from 'react';
import { useTranslation } from 'react-i18next';
import { Close as CloseIcon, Download as DownloadIcon } from '@mui/icons-material';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

const ImageModal: React.FC<ImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  alt = "Generated Image"
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleDownload = () => {

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-full max-h-full">
        {/* 控制按钮 */}
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={handleDownload}
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            title={t('labels.downloadImage')}
          >
            <DownloadIcon fontSize="small" />
          </button>
          <button
            onClick={onClose}
            className="bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
            title={t('buttons.close')}
          >
            <CloseIcon fontSize="small" />
          </button>
        </div>

        {/* 图片 */}
        <img
          src={imageUrl}
          alt={alt}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />

        {/* 图片信息 */}
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg text-sm">
          点击空白区域或按 ESC 键关闭
        </div>
      </div>
    </div>
  );
};

export default ImageModal;