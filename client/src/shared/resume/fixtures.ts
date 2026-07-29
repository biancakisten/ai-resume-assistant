import { createEmptyResumeData, RESUME_LIMITS } from './defaults'
import type { EmploymentEntry, ResumeData } from './types'

export const minimalValidResume: ResumeData = {
  ...createEmptyResumeData(),
  personalDetails: {
    firstName: 'Lerato',
    lastName: 'Mokoena',
    professionalTitle: 'Junior Software Developer',
    email: 'lerato.mokoena@example.com',
    phone: '+27 71 555 0142',
    city: 'Johannesburg',
    country: 'South Africa',
    linkedInUrl: '',
    portfolioUrl: '',
  },
}

export const completeSampleResume: ResumeData = {
  personalDetails: {
    firstName: 'Thandi',
    lastName: 'Ndlovu',
    professionalTitle: 'Frontend Engineer',
    email: 'thandi.ndlovu@example.com',
    phone: '+27 82 555 0198',
    city: 'Cape Town',
    country: 'South Africa',
    linkedInUrl: 'https://www.linkedin.com/in/thandi-ndlovu-example',
    portfolioUrl: 'https://thandi-ndlovu.example.com',
  },
  photograph: {
    url: 'https://images.example.com/thandi-ndlovu.webp',
    fileName: 'thandi-ndlovu.webp',
    mimeType: 'image/webp',
    sizeBytes: 184320,
    width: 800,
    height: 800,
    altText: 'Professional portrait of Thandi Ndlovu',
  },
  professionalOverview:
    'Product-minded software engineer with experience building accessible web applications for South African businesses.',
  strengths: ['Analytical thinking', 'Clear communication', 'Delivery focus'],
  employmentHistory: [
    {
      jobTitle: 'Frontend Engineer',
      employer: 'Ubuntu Digital Studio',
      employmentType: 'Full-time',
      city: 'Cape Town',
      country: 'South Africa',
      startDate: { month: 3, year: 2023 },
      endDate: null,
      currentlyWorkingHere: true,
      description:
        'Builds accessible React applications and mentors junior developers.',
    },
    {
      jobTitle: 'Junior Web Developer',
      employer: 'Karoo Commerce Labs',
      employmentType: 'Contract',
      city: 'Stellenbosch',
      country: 'South Africa',
      startDate: { month: 1, year: 2021 },
      endDate: { month: 2, year: 2023 },
      currentlyWorkingHere: false,
      description:
        'Delivered customer portals and improved automated test coverage.',
    },
  ],
  education: [
    {
      qualification: 'BSc Information Technology',
      institution: 'Example Metropolitan University',
      city: 'Gqeberha',
      country: 'South Africa',
      startDate: { month: 2, year: 2017 },
      endDate: { month: 11, year: 2020 },
      currentlyStudying: false,
      description: 'Focused on software engineering and information systems.',
    },
  ],
  technicalSkills: [
    'TypeScript',
    'React',
    'Node.js',
    'HTML',
    'CSS',
    'PostgreSQL',
  ],
  softSkills: ['Communication', 'Mentoring', 'Problem solving'],
  trainingAndCertificates: [
    {
      name: 'Cloud Practitioner Foundations',
      issuingOrganisation: 'Example Cloud Academy',
      completionDate: { month: 8, year: 2024 },
      inProgress: false,
      credentialId: 'ECA-2408-137',
      credentialUrl: 'https://credentials.example.com/ECA-2408-137',
    },
    {
      name: 'Accessible Web Development',
      issuingOrganisation: 'Cape Learning Collective',
      completionDate: null,
      inProgress: true,
      credentialId: '',
      credentialUrl: '',
    },
  ],
  languages: [
    { name: 'English', proficiency: 'Fluent' },
    { name: 'isiXhosa', proficiency: 'Conversational' },
    { name: 'Afrikaans', proficiency: 'Basic' },
  ],
  interests: ['Community coding workshops', 'Hiking', 'Local history'],
}

const completedEmployment: EmploymentEntry = {
  jobTitle: 'Software Developer',
  employer: 'Example Employer',
  employmentType: 'Full-time',
  city: 'Pretoria',
  country: 'South Africa',
  startDate: { month: 1, year: 2022 },
  endDate: { month: 12, year: 2023 },
  currentlyWorkingHere: false,
  description: '',
}

export const invalidResumeFixtures = {
  missingRequiredFields: createEmptyResumeData(),
  invalidEmail: {
    ...minimalValidResume,
    personalDetails: {
      ...minimalValidResume.personalDetails,
      email: 'not-an-email',
    },
  },
  invalidUrls: {
    ...minimalValidResume,
    personalDetails: {
      ...minimalValidResume.personalDetails,
      portfolioUrl: 'not a url',
    },
  },
  invalidDates: {
    ...minimalValidResume,
    employmentHistory: [
      {
        ...completedEmployment,
        startDate: { month: 12, year: 2024 },
        endDate: { month: 1, year: 2024 },
      },
    ],
  },
  duplicateSkillsAndLanguages: {
    ...minimalValidResume,
    technicalSkills: ['TypeScript', ' typescript '],
    softSkills: ['Communication', ' communication '],
    languages: [
      { name: 'English', proficiency: 'Fluent' },
      { name: ' english ', proficiency: 'Basic' },
    ],
  },
  overAllLimits: {
    ...minimalValidResume,
    employmentHistory: Array.from(
      { length: RESUME_LIMITS.employmentHistory + 1 },
      () => ({ ...completedEmployment }),
    ),
    education: Array.from(
      { length: RESUME_LIMITS.education + 1 },
      () => ({
        qualification: 'Diploma',
        institution: 'Example College',
        city: 'Durban',
        country: 'South Africa',
        startDate: { month: 1, year: 2020 },
        endDate: { month: 12, year: 2021 },
        currentlyStudying: false,
        description: '',
      }),
    ),
    technicalSkills: Array.from(
      { length: RESUME_LIMITS.technicalSkills + 1 },
      (_, index) => `Technical skill ${index}`,
    ),
    softSkills: Array.from(
      { length: RESUME_LIMITS.softSkills + 1 },
      (_, index) => `Soft skill ${index}`,
    ),
    trainingAndCertificates: Array.from(
      { length: RESUME_LIMITS.trainingAndCertificates + 1 },
      (_, index) => ({
        name: `Course ${index}`,
        issuingOrganisation: 'Example Academy',
        completionDate: { month: 1, year: 2024 },
        inProgress: false,
        credentialId: '',
        credentialUrl: '',
      }),
    ),
  },
} satisfies Record<string, unknown>
