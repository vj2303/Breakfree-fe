import { NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '../../../../lib/apiConfig';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Call the external API
    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      // Build a user-facing message from the backend's field-level validation
      // errors so the client can show exactly what to fix (and highlight it),
      // instead of only the generic "Validation error".
      const fieldErrors: Array<{ field: string; message: string }> = Array.isArray(result.errors)
        ? result.errors
        : [];
      const detailedMessage = fieldErrors.length > 0
        ? fieldErrors.map((e) => e.message).join(' ')
        : (result.message || 'Registration failed');

      return NextResponse.json(
        {
          success: false,
          message: detailedMessage,
          errors: fieldErrors,
        },
        { status: response.status }
      );
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user || result.data?.user,
        token: result.token || result.data?.token,
        refreshToken: result.refreshToken || result.data?.refreshToken,
        expiresIn: result.expiresIn || result.data?.expiresIn
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Registration failed due to network error' 
      }, 
      { status: 500 }
    );
  }
} 