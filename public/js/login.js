document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.querySelector('.toggle-password');
    const passwordInput = document.getElementById('password');
    const googleSignInBtn = document.getElementById('googleSignIn');

    // Toggle password visibility
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Toggle eye icon
        this.classList.toggle('ri-eye-line');
        this.classList.toggle('ri-eye-off-line');
    });

    // Handle form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                window.location.href = data.redirect;  // This will now redirect to index.html
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred during login. Please try again.');
        }
    });

    // Google Sign In
    googleSignInBtn.addEventListener('click', function() {
        // Implement Google Sign In logic here
        console.log('Google sign in clicked');
        // You would typically initialize and trigger Google Sign In here
        // google.accounts.id.prompt();
    });
}); 