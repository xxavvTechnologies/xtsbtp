const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const icon = themeToggle.querySelector('i');

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    icon.className = newTheme === 'light' ? 'ri-sun-line' : 'ri-moon-line';
    localStorage.setItem('theme', newTheme);
});

// Set initial theme
const savedTheme = localStorage.getItem('theme') || 'light';
html.setAttribute('data-theme', savedTheme);
icon.className = savedTheme === 'light' ? 'ri-sun-line' : 'ri-moon-line';
