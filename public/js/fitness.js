const modal = document.getElementById('editProfileModal');
const closeBtn = document.getElementsByClassName('close')[0];
const editProfileForm = document.getElementById('editProfileForm');

const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
body.setAttribute('data-theme', savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.querySelector('.nav-menu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuToggle.querySelector('i').classList.toggle('ri-menu-line');
    menuToggle.querySelector('i').classList.toggle('ri-close-line');
});

// Close mobile menu when clicking a link
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        menuToggle.querySelector('i').classList.add('ri-menu-line');
        menuToggle.querySelector('i').classList.remove('ri-close-line');
    });
});

// Progress Bar
window.onscroll = function() {
    // Progress bar
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    document.querySelector('.progress-bar-fill').style.width = scrolled + '%';

    // Go to top button
    const goToTopButton = document.getElementById('goToTop');
    if (winScroll > 300) {
        goToTopButton.style.display = 'flex';
    } else {
        goToTopButton.style.display = 'none';
    }

    // Active link highlighting
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);
        
        if(winScroll > sectionTop && winScroll <= sectionTop + sectionHeight) {
            navLink?.classList.add('active');
        } else {
            navLink?.classList.remove('active');
        }
    });
};

// Go to Top
document.getElementById('goToTop').addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Update chart colors based on theme
function updateChartColors() {
    const isDark = body.getAttribute('data-theme') === 'dark';
    const chartColor = isDark ? '#fff' : '#666';
    
    if (window.myChart) {
        window.myChart.options.scales.x.ticks.color = chartColor;
        window.myChart.options.scales.y.ticks.color = chartColor;
        window.myChart.options.plugins.legend.labels.color = chartColor;
        window.myChart.update();
    }
}

// Initialize chart with theme-aware colors
const ctx = document.getElementById('progressChart').getContext('2d');
window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        datasets: [{
            label: 'Weight Progress',
            data: [75, 74.2, 73.5, 72.8],
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: body.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: body.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
                }
            },
            y: {
                ticks: {
                    color: body.getAttribute('data-theme') === 'dark' ? '#fff' : '#666'
                }
            }
        }
    }
});

// Update chart colors when theme changes
themeToggle.addEventListener('click', updateChartColors);

// Simple profile management without class
let currentUser = null;

// Check login status when page loads
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus();
    
    // Add submit event listener to the form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
});

function checkLoginStatus() {
    const userData = localStorage.getItem('currentUser');
    if (userData) {
        currentUser = JSON.parse(userData);
        loadUserProfile();
    }
}

function loadUserProfile() {
    const profileData = localStorage.getItem(`profile_${currentUser.id}`);
    if (profileData) {
        const data = JSON.parse(profileData);
        updateProfileUI(data);
    }
}

// Simple function to open the modal when edit button is clicked
function editProfile() {
    const modal = document.getElementById('profileModal');
    const form = document.getElementById('profileForm');
    
    // Pre-fill the form with current values
    form.userName.value = document.querySelector('.profile-summary h3').textContent.trim();
    form.userAge.value = document.getElementById('userAge').textContent.trim();
    form.userWeight.value = document.getElementById('userWeight').textContent.replace('kg', '').trim();
    form.userHeight.value = document.getElementById('userHeight').textContent.replace('cm', '').trim();
    
    // Set current profile image in preview
    const currentProfileImage = document.querySelector('.profile-image').src;
    document.getElementById('imagePreview').src = currentProfileImage;
    
    // Show the modal
    modal.style.display = 'block';
}

// Function to preview image before upload
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            document.getElementById('imagePreview').src = e.target.result;
            sessionStorage.setItem('tempProfileImage', e.target.result);
        }
        
        reader.readAsDataURL(file);
    }
}

