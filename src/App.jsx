// src/App.jsx - メインアプリケーション

import React from 'react';
import SimpleVideoGenerator from './components/Generator/SimpleVideoGenerator.jsx';
import './index.css';

function App() {
  return (
    <div className="App">
      <SimpleVideoGenerator />
    </div>
  );
}

export default App;