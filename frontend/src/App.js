import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';

// Import Pages
import Dashboard from './pages/Dashboard';
import SharedReport from './pages/SharedReport';
import Login from './pages/Login';
import Settings from './pages/Settings';

// Import Components
import Navbar from './components/Navbar';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#3b5998', // Facebook blue
    },
    secondary: {
      main: '#4267B2', // Meta blue
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/share/:token" element={<SharedReport />} />
            <Route
              path="/*"
              element={
                <>
                  <Navbar />
                  <Box component="main" sx={{ flexGrow: 1, p: 3, pt: 10 }}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </Box>
                </>
              }
            />
          </Routes>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;
