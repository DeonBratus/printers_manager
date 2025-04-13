import React from 'react';
import PrinterForm from './PrinterForm';
import Modal from './Modal';

const PrinterModal = ({ isOpen, onClose, printer, onSubmit, title }) => {
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
      title={title || (printer ? 'Редактирование принтера' : 'Добавление принтера')}
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