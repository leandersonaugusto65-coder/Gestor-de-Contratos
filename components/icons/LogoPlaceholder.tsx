import React from 'react';

export const LogoPlaceholder: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="50" cy="50" r="50" fill="#ca8a04" />
    <text
      x="50"
      y="50"
      fontFamily="Playfair Display, serif"
      fontSize="48"
      fill="white"
      textAnchor="middle"
      dy=".3em"
      fontWeight="bold"
    >
      OA
    </text>
  </svg>
);
