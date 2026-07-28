import { useState, type ChangeEvent } from 'react'
import {
  PHOTOGRAPH_MIME_TYPES,
  type PersonalDetails,
  type PhotographMimeType,
} from '../../../shared/resume'
import type { BuilderStepProps } from '../types'
import { ErrorSummary, Field, TextInput } from '../components/FormControls'
import { fieldId } from '../resumeBuilderUtils'

const MAX_PHOTOGRAPH_BYTES = 5 * 1024 * 1024

export function PersonalStep({ state, updateState }: BuilderStepProps) {
  const [photographError, setPhotographError] = useState('')
  const details = state.resume.personalDetails

  const updateDetail = <Key extends keyof PersonalDetails>(
    key: Key,
    value: PersonalDetails[Key],
  ) => {
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        personalDetails: { ...current.resume.personalDetails, [key]: value },
      },
    }))
  }

  const handlePhotograph = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (
      !PHOTOGRAPH_MIME_TYPES.includes(file.type as PhotographMimeType)
    ) {
      setPhotographError('Choose a JPG, JPEG, PNG, or WebP image.')
      event.target.value = ''
      return
    }
    if (file.size > MAX_PHOTOGRAPH_BYTES) {
      setPhotographError('Photograph must be 5 MB or smaller.')
      event.target.value = ''
      return
    }

    const url = URL.createObjectURL(file)
    setPhotographError('')
    updateState((current) => ({
      ...current,
      dirty: true,
      resume: {
        ...current.resume,
        photograph: {
          url,
          fileName: file.name,
          mimeType: file.type as PhotographMimeType,
          sizeBytes: file.size,
          width: 1,
          height: 1,
          altText:
            `${current.resume.personalDetails.firstName} ${current.resume.personalDetails.lastName}`.trim() ||
            'Resume photograph',
        },
      },
    }))

    const image = new Image()
    image.onload = () => {
      updateState((current) => {
        if (current.resume.photograph?.url !== url) return current
        return {
          ...current,
          resume: {
            ...current.resume,
            photograph: {
              ...current.resume.photograph,
              width: image.naturalWidth || 1,
              height: image.naturalHeight || 1,
            },
          },
        }
      })
    }
    image.src = url
  }

  return (
    <div className="space-y-6">
      <ErrorSummary errors={state.errors} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          autoComplete="given-name"
          errors={state.errors}
          label="First name"
          onChange={(event) => updateDetail('firstName', event.target.value)}
          path="personalDetails.firstName"
          value={details.firstName}
        />
        <TextInput
          autoComplete="family-name"
          errors={state.errors}
          label="Last name"
          onChange={(event) => updateDetail('lastName', event.target.value)}
          path="personalDetails.lastName"
          value={details.lastName}
        />
      </div>
      <TextInput
        errors={state.errors}
        label="Professional job title"
        onChange={(event) => updateDetail('professionalTitle', event.target.value)}
        path="personalDetails.professionalTitle"
        placeholder="e.g. Frontend Engineer"
        value={details.professionalTitle}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          autoComplete="email"
          errors={state.errors}
          label="Email address"
          onChange={(event) => updateDetail('email', event.target.value)}
          path="personalDetails.email"
          type="email"
          value={details.email}
        />
        <TextInput
          autoComplete="tel"
          errors={state.errors}
          label="Phone number"
          onChange={(event) => updateDetail('phone', event.target.value)}
          path="personalDetails.phone"
          type="tel"
          value={details.phone}
        />
        <TextInput
          autoComplete="address-level2"
          errors={state.errors}
          label="City"
          onChange={(event) => updateDetail('city', event.target.value)}
          path="personalDetails.city"
          value={details.city}
        />
        <TextInput
          autoComplete="country-name"
          errors={state.errors}
          label="Country"
          onChange={(event) => updateDetail('country', event.target.value)}
          path="personalDetails.country"
          value={details.country}
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          errors={state.errors}
          label="LinkedIn URL"
          onChange={(event) => updateDetail('linkedInUrl', event.target.value)}
          optional
          path="personalDetails.linkedInUrl"
          type="url"
          value={details.linkedInUrl}
        />
        <TextInput
          errors={state.errors}
          label="Portfolio or professional URL"
          onChange={(event) => updateDetail('portfolioUrl', event.target.value)}
          optional
          path="personalDetails.portfolioUrl"
          type="url"
          value={details.portfolioUrl}
        />
      </div>
      <Field
        errors={state.errors}
        hint="JPG, JPEG, PNG, or WebP. Maximum 5 MB. Stored only in this browser tab."
        label="Photograph"
        optional
        path="photograph.url"
      >
        <input
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="block min-h-11 w-full rounded-lg border border-dashed border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
          id={fieldId('photograph.url')}
          onChange={handlePhotograph}
          type="file"
        />
        {photographError && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {photographError}
          </p>
        )}
        {state.resume.photograph && (
          <div className="mt-3 flex items-center gap-4 rounded-xl bg-slate-50 p-3">
            <img
              alt={state.resume.photograph.altText}
              className="size-20 rounded-lg object-cover"
              src={state.resume.photograph.url}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {state.resume.photograph.fileName}
              </p>
              <p className="text-xs text-slate-500">
                {(state.resume.photograph.sizeBytes / 1024).toFixed(0)} KB
              </p>
            </div>
            <button
              className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700"
              onClick={() =>
                updateState((current) => ({
                  ...current,
                  dirty: true,
                  resume: { ...current.resume, photograph: null },
                }))
              }
              type="button"
            >
              Remove photograph
            </button>
          </div>
        )}
      </Field>
    </div>
  )
}
