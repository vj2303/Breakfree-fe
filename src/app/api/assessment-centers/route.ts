import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../lib/apiConfig';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '10';
    const search = searchParams.get('search') || '';

    // Get the authorization token from the request headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header missing' },
        { status: 401 }
      );
    }

    const response = await fetch(
      `${SERVER_API_BASE_URL_WITH_API}/assessment-centers?page=${page}&limit=${limit}&search=${search}`,
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch assessment centers' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Assessment centers API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Authorization header missing' },
        { status: 401 }
      );
    }

    // Parse incoming multipart/form-data
    const incomingForm = await request.formData();

    // Forward all fields (including the document file) as multipart/form-data to the backend
    const forwardForm = new FormData();
    for (const [key, value] of incomingForm.entries()) {
      forwardForm.append(key, value);
    }

    const response = await fetch(
      `${SERVER_API_BASE_URL_WITH_API}/assessment-centers`,
      {
        method: 'POST',
        headers: {
          // Do NOT set Content-Type — fetch sets it automatically with the correct multipart boundary
          'Authorization': authHeader,
        },
        body: forwardForm,
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Failed to create assessment center' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Assessment centers POST API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
