// login.js - Handles login authentication for the prison management system

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // Simple authentication for demo purposes
        if (username === 'admin' && password === 'admin') {
            // Successful login
            errorMessage.textContent = '';
            
            // Add login animation
            document.querySelector('.login-container').classList.add('login-success');
            
            // Redirect to dashboard after short delay
            setTimeout(function() {
                window.location.href = 'dashboard.html';
            }, 800);
        } else {
            // Failed login
            errorMessage.textContent = 'Invalid username or password. Please try again.';
            
            // Shake animation for error
            loginForm.classList.add('shake');
            setTimeout(function() {
                loginForm.classList.remove('shake');
            }, 500);
        }
    });
});