import type { MonthYear, ResumeValidationError } from '../../../shared/resume'
import { fieldId } from '../resumeBuilderUtils'
import { TextInput } from './FormControls'

interface MonthYearFieldsProps {
  label: string
  path: string
  value: MonthYear
  errors: ResumeValidationError[]
  onChange: (value: MonthYear) => void
  disabled?: boolean
}

export function MonthYearFields({
  label,
  path,
  value,
  errors,
  onChange,
  disabled = false,
}: MonthYearFieldsProps) {
  const error = errors.find((item) => item.path === path)
  return (
    <fieldset
      className="grid gap-3 sm:grid-cols-2"
      id={fieldId(path)}
      tabIndex={-1}
    >
      <legend className="col-span-full text-sm font-bold text-slate-800">
        {label}
      </legend>
      <TextInput
        disabled={disabled}
        errors={errors}
        label="Month"
        max={12}
        min={1}
        onChange={(event) =>
          onChange({ ...value, month: Number(event.target.value) })
        }
        path={`${path}.month`}
        type="number"
        value={value.month}
      />
      <TextInput
        disabled={disabled}
        errors={errors}
        label="Year"
        max={2200}
        min={1900}
        onChange={(event) =>
          onChange({ ...value, year: Number(event.target.value) })
        }
        path={`${path}.year`}
        type="number"
        value={value.year}
      />
      {error && (
        <p className="col-span-full text-sm text-red-700" role="alert">
          {error.message}
        </p>
      )}
    </fieldset>
  )
}
