import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  ArrowUpTrayIcon, 
  FolderPlusIcon,
  DocumentPlusIcon
} from '@heroicons/react/24/outline';
import { Button, Card } from '../../common';
import { Link } from 'react-router-dom';
import { useStudio } from '../../../context/StudioContext';

/**
 * Компонент с кнопками для создания/загрузки моделей
 * @param {Object} props - Свойства компонента
 * @param {Function} props.onCreateCollection - Обработчик создания коллекции
 * @param {Function} props.onUploadModel - Обработчик загрузки модели
 * @param {string} props.className - Дополнительные CSS классы
 * @returns {JSX.Element}
 */
const ModelActionButtons = ({ 
  onCreateCollection, 
  onUploadModel,
  className = ''
}) => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  const [showMenu, setShowMenu] = useState(false);
  
  // Обработчик клика на кнопке добавления
  const handleToggleMenu = () => {
    setShowMenu(!showMenu);
  };
  
  // Обработчик создания новой коллекции
  const handleCreateCollection = () => {
    setShowMenu(false);
    if (typeof onCreateCollection === 'function') {
      onCreateCollection();
    }
  };
  
  // Обработчик загрузки модели
  const handleUploadModel = () => {
    setShowMenu(false);
    if (typeof onUploadModel === 'function') {
      onUploadModel();
    }
  };
  
  // Проверка, выбрана ли студия
  const isStudioSelected = !!selectedStudio?.id;
  
  return (
    <div className={`relative ${className}`}>
      <Button 
        onClick={handleToggleMenu}
        disabled={!isStudioSelected}
        icon={<PlusIcon className="h-5 w-5" />}
        aria-expanded={showMenu}
        aria-label={t('Add', 'Добавить')}
        className="rounded-full p-2 w-12 h-12 shadow-md"
      >
        <span className="sr-only">{t('Add', 'Добавить')}</span>
      </Button>
      
      {showMenu && (
        <Card
          className="absolute bottom-16 right-0 p-2 w-60 shadow-xl animate-fadeIn z-50"
          variant="default"
        >
          <div className="space-y-1">
            <Button
              variant="outline"
              onClick={handleUploadModel}
              className="w-full justify-start"
              icon={<ArrowUpTrayIcon className="h-5 w-5" />}
            >
              {t('Upload Model', 'Загрузить модель')}
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCreateCollection}
              className="w-full justify-start"
              icon={<FolderPlusIcon className="h-5 w-5" />}
            >
              {t('Create Collection', 'Создать коллекцию')}
            </Button>
            
            <Link to="/models/create">
              <Button
                variant="outline"
                className="w-full justify-start"
                icon={<DocumentPlusIcon className="h-5 w-5" />}
              >
                {t('Create New Model', 'Создать новую модель')}
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ModelActionButtons; 