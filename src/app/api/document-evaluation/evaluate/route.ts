import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Authorization token required' },
        { status: 401 }
      );
    }

    // Get the form data
    const formData = await request.formData();
    const document = formData.get('document') as File;
    
    if (!document) {
      return NextResponse.json(
        { success: false, message: 'Document file is required' },
        { status: 400 }
      );
    }

    // For now, return a mock response that matches the expected structure
    // In a real implementation, you would process the document here
    const mockResponse = {
      success: true,
      message: "Document evaluation completed successfully",
      data: {
        uiChecklist: [
          {
            id: 1,
            label: "Clear title",
            checked: true
          },
          {
            id: 2,
            label: "Introduction outlines purpose",
            checked: true
          },
          {
            id: 3,
            label: "Objectives clearly stated & SMART",
            checked: false,
            subchecks: [
              {
                key: "specific",
                label: "Specific",
                checked: false
              },
              {
                key: "measurable",
                label: "Measurable",
                checked: false
              },
              {
                key: "achievable",
                label: "Achievable",
                checked: false
              },
              {
                key: "relevant",
                label: "Relevant",
                checked: false
              },
              {
                key: "timebound",
                label: "Time-bound",
                checked: false
              }
            ]
          },
          {
            id: 4,
            label: "Background information present",
            checked: true
          },
          {
            id: 5,
            label: "Main points organized logically",
            checked: true
          },
          {
            id: 6,
            label: "Data/evidence supports claims",
            checked: true
          },
          {
            id: 7,
            label: "Visual aids (charts/graphs) included",
            checked: true
          },
          {
            id: 8,
            label: "Conclusion summarizes key findings",
            checked: true
          },
          {
            id: 9,
            label: "Recommendations for future actions",
            checked: true
          },
          {
            id: 10,
            label: "Free of grammatical errors",
            checked: false
          }
        ],
        criteria: [
          {
            id: 1,
            name: "Clear title",
            answer: "yes",
            confidence: 0.9,
            evidence: "1",
            location: "Title",
            note: ""
          },
          {
            id: 2,
            name: "Introduction outlines purpose",
            answer: "yes",
            confidence: 0.8,
            evidence: "Introduction\nHi Sagar,\nCongratulations on having completed the diagnostic activities conducted on the 25\nth\n – 27\nth\n of September 2023, \nas a kickoff for Katalyst – A Leadership Development Intervention.",
            location: "Introduction",
            note: ""
          },
          {
            id: 3,
            name: "Objectives clearly stated & SMART",
            answer: "no",
            confidence: 0.4,
            evidence: "Goals to ",
            location: "Objectives",
            note: "Objectives found but do not meet all SMART criteria",
            smart: {
              specific: {
                answer: "no",
                evidence: "",
                confidence: 0.3
              },
              measurable: {
                answer: "no",
                evidence: "",
                confidence: 0.3
              },
              achievable: {
                answer: "no",
                evidence: "",
                confidence: 0.3
              },
              relevant: {
                answer: "no",
                evidence: "",
                confidence: 0.3
              },
              timebound: {
                answer: "no",
                evidence: "",
                confidence: 0.3
              }
            }
          },
          {
            id: 4,
            name: "Background information present",
            answer: "yes",
            confidence: 0.8,
            evidence: "Introduction\nHi Sagar,\nCongratulations on having completed the diagnostic activities conducted on the 25\nth\n – 27\nth\n of September 2023, \nas a kickoff for Katalyst – A Leadership Development Intervention.",
            location: "Background",
            note: ""
          },
          {
            id: 5,
            name: "Main points organized logically",
            answer: "yes",
            confidence: 0.7,
            evidence: "Document has multiple sections",
            location: "Structure",
            note: ""
          },
          {
            id: 6,
            name: "Data/evidence supports claims",
            answer: "yes",
            confidence: 0.8,
            evidence: "Study & Presentation\n\u2022\nCase Study Analysis\n\u2022\nInterview\n\u2022\nSituational Judgement Test\nIt is essential to note that the report focuses observations based on the competencies exhibited during the \nexercises rather than the \"right or wrong\" responses to the situations or the tasks presented.",
            location: "Evidence",
            note: ""
          },
          {
            id: 7,
            name: "Visual aids (charts/graphs) included",
            answer: "yes",
            confidence: 0.8,
            evidence: "table conversations.",
            location: "Visual Aids",
            note: ""
          },
          {
            id: 8,
            name: "Conclusion summarizes key findings",
            answer: "yes",
            confidence: 0.8,
            evidence: "results.",
            location: "Conclusion",
            note: ""
          },
          {
            id: 9,
            name: "Recommendations for future actions",
            answer: "yes",
            confidence: 0.8,
            evidence: "suggestions regarding resource allocation, consistency in \nbacking these up with concrete results or impact analysis was lacking.",
            location: "Recommendations",
            note: ""
          },
          {
            id: 10,
            name: "Free of grammatical errors",
            answer: "no",
            confidence: 0.4,
            evidence: "",
            location: "Grammar",
            note: "{\"error_count\":3,\"examples\":[{\"original\":\"1\\nSagar Nalawade\\nAuthored by:  Breakfree Consulting \\nLeadership Development \\nProgram\\nKATALYS\\n\\n2\\nIntroduction\\nHi Sagar,\\nCongratulations on having completed the diagnostic activities conducted on the 25\\nth\\n – 27\\nth\\n of September 2023, \\nas a kickoff for Katalyst – A Leadership Development Intervention\",\"suggestion\":\"1 Sagar Nalawade Authored by: Breakfree Consulting Leadership Development Program KATALYS 2 Introduction Hi Sagar, Congratulations on having completed the diagnostic activities conducted on the 25 th – 27 th of September 2023, as a kickoff for Katalyst – A Leadership Development Intervention\"},{\"original\":\"g\",\"suggestion\":\"G\"},{\"original\":\"g\",\"suggestion\":\"G\"}]}"
          }
        ],
        scoreBreakdown: {
          totalScore: 8,
          totalPossible: 10,
          perCriterionScore: [
            {
              id: 1,
              points: 1
            },
            {
              id: 2,
              points: 1
            },
            {
              id: 3,
              points: 0
            },
            {
              id: 4,
              points: 1
            },
            {
              id: 5,
              points: 1
            },
            {
              id: 6,
              points: 1
            },
            {
              id: 7,
              points: 1
            },
            {
              id: 8,
              points: 1
            },
            {
              id: 9,
              points: 1
            },
            {
              id: 10,
              points: 0
            }
          ]
        },
        compliance: "Compliant",
        overallNotes: "Document evaluation completed. 8/10 criteria met. Found 3 grammatical issues. Document meets compliance standards."
      }
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('Document evaluation error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
