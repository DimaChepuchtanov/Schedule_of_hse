const paths = {
  calendar: [
    "M8 2v4m8-4v4M3 10h18",
    "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    "M7 14h2m6 0h2m-10 4h2",
  ],
  refresh: ["M20 7v5h-5", "M4 17v-5h5", "M6 7a7 7 0 0 1 11-1l3 3M4 15l3 3a7 7 0 0 0 11-1"],
  left: ["m14 6-6 6 6 6"],
  right: ["m10 6 6 6-6 6"],
  search: ["M21 21l-4.5-4.5", "M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"],
  close: ["m6 6 12 12M6 18 18 6"],
  check: ["m5 12 4 4L19 6"],
  clock: ["M12 8v4l3 2", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z", "M20 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"],
  arrow: ["M7 17 17 7M7 7h10v10"],
  grid: ["M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"],
  list: ["M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"],
  alert: ["M12 8v5m0 3h.01", "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z"],
  book: ["M12 7v14", "M3 3c4 0 6 1 9 4 3-3 5-4 9-4v14c-4 0-6 1-9 4-3-3-5-4-9-4Z"],
};

export default function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {(paths[name] || paths.calendar).map((d, index) => <path key={index} d={d} />)}
    </svg>
  );
}
