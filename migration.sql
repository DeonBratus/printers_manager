-- Migration to add printer model and parameters

-- Step 1: Add model column to td_printers table
ALTER TABLE td_printers 
ADD COLUMN model VARCHAR NULL;

-- Step 2: Create new table for printer parameters
CREATE TABLE td_printer_parameters (
    id SERIAL PRIMARY KEY,
    printer_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    value VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_printer
        FOREIGN KEY (printer_id)
        REFERENCES td_printers (id)
        ON DELETE CASCADE
);

-- Step 3: Create indexes for better performance
CREATE INDEX idx_printer_param_printer_id ON td_printer_parameters (printer_id);
CREATE UNIQUE INDEX idx_printer_param_name ON td_printer_parameters (printer_id, name); 