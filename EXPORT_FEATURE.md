# Canvas Export Feature

## Overview
The Canvas Export feature allows users to export their collaborative canvas in multiple formats: PNG, JPEG, and PDF. Users can choose the format that best suits their needs and customize export settings.

## Features

### Export Formats
- **PNG**: High-quality format with transparency support (larger file size)
- **JPEG**: Good quality with smaller file size (no transparency support)
- **PDF**: Document format that can be easily shared and printed

### Export Options
- **Custom File Name**: Users can specify the name for the exported file
- **Quality Control**: For JPEG and PDF formats, users can adjust the quality from 10% to 100%
- **Format Information**: Helpful descriptions for each format to guide user selection

## How to Use

### From Canvas Editor
1. Open any canvas in edit mode
2. Look for the download icon (📥) in the toolbar
3. Click the export button to open the export dialog
4. Choose your preferred format (PNG, JPEG, or PDF)
5. Enter a custom file name (optional)
6. Adjust quality settings if applicable
7. Click "Export" to download the file

### Export Dialog Features
- **Format Selection**: Radio buttons to choose between PNG, JPEG, and PDF
- **File Naming**: Text field to customize the export file name
- **Quality Slider**: Available for JPEG and PDF formats (10% - 100%)
- **Format Information**: Contextual help text explaining each format
- **Progress Indicator**: Shows export progress during processing

## Technical Implementation

### Dependencies
- `jspdf`: For PDF generation
- `html2canvas`: For high-quality canvas rendering (backup option)
- `fabric.js`: Canvas manipulation and data URL generation

### Export Process
1. **Canvas Capture**: Uses Fabric.js `toDataURL()` method to capture canvas content
2. **Format Processing**: 
   - PNG/JPEG: Direct download using data URL
   - PDF: Creates PDF document with canvas image using jsPDF
3. **File Download**: Programmatically triggers browser download

### Code Structure
- `ExportDialog.js`: Main export dialog component
- `CanvasEditor.js`: Integration with canvas toolbar
- Export functionality is self-contained and doesn't affect other canvas features

## Browser Compatibility
- Works in all modern browsers that support HTML5 Canvas
- Requires JavaScript enabled
- File downloads work in all major browsers

## File Size Considerations
- **PNG**: Largest file size, best quality, supports transparency
- **JPEG**: Medium file size, good quality, no transparency
- **PDF**: Variable size based on quality setting, good for documents

## Future Enhancements
- Export specific canvas regions
- Batch export multiple canvases
- Cloud storage integration
- Export with custom dimensions
- Export animation/timeline support

## Troubleshooting

### Common Issues
1. **Export fails**: Ensure canvas has content and browser supports file downloads
2. **Large file sizes**: Use JPEG format or reduce quality for smaller files
3. **Missing content**: Verify all canvas elements are properly loaded before export

### Browser Limitations
- Some browsers may block automatic downloads
- Very large canvases may cause memory issues
- Cross-origin images may require proper CORS headers
