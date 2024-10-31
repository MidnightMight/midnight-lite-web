document.addEventListener("DOMContentLoaded", function () {
    const countdownDate = new Date("2024-12-31T23:59:59").getTime(); // Set your target date
    const countdownElement = {
        days: document.getElementById("days"),
        hours: document.getElementById("hours"),
        minutes: document.getElementById("minutes"),
        seconds: document.getElementById("seconds"),
    };

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownElement.days.textContent = days;
        countdownElement.hours.textContent = hours;
        countdownElement.minutes.textContent = minutes;
        countdownElement.seconds.textContent = seconds;

        if (distance < 0) {
            clearInterval(countdownInterval);
            document.querySelector(".countdown").textContent = "We're live!";
        }
    };

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    document.getElementById("subscribeForm").addEventListener("submit", function (e) {
        e.preventDefault();
        const email = document.getElementById("email").value;
        alert(`Thank you! We'll notify you at ${email} when we launch.`);
        document.getElementById("subscribeForm").reset(); // Reset the form
    });
});
