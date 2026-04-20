"use client";

import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import Image from "next/image";

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!user) return null; // Optionally show a loading spinner

  const handleOptionClick = (option: string) => {
    if (option === "ai-trainers") {
      router.push("/dashboard/ai-trainer/create");
    } else if (option === "report-generation") {
      router.push("/dashboard/report-generation/content");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar Component */}
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.firstName}
          </h1>
          <p className="text-gray-600">Select an Option to Proceed</p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
          {/* AI for Trainers Card */}
          <div
            onClick={() => handleOptionClick("ai-trainers")}
            className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border border-gray-100"
          >
            <div className="text-center">
              {/* AI Trainers Image */}
              <div className="mb-6 flex justify-center">
                <Image
                  src="/ai-trainer.png"
                  alt="AI Trainers"
                  width={192}
                  height={128}
                  className="w-48 h-32 object-contain rounded-lg bg-gray-100"
                />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                AI for Trainers
              </h3>

              <p className="text-gray-600 text-sm">
                Access AI-powered training tools and resources
              </p>
            </div>
          </div>

          {/* AI Powered Report Generation Card */}
          <div
            onClick={() => handleOptionClick("report-generation")}
            className="bg-white rounded-2xl shadow-lg p-8 cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border border-gray-100"
          >
            <div className="text-center">
              {/* Report Generation Image */}
              <div className="mb-6 flex justify-center">
                <Image
                  src="/report-generator.png"
                  alt="Report Generation"
                  width={192}
                  height={128}
                  className="w-48 h-32 object-contain rounded-lg bg-gray-100"
                />
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                SkillSightAI
              </h3>

              <p className="text-gray-600 text-sm">
                Generate comprehensive reports using AI technology
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
