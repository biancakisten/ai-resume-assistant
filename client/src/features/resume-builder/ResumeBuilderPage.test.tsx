// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { RESUME_LIMITS } from '../../shared/resume'
import { EmploymentStep } from './steps/EmploymentStep'
import { EducationStep } from './steps/EducationStep'
import { LanguagesInterestsStep } from './steps/LanguagesInterestsStep'
import { PersonalStep } from './steps/PersonalStep'
import { OverviewStep } from './steps/OverviewStep'
import { ReviewStep } from './steps/ReviewStep'
import { SkillsTrainingStep } from './steps/SkillsTrainingStep'
import ResumeBuilderPage from './pages/ResumeBuilderPage'
import {
  createEducationEntry,
  createEmploymentEntry,
  createInitialBuilderState,
} from './resumeBuilderUtils'
import type {
  BuilderStepProps,
  ResumeBuilderState,
} from './types'
import { useState, type ReactNode } from 'react'
import { useResumeAiAssistance } from './ai/useResumeAiAssistance'
import { AiConsentDialog } from './ai/AiConsentDialog'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  let objectUrlIndex = 0
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => {
      objectUrlIndex += 1
      return `blob:http://localhost/photo-${objectUrlIndex}`
    }),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})

function StateHarness({
  initialState,
  children,
}: {
  initialState: ResumeBuilderState
  children: (props: BuilderStepProps) => ReactNode
}) {
  const [state, setState] = useState(initialState)
  const ai = useResumeAiAssistance()
  return (
    <>
      {children({
        ai,
        state,
        updateState: (updater) => setState(updater),
      })}
      <AiConsentDialog ai={ai} />
    </>
  )
}

function fillPersonalDetails() {
  fireEvent.change(screen.getByLabelText('First name'), {
    target: { value: 'Lerato' },
  })
  fireEvent.change(screen.getByLabelText('Last name'), {
    target: { value: 'Mokoena' },
  })
  fireEvent.change(screen.getByLabelText('Professional job title'), {
    target: { value: 'Software Developer' },
  })
  fireEvent.change(screen.getByLabelText('Email address'), {
    target: { value: 'lerato@example.com' },
  })
  fireEvent.change(screen.getByLabelText('Phone number'), {
    target: { value: '+27 71 555 0101' },
  })
  fireEvent.change(screen.getByLabelText('City'), {
    target: { value: 'Johannesburg' },
  })
  fireEvent.change(screen.getByLabelText('Country'), {
    target: { value: 'South Africa' },
  })
}

