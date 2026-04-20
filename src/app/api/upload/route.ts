import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '@/lib/apiConfig';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Get form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'documents';

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File is required' },
        { status: 400 }
      );
    }

    // Create form data for backend API
    const backendFormData = new FormData();
    backendFormData.append('file', file);
    backendFormData.append('folder', folder);

    // Make request to backend API for file upload
    // Note: You'll need to create this endpoint in your backend
    // For now, we'll use a proxy approach
    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: backendFormData,
    });

    let result;
    try {
      result = await response.json();
    } catch {
      const errorText = await response.text();
      console.error('Upload error (non-JSON response):', errorText);
      return NextResponse.json(
        { success: false, message: 'Failed to upload file to server - invalid response' },
        { status: response.status }
      );
    }

    if (!response.ok) {
      console.error('Upload error:', result);
      return NextResponse.json(
        { success: false, message: result.message || 'Failed to upload file to server' },
        { status: response.status }
      );
    }

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, message: result.message || 'Upload failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

