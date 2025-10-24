// lib/fonts.ts
import localFont from 'next/font/local';

// Define your local font
export const customHeadingFont = localFont({
  src: [
    {
      path: '../public/fonts/polysans.otf', // Use ../ to go up one level from lib folder
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-custom',
  display: 'swap',
});