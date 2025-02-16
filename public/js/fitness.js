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

// Edit Profile function
function editProfile() {
    // Pre-fill the form with current values
    document.getElementById('editAge').value = document.getElementById('userAge').textContent;
    document.getElementById('editWeight').value = document.getElementById('userWeight').textContent;
    document.getElementById('editHeight').value = document.getElementById('userHeight').textContent;
    
    // Show the modal
    modal.style.display = 'block';
}

// Close modal when clicking (X)
closeBtn.onclick = function() {
    modal.style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Handle form submission
editProfileForm.onsubmit = function(e) {
    e.preventDefault();

    // Get new values
    const newAge = document.getElementById('editAge').value;
    const newWeight = document.getElementById('editWeight').value;
    const newHeight = document.getElementById('editHeight').value;

    // Update the profile information
    document.getElementById('userAge').textContent = newAge;
    document.getElementById('userWeight').textContent = newWeight;
    document.getElementById('userHeight').textContent = newHeight;

    // Calculate and update BMI
    const heightInMeters = newHeight / 100;
    const bmi = (newWeight / (heightInMeters * heightInMeters)).toFixed(1);
    document.getElementById('userBMI').textContent = bmi;

    // Close the modal
    modal.style.display = 'none';

    // Optional: Show success message
    alert('Profile updated successfully!');
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
function editProfile() {
    // Get current values
    const currentAge = document.getElementById('userAge').textContent;
    const currentWeight = document.getElementById('userWeight').textContent;
    const currentHeight = document.getElementById('userHeight').textContent;

    // Set form values to current values
    document.getElementById('editAge').value = currentAge;
    document.getElementById('editWeight').value = currentWeight;
    document.getElementById('editHeight').value = currentHeight;

    // Show modal and setup close button
    modal.style.display = 'block';
    
    // Handle form submission
    editProfileForm.onsubmit = function(e) {
        e.preventDefault();
        
        // Get form values
        const newAge = document.getElementById('editAge').value;
        const newWeight = document.getElementById('editWeight').value;
        const newHeight = document.getElementById('editHeight').value;

        // Update profile display
        document.getElementById('userAge').textContent = newAge;
        document.getElementById('userWeight').textContent = newWeight; 
        document.getElementById('userHeight').textContent = newHeight;

        // Calculate and update BMI
        const heightInMeters = newHeight / 100;
        const bmi = (newWeight / (heightInMeters * heightInMeters)).toFixed(1);
        document.getElementById('userBMI').textContent = bmi;

        // Close modal
        modal.style.display = 'none';
    };

    // Close modal when clicking X
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };

    // Close modal when clicking outside
    window.onclick = function(e) {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    };
}

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

    