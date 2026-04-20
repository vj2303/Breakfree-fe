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

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    // Filter report structures based on search term
    let filteredReports = reportStructures;
    if (search) {
      filteredReports = reportStructures.filter(report => 
        report.reportName.toLowerCase().includes(search.toLowerCase()) ||
        report.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Calculate pagination
    const total = filteredReports.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      data: {
        reportStructures: paginatedReports,
        pagination: {
          currentPage: page,
          totalPages: pages,
          totalItems: total,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching report structures:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Validate required fields
    if (!reportName || !description || !aiProfile) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: reportName, description, aiProfile' },
        { status: 400 }
      );
    }

    // Validate reportCover structure
    if (reportCover && typeof reportCover !== 'object') {
      return NextResponse.json(
        { success: false, message: 'reportCover must be an object' },
        { status: 400 }
      );
    }

    // Validate part2Analysis structure
    if (part2Analysis && typeof part2Analysis !== 'object') {
      return NextResponse.json(
        { success: false, message: 'part2Analysis must be an object' },
        { status: 400 }
      );
    }

    // Validate part3Comments structure
    if (part3Comments && typeof part3Comments !== 'object') {
      return NextResponse.json(
        { success: false, message: 'part3Comments must be an object' },
        { status: 400 }
      );
    }

    // Validate part4OverallRatings structure
    if (part4OverallRatings && typeof part4OverallRatings !== 'object') {
      return NextResponse.json(
        { success: false, message: 'part4OverallRatings must be an object' },
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

    // Create new report structure
    const newReportStructure = {
      id: Date.now().toString(),
      reportName,
      description,
      selectedAssessment: selectedAssessment || '',
      reportTemplate: reportTemplate || 'Report Template 2',
      aiProfile,
      reportCover: reportCover || {
        reportName: true,
        candidateName: true,
        date: true
      },
      part1Introduction: part1Introduction || false,
      part2Analysis: part2Analysis || {
        detailObservation: true,
        overallCompetencyRating: true
      },
      readinessVsApplication: readinessVsApplication || false,
      part3Comments: part3Comments || {
        areasOfStrength: true,
        areasOfDevelopment: true
      },
      part4OverallRatings: part4OverallRatings || {
        interpretingScoreTable: true,
        competenciesScoreMatrix: true,
        chartType: 'bar'
      },
      part5Recommendation: part5Recommendation || false,
      createdBy: '689db10a67791b3839b99c0d', // In a real app, get from token
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    reportStructures.push(newReportStructure);

    return NextResponse.json({
      success: true,
      data: newReportStructure,
      message: 'Report structure created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating report structure:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
