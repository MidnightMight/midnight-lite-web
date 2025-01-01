document.addEventListener('DOMContentLoaded', function() {
    const audioPlayer = document.getElementById('audioPlayer');
    const playlist = document.getElementById('playlist');
    const tracks = playlist.getElementsByTagName('li');

    for (let i = 0; i < tracks.length; i++) {
        tracks[i].addEventListener('click', function() {
            for (let j = 0; j < tracks.length; j++) {
                tracks[j].classList.remove('active');
            }
            this.classList.add('active');
            audioPlayer.src = this.getAttribute('data-src');
            audioPlayer.play();
        });
    }

    // Automatically play the next track when the current one ends
    audioPlayer.addEventListener('ended', function() {
        let currentTrack = document.querySelector('#playlist .active');
        let nextTrack = currentTrack ? currentTrack.nextElementSibling : null;
        if (nextTrack) {
            nextTrack.click();
        }
    });
});