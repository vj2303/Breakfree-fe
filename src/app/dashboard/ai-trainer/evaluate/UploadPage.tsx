'use client';
import React, { useState } from 'react';
import Upload from '@/components/Upload';
// import RecentContentCard from './RecentContentCard';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

type UploadStatus = 'idle' | 'loading' | 'success' | 'error';

interface UploadPageProps {
  uploadStatus: UploadStatus;
  uploadedFileName?: string;
  handleFileUpload: (file: File) => void;
  onEvaluationComplete?: () => void;
}

const UploadPage: React.FC<UploadPageProps> = ({ uploadStatus, uploadedFileName, handleFileUpload, onEvaluationComplete }) => {
    const { token } = useAuth();
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDoneClick = async () => {
        if (uploadStatus !== 'success') {
            alert('Please upload a document first before proceeding.');
            return;
        }

        if (!token) {
            alert('Authentication token not found. Please log in again.');
            return;
        }

        setIsProcessing(true);
        
        try {
            // Call the evaluation completion API
            const response = await fetch('/api/document-evaluation/complete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fileName: uploadedFileName,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();
            
            if (result.success) {
                // Call the callback to trigger evaluation display
                if (onEvaluationComplete) {
                    onEvaluationComplete();
                } else {
                    // Fallback: redirect to accuracy page
                    router.push('/dashboard/ai-trainer/evaluate/accuracy');
                }
            } else {
                alert(result.message || 'Failed to complete evaluation. Please try again.');
            }
        } catch (error) {
            console.error('Error completing evaluation:', error);
            alert('An error occurred while completing the evaluation. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="  max-w-[1200px] mx-auto">
            <h1 className="font-bold text-black mb-6 text-[40px] leading-[60px]">Upload</h1>

            {/* Upload component */}
            <Upload onFileChange={handleFileUpload} uploadStatus={uploadStatus} />

            {/* Upload Status Message */}
            {uploadStatus !== 'idle' && (
                <p className={`mt-2 ${uploadStatus === 'success' ? 'text-green-500' : uploadStatus === 'error' ? 'text-red-500' : 'text-gray-600'}`}>
                    {uploadStatus === 'loading' ? 'Uploading...' : uploadStatus === 'success' ? '✅ Uploaded' : uploadStatus === 'error' ? '❌ Upload failed' : ''} {uploadedFileName && (`${uploadedFileName}`)}
                </p>
            )}

            <div className="flex justify-end mt-4">
                <Button 
                    bg="dark-bg" 
                    text="white" 
                    onClick={handleDoneClick}
                    disabled={isProcessing || uploadStatus !== 'success'}
                >
                    {isProcessing ? 'Processing...' : 'Done'}
                </Button>
            </div>

            {/* <h1 className="font-bold text-black text-[40px] leading-[60px]">
                Recent Evaluated Contentt
            </h1>
            <RecentContentCard /> */}

            {/* Display Evaluation Results */}

        </div>
    );
};

export default UploadPage;