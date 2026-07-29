import type {
  ChangeEventHandler,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import type { ResumeValidationError } from '../../../shared/resume'
import { fieldId } from '../resumeBuilderUtils'

const inputClass =
  'min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100'

interface FieldProps {
  label: string
  path: string
  errors: ResumeValidationError[]
  hint?: string
  optional?: boolean
  children: ReactNode
}

export function Field({
  label,
  path,
  errors,
  hint,
  optional = false,
  children,
}: FieldProps) {
  const error = errors.find((item) => item.path === path)
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-slate-800" htmlFor={fieldId(path)}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && (
        <p className="text-sm text-red-700" id={`${fieldId(path)}-error`} role="alert">
          {error.message}
        </p>
      )}
    </div>
  )
}

interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  path: string
  errors: ResumeValidationError[]
  hint?: string
  optional?: boolean
}

export function TextInput({
  label,
  path,
  errors,
  hint,
  optional,
  ...props
}: TextInputProps) {
  const hasError = errors.some((error) => error.path === path)
  return (
    <Field
      label={label}
      path={path}
      errors={errors}
      hint={hint}
      optional={optional}
    >
      <input
        {...props}
        id={fieldId(path)}
        className={inputClass}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${fieldId(path)}-error` : undefined}
      />
    </Field>
  )
}

interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  path: string
  errors: ResumeValidationError[]
  hint?: string
  optional?: boolean
}

export function TextArea({
  label,
  path,
  errors,
  hint,
  optional,
  ...props
}: TextAreaProps) {
  const hasError = errors.some((error) => error.path === path)
  return (
    <Field
      label={label}
      path={path}
      errors={errors}
      hint={hint}
      optional={optional}
    >
      <textarea
        {...props}
        id={fieldId(path)}
        className={`${inputClass} min-h-28 resize-y`}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${fieldId(path)}-error` : undefined}
      />
    </Field>
  )
}

interface SelectInputProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string
  path: string
  errors: ResumeValidationError[]
  children: ReactNode
}

export function SelectInput({
  label,
  path,
  errors,
  children,
  ...props
}: SelectInputProps) {
  const hasError = errors.some((error) => error.path === path)
  return (
    <Field label={label} path={path} errors={errors}>
      <select
        {...props}
        id={fieldId(path)}
        className={inputClass}
        aria-invalid={hasError || undefined}
      >
        {children}
      </select>
    </Field>
  )
}

interface CheckboxProps {
  label: string
  checked: boolean
  onChange: ChangeEventHandler<HTMLInputElement>
  id: string
}

export function Checkbox({ label, checked, onChange, id }: CheckboxProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 accent-blue-600"
      />
      {label}
    </label>
  )
}

export function ErrorSummary({
  errors,
  title = 'Please fix the following before continuing:',
}: {
  errors: ResumeValidationError[]
  title?: string
}) {
  if (errors.length === 0) return null
  return (
    <div
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
      role="alert"
      tabIndex={-1}
      id="step-error-summary"
    >
      <p className="font-bold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {errors.slice(0, 6).map((error, index) => (
          <li key={`${error.path}-${index}`}>{error.message}</li>
        ))}
      </ul>
    </div>
  )
}
