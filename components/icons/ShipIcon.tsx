
import React from 'react';

export const ShipIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <path d="M3.5 17.5a2.5 2.5 0 0 1 0-5L8 3l4 9.5h5.5a2.5 2.5 0 0 1 0 5H8" />
    <path d="M3 21h18" />
    <path d="M12 3v9.5" />
  </svg>
);
