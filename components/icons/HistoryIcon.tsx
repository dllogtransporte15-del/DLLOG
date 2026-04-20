
import React from 'react';

export const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 3v12a4 4 0 0 0 4 4h12" />
    <path d="M21 5v12a4 4 0 0 1-4 4H8" />
    <path d="M12 3v18" />
    <path d="M7 8h2" />
    <path d="M15 13h2" />
  </svg>
);
