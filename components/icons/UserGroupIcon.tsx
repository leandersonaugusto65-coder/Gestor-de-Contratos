import React from 'react';

export const UserGroupIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    {...props}
  >
    <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m-7.5-2.962A3.75 3.75 0 0112 15v-2.25A3.75 3.75 0 0115.75 9h.008v.008A3.75 3.75 0 0112 12.75h-3.75m-1.5-1.5a3.75 3.75 0 00-3.75 3.75V18a3 3 0 003 3h3.75m-3.75-3.75h3.75m9-3.75h3.75m-3.75 3.75h3.75M9 13.5a3 3 0 11-6 0 3 3 0 016 0z" 
    />
  </svg>
);
