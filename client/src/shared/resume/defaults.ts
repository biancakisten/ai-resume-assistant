import type { ResumeData } from './types'

export const RESUME_LIMITS = {
  employmentHistory: 5,
  education: 5,
  technicalSkills: 15,
  softSkills: 10,
  trainingAndCertificates: 10,
} as const

export function createEmptyResumeData(): ResumeData {
  return {
    personalDetails: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      city: '',
      country: '',
      linkedInUrl: '',
      portfolioUrl: '',
    },
    photograph: null,
    professionalOverview: '',
    strengths: [],
    employmentHistory: [],
    education: [],
    technicalSkills: [],
    softSkills: [],
    trainingAndCertificates: [],
    languages: [],
    interests: [],
  }
}
