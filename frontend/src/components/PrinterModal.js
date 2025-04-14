import React from 'react';
import PrinterForm from './PrinterForm';
import Modal from './Modal';
import { useTranslation } from 'react-i18next';

const PrinterModal = ({ isOpen, onClose, printer, onSubmit, title }) => {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const handleSubmit = (formData) => {
    if (formData === null) {
      // Если formData === null, значит пользователь нажал "Отмена"
      onClose();
      return;
    }
    
    onSubmit(formData);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title || (printer ? t('printersList.editPrinter', { name: printer.name }) : t('printersList.addNewPrinter'))}
      size="lg"
    >
      <PrinterForm 
        printer={printer} 
        onSubmit={handleSubmit} 
      />
    </Modal>
  );
};

export default PrinterModal; 