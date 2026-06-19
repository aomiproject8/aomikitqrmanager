/**
 * Pure, dependency-free filtering for the searchable Combobox.
 *
 * Kept separate from the React component so the matching behavior can be
 * unit-tested directly. Matching is case-insensitive substring over the option
 * label plus any extra keywords (e.g. slug, routine-type name).
 */

export interface ComboboxOption {
  value: string
  label: string
  /** Extra searchable terms (slug, type name, …) not shown as the label. */
  keywords?: string[]
}

export function filterComboboxOptions(
  options: ComboboxOption[],
  query: string
): ComboboxOption[] {
  const q = query.trim().toLowerCase()
  if (!q) return options
  return options.filter((option) => {
    const haystack = [option.label, ...(option.keywords ?? [])]
      .join(" ")
      .toLowerCase()
    return haystack.includes(q)
  })
}
