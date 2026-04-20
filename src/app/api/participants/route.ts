import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, message: 'Unauthorized: No token provided' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    // For mock, accept any non-empty token
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    const data = await request.json();
    // Mock participant creation
    return NextResponse.json({
      success: true,
      message: 'Participant created successfully',
      data: {
        id: 'mock-participant-id',
        ...data,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to create participant', error: error?.toString() }, { status: 400 });
  }
} 