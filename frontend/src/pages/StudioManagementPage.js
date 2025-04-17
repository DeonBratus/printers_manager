import React from 'react';
import { useTranslation } from 'react-i18next';
import StudioManagement from '../components/StudioManagement';
import { useStudio } from '../context/StudioContext';
import PageHeader from '../components/PageHeader';
import UserInvitations from '../components/UserInvitations';

const StudioManagementPage = () => {
  const { t } = useTranslation();
  const { selectedStudio } = useStudio();
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('studioManagement.pageTitle', 'Studio Management')}
        subtitle={selectedStudio ? selectedStudio.name : t('studios.noStudioSelected', 'No studio selected')}
      />

      <div className="grid grid-cols-1 gap-6">
        <UserInvitations />
        <StudioManagement />
      </div>
    </div>
  );
};

export default StudioManagementPage; 