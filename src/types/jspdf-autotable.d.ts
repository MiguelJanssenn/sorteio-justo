declare module 'jspdf-autotable' {
  import { jsPDF } from 'jspdf';

  interface AutoTableOptions {
    startY?: number;
    head?: any[][];
    body?: any[][];
    styles?: any;
    headStyles?: any;
    columnStyles?: any;
    margin?: any;
    theme?: string;
  }

  export default function autoTable(doc: jsPDF, options: AutoTableOptions): void;
}
