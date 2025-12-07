import { jsPDF } from "jspdf";
import { CVData } from "../types";

// Adhoc Brand Colors
const COLORS = {
  VIOLETA: "#7C6CD8",
  LAVANDA: "#BCAFEF",
  CORAL: "#FF7348",
  MOSTAZA: "#FEA912",
  DARK: "#2D2D2D",
  GRAY: "#666666",
  LIGHT_GRAY: "#F3F4F6",
  WHITE: "#FFFFFF"
};

/**
 * Creates a Data URL for the Adhoc Logo using HTML Canvas.
 * Generates the Circle + 'A' logo + Text programmatically to ensure it works without external assets.
 */
const createAdhocLogo = (): string => {
  const canvas = document.createElement('canvas');
  // High resolution for crisp PDF
  canvas.width = 600;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // 1. Draw Violet Circle
  const circleX = 75;
  const circleY = 75;
  const radius = 65;

  ctx.fillStyle = COLORS.VIOLETA;
  ctx.beginPath();
  ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Draw "A" shape manually (white)
  // This recreates the stylized A from the branding
  ctx.fillStyle = COLORS.WHITE;
  ctx.beginPath();
  
  // Outer shape of A
  const topX = 75, topY = 32;
  const botLeftX = 40, botLeftY = 110;
  const botRightX = 110, botRightY = 110;
  
  ctx.moveTo(topX, topY); // Top peak
  ctx.lineTo(botRightX, botRightY); // Bottom Right
  ctx.lineTo(botRightX - 18, botRightY); // Inner Right Foot width
  ctx.lineTo(topX + 8, topY + 55); // Right strut mid
  ctx.lineTo(topX - 8, topY + 55); // Left strut mid
  ctx.lineTo(botLeftX + 18, botLeftY); // Inner Left Foot width
  ctx.lineTo(botLeftX, botLeftY); // Bottom Left
  ctx.closePath();
  
  // Cut out the hole (Triangle)
  ctx.moveTo(topX, topY + 20);
  ctx.lineTo(topX - 10, topY + 45);
  ctx.quadraticCurveTo(topX, topY + 40, topX + 10, topY + 45); // Slight curve in crossbar
  ctx.closePath();
  
  ctx.fill("evenodd");

  // Refine the "A" bridge (The curved crossbar)
  // Drawing a curved white shape to connect legs if "evenodd" didn't catch the specific style
  // But let's stick to simple sans-serif bold A simulation if path is too complex, 
  // actually let's use the font approach but heavily modified or just the standard font 
  // to avoid glitchy paths, as the user wants it to "just work".
  // Re-drawing A using standard font but centered perfectly.
  
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear to restart safer approach
  
  // Redraw Circle
  ctx.fillStyle = COLORS.VIOLETA;
  ctx.beginPath();
  ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw A with Font (Safest bet for legibility without assets)
  ctx.fillStyle = COLORS.WHITE;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Using a very bold sans-serif
  ctx.font = "bold 100px Arial, sans-serif"; 
  // Visual tweaks to center it in the circle
  ctx.fillText("A", circleX, circleY + 8);

  // 3. Draw "Adhoc" text
  ctx.fillStyle = "#000000"; 
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  // Attempts to use a rounded font if available, else Arial
  ctx.font = "bold 90px Arial, sans-serif";
  ctx.fillText("Adhoc", 160, 75);

  // 4. Registered Trademark ®
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("®", 435, 45);

  return canvas.toDataURL('image/png');
};

export const generateATSPdf = (data: CVData) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  
  let y = 0;

  // --- Helper Functions ---
  const checkPageBreak = (heightNeeded: number) => {
    if (y + heightNeeded > pageHeight - margin) {
      doc.addPage();
      y = margin + 10;
      return true;
    }
    return false;
  };

  const drawSectionTitle = (title: string, yPos: number) => {
    // Branding: Serif for Headings
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.setTextColor(COLORS.DARK);
    doc.text(title.toUpperCase(), margin, yPos);
    
    // Decorative lines
    doc.setDrawColor(COLORS.MOSTAZA);
    doc.setLineWidth(0.8);
    doc.line(margin, yPos + 2, margin + 15, yPos + 2); // Short accent line
    
    doc.setDrawColor(COLORS.LIGHT_GRAY);
    doc.setLineWidth(0.2);
    doc.line(margin + 18, yPos + 2, pageWidth - margin, yPos + 2); // Full line

    return yPos + 10;
  };

  // --- Header ---
  
  // 1. Purple Top Bar
  doc.setFillColor(COLORS.VIOLETA);
  doc.rect(0, 0, pageWidth, 5, 'F');
  
  // 2. Insert Logo
  const logoData = createAdhocLogo();
  if (logoData) {
    const logoWidth = 50; // mm
    const logoHeight = 12.5; // Aspect ratio of 600x150 = 4:1
    doc.addImage(logoData, 'PNG', pageWidth - margin - logoWidth, 10, logoWidth, logoHeight);
  }

  y = 35;

  // 3. Candidate Name
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(COLORS.VIOLETA);
  doc.text(data.fullName.toUpperCase(), margin, y);
  y += 8;

  // 4. Contact Info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.GRAY);

  const contactItems = [
    data.contactInfo.email,
    data.contactInfo.phone,
    data.contactInfo.linkedin?.replace(/^https?:\/\/(www\.)?/, ''),
    data.contactInfo.location
  ].filter(Boolean);

  const contactText = contactItems.join("  |  ");
  doc.text(contactText, margin, y);
  y += 12;

  // --- Professional Summary ---
  if (data.professionalSummary) {
    y = drawSectionTitle("PERFIL PROFESIONAL", y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.DARK);
    
    const splitSummary = doc.splitTextToSize(data.professionalSummary, pageWidth - (margin * 2));
    doc.text(splitSummary, margin, y);
    y += (splitSummary.length * 5) + 8;
  }

  // --- Experience ---
  if (data.experience && data.experience.length > 0) {
    checkPageBreak(30);
    y = drawSectionTitle("EXPERIENCIA LABORAL", y);

    data.experience.forEach((exp) => {
      checkPageBreak(40); // Check if enough space for at least the header of the job

      // Role & Date
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(COLORS.DARK);
      doc.text(exp.role, margin, y);
      
      doc.setFont("helvetica", "bold"); // Date bold and violet
      doc.setTextColor(COLORS.VIOLETA);
      doc.setFontSize(9);
      const dateWidth = doc.getTextWidth(exp.dates);
      doc.text(exp.dates, pageWidth - margin - dateWidth, y);
      
      y += 5;

      // Company
      doc.setFont("helvetica", "bold"); // Company bold and Coral
      doc.setFontSize(10);
      doc.setTextColor(COLORS.CORAL);
      doc.text(exp.company, margin, y);
      y += 6;

      // Description Bullets
      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.GRAY);
      doc.setFontSize(9.5);

      exp.description.forEach((desc) => {
        const bulletPrefix = "• ";
        // Wrap text
        const maxLineWidth = pageWidth - (margin * 2) - 5; // Indent
        const lines = doc.splitTextToSize(desc, maxLineWidth);
        
        checkPageBreak(lines.length * 4.5);

        doc.text(bulletPrefix, margin, y);
        doc.text(lines, margin + 5, y);
        y += (lines.length * 4.5) + 1.5;
      });
      
      y += 4; // Spacing between jobs
    });
    y += 4;
  }

  // --- Education ---
  if (data.education && data.education.length > 0) {
    checkPageBreak(30);
    y = drawSectionTitle("EDUCACIÓN", y);

    data.education.forEach((edu) => {
      checkPageBreak(20);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(COLORS.DARK);
      doc.text(edu.institution, margin, y);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.GRAY);
      const yearWidth = doc.getTextWidth(edu.year);
      doc.text(edu.year, pageWidth - margin - yearWidth, y);
      
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(COLORS.DARK);
      doc.text(edu.degree, margin, y);
      
      y += 8;
    });
    y += 4;
  }

  // --- Skills ---
  if (data.skills && data.skills.length > 0) {
    checkPageBreak(30);
    y = drawSectionTitle("HABILIDADES", y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.DARK);

    // Join skills with bullets
    const skillsText = data.skills.join("  •  ");
    const splitSkills = doc.splitTextToSize(skillsText, pageWidth - (margin * 2));
    
    doc.text(splitSkills, margin, y);
    y += (splitSkills.length * 5) + 8;
  }

  // --- Languages ---
  if (data.languages && data.languages.length > 0) {
    checkPageBreak(20);
    y = drawSectionTitle("IDIOMAS", y);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.DARK);

    const langsText = data.languages.join("  •  ");
    doc.text(langsText, margin, y);
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(COLORS.GRAY);
    doc.text(`Generado con Adhoc CV Improver - Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  doc.save(`${data.fullName.replace(/\s+/g, '_')}_CV_Adhoc.pdf`);
};
