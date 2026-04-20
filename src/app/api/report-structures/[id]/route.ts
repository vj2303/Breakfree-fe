import { NextRequest, NextResponse } from 'next/server';

interface ReportStructure {
  id: string;
  reportName: string;
  description: string;
  selectedAssessment: string;
  reportTemplate: string;
  aiProfile: string;
  reportCover: {
    reportName: boolean;
    candidateName: boolean;
    date: boolean;
  };
  part1Introduction: boolean;
  part2Analysis: {
    detailObservation: boolean;
    overallCompetencyRating: boolean;
  };
  readinessVsApplication: boolean;
  part3Comments: {
    areasOfStrength: boolean;
    areasOfDevelopment: boolean;
  };
  part4OverallRatings: {
    interpretingScoreTable: boolean;
    competenciesScoreMatrix: boolean;
    chartType: 'bar' | 'pie';
  };
  part5Recommendation: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data store (in a real app, this would be a database)
const reportStructures: ReportStructure[] = [
  {
    id: '1',
    reportName: 'Assessment Report Template',
    description: 'Standard assessment report template',
    selectedAssessment: 'Standard Assessment',
    reportTemplate: 'Report Template 2',
    aiProfile: '1',
    reportCover: {
      reportName: true,
      candidateName: true,
      date: true
    },
    part1Introduction: true,
    part2Analysis: {
      detailObservation: true,
      overallCompetencyRating: true
    },
    readinessVsApplication: false,
    part3Comments: {
      areasOfStrength: true,
      areasOfDevelopment: true
    },
    part4OverallRatings: {
      interpretingScoreTable: true,
      competenciesScoreMatrix: true,
      chartType: 'bar'
    },
    part5Recommendation: false,
    createdBy: '689db10a67791b3839b99c0d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Report structure ID is required' },
        { status: 400 }
      );
    }

    // Find the report structure
    const reportStructure = reportStructures.find(r => r.id === id);
    
    if (!reportStructure) {
      return NextResponse.json(
        { success: false, message: 'Report structure not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: reportStructure
    });

  } catch (error) {
    console.error('Error fetching report structure:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Report structure ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      reportName,
      description,
      selectedAssessment,
      reportTemplate,
      aiProfile,
      reportCover,
      part1Introduction,
      part2Analysis,
      readinessVsApplication,
      part3Comments,
      part4OverallRatings,
      part5Recommendation
    } = body;

    // Find the report structure to update
    const reportIndex = reportStructures.findIndex(r => r.id === id);
    
    if (reportIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Report structure not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (reportName !== undefined && !reportName.trim()) {
      return NextResponse.json(
        { success: false, message: 'Report name cannot be empty' },
        { status: 400 }
      );
    }

    if (description !== undefined && !description.trim()) {
      return NextResponse.json(
        { success: false, message: 'Description cannot be empty' },
        { status: 400 }
      );
    }

    // Validate chartType if provided
    if (part4OverallRatings?.chartType && !['bar', 'pie'].includes(part4OverallRatings.chartType)) {
      return NextResponse.json(
        { success: false, message: 'chartType must be either "bar" or "pie"' },
        { status: 400 }
      );
    }

    // Update the report structure
    const updatedReportStructure = {
      ...reportStructures[reportIndex],
      ...(reportName !== undefined && { reportName }),
      ...(description !== undefined && { description }),
      ...(selectedAssessment !== undefined && { selectedAssessment }),
      ...(reportTemplate !== undefined && { reportTemplate }),
      ...(aiProfile !== undefined && { aiProfile }),
      ...(reportCover !== undefined && { reportCover }),
      ...(part1Introduction !== undefined && { part1Introduction }),
      ...(part2Analysis !== undefined && { part2Analysis }),
      ...(readinessVsApplication !== undefined && { readinessVsApplication }),
      ...(part3Comments !== undefined && { part3Comments }),
      ...(part4OverallRatings !== undefined && { part4OverallRatings }),
      ...(part5Recommendation !== undefined && { part5Recommendation }),
      updatedAt: new Date().toISOString()
    };

    reportStructures[reportIndex] = updatedReportStructure;

    return NextResponse.json({
      success: true,
      data: updatedReportStructure,
      message: 'Report structure updated successfully'
    });

  } catch (error) {
    console.error('Error updating report structure:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Report structure ID is required' },
        { status: 400 }
      );
    }

    // Find and remove the report structure
    const reportIndex = reportStructures.findIndex(r => r.id === id);
    
    if (reportIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'Report structure not found' },
        { status: 404 }
      );
    }

    reportStructures.splice(reportIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Report structure deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting report structure:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
