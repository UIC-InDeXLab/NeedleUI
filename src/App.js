import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import HomePage from './HomePage';
import SearchPage from './SearchPage';
import BenchmarkPage from './BenchmarkPage';

const App = () => {
    return (
        <Router>
            <div>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/benchmark" element={<BenchmarkPage />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;
