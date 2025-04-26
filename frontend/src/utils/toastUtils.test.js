import { toast } from 'react-toastify';
import { toastSuccess, toastError, toastInfo, toastWarning } from './toastUtils';

// Mock react-toastify
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
  }
}));

describe('Toast Utilities', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks();
  });

  it('toastSuccess should call toast.success with message and config', () => {
    const message = 'Success message';
    toastSuccess(message);
    
    expect(toast.success).toHaveBeenCalledWith(message, expect.objectContaining({
      position: "top-right",
      autoClose: 5000,
    }));
  });

  it('toastError should call toast.error with message and config', () => {
    const message = 'Error message';
    toastError(message);
    
    expect(toast.error).toHaveBeenCalledWith(message, expect.objectContaining({
      position: "top-right",
      autoClose: 5000,
    }));
  });

  it('toastInfo should call toast.info with message and config', () => {
    const message = 'Info message';
    toastInfo(message);
    
    expect(toast.info).toHaveBeenCalledWith(message, expect.objectContaining({
      position: "top-right",
      autoClose: 5000,
    }));
  });

  it('toastWarning should call toast.warning with message and config', () => {
    const message = 'Warning message';
    toastWarning(message);
    
    expect(toast.warning).toHaveBeenCalledWith(message, expect.objectContaining({
      position: "top-right",
      autoClose: 5000,
    }));
  });

  it('should allow overriding default config', () => {
    const message = 'Custom config';
    const customConfig = { autoClose: 2000, position: "bottom-left" };
    
    toastSuccess(message, customConfig);
    
    expect(toast.success).toHaveBeenCalledWith(message, expect.objectContaining({
      autoClose: 2000,
      position: "bottom-left",
    }));
  });
}); 