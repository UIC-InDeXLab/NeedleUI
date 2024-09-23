import React, {useState, useCallback} from 'react';
import axios from 'axios';
import './BenchmarkPage.css';

const BenchmarkPage = () => {
    const [query, setQuery] = useState("");
    const [needleResults, setNeedleResults] = useState([]);
    const [clipResults, setClipResults] = useState([]);
    const [leftEngine, setLeftEngine] = useState("");  // Track which engine is on the left
    const [rightEngine, setRightEngine] = useState(""); // Track which engine is on the right
    const [showLabels, setShowLabels] = useState(true);
    const [status, setStatus] = useState("init");

    const NEEDLE_URL = 'http://localhost:8006';
    const CLIP_URL = 'http://localhost:8000';
    const FEEDBACK_API = 'http://localhost:8009/submit-feedback';

    const fetchResults = useCallback(async () => {
        try {
            setStatus("searching")
            const response = await axios.post(`${NEEDLE_URL}/query?q=${query}`);
            const qid = response.data.qid;

            const [needleRes, clipRes] = await Promise.all([
                axios.get(`${NEEDLE_URL}/search/${qid}`, {
                    params: {
                        n: 20,
                        k: 4,
                        image_size: 768,
                        generator_engine: "stable-diffusion",
                    }
                }),
                axios.get(`${CLIP_URL}/search?query=${query}`, {})
            ]);
            setNeedleResults(needleRes.data.results);
            setClipResults(clipRes.data.results);

            // Randomize which engine appears on the left or right
            let random = Math.random();
            console.log(random)
            if (random > 0.5) {
                setLeftEngine("needle");
                setRightEngine("clip");
            } else {
                setLeftEngine("clip");
                setRightEngine("needle");
            }

            setStatus("done")
        } catch (error) {
            console.error("Error fetching results from engines", error);
        }
    }, [query]);

    const submitFeedback = async (side) => {
        let preferredEngine = "";

        // Determine which engine the user preferred based on the side
        if (side === "left") {
            preferredEngine = leftEngine;
        } else if (side === "right") {
            preferredEngine = rightEngine;
        } else {
            preferredEngine = side; // This handles "none" or "both"
        }

        try {
            console.log(preferredEngine)
            await axios.post(FEEDBACK_API, {
                query: query,
                feedback: preferredEngine  // Send the actual engine name or "none"/"both"
            });
            setStatus("init")
            setNeedleResults([]);
            setClipResults([]);
        } catch (error) {
            console.error("Error submitting feedback", error);
        }
    };

    return (
        <div className="BenchmarkPage">
            <h1>Benchmark Mode</h1>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your query"
            />
            <button onClick={fetchResults} disabled={status === "searching"}>Search</button>
            {status === "searching" && <p>Searching ...!</p>}
            {needleResults.length > 0 && clipResults.length > 0 && (
                <>
                    <div className="feedback-section">
                        <label>
                            <input
                                type="checkbox"
                                checked={showLabels}
                                onChange={() => setShowLabels(!showLabels)}
                            />
                            Show Labels
                        </label>

                        <div className="feedback-options">
                            <div className="feedback-buttons">
                                <button onClick={() => submitFeedback("left")}>Left Results Are Better</button>
                                <button onClick={() => submitFeedback("right")}>Right Results Are Better</button>
                            </div>
                            <div className="feedback-buttons">
                                <button onClick={() => submitFeedback("none")}>None Is Good Enough</button>
                                <button onClick={() => submitFeedback("both")}>Both Are Good Enough</button>
                            </div>
                        </div>
                    </div>

                    <div className="comparison-section">
                        {/* Render left side engine results */}
                        <div className="engine-title-div">
                            {showLabels && <h2>{leftEngine === "needle" ? "Needle Results" : "CLIP Results"}</h2>}
                            <div className="engine-results">
                                {(leftEngine === "needle" ? needleResults : clipResults).map((image, index) => (
                                    <div key={index} className="result">
                                        <img
                                            src={`${NEEDLE_URL}/image/${image}`}
                                            alt={`Engine Left - ${index}`}
                                            width="200"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Render right side engine results */}
                        <div className="engine-title-div">
                            {showLabels && <h2>{rightEngine === "needle" ? "Needle Results" : "CLIP Results"}</h2>}
                            <div className="engine-results">
                                {(rightEngine === "needle" ? needleResults : clipResults).map((image, index) => (
                                    <div key={index} className="result">
                                        <img
                                            src={`${NEEDLE_URL}/image/${image}`}
                                            alt={`Engine Right - ${index}`}
                                            width="200"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                </>
            )}
        </div>
    );
};

export default BenchmarkPage;
