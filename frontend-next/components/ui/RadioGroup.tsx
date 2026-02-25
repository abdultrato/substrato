"use client"

interface Option {
    value: string | number
    label: string
}

interface Props {
    name: string
    options: Option[]
    value?: string | number
    onChange?: ( value: string ) => void
}

export default function RadioGroup ( {
    name,
    options,
    value,
    onChange,
}: Props ) {
    return (
        <div className="flex flex-col gap-2">
            {options.map( opt => (
                <label
                    key={opt.value}
                    className="inline-flex items-center gap-2 cursor-pointer"
                >
                    <input
                        type="radio"
                        name={name}
                        value={opt.value}
                        checked={String( value ) === String( opt.value )}
                        onChange={() => onChange?.( String( opt.value ) )}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
            ) )}
        </div>
    )
}