// Function to handle form submission
function updateProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    
    // Update profile information
    document.querySelector('.profile-summary h3').textContent = form.userName.value;
    document.getElementById('userAge').textContent = form.userAge.value;
    document.getElementById('userWeight').textContent = `${form.userWeight.value} kg`;
    document.getElementById('userHeight').textContent = `${form.userHeight.value} cm`;
    
    // Calculate and update BMI
    const weight = parseFloat(form.userWeight.value);
    const height = parseFloat(form.userHeight.value);
    const bmi = (weight / ((height/100) * (height/100))).toFixed(1);
    document.getElementById('userBMI').textContent = bmi;
    
    // Update profile image if a new one was selected
    const newProfileImage = sessionStorage.getItem('tempProfileImage');
    if (newProfileImage) {
        document.querySelector('.profile-image').src = newProfileImage;
        sessionStorage.removeItem('tempProfileImage');
    }
    
    // Close the modal
    closeProfileModal();
}

// Function to close the modal
function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('profileModal');
    if (event.target === modal) {
        closeProfileModal();
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Login Management
function handleLogin(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.email.value;
    const password = form.password.value;

    // Mock user login
    const mockUser = {
        id: '123',
        email: email,
        name: 'User'
    };

    localStorage.setItem('currentUser', JSON.stringify(mockUser));
    currentUser = mockUser;
    
    closeLoginModal();
    showNotification('Login successful!');
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.style.display = 'none';
}

// Exercise Logging
function logExercise() {
    const exerciseForm = `
        <div class="log-entry">
            <input type="text" placeholder="Exercise Name">
            <input type="number" placeholder="Duration (min)">
            <input type="number" placeholder="Calories">
            <button onclick="saveExercise(this)" class="btn">Save</button>
        </div>
    `;
    document.querySelector('.log-entries').insertAdjacentHTML('afterbegin', exerciseForm);
}

// Water Tracking
function addWater() {
    const currentAmount = parseFloat(document.getElementById('waterAmount').textContent);
    const newAmount = (currentAmount + 0.25).toFixed(1);
    document.getElementById('waterAmount').textContent = newAmount;
    const percentage = (newAmount / 2.5) * 100;
    document.querySelector('.water-fill').style.width = `${percentage}%`;
}

// Utility functions
function addNewGoal() {
    // Get the goal input values
    const goalTitle = document.getElementById('goalTitle').value;
    const goalTarget = document.getElementById('goalTarget').value;
    const goalDeadline = document.getElementById('goalDeadline').value;

    // Validate inputs
    if (!goalTitle || !goalTarget || !goalDeadline) {
        alert('Please fill in all goal fields');
        return;
    }

    // Calculate days remaining
    const today = new Date();
    const deadline = new Date(goalDeadline);
    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
        alert('Please select a future date');
        return;
    }

    // Create new goal element
    const goalsContainer = document.getElementById('goalsContainer');
    const goalElement = document.createElement('div');
    goalElement.className = 'goal-card';

    goalElement.innerHTML = `
        <div class="goal-header">
            <h4>${goalTitle}</h4>
            <button class="btn-delete" onclick="deleteGoal(this)">
                <i class="ri-delete-bin-line"></i>
            </button>
        </div>
        <div class="goal-details">
            <p>Target: ${goalTarget}</p>
            <p>Days Remaining: ${daysRemaining}</p>
            <div class="progress-bar">
                <div class="progress-fill" style="width: 0%"></div>
            </div>
        </div>
    `;

    // Add the new goal to container
    goalsContainer.appendChild(goalElement);

    // Save goals to localStorage
    saveGoals();

    // Clear input fields
    document.getElementById('goalTitle').value = '';
    document.getElementById('goalTarget').value = '';
    document.getElementById('goalDeadline').value = '';
}

// Function to delete goal
function deleteGoal(button) {
    const goalCard = button.closest('.goal-card');
    goalCard.remove();
    saveGoals();
}

// Function to save goals to localStorage
function saveGoals() {
    const goalsContainer = document.getElementById('goalsContainer');
    const goals = [];
    
    goalsContainer.querySelectorAll('.goal-card').forEach(goalCard => {
        goals.push({
            title: goalCard.querySelector('h4').textContent,
            target: goalCard.querySelector('.goal-details p:first-child').textContent.replace('Target: ', ''),
            daysRemaining: parseInt(goalCard.querySelector('.goal-details p:last-of-type').textContent.replace('Days Remaining: ', ''))
        });
    });

    localStorage.setItem('fitnessGoals', JSON.stringify(goals));
}

