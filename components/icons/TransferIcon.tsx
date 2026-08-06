
import React from 'react';

export const TransferIcon = (props: React.SVGProps<SVGSVGElement>) => (
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
    <polyline points="14 9 9 4 4 9" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
    <polyline points="10 15 15 20 20 15" />
    <path d="M4 4v7a4 4 0 0 0 4 4h12" />
  </svg>
);