function completeRequiredStepsToLanguages() {
  fillPersonalDetails()
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  fireEvent.change(screen.getByLabelText('Professional overview'), {
    target: { value: 'A careful software developer who builds accessible products.' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))

  fireEvent.click(screen.getByRole('button', { name: 'Add employment' }))
  fireEvent.change(screen.getByLabelText('Job title'), {
    target: { value: 'Developer' },
  })
  fireEvent.change(screen.getByLabelText('Employer'), {
    target: { value: 'Example Studio' },
  })
  fireEvent.change(screen.getByLabelText('City'), {
    target: { value: 'Cape Town' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))

  fireEvent.click(screen.getByRole('button', { name: 'Add education' }))
  fireEvent.change(screen.getByLabelText('Qualification'), {
    target: { value: 'Diploma in Software Development' },
  })
  fireEvent.change(screen.getByLabelText('Institution'), {
    target: { value: 'Example College' },
  })
  fireEvent.change(screen.getByLabelText('City'), {
    target: { value: 'Durban' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))

  const technicalInput = screen.getByLabelText('Add technical skills')
  fireEvent.change(technicalInput, { target: { value: 'TypeScript' } })
  fireEvent.keyDown(technicalInput, { key: 'Enter' })
  const softInput = screen.getByLabelText('Add soft skills')
  fireEvent.change(softInput, { target: { value: 'Communication' } })
  fireEvent.keyDown(softInput, { key: 'Enter' })
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
}

function completeRequiredStepsToReview() {
  completeRequiredStepsToLanguages()
  fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
}

function createReviewState(overview = 'Original overview.') {
  const state = createInitialBuilderState()
  state.currentStep = 6
  state.highestUnlockedStep = 6
  state.resume.professionalOverview = overview
  return state
}

function renderReview(initialState = createReviewState()) {
  return render(
    <StateHarness initialState={initialState}>
      {(props) => <ReviewStep {...props} onNavigate={vi.fn()} />}
    </StateHarness>,
  )
}

function ReviewDeletionHarness({
  initialState,
}: {
  initialState: ResumeBuilderState
}) {
  const [state, setState] = useState(initialState)
  const ai = useResumeAiAssistance()

  const deleteFirstEmployment = () => {
    const entryId = state.ids.employment[0]
    if (entryId) {
      ai.clear(`employment:${entryId}:responsibilities`)
      ai.clear(`employment:${entryId}:achievements`)
    }
    setState((current) => ({
      ...current,
      resume: {
        ...current.resume,
        employmentHistory: current.resume.employmentHistory.slice(1),
      },
      ids: {
        ...current.ids,
        employment: current.ids.employment.slice(1),
      },
    }))
  }

  return (
    <>
      <ReviewStep
        ai={ai}
        state={state}
        updateState={(updater) => setState(updater)}
        onNavigate={vi.fn()}
      />
      <button type="button" onClick={deleteFirstEmployment}>
        Delete first test role
      </button>
      <AiConsentDialog ai={ai} />
    </>
  )
}

describe('resume builder navigation', () => {
  it('renders the first step without Back and keeps future steps locked', () => {
    render(<ResumeBuilderPage />)
    expect(screen.getByRole('heading', { name: 'Let’s start with the basics' })).toBeTruthy()
    expect(screen.getByText('Personal details', { selector: 'p' })).toBeTruthy()
    expect(screen.queryByText(/Step 1 of 7/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    expect(
      screen.queryByRole('heading', { name: 'Download your resume' }),
    ).toBeNull()
    expect(
      (screen.getByRole('button', {
        name: /Step 3: Employment history. Locked/,
      }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })

  it('blocks invalid required navigation and focuses the first invalid field', async () => {
    render(<ResumeBuilderPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Please fix the following before continuing:')).toBeTruthy()
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('First name')),
    )
  })

  it('supports successful Next and Back while preserving state', () => {
    render(<ResumeBuilderPage />)
    fillPersonalDetails()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Introduce your professional story' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Lerato')
  })

  it('skips the optional step, marks it skipped, and permits revisiting it', () => {
    render(<ResumeBuilderPage />)
    completeRequiredStepsToLanguages()
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(screen.getByRole('heading', { name: 'Review your resume information' })).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Download your resume' }),
    ).toBeTruthy()
    const languageStep = screen.getByRole('button', {
      name: /Step 6: Languages and interests. Skipped/,
    })
    fireEvent.click(languageStep)
    expect(screen.getByRole('button', { name: 'Add language' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Skip for now' })).toBeTruthy()
  })

  it('runs full validation on Review and links back to invalid steps', () => {
    render(<ResumeBuilderPage />)
    completeRequiredStepsToLanguages()
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit personal details' }),
    )
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: '' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: /Step 7: Review. Available/ }),
    )
    expect(screen.getByText('Your resume still needs attention')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Fix Personal details' })).toBeTruthy()
  })
})

describe('start over and unsaved progress', () => {
  it('traps focus within the confirmation dialog', () => {
    render(<ResumeBuilderPage />)
    const opener = screen.getByRole('button', { name: 'Start Over' })
    opener.focus()
    fireEvent.click(opener)

    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Start over' })
    expect(document.activeElement).toBe(cancel)

    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirm)
    fireEvent.keyDown(confirm, { key: 'Tab' })
    expect(document.activeElement).toBe(cancel)
  })

  it('closes the confirmation dialog with Escape', () => {
    render(<ResumeBuilderPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    const dialog = screen.getByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('restores focus to the control that opened the dialog', () => {
    render(<ResumeBuilderPage />)
    const opener = screen.getByRole('button', { name: 'Start Over' })
    opener.focus()
    fireEvent.click(opener)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(document.activeElement).toBe(opener)
  })

  it('keeps information when Start Over is cancelled', () => {
    render(<ResumeBuilderPage />)
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Thandi' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('Thandi')
  })

  it('clears all state after Start Over is confirmed', () => {
    render(<ResumeBuilderPage />)
    fillPersonalDetails()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    expect(screen.getByRole('heading', { name: 'Let’s start with the basics' })).toBeTruthy()
    expect((screen.getByLabelText('First name') as HTMLInputElement).value).toBe('')
  })

  it('registers and cleans up the unsaved-progress warning', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const view = render(<ResumeBuilderPage />)
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: 'Naledi' },
    })
    expect(
      addSpy.mock.calls.some(([eventName]) => eventName === 'beforeunload'),
    ).toBe(true)
    fireEvent.change(screen.getByLabelText('First name'), {
      target: { value: '' },
    })
    expect(
      removeSpy.mock.calls.some(([eventName]) => eventName === 'beforeunload'),
    ).toBe(true)
    view.unmount()
    expect(
      removeSpy.mock.calls.some(([eventName]) => eventName === 'beforeunload'),
    ).toBe(true)
  })
})

describe('repeatable entries and limits', () => {
  it('enforces employment and education maximums', () => {
    const employmentState = createInitialBuilderState()
    employmentState.resume.employmentHistory = Array.from(
      { length: RESUME_LIMITS.employmentHistory },
      createEmploymentEntry,
    )
    employmentState.ids.employment = Array.from(
      { length: RESUME_LIMITS.employmentHistory },
      (_, index) => `employment-${index}`,
    )
    const { unmount } = render(
      <StateHarness initialState={employmentState}>
        {(props) => <EmploymentStep {...props} />}
      </StateHarness>,
    )
    expect(
      (screen.getByRole('button', { name: 'Add employment' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(screen.getByText(/Maximum reached/)).toBeTruthy()
    unmount()

    const educationState = createInitialBuilderState()
    educationState.resume.education = Array.from(
      { length: RESUME_LIMITS.education },
      createEducationEntry,
    )
    educationState.ids.education = Array.from(
      { length: RESUME_LIMITS.education },
      (_, index) => `education-${index}`,
    )
    render(
      <StateHarness initialState={educationState}>
        {(props) => <EducationStep {...props} />}
      </StateHarness>,
    )
    expect(
      (screen.getByRole('button', { name: 'Add education' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
  })

  it('identifies entries in delete confirmation and supports cancellation', () => {
    const state = createInitialBuilderState()
    state.resume.employmentHistory = [
      { ...createEmploymentEntry(), jobTitle: 'Product Engineer' },
    ]
    state.ids.employment = ['employment-one']
    render(
      <StateHarness initialState={state}>
        {(props) => <EmploymentStep {...props} />}
      </StateHarness>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(screen.getByText(/Remove Product Engineer/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByDisplayValue('Product Engineer')).toBeTruthy()
  })

  it('hides end dates for current employment and current study', () => {
    const employmentState = createInitialBuilderState()
    employmentState.resume.employmentHistory = [createEmploymentEntry()]
    employmentState.ids.employment = ['employment-one']
    const { unmount } = render(
      <StateHarness initialState={employmentState}>
        {(props) => <EmploymentStep {...props} />}
      </StateHarness>,
    )
    expect(screen.getByText('End date')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('I currently work here'))
    expect(screen.queryByText('End date')).toBeNull()
    unmount()

    const educationState = createInitialBuilderState()
    educationState.resume.education = [createEducationEntry()]
    educationState.ids.education = ['education-one']
    render(
      <StateHarness initialState={educationState}>
        {(props) => <EducationStep {...props} />}
      </StateHarness>,
    )
    fireEvent.click(screen.getByLabelText('I am currently studying here'))
    expect(screen.queryByText('End date')).toBeNull()
  })

  it('reorders entries with accessible move controls', () => {
    const state = createInitialBuilderState()
    state.resume.employmentHistory = [
      { ...createEmploymentEntry(), jobTitle: 'First role' },
      { ...createEmploymentEntry(), jobTitle: 'Second role' },
    ]
    state.ids.employment = ['first', 'second']
    render(
      <StateHarness initialState={state}>
        {(props) => <EmploymentStep {...props} />}
      </StateHarness>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Move role 2 up' }))
    const titles = screen.getAllByLabelText('Job title') as HTMLInputElement[]
    expect(titles.map((input) => input.value)).toEqual(['Second role', 'First role'])
  })
})

describe('skills, languages, and photographs', () => {
  it('prevents duplicate skills and disables input at the maximum', () => {
    const state = createInitialBuilderState()
    state.resume.technicalSkills = ['TypeScript']
    state.ids.technicalSkills = ['technical-one']
    render(
      <StateHarness initialState={state}>
        {(props) => <SkillsTrainingStep {...props} />}
      </StateHarness>,
    )
    const input = screen.getByLabelText('Add technical skills')
    fireEvent.change(input, { target: { value: ' typescript ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('typescript has already been added.')).toBeTruthy()
    cleanup()

    const maximumState = createInitialBuilderState()
    maximumState.resume.technicalSkills = Array.from(
      { length: RESUME_LIMITS.technicalSkills },
      (_, index) => `Skill ${index}`,
    )
    maximumState.ids.technicalSkills = Array.from(
      { length: RESUME_LIMITS.technicalSkills },
      (_, index) => `skill-${index}`,
    )
    render(
      <StateHarness initialState={maximumState}>
        {(props) => <SkillsTrainingStep {...props} />}
      </StateHarness>,
    )
    expect(
      (screen.getByLabelText('Add technical skills') as HTMLInputElement)
        .disabled,
    ).toBe(true)
  })

  it('prevents duplicate languages', () => {
    const state = createInitialBuilderState()
    state.resume.languages = [
      { name: 'English', proficiency: 'Fluent' },
      { name: 'isiZulu', proficiency: 'Professional' },
    ]
    state.ids.languages = ['english', 'zulu']
    render(
      <StateHarness initialState={state}>
        {(props) => <LanguagesInterestsStep {...props} />}
      </StateHarness>,
    )
    fireEvent.change(screen.getAllByLabelText('Language')[1], {
      target: { value: ' english ' },
    })
    expect(screen.getByText('english has already been added.')).toBeTruthy()
    expect(
      (screen.getAllByLabelText('Language')[1] as HTMLInputElement).value,
    ).toBe('isiZulu')
  })

  it('rejects invalid photograph type and size', () => {
    render(
      <StateHarness initialState={createInitialBuilderState()}>
        {(props) => <PersonalStep {...props} />}
      </StateHarness>,
    )
    const input = screen.getByLabelText(/Photograph/) as HTMLInputElement
    fireEvent.change(input, {
      target: { files: [new File(['gif'], 'portrait.gif', { type: 'image/gif' })] },
    })
    expect(screen.getByText(/Choose a JPG/)).toBeTruthy()

    const largeFile = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      'large.png',
      { type: 'image/png' },
    )
    fireEvent.change(input, { target: { files: [largeFile] } })
    expect(screen.getByText('Photograph must be 5 MB or smaller.')).toBeTruthy()
  })

  it('adds, replaces, and removes a photograph', () => {
    render(
      <StateHarness initialState={createInitialBuilderState()}>
        {(props) => <PersonalStep {...props} />}
      </StateHarness>,
    )
    const input = screen.getByLabelText(/Photograph/) as HTMLInputElement
    fireEvent.change(input, {
      target: {
        files: [new File(['first'], 'first.png', { type: 'image/png' })],
      },
    })
    expect(screen.getByText('first.png')).toBeTruthy()
    fireEvent.change(input, {
      target: {
        files: [new File(['second'], 'second.webp', { type: 'image/webp' })],
      },
    })
    expect(screen.getByText('second.webp')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Remove photograph' }))
    expect(screen.queryByText('second.webp')).toBeNull()
  })

  it('allows the same photograph to be selected again after removal', () => {
    render(
      <StateHarness initialState={createInitialBuilderState()}>
        {(props) => <PersonalStep {...props} />}
      </StateHarness>,
    )
    const input = screen.getByLabelText(/Photograph/) as HTMLInputElement
    const photograph = new File(['portrait'], 'portrait.png', {
      type: 'image/png',
    })

    fireEvent.change(input, { target: { files: [photograph] } })
    expect(screen.getByText('portrait.png')).toBeTruthy()
    Object.defineProperty(input, 'value', {
      configurable: true,
      value: 'C:\\fakepath\\portrait.png',
      writable: true,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Remove photograph' }))
    expect(input.value).toBe('')

    fireEvent.change(input, { target: { files: [photograph] } })

    expect(screen.getByText('portrait.png')).toBeTruthy()
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
  })
})

describe('controlled AI assistance', () => {
  it('shows AI controls only on the final Review step', () => {
    const personalView = render(
      <StateHarness initialState={createInitialBuilderState()}>
        {(props) => <PersonalStep {...props} />}
      </StateHarness>,
    )
    expect(screen.queryByText('Improve with AI')).toBeNull()
    personalView.unmount()

    const skillsView = render(
      <StateHarness initialState={createInitialBuilderState()}>
        {(props) => <SkillsTrainingStep {...props} />}
      </StateHarness>,
    )
    expect(screen.queryByText('Improve with AI')).toBeNull()
    skillsView.unmount()

    const languagesView = render(
      <StateHarness initialState={createInitialBuilderState()}>
        {(props) => <LanguagesInterestsStep {...props} />}
      </StateHarness>,
    )
    expect(screen.queryByText('Improve with AI')).toBeNull()
    languagesView.unmount()

    const overviewState = createInitialBuilderState()
    overviewState.resume.professionalOverview = 'Original overview'
    const overviewView = render(
      <StateHarness initialState={overviewState}>
        {(props) => <OverviewStep {...props} />}
      </StateHarness>,
    )
    expect(screen.queryByText('Improve with AI')).toBeNull()
    overviewView.unmount()

    const employmentState = createInitialBuilderState()
    employmentState.resume.employmentHistory = [createEmploymentEntry()]
    employmentState.ids.employment = ['employment-ai']
    const employmentView = render(
      <StateHarness initialState={employmentState}>
        {(props) => <EmploymentStep {...props} />}
      </StateHarness>,
    )
    expect(screen.queryByText('Improve with AI')).toBeNull()
    employmentView.unmount()

    const educationState = createInitialBuilderState()
    educationState.resume.education = [createEducationEntry()]
    educationState.ids.education = ['education-ai']
    const educationView = render(
      <StateHarness initialState={educationState}>
        {(props) => <EducationStep {...props} />}
      </StateHarness>,
    )
    expect(screen.queryByText('Improve with AI')).toBeNull()
    educationView.unmount()

    const reviewState = createReviewState()
    const employment = createEmploymentEntry()
    employment.description = 'Build accessible products.'
    employment.achievements = 'Improved delivery quality.'
    reviewState.resume.employmentHistory = [employment]
    reviewState.ids.employment = ['employment-ai']
    const education = createEducationEntry()
    education.description = 'Completed a capstone project.'
    reviewState.resume.education = [education]
    reviewState.ids.education = ['education-ai']
    renderReview(reviewState)

    expect(
      screen.getByRole('heading', { name: 'Final AI-assisted polish' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: 'Improve role 1 responsibilities with AI',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: 'Improve role 1 achievements with AI',
      }),
    ).toBeTruthy()
    expect(
      screen.getByRole('button', {
        name: 'Improve education 1 achievements with AI',
      }),
    ).toBeTruthy()
  })

  it('requires session consent and sends only the selected field contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          suggestion: 'I build accessible software for diverse users.',
          warnings: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderReview(createReviewState('I build software that is accessible.'))
    fireEvent.change(
      screen.getByLabelText('Improvement style for professional overview'),
      { target: { value: 'concise' } },
    )

    const improve = screen.getByRole('button', {
      name: 'Improve professional overview with AI',
    })
    improve.focus()
    fireEvent.click(improve)
    expect(
      screen.getByRole('heading', {
        name: 'Share selected text with the AI service?',
      }),
    ).toBeTruthy()
    expect(screen.getByText('The complete CV will not be sent automatically.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(fetchMock).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(improve)

    fireEvent.click(improve)
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({
      fieldType: 'professionalOverview',
      style: 'concise',
      text: 'I build software that is accessible.',
    })
    expect(fetchMock.mock.calls[0][1].body).not.toContain('personalDetails')
    expect(await screen.findByText('AI suggestion')).toBeTruthy()
  })

  it('uses consent once per page session and retries a network failure', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network unavailable'))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            suggestion: 'A concise accessible-software overview.',
            warnings: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    renderReview(createReviewState('I build accessible software products.'))
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))

    expect(
      await screen.findByText(
        'The AI request could not be completed. Check your connection and try again.',
      ),
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText('A concise accessible-software overview.')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('announces and focuses the comparison, while Reject preserves the original', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            suggestion: 'Clearer overview.',
            warnings: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    renderReview(createReviewState('Original overview.'))
    const overview = screen.getByLabelText('Professional overview')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))

    const announcement = await screen.findByText(
      'AI suggestion ready for review.',
    )
    expect(announcement.textContent).toContain('AI suggestion ready for review')
    expect(screen.getAllByText('Original overview.').length).toBeGreaterThan(1)
    expect(screen.getByText('Clearer overview.')).toBeTruthy()
    expect(document.activeElement).toBe(announcement.parentElement)

    fireEvent.click(screen.getByRole('button', { name: 'Reject suggestion' }))
    expect((overview as HTMLTextAreaElement).value).toBe('Original overview.')
    expect(screen.queryByText('Clearer overview.')).toBeNull()
  })

  it('accepts, edits, and undoes a suggestion using the exact original text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            suggestion: 'Polished overview.',
            warnings: ['Confirm that the wording still reflects your experience.'],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    renderReview(createReviewState('Exact original overview.'))
    const overview = screen.getByLabelText('Professional overview')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))
    await screen.findByText('Polished overview.')
    expect(
      screen.getByText('Confirm that the wording still reflects your experience.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Accept suggestion' }))
    expect((overview as HTMLTextAreaElement).value).toBe('Polished overview.')
    fireEvent.change(overview, { target: { value: 'Edited accepted suggestion.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Undo AI suggestion' }))

    expect((overview as HTMLTextAreaElement).value).toBe(
      'Exact original overview.',
    )
  })

  it('cancels an in-flight request without changing the original text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((_url, options: RequestInit) => {
        return new Promise((_resolve, reject) => {
          options.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          )
        })
      }),
    )
    renderReview(createReviewState('Original stays here.'))
    const overview = screen.getByLabelText('Professional overview')
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))
    expect(
      await screen.findByText('Improving only this field…'),
    ).toBeTruthy()
    expect((overview as HTMLTextAreaElement).disabled).toBe(false)
    fireEvent.click(
      await screen.findByRole('button', { name: 'Cancel AI request' }),
    )

    expect(
      await screen.findByText(
        'AI improvement cancelled. Your text was not changed.',
      ),
    ).toBeTruthy()
    expect((overview as HTMLTextAreaElement).value).toBe('Original stays here.')
  })

  it('ignores a stale response after leaving the step', async () => {
    let resolveRequest!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = resolve
          }),
      ),
    )
    render(<ResumeBuilderPage />)
    completeRequiredStepsToReview()
    const overview = screen.getByLabelText('Professional overview')
    fireEvent.change(overview, { target: { value: 'Original overview.' } })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))
    await screen.findByText('Improving only this field…')

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit professional overview' }),
    )
    resolveRequest(
      new Response(
        JSON.stringify({ suggestion: 'Stale suggestion.', warnings: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Step 7: Review. Available/ }),
    )

    await waitFor(() =>
      expect(screen.queryByText('Stale suggestion.')).toBeNull(),
    )
    expect(
      (screen.getByLabelText('Professional overview') as HTMLTextAreaElement)
        .value,
    ).toBe('Original overview.')
  })

  it('accepts a suggestion into only the selected repeatable entry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            suggestion: 'Improved second responsibility.',
            warnings: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    const state = createInitialBuilderState()
    const first = createEmploymentEntry()
    const second = createEmploymentEntry()
    first.description = 'First responsibility.'
    second.description = 'Second responsibility.'
    state.resume.employmentHistory = [first, second]
    state.ids.employment = ['stable-first', 'stable-second']
    render(
      <StateHarness initialState={state}>
        {(props) => <ReviewStep {...props} onNavigate={vi.fn()} />}
      </StateHarness>,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve role 2 responsibilities with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Accept suggestion' }),
    )

    expect(
      (screen.getByLabelText(/Role 1 responsibilities/) as HTMLTextAreaElement)
        .value,
    ).toBe(
      'First responsibility.',
    )
    expect(
      (screen.getByLabelText(/Role 2 responsibilities/) as HTMLTextAreaElement)
        .value,
    ).toBe('Improved second responsibility.')
  })

  it('cannot apply a delayed response to another entry after deletion', async () => {
    let resolveRequest!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = resolve
          }),
      ),
    )
    const state = createInitialBuilderState()
    const first = createEmploymentEntry()
    const second = createEmploymentEntry()
    first.description = 'First responsibility.'
    second.description = 'Second responsibility.'
    state.resume.employmentHistory = [first, second]
    state.ids.employment = ['stable-first', 'stable-second']
    render(<ReviewDeletionHarness initialState={state} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve role 1 responsibilities with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))
    await screen.findByText('Improving only this field…')
    fireEvent.click(
      screen.getByRole('button', { name: 'Delete first test role' }),
    )

    resolveRequest(
      new Response(
        JSON.stringify({ suggestion: 'Wrong-entry suggestion.', warnings: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    await waitFor(() =>
      expect(screen.queryByText('Wrong-entry suggestion.')).toBeNull(),
    )
    expect(
      (screen.getByLabelText(/Role 1 responsibilities/) as HTMLTextAreaElement)
        .value,
    ).toBe('Second responsibility.')
    expect(screen.queryByLabelText(/Role 2 responsibilities/)).toBeNull()
  })

  it('clears comparison and undo state when leaving the step', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ suggestion: 'Accepted overview.', warnings: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )
    render(<ResumeBuilderPage />)
    completeRequiredStepsToReview()
    fireEvent.change(screen.getByLabelText('Professional overview'), {
      target: { value: 'Original overview.' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Accept suggestion' }),
    )
    expect(screen.getByRole('button', { name: 'Undo AI suggestion' })).toBeTruthy()

    fireEvent.click(
      screen.getByRole('button', { name: 'Edit professional overview' }),
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Step 7: Review. Available/ }),
    )

    expect(screen.queryByRole('button', { name: 'Undo AI suggestion' })).toBeNull()
  })

  it('resets consent and all AI state when Start Over is confirmed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ suggestion: 'Suggested overview.', warnings: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<ResumeBuilderPage />)
    completeRequiredStepsToReview()
    fireEvent.change(screen.getByLabelText('Professional overview'), {
      target: { value: 'Overview before reset.' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Continue with AI' }))
    await screen.findByText('Suggested overview.')

    fireEvent.click(screen.getByRole('button', { name: 'Start Over' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }))
    completeRequiredStepsToReview()
    fireEvent.change(screen.getByLabelText('Professional overview'), {
      target: { value: 'Overview after reset.' },
    })
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Improve professional overview with AI',
      }),
    )

    expect(
      screen.getByRole('heading', {
        name: 'Share selected text with the AI service?',
      }),
    ).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