// Function to load goals from localStorage
function loadGoals() {
    const savedGoals = localStorage.getItem('fitnessGoals');
    if (savedGoals) {
        const goals = JSON.parse(savedGoals);
        const goalsContainer = document.getElementById('goalsContainer');
        
        goals.forEach(goal => {
            const goalElement = document.createElement('div');
            goalElement.className = 'goal-card';
            goalElement.innerHTML = `
                <div class="goal-header">
                    <h4>${goal.title}</h4>
                    <button class="btn-delete" onclick="deleteGoal(this)">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
                <div class="goal-details">
                    <p>Target: ${goal.target}</p>
                    <p>Days Remaining: ${goal.daysRemaining}</p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
            `;
            goalsContainer.appendChild(goalElement);
        });
    }
}

// Load goals when page loads
document.addEventListener('DOMContentLoaded', loadGoals);

function logMeal(mealType) {
    // Meal logging logic
}

function saveExercise(btn) {
    // Save exercise logic
}

document.addEventListener('DOMContentLoaded', function() {
    // Theme Toggle
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Mobile Menu Toggle
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.querySelector('.nav-menu');

    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        menuToggle.querySelector('i').classList.toggle('ri-menu-line');
        menuToggle.querySelector('i').classList.toggle('ri-close-line');
    });

    // Close mobile menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            menuToggle.querySelector('i').classList.add('ri-menu-line');
            menuToggle.querySelector('i').classList.remove('ri-close-line');
        });
    });

    // Progress Bar
    window.onscroll = function() {
        const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
        const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrolled = (winScroll / height) * 100;
        document.querySelector('.progress-bar-fill').style.width = scrolled + '%';
    };

    // Active link highlighting
    const sections = document.querySelectorAll('section[id]');
    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        sections.forEach(section => {
            const sectionHeight = section.offsetHeight;
            const sectionTop = section.offsetTop - 100;
            const sectionId = section.getAttribute('id');
            const navLink = document.querySelector(`.nav-link[href*="${sectionId}"]`);
            
            if(scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLink?.classList.add('active');
            } else {
                navLink?.classList.remove('active');
            }
        });
    });
});

function saveProfile(event) {
    event.preventDefault();
    
    // Get form values
    const formData = {
        name: document.getElementById('userName').value,
        age: document.getElementById('userAge').value,
        weight: document.getElementById('userWeight').value,
        height: document.getElementById('userHeight').value
    };

    // Update profile display on dashboard
    document.querySelector('.profile-summary h3').textContent = formData.name;
    document.getElementById('displayAge').textContent = formData.age;
    document.getElementById('displayWeight').textContent = `${formData.weight} kg`;
    document.getElementById('displayHeight').textContent = `${formData.height} cm`;

    // Calculate and update BMI
    const bmi = calculateBMI(formData.weight, formData.height);
    document.getElementById('displayBMI').textContent = bmi.toFixed(1);

    // Save to localStorage for persistence
    localStorage.setItem('userProfile', JSON.stringify(formData));

    // Close the modal
    closeProfileModal();
}

function calculateBMI(weight, height) {
    // Convert height from cm to meters
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
}

// Load profile data when page loads
function loadProfile() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        
        // Set form values
        document.getElementById('userName').value = profile.name;
        document.getElementById('userAge').value = profile.age;
        document.getElementById('userWeight').value = profile.weight;
        document.getElementById('userHeight').value = profile.height;

        // Update dashboard display
        document.querySelector('.profile-summary h3').textContent = profile.name;
        document.getElementById('displayAge').textContent = profile.age;
        document.getElementById('displayWeight').textContent = `${profile.weight} kg`;
        document.getElementById('displayHeight').textContent = `${profile.height} cm`;
        
        const bmi = calculateBMI(profile.weight, profile.height);
        document.getElementById('displayBMI').textContent = bmi.toFixed(1);
    }
}

// Call loadProfile when page loads
document.addEventListener('DOMContentLoaded', loadProfile);

    