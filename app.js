import React, { useState, useEffect } from 'react';
import './styles.css';

const App = () => {
    const targetDate = new Date("Dec 31, 2024 23:59:59").getTime();
    const [timeLeft, setTimeLeft] = useState({});
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    // Update countdown timer
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;

            if (distance < 0) {
                clearInterval(interval);
                setTimeLeft({ expired: true });
            } else {
                setTimeLeft({
                    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                    minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                    seconds: Math.floor((distance % (1000 * 60)) / 1000)
                });
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate]);

    // Handle form submission
    const handleFormSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    return (
        <div className="container">
            <h1>COMING SOON</h1>
            
            {timeLeft.expired ? (
                <p className="description">We're Live! Welcome to our website.</p>
            ) : (
                <div className="countdown">
                    <div className="time">{timeLeft.days}</div><div className="label">DAYS</div>
                    <div className="time">{timeLeft.hours}</div><div className="label">HOURS</div>
                    <div className="time">{timeLeft.minutes}</div><div className="label">MINUTES</div>
                    <div className="time">{timeLeft.seconds}</div><div className="label">SECONDS</div>
                </div>
            )}

            {!submitted ? (
                <form onSubmit={handleFormSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        required
                    />
                    <button type="submit">Notify Me!</button>
                </form>
            ) : (
                <p className="description">Thank you! You’ll be notified once we’re live.</p>
            )}

            <p className="description">I am still making this website... will start soon</p>
            <footer>Created By Midnight Lite</footer>
        </div>
    );
};

export default App;
