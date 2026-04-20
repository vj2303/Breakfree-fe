import { NextRequest, NextResponse } from 'next/server';

interface AIProfile {
  id: string;
  title: string;
  systemInstruction: string;
  temperature: number;
  model: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data store (in a real app, this would be a database)
const aiProfiles: AIProfile[] = [
  {
    id: '1',
    title: 'Assessment Expert',
    systemInstruction: 'You are an expert assessor who generates professional evaluation reports. Always maintain objectivity and use professional language.',
    temperature: 0.7,
    model: 'gpt-4o',
    createdBy: '689db10a67791b3839b99c0d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Content Writer',
    systemInstruction: 'You are a skilled content writer who creates engaging and informative content. Focus on clarity and user engagement.',
    temperature: 0.8,
    model: 'gpt-4',
    createdBy: '689db10a67791b3839b99c0d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Code Reviewer',
    systemInstruction: 'You are an experienced software engineer who reviews code for quality, security, and best practices.',
    temperature: 0.3,
    model: 'claude-3',
    createdBy: '689db10a67791b3839b99c0d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Data Analyst',
    systemInstruction: 'You are a data analyst who helps interpret data and provides insights. Focus on accuracy and actionable recommendations.',
    temperature: 0.5,
    model: 'gemini-pro',
    createdBy: '689db10a67791b3839b99c0d',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Customer Support',
    systemInstruction: 'You are a helpful customer support representative. Be friendly, empathetic, and solution-oriented.',
    temperature: 0.6,
    model: 'gpt-3.5-turbo',
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
    
    // In a real app, you would validate the token here
    // For now, we'll just check if it exists
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

    // Filter profiles based on search term
    let filteredProfiles = aiProfiles;
    if (search) {
      filteredProfiles = aiProfiles.filter(profile => 
        profile.title.toLowerCase().includes(search.toLowerCase()) ||
        profile.systemInstruction.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Calculate pagination
    const total = filteredProfiles.length;
    const pages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProfiles = filteredProfiles.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      message: 'AI Profiles retrieved successfully',
      data: {
        aiProfiles: paginatedProfiles,
        pagination: {
          page,
          limit,
          total,
          pages
        }
      }
    });

  } catch (error) {
    console.error('Error fetching AI profiles:', error);
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
    
    // In a real app, you would validate the token here
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, systemInstruction, temperature, model } = body;

    // Validate required fields
    if (!title || !systemInstruction || temperature === undefined || !model) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: title, systemInstruction, temperature, model' },
        { status: 400 }
      );
    }

    // Validate temperature range
    if (temperature < 0 || temperature > 1) {
      return NextResponse.json(
        { success: false, message: 'Temperature must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Validate model
    const validModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro'];
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { success: false, message: 'Invalid model specified' },
        { status: 400 }
      );
    }

    // Create new AI profile
    const newProfile = {
      id: Date.now().toString(),
      title,
      systemInstruction,
      temperature,
      model,
      createdBy: '689db10a67791b3839b99c0d', // In a real app, get from token
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    aiProfiles.push(newProfile);

    return NextResponse.json({
      success: true,
      data: newProfile,
      message: 'AI profile created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating AI profile:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

