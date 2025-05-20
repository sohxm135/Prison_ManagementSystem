document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        console.log('Username:', username);
        console.log('Password:', password);

        try {
            // Send login credentials to the backend
            const response = await fetch('/auth', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json(); // Parse response data

            if (response.ok) {
                // Successful login
                errorMessage.textContent = '';

                // Store the username and user role in sessionStorage for auth checks
                sessionStorage.setItem('username', username);
                sessionStorage.setItem('role', data.role || 'user');

                // Add login animation
                document.querySelector('.login-container').classList.add('login-success');

                // Redirect to dashboard after short delay
                setTimeout(function () {
                    // Redirect based on role
                    if(data.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                }, 800);
            } else {
                // Failed login
                errorMessage.textContent = data.message || 'Invalid username or password. Please try again.';
                
                // Shake animation for error
                loginForm.classList.add('shake');
                setTimeout(function () {
                    loginForm.classList.remove('shake');
                }, 500);
            }
        } catch (error) {
            console.error('Error during login:', error);
            errorMessage.textContent = 'An error occurred. Please try again later.';
        }
    });
});
