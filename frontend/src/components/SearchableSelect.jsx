import { useId, useMemo, useState } from 'react'

function normalize(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim()
}

export default function SearchableSelect({
  label, value, onChange, options, getValue, getLabel, placeholder = 'Escriba para buscar',
  disabled = false, required = false,
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = options.find((item) => String(getValue(item)) === String(value) && value !== '')
  const selectedLabel = selected ? getLabel(selected) : ''
  const [editing, setEditing] = useState(false)
  const text = editing ? query : selectedLabel

  const matches = useMemo(() => {
    const q = normalize(query)
    return options.filter((item) => normalize(getLabel(item)).includes(q)).slice(0, 50)
  }, [options, getLabel, query])

  function choose(item) {
    onChange(String(getValue(item)))
    setQuery('')
    setEditing(false)
    setOpen(false)
  }

  return (
    <div className="searchable-select">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        role="combobox"
        type="search"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={open && !disabled}
        aria-controls={`${id}-options`}
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onFocus={() => { setEditing(true); setQuery(''); setOpen(true) }}
        onChange={(event) => {
          setQuery(event.target.value)
          setEditing(true)
          setOpen(true)
          onChange('')
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpen(false); setEditing(false); setQuery('') }
          if (event.key === 'Enter' && open && matches.length) {
            event.preventDefault()
            choose(matches[0])
          }
        }}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement.contains(event.relatedTarget)) {
            setOpen(false)
            setEditing(false)
            setQuery('')
          }
        }}
      />
      {open && !disabled && (
        <div id={`${id}-options`} className="searchable-options" role="listbox">
          {matches.length
            ? matches.map((item) => (
                <button key={String(getValue(item))} type="button" role="option"
                  aria-selected={String(getValue(item)) === String(value)}
                  onClick={() => choose(item)}>{getLabel(item)}</button>
              ))
            : <p className="muted">No se encontraron resultados.</p>}
          {matches.length === 50 && <p className="muted">Escriba más para limitar los resultados.</p>}
        </div>
      )}
    </div>
  )
}
