import React from 'react';
import { useTranslation } from 'react-i18next';
import StudioManagement from '../components/StudioManagement';
import { useStudio } from '../context/StudioContext';
import PageHeader from '../components/PageHeader';

const StudioManagementPage = () => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('studioManagement.pageTitle', 'Studio Management')}
        subtitle={selectedStudio ? selectedStudio.name : t('studios.noStudioSelected', 'No studio selected')}
      />

      <StudioManagement />
    </div>
  );
};

export default StudioManagementPage; 