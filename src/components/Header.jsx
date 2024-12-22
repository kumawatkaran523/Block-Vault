import React from 'react'
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

function Header({ darkMode, setDarkMode }) {
  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-slate-200 text-black'} p-8 font-poppins flex justify-between items-center`}>
      <div className=' flex items-center'>
        <img src='/logo.png' alt="" width={50} height={50} />
        <p className=' text-3xl font-bold px-2'>Block Vault</p>
      </div>
      {
        darkMode ? (
          <LightModeIcon onClick={() => setDarkMode((prev) => !prev)} />
        ) : (
          <DarkModeIcon onClick={() => setDarkMode((prev) => !prev)} />
        )
      }

    </div>
  );
}

export default Header