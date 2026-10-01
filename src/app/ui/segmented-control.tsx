export interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full bg-surface-2 p-1"
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              checked ? 'bg-fg text-bg' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
