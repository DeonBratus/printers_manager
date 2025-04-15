import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { 
  QuestionMarkCircleIcon, 
  BookOpenIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const HelpSupport = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedFaq, setExpandedFaq] = useState(null);
  
  const toggleFaq = (id) => {
    if (expandedFaq === id) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(id);
    }
  };
  
  const faqs = [
    {
      id: 1,
      question: 'How do I add a new printer?',
      answer: 'To add a new printer, go to the Printers page and click the "Add New Printer" button. Enter the required information in the form and click "Add Printer".'
    },
    {
      id: 2,
      question: 'How do I start a print job?',
      answer: 'Navigate to the printer detail page by clicking on a printer from the Printers list. Then click the "Start Print" button and select a model from the dropdown list.'
    },
    {
      id: 3,
      question: 'Why does my printer show as "Error"?',
      answer: 'A printer may show an error status if there was a problem during printing or communication with the printer. Check the printer connection or if there were any issues with the print job.'
    },
    {
      id: 4,
      question: 'What does printer efficiency mean?',
      answer: 'Printer efficiency is calculated based on the ratio of successfully completed print jobs to total print jobs. A higher percentage indicates better reliability of the printer.'
    },
    {
      id: 5,
      question: 'Can I export reports of printer usage?',
      answer: 'Yes, reports can be generated and exported from the Reports page. You can select different time periods and report types.'
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold dark:text-white">{t('help.title')}</h1>
        <Button onClick={() => navigate(-1)} variant="secondary">
          {t('help.back')}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* About */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center mb-4">
            <BookOpenIcon className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold dark:text-white">{t('help.about')}</h2>
          </div>
          
          <div className="prose dark:prose-invert max-w-none">
            <p>
              {t('help.aboutText')}
            </p>
            
            <h3>{t('help.keyFeatures')}</h3>
            <ul>
              <li>{t('help.feature1')}</li>
              <li>{t('help.feature2')}</li>
              <li>{t('help.feature3')}</li>
              <li>{t('help.feature4')}</li>
              <li>{t('help.feature5')}</li>
            </ul>
            
            <h3>{t('help.systemRequirements')}</h3>
            <p>
              {t('help.systemText')}
            </p>
            
            <h3>{t('help.versionInfo')}</h3>
            <p>
              <strong>{t('help.currentVersion')}:</strong> 1.2.3<br />
              <strong>{t('help.lastUpdated')}:</strong> June 15, 2023<br />
              <strong>{t('help.releaseNotes')}:</strong> {t('help.releaseText')}
            </p>
          </div>
        </Card>
        
        {/* Contact Info */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <EnvelopeIcon className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold dark:text-white">{t('help.contactUs')}</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">{t('help.emailSupport')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">support@3dprintmanager.com</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('help.responseTime')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">{t('help.phoneSupport')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">+1 (555) 123-4567</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('help.phoneAvailability')}
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">{t('help.liveChat')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('help.chatAvailability')}
                </p>
                <Button size="sm" className="mt-2" variant="outline">
                  {t('help.startChat')}
                </Button>
              </div>
            </div>
            
            <div className="flex items-start">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">{t('help.documentation')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('help.accessDocs')}
                </p>
                <Button size="sm" className="mt-2" variant="outline">
                  {t('help.viewDocs')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* FAQs */}
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <QuestionMarkCircleIcon className="h-6 w-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-semibold dark:text-white">{t('help.faq')}</h2>
        </div>
        
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.id} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0 last:pb-0">
              <button
                className="flex justify-between items-center w-full text-left"
                onClick={() => toggleFaq(faq.id)}
              >
                <h3 className="text-md font-medium dark:text-white">{faq.question}</h3>
                {expandedFaq === faq.id ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              
              {expandedFaq === faq.id && (
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default HelpSupport; 