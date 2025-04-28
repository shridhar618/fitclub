// Global variables
const tabs = {
    'dashboard-tab': 'dashboard-content',
    'users-tab': 'users-content',
    'stats-tab': 'stats-content'
};

let charts = {
    growth: null,
    activity: null
};

document.addEventListener('DOMContentLoaded', () => {
    // Check admin session
    checkAdminSession();

    // Tab switching
    Object.keys(tabs).forEach(tabId => {
        document.getElementById(tabId).addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(tabId);
        });
    });

    // Logout button
    document.getElementById('logout-btn').addEventListener('click', logout);

    // Initial load
    loadDashboard();
});

// Tab switching function
function switchTab(tabId) {
    // Update active tab styling
    Object.keys(tabs).forEach(id => {
        const tab = document.getElementById(id);
        const content = document.getElementById(tabs[id]);
        
        if (id === tabId) {
            tab.classList.add('bg-gray-700');
            content.classList.remove('hidden');
        } else {
            tab.classList.remove('bg-gray-700');
            content.classList.add('hidden');
        }
    });

    // Update page title
    const pageTitle = document.getElementById('page-title');
    pageTitle.textContent = tabId.split('-')[0].charAt(0).toUpperCase() + 
                           tabId.split('-')[0].slice(1) + ' ' +
                           tabId.split('-')[1].charAt(0).toUpperCase() + 
                           tabId.split('-')[1].slice(1);

    // Load appropriate content
    switch(tabId) {
        case 'dashboard-tab':
            loadDashboard();
            break;
        case 'users-tab':
            loadUsers();
            break;
        case 'stats-tab':
            loadStatistics();
            break;
    }
}

// Check admin session
async function checkAdminSession() {
    try {
        const response = await fetch('/api/admin/check-session');
        const data = await response.json();
        
        if (!data.isAuthenticated) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Session check failed:', error);
        window.location.href = '/login';
    }
}

// Load dashboard data
async function loadDashboard() {
    try {
        showLoading('dashboard-content');
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        document.getElementById('total-users').textContent = data.total_users || 0;
        document.getElementById('new-users').textContent = data.new_users_today || 0;
        document.getElementById('active-users').textContent = data.active_users || 0;
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        showToast('Failed to load dashboard data', 'error');
    } finally {
        hideLoading('dashboard-content');
    }
}

// Load users data
async function loadUsers() {
    try {
        showLoading('users-content');
        const response = await fetch('/api/users');
        const users = await response.json();
        
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        
        if (users && users.length > 0) {
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${user.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.name || 'N/A'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${new Date(user.created_at).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button class="action-btn delete-btn" onclick="deleteUser(${user.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center">No users found</td></tr>';
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        showToast('Failed to load users', 'error');
    } finally {
        hideLoading('users-content');
    }
}

// Load statistics
async function loadStatistics() {
    try {
        showLoading('stats-content');
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        // Destroy existing charts if they exist
        if (charts.growth) {
            charts.growth.destroy();
            charts.growth = null;
        }
        if (charts.activity) {
            charts.activity.destroy();
            charts.activity = null;
        }
        
        // User Growth Chart
        const growthCtx = document.getElementById('user-growth-chart');
        if (growthCtx) {
            charts.growth = new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [{
                        label: 'User Growth',
                        data: [12, 19, 3, 5, 2, 3],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // Activity Distribution Chart
        const activityCtx = document.getElementById('activity-chart');
        if (activityCtx) {
            const totalUsers = data.total_users || 0;
            const newUsers = data.new_users_today || 0;
            const activeUsers = data.active_users || 0;
            const inactiveUsers = totalUsers - activeUsers;

            charts.activity = new Chart(activityCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Active (Last 7 Days)', 'Inactive', 'New Today'],
                    datasets: [{
                        data: [activeUsers, inactiveUsers, newUsers],
                        backgroundColor: [
                            'rgb(75, 192, 192)',
                            'rgb(255, 99, 132)',
                            'rgb(255, 205, 86)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
        showToast('Failed to load statistics', 'error');
        
        // Clear charts if there's an error
        if (charts.growth) {
            charts.growth.destroy();
            charts.growth = null;
        }
        if (charts.activity) {
            charts.activity.destroy();
            charts.activity = null;
        }
    } finally {
        hideLoading('stats-content');
    }
}

// Delete user
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast('User deleted successfully', 'success');
            loadUsers();
        } else {
            throw new Error('Failed to delete user');
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        showToast('Failed to delete user', 'error');
    }
}

// Logout
async function logout() {
    try {
        const response = await fetch('/api/admin/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout failed:', error);
        showToast('Logout failed', 'error');
    }
}

// Show loading spinner
function showLoading(contentId) {
    const content = document.getElementById(contentId);
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.id = `${contentId}-spinner`;
    content.appendChild(spinner);
}

// Hide loading spinner
function hideLoading(contentId) {
    const spinner = document.getElementById(`${contentId}-spinner`);
    if (spinner) {
        spinner.remove();
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
} 