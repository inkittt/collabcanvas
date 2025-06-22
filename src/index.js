import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('Starting CollabCanvas application...');

try {
  console.log('Finding root element...');
  const rootElement = document.getElementById('root');
  console.log('Root element found:', rootElement);
  
  console.log('Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('Rendering App component...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('App rendered successfully');
} catch (error) {
  console.error('Error rendering application:', error);
} 