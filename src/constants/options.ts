export const contentTypeOptions = [
    { label: "Training Modules", value: "training_modules" },
    { label: "E-learning Courses", value: "e_learning_courses" },
    { label: "Case Studies/Caselets", value: "case_studies_caselets" },
    { label: "Role Plays", value: "role_plays" },
    { label: "Assessments", value: "assessments" },
    { label: "Videos/Animations", value: "videos_animations" },
    { label: "Infographics", value: "infographics" },
    { label: "Worksheets/Job Aids", value: "worksheets_job_aids" },
    { label: "Proposals", value: "proposals" },
    { label: "Content Outline", value: "content_outline" },
    { label: "Feedback Templates", value: "feedback_templates" },
    { label: "Simulations", value: "simulations" },
    { label: "Activities", value: "activities" },
    { label: "Questionnaires - self Assesments/Reflections/research etc", value: "questionnaires_self_assessments_reflections_research" },
];

export const audienceTypeOptions = [
    { label: "Entry-Level Employees", value: "entry_level_employees" },
    { label: "Mid-Level Professionals", value: "mid_level_professionals" },
    { label: "Senior Management", value: "senior_management" },
    { label: "Trainer/Facilitators", value: "trainers_facilitators" },
    { label: "Students", value: "students" },
    { label: "Specialized Roles (Ex: Sales, Customer Support)", value: "specialized_roles" },
    { label: "Client Point of Contact / LnD Head", value: "client_point_of_contact_lnd_head" }
];


export const deliveryMethodOptions = [
    { label: "In-Person Training", value: "in_person_training" },
    { label: "Self-Paced Training", value: "self_paced_training" },
    { label: "Blended Learning", value: "blended_learning" },
    { label: "Microlearning", value: "microlearning" },
    { label: "Virtual Instructor-Led Training (VLIT)", value: "virtual_instructor_led_training" },
    { label: "Outbound Training", value: "outbound_training" }
];

export const outputTypeOptions = [
    { label: "Leadership Management", value: "leadership_management" },
    { label: "Customer Service", value: "customer_service" },
    { label: "Communication Skills", value: "communication_skills" },
    { label: "Technical Training", value: "technical_training" }
];

export const industryTypeOptions = [
    { label: "IT and ITeS", value: "it_and_ites" },
    { label: "Healthcare", value: "healthcare" },
    { label: "BFSI", value: "bfsi" },
    { label: "E-commerce and Retail", value: "ecommerce_and_retail" },
    { label: "Manufacturing", value: "manufacturing" },
    { label: "Media and Entertainment", value: "media_and_entertainment" },
    { label: "Education and Training", value: "education_and_training" },
    { label: "Travel and Hospitality", value: "travel_and_hospitality" },
    { label: "Real Estate & Construction", value: "real_estate_and_construction" }
];




// 'use client';
// import React from 'react';
// import Button from '@/components/UI/Button';


// interface AssessmentInfoProps {
//   group: Group;
//   participants: Participant[];
//   onBack: () => void;
//   onViewParticipant: (participant: Participant) => void;
// }

// const AssesmentInfo: React.FC<AssessmentInfoProps> = ({ 
//   group, 
//   participants, 
//   onBack, 
//   onViewParticipant 
// }) => {
//   return (
//     <div>
//           //  <Button
//           //    bg={ 'dark-blue'}
//           //    text={'white'}
//           //    onClick={onBack}
//           //    size="sm"
//           //    type="button"
//           //  >
//           //     Back
//           //  </Button>
           
//            <div className='bg-[#fff] px-4 mt-2'>
//                   <h1 className='font-bold text-[32px]'>Group Name</h1>
//                   <p className='text-[#888888] font-medium'>Group Admin Name</p>

//                   <h1 className='font-bold mt-[18px] text-[32px]'>Assessment Details</h1>

//                   <p className='font-medium mt-[18px]'>Assigning Date- 12/ 02/ 2025</p>

//                  <div className='flex flex-row gap-4 py-4'>
//                       <div className='bg-[#F4F8FD] p-4'>
//                                   <h1>Assessment Center Name</h1>
//                                   <p>Activity- Case Study</p>
//                                   <p>Activity- Case Study</p>
//                                   <p>Activity- Case Study</p>
//                         </div>
//                       <div className='bg-[#F4F8FD] p-4'>
//                                   <h1>Assessment Center Name</h1>
                                 
//                         </div>
//                       <div className='bg-[#F4F8FD] p-4'>
//                                   <h1>Assessment Center Name</h1>
                               
//                         </div>
//                  </div>

//                  <h1 className='font-medium text-[20px]'>Submission Date- 12/ 02/ 2025</h1>

//                  <p className='text-[14px] '>Group Member</p>

//                  <div>
//                       <div className='bg-[#00FFFF1A]'>
//                            <h1>Participant Name</h1>
//                            <p>Designation</p>
//                            <p>Email - a@gmail.com</p>
//                            <Button
//                            bg="dark-blue"
//                            text="white"
//                            size="sm"
//                            type="button"
//                            onClick={() => onViewParticipant(participant)}
//                          >
//                            View
//                          </Button>
//                       </div>
//                  </div>
                 
//            </div>

    
      
      
   
//     </div>
//   );
// };

// export default AssesmentInfo;