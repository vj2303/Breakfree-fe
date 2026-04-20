import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_BASE_URL_WITH_API } from '@/lib/apiConfig';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const frontendBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      'https://breakfreefe.vercel.app';

    const normalizedFrontendBaseUrl = frontendBaseUrl.replace(/\/$/, '');
    const requestBody = {
      ...body,
      frontendBaseUrl: normalizedFrontendBaseUrl,
      resetPasswordUrl: `${normalizedFrontendBaseUrl}/reset-password`,
    };

    const response = await fetch(`${SERVER_API_BASE_URL_WITH_API}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy forgot-password error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process forgot password request' },
      { status: 500 }
    );
  }
}

