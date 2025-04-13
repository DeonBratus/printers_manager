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

const HelpSupport = () => {
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
        <h1 className="text-2xl font-bold dark:text-white">Help & Support</h1>
        <Button onClick={() => navigate(-1)} variant="secondary">
          Back
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* About */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center mb-4">
            <BookOpenIcon className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold dark:text-white">About 3D Print Manager</h2>
          </div>
          
          <div className="prose dark:prose-invert max-w-none">
            <p>
              3D Print Manager is a comprehensive solution for managing and monitoring your 3D printers. 
              It allows you to track print jobs, monitor printer status, and generate reports on printer efficiency and usage.
            </p>
            
            <h3>Key Features</h3>
            <ul>
              <li>Real-time printer status monitoring</li>
              <li>Print job tracking and history</li>
              <li>3D model management</li>
              <li>Printer efficiency metrics and reporting</li>
              <li>User-friendly interface with light and dark mode</li>
            </ul>
            
            <h3>System Requirements</h3>
            <p>
              3D Print Manager is a web-based application that works on modern browsers including Chrome, Firefox, Safari, and Edge.
              For optimal performance, we recommend using the latest version of your preferred browser.
            </p>
            
            <h3>Version Information</h3>
            <p>
              <strong>Current Version:</strong> 1.2.3<br />
              <strong>Last Updated:</strong> June 15, 2023<br />
              <strong>Release Notes:</strong> Added printer efficiency reports, improved UI, and fixed various bugs.
            </p>
          </div>
        </Card>
        
        {/* Contact Info */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <EnvelopeIcon className="h-6 w-6 text-blue-500 mr-2" />
            <h2 className="text-xl font-semibold dark:text-white">Contact Us</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">Email Support</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">support@3dprintmanager.com</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Response time: 24-48 hours
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <PhoneIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">Phone Support</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">+1 (555) 123-4567</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available Monday-Friday, 9AM-5PM EST
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">Live Chat</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Available during business hours
                </p>
                <Button size="sm" className="mt-2" variant="outline">
                  Start Chat
                </Button>
              </div>
            </div>
            
            <div className="flex items-start">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium dark:text-white">Documentation</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Access our complete documentation
                </p>
                <Button size="sm" className="mt-2" variant="outline">
                  View Docs
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
          <h2 className="text-xl font-semibold dark:text-white">Frequently Asked Questions</h2>
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