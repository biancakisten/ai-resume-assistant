import type {
  ResumeData,
  ResumeValidationError,
} from '../../shared/resume'
import type { ResumeAiController } from './ai/types'

export const RESUME_STEPS = [
  {
    title: 'Personal details',
    heading: 'Let’s start with the basics',
    description: 'Add the contact information employers need to reach you.',
    optional: false,
  },
  {
    title: 'Professional overview',
    heading: 'Introduce your professional story',
    description: 'Summarise the experience and strengths you want employers to notice.',
    optional: false,
  },
  {
    title: 'Employment history',
    heading: 'Show where you have made an impact',
    description: 'Add up to five roles, keeping the most relevant experience first.',
    optional: false,
  },
  {
    title: 'Education',
    heading: 'Add your education',
    description: 'Include at least one qualification and its institution.',
    optional: false,
  },
  {
    title: 'Skills and training',
    heading: 'Highlight what you bring',
    description: 'Add your technical skills, people skills, and optional training.',
    optional: false,
  },
  {
    title: 'Languages and interests',
    heading: 'Add a little more about you',
    description: 'Languages and interests are optional and can be added later.',
    optional: true,
  },
  {
    title: 'Review',
    heading: 'Review your resume information',
    description: 'Check every section and return to anything that still needs attention.',
    optional: false,
  },
] as const

export type StepIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface RepeatableUiIds {
  employment: string[]
  education: string[]
  training: string[]
  languages: string[]
  interests: string[]
  strengths: string[]
  technicalSkills: string[]
  softSkills: string[]
}

export interface ResumeBuilderState {
  resume: ResumeData
  currentStep: StepIndex
  highestUnlockedStep: StepIndex
  completedSteps: StepIndex[]
  skippedSteps: StepIndex[]
  touchedFields: string[]
  errors: ResumeValidationError[]
  ids: RepeatableUiIds
  dirty: boolean
  sessionId: number
}

export interface BuilderStepProps {
  state: ResumeBuilderState
  ai: ResumeAiController
  updateState: (
    updater: (current: ResumeBuilderState) => ResumeBuilderState,
  ) => void
}

export interface DeleteRequest {
  kind: 'employment' | 'education' | 'training' | 'language'
  index: number
  label: string
}
