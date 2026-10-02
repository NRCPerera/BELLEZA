const Field = ({ label, error, hint, id, children }) => <label className="block" htmlFor={id}>
  {label && <span className="ui-label">{label}</span>}{children}
  {error ? <span className="ui-error" role="alert">{error}</span> : hint && <span className="mt-1.5 block text-xs text-ink-500">{hint}</span>}
</label>;
const control = (error, className) => `input-field ${error ? '!border-red-500 !ring-2 !ring-red-100' : ''} ${className || ''}`;
export const Input = ({ label, error, hint, id, className, ...props }) => <Field label={label} error={error} hint={hint} id={id}><input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={control(error, className)} {...props} /></Field>;
export const Select = ({ label, error, hint, id, className, children, ...props }) => <Field label={label} error={error} hint={hint} id={id}><select id={id} aria-invalid={!!error} className={control(error, className)} {...props}>{children}</select></Field>;
export const Textarea = ({ label, error, hint, id, className, ...props }) => <Field label={label} error={error} hint={hint} id={id}><textarea id={id} aria-invalid={!!error} className={control(error, className)} {...props} /></Field>;
