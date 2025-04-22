# Setting Up 3D Model Files and G-Code Support

This document provides instructions for setting up the new file upload functionality for 3D models and G-code files.

## Overview

The new functionality allows users to:

1. Upload 3D model files (STL, OBJ, AMF, 3MF) for each model
2. Upload G-code files associated with models and/or printers
3. Create composite models (models consisting of multiple sub-models)
4. Download model files and G-code files
5. Manage model relationships (parent-child)

## Backend Setup

### 1. Apply Database Migrations

Run the SQL migration script to add the necessary tables and columns:

```bash
psql -d your_database_name -f db_migration.sql
```

### 2. Create Upload Directories

Create directories for storing uploaded files:

```bash
mkdir -p uploads/models uploads/gcodes
```

Make sure these directories are writable by the FastAPI server:

```bash
chmod 755 uploads
chmod 755 uploads/models
chmod 755 uploads/gcodes
```

### 3. Configure File Storage Path (Optional)

If you want to store files in a different location, edit the `backend/dal/model.py` file and update the `UPLOAD_DIR` constant.

## Frontend Setup

### 1. Restart Development Server

Restart your frontend development server to incorporate the new components.

## Testing the Functionality

### 1. Create or Edit a Model

Create a new model or navigate to an existing model's detail page.

### 2. Upload Model Files

On the model detail page, use the "Model Files" section to upload 3D model files (STL, OBJ, etc.).

### 3. Upload G-Code Files

Use the "G-Code Files" section to upload G-code files associated with the model and optionally with a specific printer.

### 4. Create Composite Models

In the "Model Relations" section, you can establish parent-child relationships between models to create composite models (assemblies).

## Troubleshooting

### File Upload Issues

- Ensure the upload directories exist and have proper permissions
- Check that the FastAPI server has write access to these directories
- Verify that the file size doesn't exceed the maximum allowed size (100MB by default)

### Database Migration Issues

- If you encounter errors during migration, check the database logs
- Make sure you have the necessary privileges to alter tables and create new ones

## Security Considerations

- The file upload functionality includes validation to prevent malicious files
- File paths are sanitized to prevent path traversal attacks
- Access control is enforced to ensure users can only access files they have permission to view 