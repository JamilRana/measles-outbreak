import localFont from 'next/font/local';

export const nikosh = localFont({
  src: './fonts/Nikosh.ttf',  // Ensure this file exists at app/fonts/Nikosh.ttf
  variable: '--font-nikosh',
  display: 'swap',
  weight: '400', // Add weight if needed
});