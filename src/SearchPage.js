import React, {useState, useEffect, useCallback} from 'react';
import useWebSocket, {ReadyState} from 'react-use-websocket';
import axios from 'axios';
import './SearchPage.css';

const API_URL = 'http://localhost:8001';
const WEBSOCKET_URL = 'ws://localhost:8001/feedback';

const SearchPage = () => {
    const [query, setQuery] = useState("landscape");
    const [qid, setQid] = useState(null);
    const [generatedImages, setGeneratedImages] = useState([]);
    const [approvedImages, setApprovedImages] = useState([]);
    const [rejectedImages, setRejectedImages] = useState([]);
    const [currentStep, setCurrentStep] = useState("waiting");
    const [imageSize, setImageSize] = useState(768);
    const [k, setK] = useState(4);
    const [n, setN] = useState(20);
    const [connectToWebsocket, setConnectToWebsocket] = useState(false);
    const [feedbackMode, setFeedbackMode] = useState(true);
    const [finalResults, setFinalResults] = useState([]);

    const {
        sendJsonMessage,
        lastMessage,
        readyState
    } = useWebSocket(qid && feedbackMode ? `${WEBSOCKET_URL}/${qid}` : null, {
        onOpen: () => {
            console.log('Connected to WebSocket');
            sendJsonMessage({k: k, image_size: imageSize});
        },
        onClose: () => console.log('WebSocket connection closed'),
        shouldReconnect: () => feedbackMode, // Only reconnect if feedback mode is on
    }, connectToWebsocket);

    // Create query and get qid from API
    const createQuery = useCallback(async () => {
        try {
            setApprovedImages([]);
            setRejectedImages([]);
            setFinalResults([]);
            setQid(null);
            const response = await axios.post(`${API_URL}/query?q=${query}`);
            const qid = response.data.qid;
            setQid(qid);
            setCurrentStep('waiting');
            setConnectToWebsocket(feedbackMode);

            if (!feedbackMode) {
                // If feedback mode is off, directly call search after generating images
                setCurrentStep('done');
                await fetchSearchResults(qid);
            }
        } catch (error) {
            console.error("Error creating query:", error);
        }
    }, [query, feedbackMode]);

    // Fetch search results after images are approved or if feedback mode is off
    const fetchSearchResults = useCallback(async (queryId) => {
        try {
            const response = await axios.get(`${API_URL}/search/${queryId}`, {
                params: {
                    n: n,
                    k: k,
                    image_size: imageSize,
                    generator_engine: "stable-diffusion",
                },
            });
            setFinalResults(response.data.results); // Store the final filenames
        } catch (error) {
            console.error("Error fetching search results:", error);
        }
    }, [n, k, imageSize]);

    // Handle incoming WebSocket messages
    useEffect(() => {
        if (lastMessage !== null && feedbackMode) {
            const data = JSON.parse(lastMessage.data);

            setApprovedImages([]);
            setRejectedImages([]);

            if (data.generated_images) {
                setGeneratedImages(data.generated_images); // Base64 encoded images
                setApprovedImages(data.generated_images);
                setCurrentStep('approving');
            }

            if (data.regenerated_images) {
                setGeneratedImages(data.regenerated_images);
                setApprovedImages(data.regenerated_images);
                setCurrentStep('approving');
            }

            if (data.status === 'all_approved') {
                setCurrentStep('done');
                setConnectToWebsocket(false);
                fetchSearchResults(qid).then(results => {
                });
            }
        }
    }, [lastMessage, feedbackMode, fetchSearchResults, qid]);

    // Approve or reject images
    const handleApproval = (index, approved) => {
        const image = generatedImages[index];
        console.log(index, approved)
        if (approved) {
            setApprovedImages((prev) => {
                if (!prev.includes(image)) {
                    return [...prev, image];
                }
                return prev;
            });
            setRejectedImages((prev) => prev.filter((img) => img !== image));
        } else {
            setRejectedImages((prev) => {
                if (!prev.includes(image)) {
                    return [...prev, image];
                }
                return prev;
            });
            setApprovedImages((prev) => prev.filter((img) => img !== image));
        }
    };


    // Send feedback to WebSocket server
    const sendFeedback = () => {
        sendJsonMessage({
            approved: approvedImages,
            rejected: rejectedImages,
        });
        setApprovedImages([]);
        setRejectedImages([]);
        setCurrentStep('waiting');
    };

    // Connection status handling
    const connectionStatus = {
        [ReadyState.CONNECTING]: 'Connecting...',
        [ReadyState.OPEN]: 'Connected',
        [ReadyState.CLOSING]: 'Closing...',
        [ReadyState.CLOSED]: 'Closed',
        [ReadyState.UNINSTANTIATED]: 'Uninstantiated',
    }[readyState];

    return (
        <div className="App">
            <div className="search-bar">
                <div className="settings">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Type a query..."
                    />

                    <div className="settings">
                        <label>
                            <span>Image Size:</span>
                            <select value={imageSize} onChange={(e) => setImageSize(Number(e.target.value))}>
                                <option value="256">256x256</option>
                                <option value="512">512x512</option>
                                <option value="768">768x768</option>
                                <option value="1024">1024x1024</option>
                            </select>
                        </label>
                        <label>
                            <span>k:</span>
                            <input
                                type="number"
                                value={k}
                                onChange={(e) => setK(Number(e.target.value))}
                                min="1"
                                max="10"
                            />
                        </label>
                    </div>


                    <label>
                        <span>n:</span>
                        <input
                            type="number"
                            value={n}
                            onChange={(e) => setN(Number(e.target.value))}
                            min="1"
                            max="60"
                        />
                    </label>

                    <label>
                        <span>Feedback Mode:</span>
                        <input
                            type="checkbox"
                            checked={feedbackMode}
                            onChange={() => setFeedbackMode(!feedbackMode)}
                        />
                    </label>
                    <button onClick={createQuery} disabled={readyState === ReadyState.CONNECTING}>
                        Search
                    </button>
                </div>
            </div>

            {feedbackMode && <p>Connection Status: {connectionStatus}</p>}

            {currentStep === "waiting" && feedbackMode && <p>Waiting for guide images...</p>}

            {currentStep === "approving" && (
                <div className="feedback-div">
                    <h2>Approve or Reject Guide Images</h2>
                    <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center'}}>
                        {generatedImages.map((image, index) => (
                            <div key={index} style={{margin: 10}}>
                                <img
                                    src={`data:image/png;base64,${image}`}
                                    alt={`Generated ${index}`}
                                    width="200"
                                />
                                <div className="checkbox-container">
                                    <input
                                        type="checkbox"
                                        id={`checkbox-${index}`}
                                        checked={approvedImages.includes(image)}
                                        onChange={() => handleApproval(index, !approvedImages.includes(image))}
                                    />
                                    <label htmlFor={`checkbox-${index}`} className="checkbox-label"></label>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button onClick={sendFeedback} disabled={generatedImages.length === 0}>
                        Submit Feedback
                    </button>
                </div>
            )}

            {currentStep === "done" && (
                <div className="search-results-div">
                    {finalResults.length === 0 && feedbackMode && <p>All images approved. Fetching your results ...!</p>}
                    {finalResults.length === 0 && !feedbackMode && <p>Searching ...!</p>}
                    {finalResults.length > 0 && (
                        <div>
                            <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center'}}>
                                {finalResults.map((filename, index) => (
                                    <div key={index} style={{margin: 10}}>
                                        <img
                                            src={`${API_URL}/image/${filename}`}
                                            alt={`Result ${index}`}
                                            width="200"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPage;
