import React, { useState, useEffect } from 'react';
import { getPrinters, getPrintings, getPrinterStatusReport } from '../services/api';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart a