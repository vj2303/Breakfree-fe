import { jsPDF } from 'jspdf';

/**
 * Breakfree participant report PDF.
 *
 * Extracted verbatim from ParticipantReports' `handleDownloadReport` so the admin download and
 * the assessor "Generate report" button produce the identical document. The drawing code below
 * is unchanged; only the five lines that reached into component state became parameters.
 */
export interface ParticipantReportPdfInput {
  /** `data.reportContent` from the report-generation API. */
  reportContent: Record<string, unknown>;
  participantName: string;
  participantEmail: string;
  /** Rendered in the report meta box; pass 'N/A' when unknown. */
  assessmentCenterName: string;
  /** Included in the filename when non-empty. */
  assessmentCenterFileNamePart?: string;
  reportName: string;
}

// Helper function to draw donut chart
const drawDonutChart = (doc: jsPDF, x: number, y: number, score: number, maxScore: number = 10) => {
  const radius = 20;
  const innerRadius = 15;
  const percentage = Math.min((score / maxScore), 1); // 0 to 1

  // Draw outer circle (background - light gray)
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(240, 240, 240);
  doc.circle(x, y, radius, 'FD');

  // Draw filled portion (black arc) if score > 0
  if (percentage > 0) {
    doc.setFillColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    const startAngle = -Math.PI / 2; // Start from top (-90 degrees)
    const endAngle = startAngle + (percentage * 2 * Math.PI);
    const steps = Math.max(20, Math.floor(percentage * 40));
    const angleStep = (endAngle - startAngle) / steps;

    const centerX = x;
    const centerY = y;
    const path: number[][] = [[centerX, centerY]]; // Start from center

    // Create arc path
    for (let i = 0; i <= steps; i++) {
      const angle = startAngle + (angleStep * i);
      path.push([
        centerX + radius * Math.cos(angle),
        centerY + radius * Math.sin(angle)
      ]);
    }

    // Close the path back to center
    path.push([centerX, centerY]);

    if (path.length > 2) {
      doc.path(path, 'F');
    }

    // Draw inner circle to create donut effect
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.circle(centerX, centerY, innerRadius, 'FD');
    doc.setDrawColor(0, 0, 0);
    doc.circle(centerX, centerY, innerRadius, 'D');
  }

  // Redraw outer circle border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.circle(x, y, radius, 'D');

  // Add score text in center
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(score.toFixed(1), x, y + 3, { align: 'center' });
};

// Helper function to draw bar chart
const drawBarChart = (doc: jsPDF, x: number, y: number, width: number, height: number, data: Array<{name: string, readiness: number, application: number}>) => {
  const maxVal = 10;
  const chartHeight = height - 30;
  const startY = y + chartHeight;
  const groupWidth = width / data.length;
  const barWidth = Math.min(15, groupWidth / 2 - 2);
  const gap = 4;

  // Draw axes
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(x, y, x, startY); // Y-axis
  doc.line(x, startY, x + width, startY); // X-axis

  // Draw grid lines
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  for (let i = 0; i <= 5; i++) {
    const val = i * 2;
    const lineY = startY - ((val / maxVal) * chartHeight);
    doc.line(x, lineY, x + width, lineY);
  }

  // Draw bars
  data.forEach((item, idx) => {
    const centerX = x + (idx * groupWidth) + (groupWidth / 2);
    const rH = (item.readiness / maxVal) * chartHeight;
    const aH = (item.application / maxVal) * chartHeight;

    // Readiness bar (black solid)
    doc.setFillColor(0, 0, 0);
    doc.rect(centerX - barWidth - (gap/2), startY - rH, barWidth, rH, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(item.readiness.toString(), centerX - barWidth - (gap/2) + (barWidth/2), startY - rH - 2, { align: 'center'});

    // Application bar (gray with pattern)
    doc.setFillColor(150, 150, 150);
    doc.rect(centerX + (gap/2), startY - aH, barWidth, aH, 'F');
    doc.text(item.application.toString(), centerX + (gap/2) + (barWidth/2), startY - aH - 2, { align: 'center'});

    // X Label
    doc.setFontSize(8);
    const label = doc.splitTextToSize(item.name, groupWidth - 5);
    doc.text(label, centerX, startY + 10, { align: 'center' });
  });

  // Legend (positioned at bottom right, matching reference)
  const lx = x + width - 70;
  const ly = y + height - 15;
  doc.setFillColor(0, 0, 0);
  doc.rect(lx, ly, 10, 8, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Readiness", lx + 13, ly + 5);
  doc.setFillColor(150, 150, 150);
  doc.rect(lx + 45, ly, 10, 8, 'F');
  doc.text("Application", lx + 58, ly + 5);
};

// Helper function to add page number
const addPageNumber = (doc: jsPDF, pageNum: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
};

// Format report content for PDF with proper structure - Enhanced for detailed analysis
const formatReportContentForPDF = (reportContent: Record<string, unknown>) => {
  let competencies: Array<Record<string, unknown>> = [];

  // Extract competencies from part2Analysis - handle new detailed structure
  const part2Analysis = reportContent.part2Analysis as Record<string, unknown> | undefined;
  if (part2Analysis && Array.isArray(part2Analysis.competencies)) {
    competencies = (part2Analysis.competencies as Array<Record<string, unknown>>).map((comp) => {
      const compName = typeof comp.name === 'string' ? comp.name : 'Competency';
      const compScore = typeof comp.score === 'number' ? comp.score : 0;
      const compReadiness = typeof comp.readiness === 'number' ? comp.readiness : compScore;
      const compApplication = typeof comp.application === 'number' ? comp.application : compScore;
      const compOverview = typeof comp.overview === 'string' ? comp.overview : '';
      const compStrengths = Array.isArray(comp.strengths) ? comp.strengths : [];
      const compOpportunities = Array.isArray(comp.opportunities) ? comp.opportunities : [];
      return {
        name: compName,
        score: compScore,
        readiness: compReadiness,
        application: compApplication,
        overview: compOverview,
        strengths: compStrengths,
        opportunities: compOpportunities,
        analysis: comp.analysis
      };
    });
  } else if (part2Analysis && part2Analysis.content) {
    try {
      const analysisData = typeof part2Analysis.content === 'string' 
        ? JSON.parse(part2Analysis.content) 
        : part2Analysis.content;

      if (Array.isArray(analysisData)) {
        competencies = analysisData;
      } else if (typeof analysisData === 'object') {
        Object.keys(analysisData).forEach((key) => {
          const compData = analysisData[key];
          if (compData && typeof compData === 'object') {
            // Handle new structure with overview, Strengths, Areas of Opportunity
            const strengths: string[] = [];
            const opportunities: string[] = [];

            if (compData.Strengths && typeof compData.Strengths === 'object') {
              Object.values(compData.Strengths).forEach((strength: unknown) => {
                if (typeof strength === 'string') {
                  strengths.push(strength);
                }
              });
            }

            if (compData['Areas of Opportunity'] && typeof compData['Areas of Opportunity'] === 'object') {
              Object.values(compData['Areas of Opportunity']).forEach((opp: unknown) => {
                if (typeof opp === 'string') {
                  opportunities.push(opp);
              }
            });
          }

            competencies.push({
              name: key,
              score: compData.score || 0,
              readiness: compData.readiness || compData.score || 0,
              application: compData.application || compData.score || 0,
              overview: compData.overview || '',
              strengths: strengths,
              opportunities: opportunities,
              analysis: JSON.stringify(compData)
            });
          }
        });
      }
    } catch (error) {
      console.error('Error parsing analysis data:', error);
    }
  }

  // Parse comments
  let strengths: string[] = [];
  let developmentAreas: string[] = [];

  const part3Comments = reportContent.part3Comments as Record<string, unknown> | undefined;
  if (part3Comments && part3Comments.content) {
    try {
      const commentsData = typeof part3Comments.content === 'string'
        ? JSON.parse(part3Comments.content)
        : part3Comments.content;

      if (commentsData && typeof commentsData === 'object') {
        if (commentsData.Strengths) {
          if (Array.isArray(commentsData.Strengths)) {
            strengths = commentsData.Strengths;
          } else if (typeof commentsData.Strengths === 'object') {
            strengths = Object.values(commentsData.Strengths) as string[];
          }
        }
        if (commentsData['Areas of Opportunity'] || commentsData['Areas of Development']) {
          const areas = commentsData['Areas of Opportunity'] || commentsData['Areas of Development'];
          if (Array.isArray(areas)) {
            developmentAreas = areas;
          } else if (typeof areas === 'object') {
            developmentAreas = Object.values(areas) as string[];
          }
        }
      }
    } catch {
      // Use direct properties if available
      if (part3Comments && Array.isArray(part3Comments.strengths)) {
        strengths = part3Comments.strengths as string[];
      }
      if (part3Comments && Array.isArray(part3Comments.developmentAreas)) {
        developmentAreas = part3Comments.developmentAreas as string[];
      }
    }
  } else {
    if (part3Comments && Array.isArray(part3Comments.strengths)) {
      strengths = part3Comments.strengths as string[];
    }
    if (part3Comments && Array.isArray(part3Comments.developmentAreas)) {
      developmentAreas = part3Comments.developmentAreas as string[];
    }
  }

  // Extract recommendations
  let recommendations: string[] = [];
  const part5Recommendation = reportContent.part5Recommendation as Record<string, unknown> | undefined;
  if (part5Recommendation && Array.isArray(part5Recommendation.recommendations)) {
    recommendations = part5Recommendation.recommendations as string[];
  } else if (part5Recommendation && part5Recommendation.content) {
    try {
      const recData = typeof part5Recommendation.content === 'string'
        ? JSON.parse(part5Recommendation.content)
        : part5Recommendation.content;

      if (Array.isArray(recData)) {
        recommendations = recData as string[];
      } else if (typeof recData === 'object') {
        recommendations = Object.values(recData) as string[];
      }
    } catch {
      if (typeof part5Recommendation.content === 'string') {
        recommendations = part5Recommendation.content.split('\n').filter((r: string) => r.trim());
      }
    }
  }

  const part1Introduction = reportContent.part1Introduction as Record<string, unknown> | undefined;
  const part4OverallRatings = reportContent.part4OverallRatings as Record<string, unknown> | undefined;
  return {
    introduction: (part1Introduction && typeof part1Introduction.content === 'string' ? part1Introduction.content : '') || '',
    analysis: {
      content: (part2Analysis && typeof part2Analysis.content === 'string' ? part2Analysis.content : '') || '',
      competencies: competencies
    },
    comments: {
      content: (part3Comments && typeof part3Comments.content === 'string' ? part3Comments.content : '') || '',
      strengths: strengths,
      developmentAreas: developmentAreas
    },
    ratings: {
      content: (part4OverallRatings && typeof part4OverallRatings.content === 'string' ? part4OverallRatings.content : '') || '',
      scoreTable: part4OverallRatings?.scoreTable || null,
      chartData: part4OverallRatings?.chartData || null
    },
    recommendations: {
      content: (part5Recommendation && typeof part5Recommendation.content === 'string' ? part5Recommendation.content : '') || '',
      recommendations: recommendations
    }
  };
};

export function downloadParticipantReportPdf({
  reportContent,
  participantName,
  participantEmail,
  assessmentCenterName,
  assessmentCenterFileNamePart = '',
  reportName,
}: ParticipantReportPdfInput): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let pageNum = 1;
  let yPosition = margin;
  const lineHeight = 6;

  const sections = formatReportContentForPDF(reportContent);

  // Helper to check and add new page
  const checkNewPage = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      addPageNumber(doc, pageNum);
      doc.addPage();
      pageNum++;
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Removed unused addText helper

  // Helper to draw header line
  const drawHeaderLine = () => {
    checkNewPage(15);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 15;
  };

  // Helper to draw meta box
  const drawMetaBox = (items: Array<{label: string, value: string}>) => {
    checkNewPage(60);
    const boxHeight = 50;
    const boxY = yPosition;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.rect(margin, boxY, pageWidth - 2 * margin, boxHeight);

    const itemHeight = boxHeight / Math.ceil(items.length / 2);
    items.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = margin + (col * (pageWidth - 2 * margin) / 2) + 10;
      const y = boxY + (row * itemHeight) + 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(item.label.toUpperCase(), x, y);
      doc.setFont('helvetica', 'normal');
      doc.text(item.value, x, y + 5);
    });

    yPosition = boxY + boxHeight + 10;
  };

  // PAGE 1: COVER & INTRODUCTION
  // Title
  doc.setFontSize(26);
  doc.setFont('helvetica', 'normal');
  doc.text('Leadership Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  drawHeaderLine();

  // Introduction
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Introduction', margin, yPosition);
  yPosition += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const introText = sections.introduction || `Hi ${participantName},\n\nCongratulations on having completed your assessment.\n\nEnclosed is your final report, which provides a comprehensive overview of your performance and development areas identified during the program. This report offers valuable insights into your strengths and areas for growth, empowering you to continue your development journey.\n\nAs you review your final report, remember that it's not just about the results but about the journey and the lessons learned along the way.`;
  const introLines = doc.splitTextToSize(introText, maxWidth);
  introLines.forEach((line: string) => {
    checkNewPage();
    doc.text(line, margin, yPosition);
    yPosition += lineHeight;
  });

  yPosition += 20;
  checkNewPage(60);

  // Meta Box
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  drawMetaBox([
    { label: 'Participant Name', value: participantName },
    { label: 'Assessment Center', value: assessmentCenterName },
    { label: 'Email', value: participantEmail },
    { label: 'Date', value: currentDate }
  ]);

  addPageNumber(doc, pageNum);
  pageNum++;

  // PAGE 2: COMPETENCY SUMMARY
  doc.addPage();
  yPosition = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Competency Summary', margin, yPosition);
  yPosition += 10;
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Top Strengths - Enhanced formatting
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Top Strengths', margin, yPosition);
  yPosition += 15;

  if (sections.comments.strengths && sections.comments.strengths.length > 0) {
    sections.comments.strengths.forEach((strength: string) => {
      checkNewPage(20);

      // Bullet point with better styling
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.circle(margin + 3, yPosition - 2, 2, 'F');

      // Strength text (detailed 2-3 sentences)
      const strengthLines = doc.splitTextToSize(strength, maxWidth - 15);
      strengthLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 12, yPosition + (idx * (lineHeight + 1)));
      });
      yPosition += (strengthLines.length * (lineHeight + 1)) + 8;
    });
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('No specific strengths identified in this assessment.', margin + 12, yPosition);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
  }

  yPosition += 10;
  checkNewPage(30);

  // Areas for Development - Enhanced formatting
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Areas for Development', margin, yPosition);
  yPosition += 15;

  if (sections.comments.developmentAreas && sections.comments.developmentAreas.length > 0) {
    sections.comments.developmentAreas.forEach((area: string) => {
      checkNewPage(20);

      // Bullet point with better styling
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.circle(margin + 3, yPosition - 2, 2, 'F');

      // Development area text (detailed 2-3 sentences)
      const areaLines = doc.splitTextToSize(area, maxWidth - 15);
      areaLines.forEach((line: string, idx: number) => {
        doc.text(line, margin + 12, yPosition + (idx * (lineHeight + 1)));
      });
      yPosition += (areaLines.length * (lineHeight + 1)) + 8;
    });
  } else {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('No specific areas for development identified in this assessment.', margin + 12, yPosition);
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
  }

  addPageNumber(doc, pageNum);
  pageNum++;

  // PAGE 3: DETAILED ANALYSIS (Competencies with donut charts)
  if (sections.analysis.competencies && sections.analysis.competencies.length > 0) {
    sections.analysis.competencies.forEach((competency: Record<string, unknown>, compIndex: number) => {
      if (compIndex > 0) {
        checkNewPage(100);
        if (yPosition > pageHeight - 100) {
          doc.addPage();
          pageNum++;
          yPosition = margin;
        }
        drawHeaderLine();
      }

      doc.addPage();
      pageNum++;
      yPosition = margin;

      // Competency Title with improved styling
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const compName = typeof competency.name === 'string' ? competency.name : `Competency ${compIndex + 1}`;
      doc.text(compName, margin, yPosition);
      yPosition += 12;

      // Decorative line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 20;

      // Competency Overview (if available)
      if (competency.overview) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        const overviewText = typeof competency.overview === 'string' ? competency.overview : '';
        const overviewLines = doc.splitTextToSize(overviewText, maxWidth);
        overviewLines.forEach((line: string) => {
          checkNewPage();
          doc.text(line, margin, yPosition);
          yPosition += lineHeight + 1;
        });
        yPosition += 10;
        doc.setTextColor(0, 0, 0);
      }

      // Score visualization section
      checkNewPage(60);
      const score = typeof competency.score === 'number' ? competency.score : 5;
      const maxScore = 10;
      const readiness = typeof competency.readiness === 'number' ? competency.readiness : score;
      const application = typeof competency.application === 'number' ? competency.application : score;

      // Donut Chart for overall score
      drawDonutChart(doc, margin + 40, yPosition + 20, score, maxScore);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text('Overall Score', margin + 100, yPosition + 20);
      doc.text(`Readiness: ${readiness.toFixed(1)} | Application: ${application.toFixed(1)}`, margin + 100, yPosition + 28);
      doc.setTextColor(0, 0, 0);
      yPosition += 55;

      // Strengths Section - Enhanced formatting
      checkNewPage(30);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Strengths', margin, yPosition);
      yPosition += 15;

      const strengths = Array.isArray(competency.strengths) ? competency.strengths : [];
      if (strengths.length > 0) {
        strengths.forEach((strength: Record<string, unknown>) => {
          checkNewPage(30);

          // Strength bullet point with better styling
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);

          // Use bullet point
          const bulletY = yPosition;
          doc.circle(margin + 3, bulletY - 2, 2, 'F');

          // Strength text (detailed 3-5 sentences)
          let strengthText: string;
          if (typeof strength === 'string') {
            strengthText = strength;
          } else {
            const strengthObj = strength as Record<string, unknown>;
            strengthText = (typeof strengthObj.title === 'string' ? strengthObj.title : (typeof strengthObj.description === 'string' ? strengthObj.description : 'Strength'));
          }
          const strengthLines = doc.splitTextToSize(strengthText, maxWidth - 15);

          strengthLines.forEach((line: string, lineIdx: number) => {
            checkNewPage();
            doc.setFont('helvetica', lineIdx === 0 ? 'bold' : 'normal');
            doc.text(line, margin + 12, yPosition);
            yPosition += lineHeight + 1;
          });

          yPosition += 8; // Space between strengths
        });
      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('No specific strengths identified for this competency.', margin + 12, yPosition);
        yPosition += 12;
        doc.setTextColor(0, 0, 0);
      }

      // Areas of Opportunity Section - Enhanced formatting
      checkNewPage(30);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 15;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Areas of Opportunity', margin, yPosition);
      yPosition += 15;

      const opportunities = Array.isArray(competency.opportunities) ? competency.opportunities : [];
      if (opportunities.length > 0) {
        opportunities.forEach((opp: Record<string, unknown>) => {
          checkNewPage(30);

          // Opportunity bullet point with better styling
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);

          // Use bullet point
          const bulletY = yPosition;
          doc.circle(margin + 3, bulletY - 2, 2, 'F');

          // Opportunity text (detailed 3-5 sentences)
          let oppText: string;
          if (typeof opp === 'string') {
            oppText = opp;
          } else {
            const oppObj = opp as Record<string, unknown>;
            oppText = (typeof oppObj.title === 'string' ? oppObj.title : (typeof oppObj.description === 'string' ? oppObj.description : 'Area of Opportunity'));
          }
          const oppLines = doc.splitTextToSize(oppText, maxWidth - 15);

          oppLines.forEach((line: string, lineIdx: number) => {
            checkNewPage();
            doc.setFont('helvetica', lineIdx === 0 ? 'bold' : 'normal');
            doc.text(line, margin + 12, yPosition);
            yPosition += lineHeight + 1;
          });

          yPosition += 8; // Space between opportunities
        });
      } else {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(120, 120, 120);
        doc.text('No specific areas of opportunity identified for this competency in the current assessment.', margin + 12, yPosition);
        yPosition += 12;
        doc.setTextColor(0, 0, 0);
      }

      addPageNumber(doc, pageNum);
    });
  }

  // PAGE 4: OVERALL RATINGS & RECOMMENDATIONS
  doc.addPage();
  pageNum++;
  yPosition = margin;

  // Title - Large, bold with thick underline (matching reference)
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Readiness Vs. Application', margin, yPosition);
  yPosition += 12;

  // Thick underline
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(2);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 20;

  // Introductory paragraph
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const readinessIntroText = 'Readiness evaluates intellectual knowledge and understanding of competencies. Application focuses on the capacity to demonstrate these competencies in real-world situations and interactions.';
  const readinessIntroLines = doc.splitTextToSize(readinessIntroText, maxWidth);
  readinessIntroLines.forEach((line: string) => {
    doc.text(line, margin, yPosition);
    yPosition += lineHeight + 1;
  });
  yPosition += 15;

  // Parse readiness comments
  let readinessComments: string[] = [];
  if (sections.ratings.content) {
    try {
      if (typeof sections.ratings.content === 'string') {
        try {
          const parsed = JSON.parse(sections.ratings.content);
          if (parsed.comments && Array.isArray(parsed.comments)) {
            readinessComments = parsed.comments;
          } else if (Array.isArray(parsed)) {
            readinessComments = parsed;
          }
        } catch {
          readinessComments = sections.ratings.content.split('\n').filter((line: string) => line.trim());
        }
      } else if (Array.isArray(sections.ratings.content)) {
        readinessComments = sections.ratings.content;
      }
    } catch (error) {
      console.error('Error parsing readiness comments:', error);
    }
  }

  // Detailed Readiness vs Application Analysis Section (matching reference)
  checkNewPage(30);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Detailed Readiness vs Application Analysis', margin, yPosition);
  yPosition += 12;

  // Underline for section heading
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;

  // Display analysis for each competency
  if (readinessComments.length > 0 && sections.analysis.competencies && sections.analysis.competencies.length > 0) {
    sections.analysis.competencies.forEach((comp: Record<string, unknown>, idx: number) => {
      if (readinessComments[idx]) {
        checkNewPage(40);

        // Competency name as sub-heading (bold)
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const compName = typeof comp.name === 'string' ? comp.name : `Competency ${idx + 1}`;
        doc.text(compName, margin, yPosition);
        yPosition += 10;

        // Detailed analysis paragraph
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const commentLines = doc.splitTextToSize(readinessComments[idx], maxWidth);
        commentLines.forEach((line: string) => {
          checkNewPage();
          doc.text(line, margin, yPosition);
          yPosition += lineHeight + 1;
        });

        yPosition += 12; // Space between competencies
      }
    });
  } else if (sections.analysis.competencies && sections.analysis.competencies.length > 0) {
    // Fallback: generate analysis from scores if comments not available
    sections.analysis.competencies.forEach((comp: Record<string, unknown>, idx: number) => {
      checkNewPage(40);

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const compName = typeof comp.name === 'string' ? comp.name : `Competency ${idx + 1}`;
      doc.text(compName, margin, yPosition);
      yPosition += 10;

      const compScore = typeof comp.score === 'number' ? comp.score : 5;
      const readiness = typeof comp.readiness === 'number' ? comp.readiness : compScore;
      const application = typeof comp.application === 'number' ? comp.application : compScore;
      const analysisText = `For the competency in question, ${participantName} has both a readiness score of ${readiness.toFixed(0)} and an application score of ${application.toFixed(0)}. This ${readiness === application ? 'alignment' : readiness > application ? 'gap' : 'difference'} suggests ${readiness === application ? 'a balanced approach' : readiness > application ? 'that knowledge exceeds practical application' : 'that practical application exceeds knowledge'}.`;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const analysisLines = doc.splitTextToSize(analysisText, maxWidth);
      analysisLines.forEach((line: string) => {
        checkNewPage();
        doc.text(line, margin, yPosition);
        yPosition += lineHeight + 1;
      });

      yPosition += 12;
    });
  }

  // Bar Chart
  if (sections.analysis.competencies && sections.analysis.competencies.length > 0) {
    const chartData: Array<{name: string, readiness: number, application: number}> = sections.analysis.competencies.map((comp: Record<string, unknown>) => {
      const compName = typeof comp.name === 'string' ? comp.name : 'Competency';
      const compScore = typeof comp.score === 'number' ? comp.score : 5;
      const compReadiness = typeof comp.readiness === 'number' ? comp.readiness : compScore;
      const compApplication = typeof comp.application === 'number' ? comp.application : compScore;
      return {
        name: compName,
        readiness: compReadiness,
        application: compApplication
      };
    });

    if (chartData.length > 0) {
      checkNewPage(120);
      drawBarChart(doc, margin, yPosition, pageWidth - 2 * margin, 120, chartData);
      yPosition += 130;
    }
  }

  // Detailed Analysis Table - Fixed to match reference
  checkNewPage(60);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Analysis Table', margin, yPosition);
  yPosition += 15;

  const tableY = yPosition;
  // Better column widths: Competency (30%), Ready (12%), Apply (12%), Analysis Comment (46%)
  const colWidths = [
    (pageWidth - 2 * margin) * 0.30, 
    (pageWidth - 2 * margin) * 0.12, 
    (pageWidth - 2 * margin) * 0.12, 
    (pageWidth - 2 * margin) * 0.46
  ];
  const colX = [
    margin, 
    margin + colWidths[0], 
    margin + colWidths[0] + colWidths[1], 
    margin + colWidths[0] + colWidths[1] + colWidths[2]
  ];
  const headerHeight = 15;

  // Table header (black background, white text)
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, tableY, pageWidth - 2 * margin, headerHeight, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('Competency', colX[0] + 5, tableY + 10);
  doc.text('Ready', colX[1] + colWidths[1] / 2, tableY + 10, { align: 'center' });
  doc.text('Apply', colX[2] + colWidths[2] / 2, tableY + 10, { align: 'center' });
  doc.text('Analysis Comment', colX[3] + 5, tableY + 10);

  doc.setTextColor(0, 0, 0);
  yPosition = tableY + headerHeight;

  // Use readinessComments already parsed above

  if (sections.analysis.competencies && sections.analysis.competencies.length > 0) {
    sections.analysis.competencies.forEach((comp: Record<string, unknown>, idx: number) => {
      // Get analysis comment
        let comment = '';
        if (readinessComments[idx]) {
          comment = readinessComments[idx];
        } else if (typeof comp.overview === 'string') {
          comment = comp.overview;
        } else {
          const compAnalysisComment = typeof comp.analysisComment === 'string' ? comp.analysisComment : '';
          const compComment = typeof comp.comment === 'string' ? comp.comment : '';
          const compAnalysis = typeof comp.analysis === 'string' ? comp.analysis : '';
          comment = compAnalysisComment || compComment || compAnalysis || 'No analysis comment available.';
        }

      // Calculate row height based on comment text
      doc.setFontSize(9);
      const commentLines = doc.splitTextToSize(comment, colWidths[3] - 10);
      const lineHeight = 4.5;
      const padding = 8;
      const actualRowHeight = Math.max(20, commentLines.length * lineHeight + padding);

      checkNewPage(actualRowHeight + 5);

      // Draw row background (light grey for even rows)
      const isEven = idx % 2 === 0;
      if (isEven) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, actualRowHeight, 'F');
      }

      // Draw row border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, actualRowHeight);

      // Draw Competency name
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const compName = typeof comp.name === 'string' ? comp.name : 'Competency';
      const compNameLines = doc.splitTextToSize(compName, colWidths[0] - 10);
      compNameLines.forEach((line: string, lineIdx: number) => {
        doc.text(line, colX[0] + 5, yPosition + 8 + (lineIdx * 5));
      });

      // Draw Ready score (centered, bold)
      doc.setFont('helvetica', 'bold');
      const compScore = typeof comp.score === 'number' ? comp.score : 0;
      const compReadiness = typeof comp.readiness === 'number' ? comp.readiness : compScore;
      const compApplication = typeof comp.application === 'number' ? comp.application : compScore;
      const readyScore = compReadiness.toFixed(0);
      doc.text(readyScore, colX[1] + colWidths[1] / 2, yPosition + 10, { align: 'center' });

      // Draw Apply score (centered, bold)
      const applyScore = compApplication.toFixed(0);
      doc.text(applyScore, colX[2] + colWidths[2] / 2, yPosition + 10, { align: 'center' });

      // Draw Analysis Comment (wrapped text)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      commentLines.forEach((line: string, lineIdx: number) => {
        doc.text(line, colX[3] + 5, yPosition + 6 + (lineIdx * lineHeight));
      });

      yPosition += actualRowHeight;
    });
  }

  yPosition += 20;
  checkNewPage(40);

  // Recommendations Section - Enhanced formatting
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(1);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Recommendations', margin, yPosition);
  yPosition += 15;

  if (sections.recommendations.recommendations && sections.recommendations.recommendations.length > 0) {
    sections.recommendations.recommendations.forEach((rec: string, recIdx: number) => {
      checkNewPage(25);

      // Numbered recommendation with better styling
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${recIdx + 1}.`, margin, yPosition);

      // Recommendation text (detailed 2-3 sentences)
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const recLines = doc.splitTextToSize(rec, maxWidth - 20);
      recLines.forEach((line: string, lineIdx: number) => {
        checkNewPage();
        doc.text(line, margin + 15, yPosition + (lineIdx * (lineHeight + 1)));
      });

      yPosition += (recLines.length * (lineHeight + 1)) + 10; // Space between recommendations
    });
  } else if (sections.recommendations.content) {
    const recLines = doc.splitTextToSize(sections.recommendations.content, maxWidth);
    recLines.forEach((line: string) => {
      checkNewPage();
      doc.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  }

  addPageNumber(doc, pageNum);

  // Save the PDF. Sanitise the stem only — the previous `.replace()` ran over the whole
  // string and turned ".pdf" into "_pdf", leaving the file with no extension.
  const stem = [participantName, assessmentCenterFileNamePart, reportName, 'Report']
    .filter((part) => part && part.trim().length > 0)
    .join('_')
    .replace(/[^a-z0-9]/gi, '_');
  doc.save(`${stem}.pdf`);
}
