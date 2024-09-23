import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
    return (
        <div className="homepage">
            <h1>Welcome to the Image Search App</h1>
            <div className="button-container">
                <Link to="/search">
                    <button className="nav-button">Go to Search</button>
                </Link>
                <Link to="/benchmark">
                    <button className="nav-button">Go to Benchmark Mode</button>
                </Link>
            </div>
        </div>
    );
};

export default HomePage;
