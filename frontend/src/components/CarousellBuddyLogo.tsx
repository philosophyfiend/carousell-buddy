interface CarousellBuddyLogoProps {
  iconSize?: number
  textSize?: string
  className?: string
}

export function CarousellBuddyLogo({
  iconSize = 28,
  textSize = 'text-base',
  className = '',
}: CarousellBuddyLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41s-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"
          fill="#4DB6AC"
        />
      </svg>
      <span className={`${textSize} text-gray-900 dark:text-gray-100`}>
        Carousell<strong>Buddy</strong>
      </span>
    </div>
  )
}
