
document.addEventListener("DOMContentLoaded", function () {
    const nav = document.getElementById('navLinks');
    const hamburger = document.getElementById('hamburger');

    hamburger.addEventListener('click', function () {
        nav.classList.toggle('show');
    });

    document.getElementById('userForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const gender = document.querySelector('input[name="gender"]:checked')?.value;
        const name = document.querySelector('input[name="username"]').value.trim() || "Guest";
        console.log(`Selected Gender: ${gender}, Name: ${name}`, "submit button clicked");
        window.location.href = `/chat?name=${encodeURIComponent(name)}&gender=${gender}`;

    });
});
