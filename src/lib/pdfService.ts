import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import { sanitizeFileName } from './calculationEngine';

async function captureElementAsImage(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element with id ${elementId} not found`);

  // Temporarily remove transform if it exists to capture full resolution
  const originalTransform = element.style.transform;
  element.style.transform = 'none';

  try {
    const dataUrl = await toJpeg(element, {
      quality: 0.8,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      style: {
        transform: 'none'
      }
    });

    // Restore transform
    element.style.transform = originalTransform;
    return dataUrl;
  } catch (error) {
    element.style.transform = originalTransform;
    throw error;
  }
}

/**
 * Generates a single PDF for a student report card.
 */
export async function generateSinglePDF(elementId: string, fullName: string, className: string, term: string): Promise<void> {
  try {
    const imgData = await captureElementAsImage(elementId);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    
    let finalImgWidth = pdfWidth;
    let finalImgHeight = pdfWidth / imgRatio;

    if (finalImgHeight > pdfHeight) {
       finalImgHeight = pdfHeight;
       finalImgWidth = pdfHeight * imgRatio;
    }

    const x = (pdfWidth - finalImgWidth) / 2;
    const y = 0;

    pdf.addImage(imgData, 'JPEG', x, y, finalImgWidth, finalImgHeight);
    
    const fileName = `${sanitizeFileName(fullName)}_${sanitizeFileName(className)}_${sanitizeFileName(term)}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw error;
  }
}

/**
 * Generates a blob for a student report card (used for bulk ZIP export).
 */
export async function generatePDFBlob(elementId: string): Promise<Blob> {
  try {
    const imgData = await captureElementAsImage(elementId);
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    
    let finalImgWidth = pdfWidth;
    let finalImgHeight = pdfWidth / imgRatio;

    if (finalImgHeight > pdfHeight) {
       finalImgHeight = pdfHeight;
       finalImgWidth = pdfHeight * imgRatio;
    }

    const x = (pdfWidth - finalImgWidth) / 2;
    const y = 0;

    pdf.addImage(imgData, 'JPEG', x, y, finalImgWidth, finalImgHeight);
    
    return pdf.output('blob');
  } catch (error) {
    console.error('PDF Blob Generation Error:', error);
    throw error;
  }
}

/**
 * Generates a combined PDF for a class.
 */
export async function generateCombinedPDF(
  elementIds: string[], 
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    for (let i = 0; i < elementIds.length; i++) {
      const imgData = await captureElementAsImage(elementIds[i]);
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;
      
      let finalImgWidth = pdfWidth;
      let finalImgHeight = pdfWidth / imgRatio;

      if (finalImgHeight > pdfHeight) {
         finalImgHeight = pdfHeight;
         finalImgWidth = pdfHeight * imgRatio;
      }

      const x = (pdfWidth - finalImgWidth) / 2;
      const y = 0;

      if (i > 0) {
        pdf.addPage();
      }
      
      pdf.addImage(imgData, 'JPEG', x, y, finalImgWidth, finalImgHeight);
      
      if (onProgress) {
        onProgress(Math.round(((i + 1) / elementIds.length) * 100));
      }
    }
    
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('Combined PDF Generation Error:', error);
    throw error;
  }
}

/**
 * Packages multiple PDF blobs into a ZIP file.
 */
export async function packageZIP(files: { name: string, blob: Blob }[], zipName: string): Promise<void> {
  const zip = new JSZip();
  files.forEach(file => {
    zip.file(file.name, file.blob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(content);
  link.download = `${zipName}.zip`;
  link.click();
}
