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
  }
];

export async function PATCH(
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
        { success: false, message: 'Profile ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, systemInstruction, temperature, model } = body;

    // Find the profile to update
    const profileIndex = aiProfiles.findIndex(p => p.id === id);
    
    if (profileIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'AI profile not found' },
        { status: 404 }
      );
    }

    // Validate temperature if provided
    if (temperature !== undefined && (temperature < 0 || temperature > 1)) {
      return NextResponse.json(
        { success: false, message: 'Temperature must be between 0 and 1' },
        { status: 400 }
      );
    }

    // Validate model if provided
    if (model) {
      const validModels = ['gpt-4o', 'gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro'];
      if (!validModels.includes(model)) {
        return NextResponse.json(
          { success: false, message: 'Invalid model specified' },
          { status: 400 }
        );
      }
    }

    // Update the profile
    const updatedProfile = {
      ...aiProfiles[profileIndex],
      ...(title && { title }),
      ...(systemInstruction && { systemInstruction }),
      ...(temperature !== undefined && { temperature }),
      ...(model && { model }),
      updatedAt: new Date().toISOString()
    };

    aiProfiles[profileIndex] = updatedProfile;

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'AI profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating AI profile:', error);
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
        { success: false, message: 'Profile ID is required' },
        { status: 400 }
      );
    }

    // Find and remove the profile
    const profileIndex = aiProfiles.findIndex(p => p.id === id);
    
    if (profileIndex === -1) {
      return NextResponse.json(
        { success: false, message: 'AI profile not found' },
        { status: 404 }
      );
    }

    aiProfiles.splice(profileIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'AI profile deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting AI profile:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
